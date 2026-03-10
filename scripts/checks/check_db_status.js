const db = require('./database');

setTimeout(() => {
    console.log('\n📋 ===== فحص البطولات والدعوات =====\n');
    
    // جلب البطولات
    db.all("SELECT * FROM tournaments", [], (err, tournaments) => {
        if (err) {
            console.error('❌ خطأ في جلب البطولات:', err.message);
        } else {
            console.log(`🏆 عدد البطولات: ${tournaments.length}`);
            tournaments.forEach(t => {
                console.log(`   - ID: ${t.tournament_id}, Name: ${t.name}, Creator: ${t.creator_id}`);
            });
        }
        
        // جلب الدعوات
        db.all("SELECT * FROM tournament_invitations", [], (err, invitations) => {
            if (err) {
                console.error('❌ خطأ في جلب الدعوات:', err.message);
            } else {
                console.log(`\n📧 عدد الدعوات: ${invitations.length}`);
                invitations.forEach(inv => {
                    console.log(`   - من ${inv.from_user_id} إلى ${inv.to_user_id}: ${inv.tournament_name} (${inv.status})`);
                });
            }
            
            // جلب المستخدمين
            db.all("SELECT id, username FROM users", [], (err, users) => {
                if (err) {
                    console.error('❌ خطأ في جلب المستخدمين:', err.message);
                } else {
                    console.log(`\n👥 عدد المستخدمين: ${users.length}`);
                    users.forEach(u => {
                        console.log(`   - ID: ${u.id}, Name: ${u.username}`);
                    });
                }
                
                process.exit(0);
            });
        });
    });
}, 1000);
