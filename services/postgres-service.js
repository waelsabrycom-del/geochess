const { Pool } = require('pg');

const isPostgresEnabled = process.env.USE_POSTGRES === 'true' && !!process.env.DATABASE_URL;

let pool = null;

function getPool() {
    if (!isPostgresEnabled) return null;
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        });
        pool.on('error', (err) => {
            console.error('PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

async function query(text, params = []) {
    const p = getPool();
    if (!p) {
        throw new Error('PostgreSQL is not enabled. Set USE_POSTGRES=true and DATABASE_URL.');
    }
    return p.query(text, params);
}

async function initPostgresSchema() {
    if (!isPostgresEnabled) return;

    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
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

    await query(`
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
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
            winner_id INTEGER REFERENCES users(id),
            UNIQUE(host_id, game_name)
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS game_players (
            id SERIAL PRIMARY KEY,
            game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            player_side TEXT DEFAULT 'white',
            is_ready BOOLEAN DEFAULT FALSE,
            army_deployed BOOLEAN DEFAULT FALSE,
            joined_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS game_invites (
            id SERIAL PRIMARY KEY,
            game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            from_user_id INTEGER NOT NULL REFERENCES users(id),
            to_user_id INTEGER NOT NULL REFERENCES users(id),
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            responded_at TIMESTAMP
        );
    `);

    console.log('PostgreSQL schema ready');
}

module.exports = {
    isPostgresEnabled,
    getPool,
    query,
    initPostgresSchema
};
