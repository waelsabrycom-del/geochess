/**
 * سكريبت إعداد حساب المدير
 * الاستخدام:  node setup-admin.js <email> <password>
 * مثال:       node setup-admin.js wael@waelsabry.com MyPassword123
 *
 * أو لعرض قائمة المستخدمين الحاليين: node setup-admin.js --list
 */

const bcrypt = require('bcryptjs');
const db = require('./database');

const args = process.argv.slice(2);

function waitForDb(callback) {
    setTimeout(callback, 1200);
}

if (args[0] === '--list') {
    waitForDb(() => {
        db.all('SELECT id, username, email, user_type FROM users', [], (err, rows) => {
            if (err) { console.error('❌ خطأ:', err.message); process.exit(1); }
            console.log('\n📋 قائمة المستخدمين:');
            console.table(rows);
            process.exit(0);
        });
    });

} else if (args.length === 2) {
    const [email, newPassword] = args;

    if (newPassword.length < 6) {
        console.error('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        process.exit(1);
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    waitForDb(() => {
        db.get('SELECT id, username, email, user_type FROM users WHERE email = ?', [email], (err, user) => {
            if (err) { console.error('❌ خطأ:', err.message); process.exit(1); }

            if (!user) {
                // إنشاء مدير جديد
                db.run(
                    `INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, 'admin')`,
                    ['Admin', email, hashedPassword],
                    function (err) {
                        if (err) { console.error('❌ خطأ في إنشاء الحساب:', err.message); process.exit(1); }
                        console.log(`\n✅ تم إنشاء حساب مدير جديد:`);
                        console.log(`   البريد:      ${email}`);
                        console.log(`   نوع المستخدم: admin`);
                        process.exit(0);
                    }
                );
            } else {
                // تحديث كلمة المرور وتعيين نوع المستخدم كـ admin
                db.run(
                    `UPDATE users SET password = ?, user_type = 'admin' WHERE email = ?`,
                    [hashedPassword, email],
                    function (err) {
                        if (err) { console.error('❌ خطأ في التحديث:', err.message); process.exit(1); }
                        console.log(`\n✅ تم تحديث حساب المدير:`);
                        console.log(`   المستخدم:    ${user.username}`);
                        console.log(`   البريد:      ${email}`);
                        console.log(`   نوع المستخدم: admin`);
                        console.log(`   كلمة المرور: تم تغييرها بنجاح`);
                        process.exit(0);
                    }
                );
            }
        });
    });

} else {
    console.log(`
استخدام سكريبت المدير:
──────────────────────────────────────────────────────
  عرض المستخدمين الحاليين:
    node setup-admin.js --list

  تعيين / تغيير كلمة مرور المدير:
    node setup-admin.js <email> <password>

  مثال:
    node setup-admin.js wael@waelsabry.com MyNewPass123
──────────────────────────────────────────────────────
`);
    process.exit(0);
}
