const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'chess_game.db');
const db = new sqlite3.Database(dbPath);

console.log('📁 مسار قاعدة البيانات:', dbPath);

// قائمة الجداول المطلوبة
const requiredTables = [
    'users',
    'games',
    'game_players',
    'maps',
    'friends',
    'battle_history',
    'achievements',
    'sessions',
    'game_invites',
    'messages',
    'group_chats',
    'game_pieces',
    'tournaments',
    'tournament_invitations',
    'player_statistics',
    'tournament_results',
    'tournament_chat_messages'
];

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
    if(err) {
        console.error('❌ خطأ:', err);
        db.close();
        return;
    }
    
    const existingTables = rows.map(r => r.name).filter(n => n !== 'sqlite_sequence');
    
    console.log('✅ الجداول الموجودة:', existingTables.length);
    console.log('📋 المطلوبة:', requiredTables.length);
    console.log('');
    
    const missing = requiredTables.filter(t => !existingTables.includes(t));
    const extra = existingTables.filter(t => !requiredTables.includes(t));
    
    if(missing.length > 0) {
        console.log('❌ جداول مفقودة:');
        missing.forEach(t => console.log(`   - ${t}`));
    } else {
        console.log('✅ جميع الجداول المطلوبة موجودة');
    }
    
    if(extra.length > 0) {
        console.log('\nℹ️  جداول إضافية:');
        extra.forEach(t => console.log(`   + ${t}`));
    }
    
    db.close();
});
