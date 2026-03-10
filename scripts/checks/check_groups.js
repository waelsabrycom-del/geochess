const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all('SELECT * FROM group_chats', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Groups in database:', JSON.stringify(rows, null, 2));
    }
    db.close();
});
