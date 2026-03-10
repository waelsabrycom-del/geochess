const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chess_game.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err);
        process.exit(1);
    }
});

console.log('\n=== جدول المباريات ===');
db.all("PRAGMA table_info(games)", (err, rows) => {
    if (err) console.error('خطأ:', err);
    else console.log('الأعمدة:', JSON.stringify(rows, null, 2));
    
    console.log('\n=== القيود المفروضة ===');
    db.all("PRAGMA index_list(games)", (err, rows) => {
        if (err) console.error('خطأ:', err);
        else console.log('الفهارس:', JSON.stringify(rows, null, 2));
        
        console.log('\n=== بيانات اللعبة رقم 162 ===');
        db.get("SELECT * FROM games WHERE id = 162", (err, row) => {
            if (err) console.error('خطأ:', err);
            else console.log('اللعبة:', JSON.stringify(row, null, 2));
            
            console.log('\n=== جميع الألعاب ===');
            db.all("SELECT id, game_name, host_id, opponent_id, status FROM games LIMIT 5", (err, rows) => {
                if (err) console.error('خطأ:', err);
                else console.log('الألعاب:', JSON.stringify(rows, null, 2));
                
                db.get("SELECT COUNT(*) as count FROM games", (err, row) => {
                    if (err) console.error('خطأ:', err);
                    else console.log('إجمالي الألعاب:', JSON.stringify(row, null, 2));
                    
                    db.close();
                });
            });
        });
    });
});
