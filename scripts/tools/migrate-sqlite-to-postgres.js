const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const sqlitePath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', '..', 'database', 'chess_game.db');
const databaseUrl = process.env.DATABASE_URL;
const pgSsl = process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

if (!databaseUrl) {
    console.error('DATABASE_URL is required to run migration.');
    process.exit(1);
}

const sqlite = new sqlite3.Database(sqlitePath);
const pg = new Pool({ connectionString: databaseUrl, ssl: pgSsl });

function sqliteAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        sqlite.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

async function getExistingSqliteTables() {
    const rows = await sqliteAll("SELECT name FROM sqlite_master WHERE type = 'table'");
    return new Set(rows.map((r) => String(r.name || '').trim()).filter(Boolean));
}

async function ensureSchema() {
    await pg.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar_url TEXT,
            level INTEGER DEFAULT 1,
            reserve_army INTEGER DEFAULT 0,
            experience_points INTEGER DEFAULT 0,
            rank TEXT DEFAULT 'مبتدئ',
            global_rank INTEGER,
            league TEXT,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            total_games INTEGER DEFAULT 0,
            user_type TEXT DEFAULT 'player',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pg.query(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY,
            game_name TEXT NOT NULL,
            host_id INTEGER NOT NULL REFERENCES users(id),
            opponent_id INTEGER REFERENCES users(id),
            map_name TEXT NOT NULL,
            map_size TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'waiting',
            game_mode TEXT DEFAULT 'pvp',
            game_settings JSONB,
            guest_kicked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            started_at TIMESTAMP,
            ended_at TIMESTAMP,
            winner_id INTEGER REFERENCES users(id)
        );
    `);

    await pg.query(`
        CREATE TABLE IF NOT EXISTS game_players (
            id INTEGER PRIMARY KEY,
            game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            player_side TEXT DEFAULT 'white',
            is_ready BOOLEAN DEFAULT FALSE,
            army_deployed BOOLEAN DEFAULT FALSE,
            joined_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pg.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP
        );
    `);
}

function toJsonOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    try {
        return JSON.parse(value);
    } catch (e) {
        return null;
    }
}

async function migrateUsers() {
    const rows = await sqliteAll('SELECT * FROM users ORDER BY id');
    for (const r of rows) {
        await pg.query(
            `
            INSERT INTO users (id, username, email, password, avatar_url, level, reserve_army, experience_points, rank, global_rank, league, wins, losses, total_games, user_type, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                password = EXCLUDED.password,
                avatar_url = EXCLUDED.avatar_url,
                level = EXCLUDED.level,
                reserve_army = EXCLUDED.reserve_army,
                experience_points = EXCLUDED.experience_points,
                rank = EXCLUDED.rank,
                global_rank = EXCLUDED.global_rank,
                league = EXCLUDED.league,
                wins = EXCLUDED.wins,
                losses = EXCLUDED.losses,
                total_games = EXCLUDED.total_games,
                user_type = EXCLUDED.user_type,
                updated_at = EXCLUDED.updated_at
            `,
            [
                r.id,
                r.username,
                r.email,
                r.password,
                r.avatar_url,
                r.level || 1,
                r.reserve_army || 0,
                r.experience_points || 0,
                r.rank || 'مبتدئ',
                r.global_rank,
                r.league,
                r.wins || 0,
                r.losses || 0,
                r.total_games || 0,
                r.user_type || 'player',
                r.created_at,
                r.updated_at
            ]
        );
    }
    console.log(`Migrated users: ${rows.length}`);
}

async function migrateGames() {
    const rows = await sqliteAll('SELECT * FROM games ORDER BY id');
    for (const r of rows) {
        await pg.query(
            `
            INSERT INTO games (id, game_name, host_id, opponent_id, map_name, map_size, status, game_mode, game_settings, guest_kicked, created_at, started_at, ended_at, winner_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            ON CONFLICT (id) DO UPDATE SET
                game_name = EXCLUDED.game_name,
                host_id = EXCLUDED.host_id,
                opponent_id = EXCLUDED.opponent_id,
                map_name = EXCLUDED.map_name,
                map_size = EXCLUDED.map_size,
                status = EXCLUDED.status,
                game_mode = EXCLUDED.game_mode,
                game_settings = EXCLUDED.game_settings,
                guest_kicked = EXCLUDED.guest_kicked,
                started_at = EXCLUDED.started_at,
                ended_at = EXCLUDED.ended_at,
                winner_id = EXCLUDED.winner_id
            `,
            [
                r.id,
                r.game_name,
                r.host_id,
                r.opponent_id,
                r.map_name,
                r.map_size || 'medium',
                r.status || 'waiting',
                r.game_mode || 'pvp',
                toJsonOrNull(r.game_settings),
                !!r.guest_kicked,
                r.created_at,
                r.started_at,
                r.ended_at,
                r.winner_id
            ]
        );
    }
    console.log(`Migrated games: ${rows.length}`);
}

async function migrateGamePlayers() {
    const rows = await sqliteAll('SELECT * FROM game_players ORDER BY id');
    for (const r of rows) {
        await pg.query(
            `
            INSERT INTO game_players (id, game_id, user_id, player_side, is_ready, army_deployed, joined_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO UPDATE SET
                game_id = EXCLUDED.game_id,
                user_id = EXCLUDED.user_id,
                player_side = EXCLUDED.player_side,
                is_ready = EXCLUDED.is_ready,
                army_deployed = EXCLUDED.army_deployed,
                joined_at = EXCLUDED.joined_at
            `,
            [
                r.id,
                r.game_id,
                r.user_id,
                r.player_side || 'white',
                !!r.is_ready,
                !!r.army_deployed,
                r.joined_at
            ]
        );
    }
    console.log(`Migrated game_players: ${rows.length}`);
}

async function migrateSessions() {
    const rows = await sqliteAll('SELECT * FROM sessions ORDER BY id');
    for (const r of rows) {
        await pg.query(
            `
            INSERT INTO sessions (id, user_id, token, created_at, expires_at)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                token = EXCLUDED.token,
                created_at = EXCLUDED.created_at,
                expires_at = EXCLUDED.expires_at
            `,
            [r.id, r.user_id, r.token, r.created_at, r.expires_at]
        );
    }
    console.log(`Migrated sessions: ${rows.length}`);
}

async function resetSequences() {
    await pg.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true)`);
    await pg.query(`SELECT setval(pg_get_serial_sequence('games', 'id'), COALESCE((SELECT MAX(id) FROM games), 1), true)`);
    await pg.query(`SELECT setval(pg_get_serial_sequence('game_players', 'id'), COALESCE((SELECT MAX(id) FROM game_players), 1), true)`);
    await pg.query(`SELECT setval(pg_get_serial_sequence('sessions', 'id'), COALESCE((SELECT MAX(id) FROM sessions), 1), true)`);
}

async function run() {
    console.log('Starting SQLite -> PostgreSQL migration');
    console.log(`SQLite source: ${sqlitePath}`);

    try {
        const existingTables = await getExistingSqliteTables();
        await ensureSchema();

        if (existingTables.has('users')) {
            await migrateUsers();
        } else {
            console.log('Skipping users migration: source SQLite table does not exist.');
        }

        if (existingTables.has('games')) {
            await migrateGames();
        } else {
            console.log('Skipping games migration: source SQLite table does not exist.');
        }

        if (existingTables.has('game_players')) {
            await migrateGamePlayers();
        } else {
            console.log('Skipping game_players migration: source SQLite table does not exist.');
        }

        if (existingTables.has('sessions')) {
            await migrateSessions();
        } else {
            console.log('Skipping sessions migration: source SQLite table does not exist.');
        }

        await resetSequences();

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        sqlite.close();
        await pg.end();
    }
}

run();
