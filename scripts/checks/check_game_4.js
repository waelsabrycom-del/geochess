const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/chess_game.db');

console.log('🔍 جاري التحقق من اللعبة رقم 4...\n');

db.get("SELECT id, game_name, map_name, game_settings, placed_units_data FROM games WHERE id = 4", (err, game) => {
  if (err) {
    console.error('❌ خطأ:', err);
  } else if (game) {
    console.log('✅ تم العثور على اللعبة:');
    console.log('ID:', game.id);
    console.log('Game Name:', game.game_name);
    console.log('Map Name:', game.map_name);
    console.log('Has Settings:', !!game.game_settings);
    console.log('Has Placed Units:', !!game.placed_units_data);
    
    if (game.game_settings) {
      try {
        const settings = JSON.parse(game.game_settings);
        console.log('Map Name from Settings:', settings.mapName);
      } catch (e) {
        console.log('Settings parse error:', e.message);
      }
    }
  } else {
    console.log('❌ اللعبة رقم 4 غير موجودة');
  }
  
  db.close();
});
