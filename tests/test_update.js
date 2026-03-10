const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chess_game.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err);
        process.exit(1);
    }
});

console.log('\n=== اختبار استعلام التحديث ===');
const gameId = 162;
const updateQuery = `UPDATE games SET status = 'started' WHERE id = ${gameId}`;

console.log(`استعلام التحديث: ${updateQuery}`);

try {
    db.run(updateQuery, function(err) {
        if (err) {
            console.error('❌ خطأ في تنفيذ الاستعلام:');
            console.error(`   - الرسالة: ${err.message}`);
            console.error(`   - الكود: ${err.code}`);
            console.error(`   - SQL: ${err.sql}`);
        } else {
            console.log(`✅ نجح التحديث`);
            console.log(`   - عدد الصفوف المتأثرة: ${this.changes}`);
            console.log(`   - آخر معرف دخل: ${this.lastID}`);
            
            // التحقق من النتيجة
            console.log('\n=== التحقق من النتيجة ===');
            db.get("SELECT id, status FROM games WHERE id = 162", (err, row) => {
                if (err) console.error('خطأ:', err);
                else console.log('الحالة الحالية:', JSON.stringify(row, null, 2));
                
                db.close();
            });
        }
    });
} catch (err) {
    console.error('❌ خطأ غير متوقع:', err);
    db.close();
}
