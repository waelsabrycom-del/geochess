const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/chess_game.db');

// Create a test game
db.run(`
    INSERT INTO games (game_name, host_id, map_name, status)
    VALUES (?, ?, ?, ?)
`, ['اختبار', 1, 'map1', 'waiting'], function(err) {
    if (err) {
        console.error('❌ خطأ في إنشاء اللعبة:', err.message);
        db.close();
        return;
    }
    
    const gameId = this.lastID;
    console.log(`✅ تم إنشاء لعبة اختبار برقم: ${gameId}`);
    
    // Now test the UPDATE
    const updateQuery = `UPDATE games SET status = 'started' WHERE id = ?`;
    db.run(updateQuery, [gameId], function(err) {
        if (err) {
            console.error(`❌ خطأ في التحديث:`, err.message);
        } else {
            console.log(`✅ تم التحديث بنجاح - الصفوف المتأثرة: ${this.changes}`);
            
            // Verify
            db.get("SELECT id, status FROM games WHERE id = ?", [gameId], (err, row) => {
                if (err) {
                    console.error('خطأ:', err);
                } else {
                    console.log(`✅ الحالة الحالية:`, JSON.stringify(row));
                }
                db.close();
            });
        }
    });
});
