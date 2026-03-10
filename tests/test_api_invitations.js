const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key-change-in-production';

const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: '7d' });

console.log('🧪 اختبار API جلب الدعوات\n');
console.log('👤 المستخدم: 2 (roro)');
console.log(`🔑 التوكن: ${token.substring(0, 30)}...`);

setTimeout(async () => {
    try {
        const response = await fetch('http://localhost:3000/api/tournaments/my-invitations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`\n📡 حالة الاستجابة: ${response.status}`);
        
        const data = await response.json();
        
        console.log(`✅ البيانات المستلمة:\n${JSON.stringify(data, null, 2)}`);
        
        if (data.invitations && data.invitations.length > 0) {
            console.log(`\n🎉 عدد الدعوات: ${data.invitations.length}`);
            data.invitations.forEach(inv => {
                console.log(`   - ${inv.tournament_name} من ${inv.from_username}`);
            });
        } else {
            console.log('\n⚠️ لا توجد دعوات');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}, 1000);
