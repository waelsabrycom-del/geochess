const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chess_game.db');
const tournamentName = 'صحاري القاهرة';
const targetArg = process.argv[2];

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('DB_OPEN_ERROR', err.message);
        process.exit(1);
    }
});

function getLatestAdminId() {
    return new Promise((resolve) => {
        const sql = "SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.user_type = 'admin' ORDER BY s.created_at DESC LIMIT 1";
        db.get(sql, (err, row) => {
            if (err) {
                resolve(null);
                return;
            }
            resolve(row ? row.user_id : null);
        });
    });
}

(async () => {
    const adminId = await getLatestAdminId();
    let tournamentSql = '';
    const params = [];

    if (targetArg && targetArg !== 'latest' && !Number.isNaN(Number(targetArg))) {
        tournamentSql = 'SELECT tournament_id, creator_id, name FROM tournaments WHERE tournament_id = ?';
        params.push(Number(targetArg));
    } else if (targetArg === 'latest') {
        tournamentSql = 'SELECT tournament_id, creator_id, name FROM tournaments ORDER BY tournament_id DESC LIMIT 1';
    } else {
        tournamentSql = 'SELECT tournament_id, creator_id, name FROM tournaments WHERE name = ?';
        params.push(tournamentName);
        if (adminId) {
            tournamentSql += ' AND creator_id = ?';
            params.push(adminId);
        }
        tournamentSql += ' ORDER BY tournament_id DESC LIMIT 1';
    }

    db.get(tournamentSql, params, (err, tournament) => {
        if (err) {
            console.error('TOURNAMENT_QUERY_ERROR', err.message);
            db.close();
            return;
        }
        if (!tournament) {
            console.log('NOT_FOUND');
            db.close();
            return;
        }

        const countSql = "SELECT COUNT(*) as accepted_count FROM tournament_invitations WHERE tournament_id = ? AND status = 'accepted'";
        db.get(countSql, [tournament.tournament_id], (err2, row) => {
            if (err2) {
                console.error('COUNT_ERROR', err2.message);
                db.close();
                return;
            }

            const participantCount = row ? row.accepted_count : 0;
            const brackets = Math.ceil(participantCount / 2);

            console.log(`TOURNAMENT_ID=${tournament.tournament_id}`);
            console.log(`NAME=${tournament.name || ''}`);
            console.log(`CREATOR_ID=${tournament.creator_id}`);
            console.log(`PARTICIPANTS=${participantCount}`);
            console.log(`BRACKETS=${brackets}`);
            db.close();
        });
    });
})();
