const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chess_game.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في فتح قاعدة البيانات:', err);
        process.exit(1);
    }

    // حذف جميع المباريات المفتوحة
    db.run(`DELETE FROM games WHERE status = 'waiting'`, function(err) {
        if (err) {
            console.error('خطأ في حذف المباريات:', err);
        } else {
            console.log(`✓ تم حذف ${this.changes} مباراة مفتوحة`);
        }

        // حذف لاعبي المباريات المحذوفة
        db.run(`DELETE FROM game_players WHERE game_id NOT IN (SELECT id FROM games)`, function(err) {
            if (err) {
                console.error('خطأ في حذف لاعبي المباريات:', err);
            } else {
                console.log(`✓ تم حذف ${this.changes} لاعب من المباريات المحذوفة`);
            }
            
            // إغلاق الاتصال
            db.close((err) => {
                if (err) {
                    console.error('خطأ في إغلاق قاعدة البيانات:', err);
                } else {
                    console.log('✓ تم إغلاق قاعدة البيانات بنجاح');
                    process.exit(0);
                }
            });
        });
    });
});
