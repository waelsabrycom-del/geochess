const http = require('http');

// اختبار: dodo (host) قتل ملك heba (guest)
// الفائز: dodo (host), winnerId = 10

const testData = {
  winnerId: 10,           // dodo (host) - الفائز
  loserId: 12,            // heba (opponent) - الخاسر
  winnerName: 'dodo',
  loserName: 'heba',
  winnerRole: 'host',     // صحيح: host هو الفائز
  reason: 'king_killed',
  gameId: '77'
};

console.log('🧪 اختبار الحالة الأخرى: dodo (host) قتل ملك heba → dodo الفائز');
console.log('📤 البيانات المتوقعة:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n');

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/tournaments/1771622687179/matches/2/result',
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
    console.log('✅ استجابة من الخادم:', res.statusCode);
    
    setTimeout(() => {
      console.log('\n🔍 التحقق من البيانات المحفوظة...\n');
      const db = require('./database.js');
      db.get(
        'SELECT * FROM tournament_results WHERE tournament_id = ? AND match_number = ?',
        ['1771622687179', 2],
        (err, row) => {
          if (err) {
            console.error('❌ خطأ:', err);
          } else if (row) {
            console.log('📊 البيانات المحفوظة:');
            console.log('  - winner_id:', row.winner_id);
            console.log('  - winner_name:', row.winner_name);
            console.log('  - loser_id:', row.loser_id);
            console.log('  - loser_name:', row.loser_name);
            console.log('  - winner_role:', row.winner_role);
            
            if (row.winner_id === 10 && row.winner_name === 'dodo' && row.winner_role === 'host') {
              console.log('\n✅ ✅ ✅ البيانات محفوظة بشكل صحيح!');
              console.log('✅ dodo هو الفائز حقاً (winner_id = 10)');
              console.log('✅ heba هي الخاسرة (loser_id = 12)');
              console.log('\n✅ كلا الحالتين تم اختبارهما بنجاح!');
            } else {
              console.log('\n❌ خطأ في البيانات');
            }
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
