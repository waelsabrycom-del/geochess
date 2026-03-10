const db = require('./database');

// انتظر قليلاً حتى تُنشأ الجداول
setTimeout(() => {
    console.log('\n📋 اختبار جدول دعوات البطولات:\n');
    
    // تحقق من الجداول الموجودة
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('❌ خطأ في جلب الجداول:', err);
        } else {
            console.log('✅ الجداول الموجودة:');
            tables.forEach(t => console.log(`   - ${t.name}`));
        }
        
        // تحقق من محتوى جدول الدعوات
        db.all("SELECT * FROM tournament_invitations", [], (err, rows) => {
            if (err) {
                console.error('❌ خطأ في جلب دعوات البطولات:', err.message);
            } else {
                console.log(`\n✅ عدد الدعوات في قاعدة البيانات: ${rows.length}`);
                if (rows.length > 0) {
                    console.log('📋 الدعوات:');
                    rows.forEach(row => {
                        console.log(`   ID: ${row.id}, Tournament: ${row.tournament_name}, To User: ${row.to_user_id}, Status: ${row.status}`);
                    });
                }
            }
            
            // اختبر جدول البطولات أيضاً
            db.all("SELECT * FROM tournaments", [], (err, tournaments) => {
                if (err) {
                    console.error('❌ خطأ في جلب البطولات:', err.message);
                } else {
                    console.log(`\n✅ عدد البطولات في قاعدة البيانات: ${tournaments.length}`);
                    if (tournaments.length > 0) {
                        console.log('🏆 البطولات:');
                        tournaments.forEach(t => {
                            console.log(`   ID: ${t.tournament_id}, Name: ${t.name}, Creator: ${t.creator_id}, Status: ${t.status}`);
                        });
                    }
                }
                
                process.exit(0);
            });
        });
    });
    
}, 2000);
