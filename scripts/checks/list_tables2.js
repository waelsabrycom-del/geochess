const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chess_game.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        return;
    }
});

// Get all tables
const query = `SELECT name FROM sqlite_master WHERE type='table'`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }

    console.log('📊 Tables in chess_game.db:');
    rows.forEach(row => {
        console.log(`   - ${row.name}`);
    });
    
    db.close();
});
