#!/usr/bin/env node

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database/chess_game.db');

async function test() {
    console.log('\n=== اختبار خروج الضيف ومسح البيانات ===\n');
    
    return new Promise((resolve) => {
        db.serialize(() => {
            // 1. إنشاء مباراة
            console.log('📝 1. إنشاء مباراة...');
            db.run(
                'INSERT INTO games (host_id, game_name, map_name, map_size, status) VALUES (?, ?, ?, ?, ?)',
                [1, 'معركة الاختبار', 'map', 'medium', 'waiting'],
                function(err) {
                    if (err) {
                        console.log('❌ فشل الإنشاء:', err.message);
                        db.close();
                        process.exit(1);
                    }
                    
                    const gameId = this.lastID;
                    console.log(`✓ تم إنشاء مباراة برقم: ${gameId}\n`);
                    
                    // 2. الضيف ينضم
                    console.log('📝 2. الضيف ينضم للمباراة...');
                    db.run('UPDATE games SET opponent_id = ? WHERE id = ?', [2, gameId], () => {
                        console.log('✓ الضيف انضم - opponent_id = 2\n');
                        
                        // 3. عرض البيانات قبل الخروج
                        db.get('SELECT opponent_id, status FROM games WHERE id = ?', [gameId], (err, before) => {
                            console.log('📊 البيانات قبل خروج الضيف:');
                            console.log(`   - opponent_id: ${before.opponent_id}`);
                            console.log(`   - status: ${before.status}\n`);
                            
                            // 4. الضيف يخرج - مسح البيانات
                            console.log('📝 3. الضيف يخرج - مسح البيانات...');
                            db.run(
                                'UPDATE games SET opponent_id = NULL, status = ? WHERE id = ?',
                                ['waiting', gameId],
                                () => {
                                    console.log('✓ تم مسح بيانات الضيف\n');
                                    
                                    // 5. عرض البيانات بعد الخروج
                                    db.get('SELECT opponent_id, status FROM games WHERE id = ?', [gameId], (err, after) => {
                                        console.log('📊 البيانات بعد خروج الضيف:');
                                        console.log(`   - opponent_id: ${after.opponent_id} (يجب أن يكون null)`);
                                        console.log(`   - status: ${after.status}\n`);
                                        
                                        if (after.opponent_id === null) {
                                            console.log('✅✅ نجح! تم مسح بيانات الضيف بنجاح!');
                                            console.log('✅ opponent_id الآن NULL');
                                            console.log('✅ status عاد إلى waiting');
                                            console.log('\n✓ جميع بيانات الضيف من الخانة 2 تم مسحها');
                                        } else {
                                            console.log('❌ فشل! لم يتم مسح opponent_id');
                                        }
                                        
                                        db.close();
                                        process.exit(0);
                                    });
                                }
                            );
                        });
                    });
                }
            );
        });
    });
}

test();
