const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/chess_game.db');

console.log('\n📊 محتوى جدول game_pieces من chess_game.db:\n');

db.all('SELECT game_id, piece_type, row, col, color, player_number FROM game_pieces ORDER BY game_id DESC LIMIT 20', (err, rows) => {
    if(err) {
        console.error('❌ خطأ:', err.message);
        if(err.message.includes('no such table')) {
            console.log('\n🔍 محاولة من chess.db...');
            const db2 = new sqlite3.Database('./database/chess.db');
            db2.all('SELECT game_id, piece_type, row, col, color, player_number FROM game_pieces LIMIT 20', (err2, rows2) => {
                if(err2) console.error('❌ خطأ chess.db:', err2.message);
                else if(rows2?.length > 0) {
                    console.log(`\n✅ وجدت ${rows2.length} وحدات في chess.db:`);
                    rows2.forEach((r, i) => {
                        console.log(`[${i+1}] Game: ${r.game_id} | Type: ${r.piece_type} | Pos: (${r.row},${r.col}) | Color: ${r.color} | Player: ${r.player_number}`);
                    });
                } else {
                    console.log('⚠️ chess.db: لا توجد وحدات');
                }
                db2.close();
            });
        }
    } else {
        if(rows && rows.length > 0) {
            console.log(`✅ من chess_game.db: ${rows.length} وحدات\n`);
            rows.forEach((r, i) => {
                console.log(`[${i+1}] Game: ${r.game_id} | Type: ${r.piece_type} | Pos: (${r.row},${r.col}) | Color: ${r.color} | Player: ${r.player_number}`);
            });
        } else {
            console.log('⚠️ chess_game.db: لا توجد وحدات');
        }
        db.close();
    }
});
