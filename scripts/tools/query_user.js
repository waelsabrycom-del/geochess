const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/chess_game.db');

db.get('SELECT id, username, email FROM users WHERE id = ?', [4], (err, row) => {
    if (err) {
        console.error('خطأ:', err);
    } else if (row) {
        console.log('المستخدم رقم 4:');
        console.log('ID:', row.id);
        console.log('Username:', row.username);
        console.log('Email:', row.email);
    } else {
        console.log('المستخدم رقم 4 غير موجود');
    }
    db.close();
});
