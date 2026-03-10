const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chess_game.db');

const createTableSQL = `
    CREATE TABLE IF NOT EXISTS game_pieces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        piece_name TEXT NOT NULL,
        piece_type TEXT NOT NULL,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        color TEXT NOT NULL,
        player_number INTEGER NOT NULL,
        html_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
`;

db.run(createTableSQL, (err) => {
    if(err) {
        console.error('❌ خطأ في إنشاء الجدول:', err);
    } else {
        console.log('✅ تم إنشاء جدول game_pieces بنجاح');
    }
    
    // التحقق من الجدول
    db.all('PRAGMA table_info(game_pieces)', (err, rows) => {
        if(err) {
            console.error('❌ خطأ في التحقق:', err);
        } else {
            console.log('✅ تأكيد - الجدول موجود الآن بـ', rows.length, 'أعمدة');
            console.table(rows);
        }
        db.close();
    });
});
