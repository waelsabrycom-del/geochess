const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/chess_game.db');

db.all("PRAGMA index_info(sqlite_autoindex_games_1)", (err, rows) => {
    if (err) {
        console.log('خطأ:', err.message);
    } else {
        console.log('🔍 معلومات الفهرس الفريد:');
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
