const db = require('./database');
const bcrypt = require('bcryptjs');

/**
 * ملف مساعد لإضافة بيانات عينة لقاعدة البيانات
 * استخدم: node seedData.js
 */

console.log('🌱 بدء إضافة بيانات العينة...\n');

// بيانات عينة للمستخدمين
const sampleUsers = [
    {
        username: 'الجنرال خالد',
        email: 'khalid@example.com',
        password: bcrypt.hashSync('password123', 10),
        level: 48,
        experience_points: 35000,
        rank: 'محترف',
        global_rank: 542,
        league: 'الدوري الفضي',
        wins: 65,
        losses: 42
    },
    {
        username: 'المخطط عمر',
        email: 'omar@example.com',
        password: bcrypt.hashSync('password123', 10),
        level: 52,
        experience_points: 42000,
        rank: 'محترف متقدم',
        global_rank: 380,
        league: 'الدوري الذهبي',
        wins: 78,
        losses: 35
    },
    {
        username: 'ليلى التكتيكية',
        email: 'layla@example.com',
        password: bcrypt.hashSync('password123', 10),
        level: 53,
        experience_points: 40000,
        rank: 'محترف متقدم',
        global_rank: 420,
        league: 'الدوري الذهبي',
        wins: 72,
        losses: 38
    },
    {
        username: 'القائد أحمد',
        email: 'ahmed@example.com',
        password: bcrypt.hashSync('password123', 10),
        level: 55,
        experience_points: 45200,
        rank: 'ماستر',
        global_rank: 240,
        league: 'الدوري الذهبي',
        wins: 89,
        losses: 53
    }
];

// بيانات عينة للخرائط
const sampleMaps = [
    {
        name: 'صحراء سيناء',
        description: 'صحراء شاسعة مع واحات محدودة',
        width: 15,
        height: 15,
        difficulty: 'medium'
    },
    {
        name: 'جبال الأطلس',
        description: 'جبال عالية بتضاريس وعرة',
        width: 12,
        height: 12,
        difficulty: 'hard'
    },
    {
        name: 'الربع الخالي',
        description: 'صحراء رملية شاسعة جداً',
        width: 20,
        height: 20,
        difficulty: 'hard'
    },
    {
        name: 'الجبال الوعرة',
        description: 'جبال وسهول متنوعة',
        width: 16,
        height: 16,
        difficulty: 'medium'
    },
    {
        name: 'سواحل البحر الأحمر',
        description: 'ساحل بحري مع جزر',
        width: 14,
        height: 18,
        difficulty: 'easy'
    },
    {
        name: 'جزر دبي',
        description: 'جزر استراتيجية',
        width: 10,
        height: 10,
        difficulty: 'hard'
    }
];

// انتظر قليلاً لضمان إنشاء الجداول
let usersAdded = 0;
setTimeout(() => {
    // إضافة المستخدمين
    console.log('👥 إضافة المستخدمين...');

    sampleUsers.forEach((user, index) => {
    db.run(
        `INSERT INTO users (username, email, password, level, experience_points, rank, global_rank, league, wins, losses, total_games)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user.username,
            user.email,
            user.password,
            user.level,
            user.experience_points,
            user.rank,
            user.global_rank,
            user.league,
            user.wins,
            user.losses,
            user.wins + user.losses
        ],
        (err) => {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    console.log(`⚠️  المستخدم ${user.username} موجود بالفعل`);
                } else {
                    console.log(`❌ خطأ في إضافة ${user.username}:`, err.message);
                }
            } else {
                console.log(`✅ ${user.username}`);
                usersAdded++;
            }

            // إضافة الخرائط بعد انتهاء المستخدمين
            if (index === sampleUsers.length - 1 && usersAdded > 0) {
                addMaps();
            }
        }
    );
    });
}, 2000);

// إضافة الخرائط
function addMaps() {
    console.log('\n🗺️  إضافة الخرائط...');
    let mapsAdded = 0;

    sampleMaps.forEach((map, index) => {
        db.run(
            `INSERT INTO maps (name, description, width, height, difficulty)
             VALUES (?, ?, ?, ?, ?)`,
            [map.name, map.description, map.width, map.height, map.difficulty],
            (err) => {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        console.log(`⚠️  الخريطة ${map.name} موجودة بالفعل`);
                    } else {
                        console.log(`❌ خطأ في إضافة ${map.name}:`, err.message);
                    }
                } else {
                    console.log(`✅ ${map.name}`);
                    mapsAdded++;
                }

                // إنهاء العملية
                if (index === sampleMaps.length - 1) {
                    finalize(usersAdded, mapsAdded);
                }
            }
        );
    });
}

// إنهاء العملية
function finalize(usersAdded, mapsAdded) {
    console.log('\n' + '='.repeat(50));
    console.log('✅ تمت إضافة بيانات العينة بنجاح!');
    console.log(`   - تم إضافة ${usersAdded} مستخدمين`);
    console.log(`   - تم إضافة ${mapsAdded} خرائط`);
    console.log('\n📋 بيانات تجريبية للدخول:');
    console.log('   البريد: ahmed@example.com');
    console.log('   كلمة المرور: password123');
    console.log('='.repeat(50) + '\n');
    
    setTimeout(() => {
        db.close();
        process.exit(0);
    }, 1000);
}
