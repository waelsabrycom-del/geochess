const http = require('http');

// اختبار بـ winnerRole = 'host' (معاكس الصحيح)
const testData = {
  winnerId: 10,           // dodo (host) - WRONG
  loserId: 12,            // heba (opponent) - WRONG  
  winnerName: 'dodo',
  loserName: 'heba',
  winnerRole: 'host',     // WRONG - should be 'guest'
  reason: 'king_killed',
  gameId: '77'
};

console.log('🧪 اختبار بـ winnerRole معاكس (مثل المشكلة الحقيقية)');
console.log('📤 البيانات المرسلة:');
console.log(JSON.stringify(testData, null, 2));

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
    console.log('\n✅ استجابة من الخادم:');
    console.log(res.statusCode, res.statusMessage);
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log(data);
    }

    // الآن تحقق من البيانات المحفوظة في قاعدة البيانات
    setTimeout(() => {
      console.log('\n🔍 التحقق من البيانات المحفوظة في قاعدة البيانات...');
      const db = require('./database.js');
      db.get(
        'SELECT * FROM tournament_results WHERE tournament_id = ? AND match_number = ?',
        ['1771622687179', 2],
        (err, row) => {
          if (err) {
            console.error('❌ خطأ:', err);
          } else if (row) {
            console.log('📊 البيانات المحفوظة:');
            console.log(JSON.stringify(row, null, 2));
            
            // التحقق من الصحة
            if (row.winner_id === 10) {
              console.log('⚠️  تحذير: البيانات المعاكسة تم حفظها كما هي (لا يوجد تصحيح في الخادم)');
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
