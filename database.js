const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// تحديد مسار قاعدة البيانات
const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'chess_game.db');

// التأكد من وجود مجلد قاعدة البيانات
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// إنشاء أو فتح قاعدة البيانات مع إعدادات آمنة
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err);
        process.exit(1);
    } else {
        console.log('✓ تم الاتصال بقاعدة البيانات بنجاح');
        
        // تفعيل Foreign Keys
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) console.error('❌ خطأ في تفعيل Foreign Keys:', err);
        });
        
        // تفعيل WAL mode لتحسين الأداء والاستقرار
        db.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) console.error('❌ خطأ في تفعيل WAL:', err);
            else console.log('✓ تم تفعيل وضع WAL');
        });
        
        // تحديد حجم الكاش
        db.run('PRAGMA cache_size = 10000', (err) => {
            if (err) console.error('❌ خطأ في تحديد حجم الكاش:', err);
        });
        
        // تعيين timeout للقفل
        db.configure('busyTimeout', 5000);
        
        initializeDatabase();
    }
});

// معالج الأخطاء للاتصال
db.on('error', (err) => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
});

// دالة لإنشاء الجداول
function initializeDatabase() {
    db.serialize(() => {
        let tablesCreated = 0;
        const totalTables = 16; // زيادة لإضافة جداول البطولات ونتائج البطولات وشات البطولات

        function checkCompletion() {
            tablesCreated++;
            if (tablesCreated === totalTables) {
                console.log('✓ تم إنشاء جميع الجداول بنجاح');
            }
        }

        // جدول المستخدمين
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                avatar_url TEXT,
                level INTEGER DEFAULT 1,
                experience_points INTEGER DEFAULT 0,
                rank TEXT DEFAULT 'مبتدئ',
                global_rank INTEGER,
                league TEXT,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                total_games INTEGER DEFAULT 0,
                user_type TEXT DEFAULT 'player',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول المستخدمين:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول المستخدمين');
            }
            
            // إضافة حقل user_type إلى جدول المستخدمين القائم (إذا لم يكن موجوداً)
            db.run(`
                ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'player'
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('❌ خطأ في إضافة حقل user_type:', err);
                } else if (!err) {
                    console.log('✓ تم إضافة حقل user_type');
                }

                // إضافة حقل reserve_army إلى جدول المستخدمين القائم (إذا لم يكن موجوداً)
                db.run(`
                    ALTER TABLE users ADD COLUMN reserve_army INTEGER DEFAULT 0
                `, (reserveErr) => {
                    if (reserveErr && !reserveErr.message.includes('duplicate column')) {
                        console.error('❌ خطأ في إضافة حقل reserve_army:', reserveErr);
                    } else if (!reserveErr) {
                        console.log('✓ تم إضافة حقل reserve_army');
                    }
                    checkCompletion();
                });
            });
        });

        // جدول المباريات
        db.run(`
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_name TEXT NOT NULL,
                host_id INTEGER NOT NULL,
                opponent_id INTEGER,
                map_name TEXT NOT NULL,
                map_size TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'waiting',
                game_mode TEXT DEFAULT 'pvp',
                game_settings TEXT,
                guest_kicked BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                ended_at DATETIME,
                winner_id INTEGER,
                FOREIGN KEY (host_id) REFERENCES users(id),
                FOREIGN KEY (opponent_id) REFERENCES users(id),
                FOREIGN KEY (winner_id) REFERENCES users(id),
                UNIQUE(host_id, game_name)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول المباريات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول المباريات');
            }
            checkCompletion();
        });

        // جدول المشاركين في المباريات
        db.run(`
            CREATE TABLE IF NOT EXISTS game_players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                player_side TEXT DEFAULT 'white',
                is_ready BOOLEAN DEFAULT 0,
                army_deployed BOOLEAN DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول المشاركين:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول المشاركين');
            }
            checkCompletion();
        });

        // جدول الخرائط المتاحة
        db.run(`
            CREATE TABLE IF NOT EXISTS maps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                width INTEGER,
                height INTEGER,
                difficulty TEXT DEFAULT 'medium',
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول الخرائط:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول الخرائط');
            }
            checkCompletion();
        });

        // جدول الأصدقاء
        db.run(`
            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (friend_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول الأصدقاء:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول الأصدقاء');
            }
            checkCompletion();
        });

        // جدول سجل المعارك
        db.run(`
            CREATE TABLE IF NOT EXISTS battle_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                opponent_id INTEGER NOT NULL,
                result TEXT,
                map_name TEXT,
                duration INTEGER,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (opponent_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول سجل المعارك:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول سجل المعارك');
            }
            checkCompletion();
        });

        // جدول الإنجازات
        db.run(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_name TEXT NOT NULL,
                description TEXT,
                icon_url TEXT,
                earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول الإنجازات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول الإنجازات');
            }
            checkCompletion();
        });

        // جدول جلسات المستخدمين
        db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول الجلسات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول الجلسات');
            }
            checkCompletion();
        });

        // جدول دعوات الانضمام للمباريات
        db.run(`
            CREATE TABLE IF NOT EXISTS game_invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                from_user_id INTEGER NOT NULL,
                to_user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                responded_at DATETIME,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (from_user_id) REFERENCES users(id),
                FOREIGN KEY (to_user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول الدعوات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول الدعوات');
            }
            checkCompletion();
        });

        // جدول الرسائل بين الأصدقاء
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT NOT NULL,
                sender_id INTEGER NOT NULL,
                recipient_ids TEXT NOT NULL,
                message_text TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                is_group_chat INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_status TEXT DEFAULT 'unread',
                FOREIGN KEY (sender_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول الرسائل:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول الرسائل');
            }
            checkCompletion();
        });

        // جدول محادثات المجموعات
        db.run(`
            CREATE TABLE IF NOT EXISTS group_chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT UNIQUE NOT NULL,
                group_name TEXT NOT NULL,
                creator_id INTEGER NOT NULL,
                member_ids TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creator_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول محادثات المجموعات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول محادثات المجموعات');
            }
            checkCompletion();
        });

        // جدول القطع الموزعة على الخريطة
        db.run(`
            CREATE TABLE IF NOT EXISTS game_pieces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                piece_name TEXT NOT NULL,
                piece_type TEXT NOT NULL,
                row INTEGER NOT NULL,
                col INTEGER NOT NULL,
                color TEXT NOT NULL,
                player_number INTEGER NOT NULL,
                html_content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول القطع:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول القطع');
            }
            checkCompletion();
        });

        // جدول البطولات
        db.run(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                creator_id INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                max_participants INTEGER DEFAULT 16,
                prizes TEXT,
                status TEXT DEFAULT 'قادمة',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creator_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول البطولات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول البطولات');
            }
            checkCompletion();
        });

        // جدول دعوات البطولات
        db.run(`
            CREATE TABLE IF NOT EXISTS tournament_invitations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                from_user_id INTEGER NOT NULL,
                to_user_id INTEGER NOT NULL,
                tournament_name TEXT NOT NULL,
                start_date DATE,
                end_date DATE,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                responded_at DATETIME,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id),
                FOREIGN KEY (from_user_id) REFERENCES users(id),
                FOREIGN KEY (to_user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول دعوات البطولات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول دعوات البطولات');
            }
            checkCompletion();
        });

        // 🆕 جدول إحصائيات اللاعبين (player_statistics)
        db.run(`
            CREATE TABLE IF NOT EXISTS player_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                opponent_name TEXT NOT NULL,
                player_role TEXT NOT NULL,
                result TEXT,
                battle_name TEXT,
                map_name TEXT,
                location_size INTEGER DEFAULT 0,
                match_duration INTEGER DEFAULT 0,
                pieces_killed INTEGER DEFAULT 0,
                moves_count INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول إحصائيات اللاعبين:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول إحصائيات اللاعبين');
            }
            checkCompletion();
        });

        // 🆕 جدول نتائج مباريات البطولات (tournament_results)
        db.run(`
            CREATE TABLE IF NOT EXISTS tournament_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id TEXT NOT NULL,
                match_number INTEGER NOT NULL,
                game_id TEXT,
                winner_id INTEGER NOT NULL,
                loser_id INTEGER NOT NULL,
                winner_name TEXT NOT NULL,
                loser_name TEXT NOT NULL,
                winner_role TEXT NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (winner_id) REFERENCES users(id),
                FOREIGN KEY (loser_id) REFERENCES users(id),
                UNIQUE(tournament_id, match_number)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول نتائج البطولات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول نتائج البطولات');
            }
            checkCompletion();
        });

        // 🆕 جدول رسائل شات البطولات (tournament_chat_messages)
        db.run(`
            CREATE TABLE IF NOT EXISTS tournament_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                message TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء جدول رسائل شات البطولات:', err);
            } else if (!err) {
                console.log('✓ تم إنشاء جدول رسائل شات البطولات');
            }
            checkCompletion();
        });

        // إنشاء فهرس على game_id لتحسين أداء جلب الرسائل
        db.run(`
            CREATE INDEX IF NOT EXISTS idx_tournament_chat_game_id 
            ON tournament_chat_messages(game_id)
        `, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ خطأ في إنشاء فهرس الشات:', err);
            }
        });

        // إضافة الأعمدة الجديدة لحفظ بيانات المعركة (بدون تأخير إجباري)
        const newColumns = [
            { name: 'host_name', type: 'TEXT' },
            { name: 'host_color', type: 'TEXT' },
            { name: 'guest_name', type: 'TEXT' },
            { name: 'guest_color', type: 'TEXT' },
            { name: 'admin_id', type: 'INTEGER' },
            { name: 'admin_name', type: 'TEXT' },
            { name: 'placed_units_count', type: 'INTEGER DEFAULT 0' },
            { name: 'placed_units_data', type: 'TEXT' },
            { name: 'unit_counts_data', type: 'TEXT' },
            { name: 'last_saved_at', type: 'DATETIME' }
        ];

        db.all('PRAGMA table_info(games)', (tableInfoErr, rows) => {
            if (tableInfoErr) {
                console.error('❌ خطأ في قراءة أعمدة جدول games:', tableInfoErr.message);
                return;
            }

            const existingColumns = new Set((rows || []).map((row) => row.name));

            newColumns.forEach((column) => {
                if (existingColumns.has(column.name)) {
                    return;
                }

                db.run(
                    `ALTER TABLE games ADD COLUMN ${column.name} ${column.type}`,
                    (err) => {
                        if (err) {
                            console.error(`❌ خطأ في إضافة عمود ${column.name}:`, err.message);
                        } else {
                            console.log(`✓ تم إضافة عمود ${column.name}`);
                        }
                    }
                );
            });
        });
    });
}

module.exports = db;
