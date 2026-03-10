const http = require('http');

// اختبار: dodo (host, isGuest=false) فقد ملكه
// heba (guest) قتلت ملك dodo = guest هو الفائز
// الكود الصحيح يجب أن يحسب: isGuest = false, winnerRole = 'guest', winnerId = 12

const testData = {
  winnerId: 12,           // heba (opponent) - صحيح
  loserId: 10,            // dodo (host) - صحيح
  winnerName: 'heba',
  loserName: 'dodo',
  winnerRole: 'guest',    // صحيح: guest هو الفائز
  reason: 'king_killed',
  gameId: '77'
};

console.log('🧪 اختبار الإصلاح: dodo (host) فقد ملكه → heba (guest) الفائز');
console.log('📤 البيانات المتوقعة (بعد الإصلاح):');
console.log(JSON.stringify(testData, null, 2));
console.log('\n');

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/tournaments/1771622687179/matches/1/result',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ اسجابة من الخادم:', res.statusCode);
    
    // الآن تحقق من البيانات المحفوظة في قاعدة البيانات
    setTimeout(() => {
      console.log('\n🔍 التحقق من البيانات المحفوظة...\n');
      const db = require('./database.js');
      db.get(
        'SELECT * FROM tournament_results WHERE tournament_id = ? AND match_number = ?',
        ['1771622687179', 1],
        (err, row) => {
          if (err) {
            console.error('❌ خطأ:', err);
          } else if (row) {
            console.log('📊 البيانات المحفوظة في قاعدة البيانات:');
            console.log('  - winner_id:', row.winner_id);
            console.log('  - winner_name:', row.winner_name);
            console.log('  - loser_id:', row.loser_id);
            console.log('  - loser_name:', row.loser_name);
            console.log('  - winner_role:', row.winner_role);
            
            // التحقق من الصحة
            if (row.winner_id === 12 && row.winner_name === 'heba' && row.winner_role === 'guest') {
              console.log('\n✅ ✅ ✅ البيانات محفوظة بشكل صحيح!');
              console.log('✅ heba هي الفائز حقاً (winner_id = 12)');
              console.log('✅ دodo هو الخاسر (loser_id = 10)');
              console.log('\n🎉 تم حل المشكلة بنجاح!');
            } else {
              console.log('\n❌ ❌ ❌ خطأ: البيانات محفوظة بشكل خاطئ!');
              if (row.winner_id !== 12) {
                console.log(`  ❌ winner_id: ${row.winner_id} (يجب أن يكون 12)`);
              }
              if (row.winner_name !== 'heba') {
                console.log(`  ❌ winner_name: ${row.winner_name} (يجب أن يكون heba)`);
              }
              if (row.winner_role !== 'guest') {
                console.log(`  ❌ winner_role: ${row.winner_role} (يجب أن يكون guest)`);
              }
            }
          } else {
            console.log('❌ لم يتم العثور على النتيجة في قاعدة البيانات');
          }
          process.exit(0);
        }
      );
    }, 500);
  });
});

req.on('error', (e) => {
  console.error('❌ خطأ في الاتصال:', e);
  process.exit(1);
});

req.write(postData);
req.end();
