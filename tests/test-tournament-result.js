const http = require('http');

// محاكاة إرسال نتيجة البطولة (كما يفعل الكلاينت)
const testData = {
  winnerId: 12,           // heba (opponent)
  loserId: 10,            // dodo (host)
  winnerName: 'heba',
  loserName: 'dodo',
  winnerRole: 'guest',
  reason: 'king_killed',
  gameId: '77'
};

console.log('🧪 اختبار حفظ نتيجة البطولة');
console.log('📤 البيانات المرسلة:');
console.log(JSON.stringify(testData, null, 2));

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
        ['1771622687179', 1],
        (err, row) => {
          if (err) {
            console.error('❌ خطأ:', err);
          } else if (row) {
            console.log('📊 البيانات المحفوظة:');
            console.log(JSON.stringify(row, null, 2));
            
            // التحقق من الصحة
            if (row.winner_id === 12 && row.loser_id === 10) {
              console.log('✅ تم حفظ البيانات بشكل صحيح!');
            } else {
              console.log('❌ خطأ: البيانات محفوظة بشكل معاكس!');
              console.log(`  - winner_id: ${row.winner_id} (يجب أن يكون 12)`);
              console.log(`  - loser_id: ${row.loser_id} (يجب أن يكون 10)`);
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
