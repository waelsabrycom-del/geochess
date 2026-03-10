const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/chess_game.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Tables in chess_game.db:');
        rows.forEach(r => console.log('  -', r.name));
    }
    db.close();
});
