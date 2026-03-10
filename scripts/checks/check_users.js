const db = require('./database');

setTimeout(() => {
    db.all("SELECT id, username FROM users", [], (err, users) => {
        if (err) {
            console.error('❌ خطأ:', err);
        } else {
            console.log(`👥 عدد المستخدمين: ${users.length}\n`);
            users.forEach(u => {
                console.log(`   ${u.id}: ${u.username}`);
            });
        }
        process.exit(0);
    });
}, 1000);
