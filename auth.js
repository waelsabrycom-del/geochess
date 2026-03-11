const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isPostgresEnabled, query: pgQuery } = require('./services/postgres-service');
const redisService = require('./services/redis-service');
const router = express.Router();

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads', 'avatars');
        // إنشاء المجلد إذا لم يكن موجوداً
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('يُسمح فقط بالصور (jpg, jpeg, png, gif, webp)'));
        }
    }
});

// استخدام متغيرات البيئة
require('dotenv').config();
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-key-not-for-production';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// دالة مساعدة للتحقق من التوكن
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'لا توجد صلاحية' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'توكن غير صحيح' });
        }

        (async () => {
            try {
                const redisUserId = await redisService.getSessionUserId(token);
                if (redisUserId && redisUserId === decoded.id) {
                    req.userId = decoded.id;
                    return next();
                }

                if (isPostgresEnabled) {
                    const result = await pgQuery(
                        `SELECT id FROM sessions WHERE token = $1 AND user_id = $2 AND expires_at > NOW() LIMIT 1`,
                        [token, decoded.id]
                    );
                    if (result.rows.length === 0) {
                        return res.status(401).json({ success: false, message: 'انتهت الجلسة، يرجى إعادة الدخول' });
                    }
                    req.userId = decoded.id;
                    return next();
                }

                // fallback على SQLite
                db.get(
                    `SELECT id FROM sessions WHERE token = ? AND user_id = ? AND expires_at > datetime('now')`,
                    [token, decoded.id],
                    (dbErr, session) => {
                        if (dbErr || !session) {
                            return res.status(401).json({ success: false, message: 'انتهت الجلسة، يرجى إعادة الدخول' });
                        }
                        req.userId = decoded.id;
                        next();
                    }
                );
            } catch (sessionErr) {
                console.error('Session verification error:', sessionErr.message);
                return res.status(401).json({ success: false, message: 'انتهت الجلسة، يرجى إعادة الدخول' });
            }
        })();
    });
}

// API للتسجيل
router.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword, userType } = req.body;

    // التحقق من البيانات
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'جميع الحقول مطلوبة' 
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'كلمات المرور غير متطابقة' 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
        });
    }

    // السماح بنوعي المستخدم: لاعب أو مدير (المدير ليس سوبر أدمن - يمكن أن يوجد أكثر من مدير)
    const allowedTypes = ['player', 'admin'];
    const finalUserType = allowedTypes.includes(userType) ? userType : 'player';

    // تشفير كلمة المرور
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        if (isPostgresEnabled) {
            const inserted = await pgQuery(
                `INSERT INTO users (username, email, password, user_type) VALUES ($1, $2, $3, $4) RETURNING id`,
                [username, email, hashedPassword, finalUserType]
            );
            const userId = inserted.rows[0].id;
            const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
            await pgQuery(
                `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
                [userId, token]
            );
            await redisService.setSession(token, userId, SESSION_TTL_SECONDS);

            return res.status(201).json({
                success: true,
                message: 'تم التسجيل بنجاح',
                user: { id: userId, username, email, user_type: finalUserType },
                token
            });
        }
    } catch (err) {
        if (String(err.message || '').toLowerCase().includes('duplicate') || String(err.code || '') === '23505') {
            return res.status(409).json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
        }
        return res.status(500).json({ success: false, message: 'خطأ في التسجيل' });
    }

    // fallback على SQLite
    db.run(
        `INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, finalUserType],
        async function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
                }
                return res.status(500).json({ success: false, message: 'خطأ في التسجيل' });
            }

            const userId = this.lastID;
            const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

            db.run(
                `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`,
                [userId, token],
                async () => {
                    await redisService.setSession(token, userId, SESSION_TTL_SECONDS);
                    res.status(201).json({
                        success: true,
                        message: 'تم التسجيل بنجاح',
                        user: { id: userId, username, email, user_type: finalUserType },
                        token
                    });
                }
            );
        }
    );
});

// API للدخول
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // التحقق من البيانات
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'البريد الإلكتروني وكلمة المرور مطلوبة' 
        });
    }

    if (isPostgresEnabled) {
        try {
            const result = await pgQuery(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]);
            const user = result.rows[0];
            if (!user) {
                return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            const isPasswordValid = bcrypt.compareSync(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
            await pgQuery(
                `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
                [user.id, token]
            );
            await redisService.setSession(token, user.id, SESSION_TTL_SECONDS);

            return res.json({
                success: true,
                message: 'تم الدخول بنجاح',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    level: user.level,
                    reserve_army: user.reserve_army ?? 0,
                    experience_points: user.experience_points,
                    rank: user.rank,
                    global_rank: user.global_rank,
                    league: user.league,
                    wins: user.wins,
                    losses: user.losses,
                    total_games: user.total_games,
                    user_type: user.user_type || 'player'
                },
                token
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        }
    }

    // fallback على SQLite
    db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
            if (!user) {
                return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            const isPasswordValid = bcrypt.compareSync(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

            db.run(
                `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`,
                [user.id, token],
                async (sessionErr) => {
                    if (sessionErr) {
                        return res.status(500).json({ success: false, message: 'خطأ في إنشاء الجلسة' });
                    }

                    await redisService.setSession(token, user.id, SESSION_TTL_SECONDS);
                    res.json({
                        success: true,
                        message: 'تم الدخول بنجاح',
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            level: user.level,
                            reserve_army: user.reserve_army ?? 0,
                            experience_points: user.experience_points,
                            rank: user.rank,
                            global_rank: user.global_rank,
                            league: user.league,
                            wins: user.wins,
                            losses: user.losses,
                            total_games: user.total_games,
                            user_type: user.user_type || 'player'
                        },
                        token
                    });
                }
            );
        }
    );
});

// API للحصول على بيانات المستخدم
router.get('/profile', verifyToken, async (req, res) => {
    if (isPostgresEnabled) {
        try {
            const result = await pgQuery(
                `SELECT id, username, email, level, reserve_army, experience_points, rank, global_rank, league, wins, losses, total_games, avatar_url, user_type FROM users WHERE id = $1 LIMIT 1`,
                [req.userId]
            );
            const user = result.rows[0];
            if (!user) {
                return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
            }
            return res.json({ success: true, user });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
        }
    }

    db.get(
        `SELECT id, username, email, level, reserve_army, experience_points, rank, global_rank, league, wins, losses, total_games, avatar_url, user_type FROM users WHERE id = ?`,
        [req.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'خطأ في الخادم' 
                });
            }

            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'المستخدم غير موجود' 
                });
            }

            res.json({
                success: true,
                user: user
            });
        }
    );
});

// API لتحديث جيش الاحتياط الخاص بالمستخدم
router.post('/reserve-army', verifyToken, (req, res) => {
    const parsedValue = parseInt(req.body?.reserveArmy, 10);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return res.status(400).json({
            success: false,
            message: 'قيمة جيش الاحتياط غير صالحة'
        });
    }

    db.run(
        `UPDATE users SET reserve_army = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [parsedValue, req.userId],
        function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'تعذر تحديث جيش الاحتياط'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود'
                });
            }

            res.json({
                success: true,
                reserve_army: parsedValue
            });
        }
    );
});

// API لتحويل قوات (جيش احتياط) لصديق
router.post('/transfer-troops', verifyToken, (req, res) => {
    const senderId = req.userId;
    const friendId = parseInt(req.body?.friendId, 10);
    const amount = parseInt(req.body?.amount, 10);

    if (!Number.isFinite(friendId) || friendId <= 0) {
        return res.status(400).json({ success: false, message: 'معرّف الصديق غير صالح' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'عدد الجنود غير صالح' });
    }
    if (senderId === friendId) {
        return res.status(400).json({ success: false, message: 'لا يمكنك إرسال قوات لنفسك' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get('SELECT reserve_army FROM users WHERE id = ?', [senderId], (err, sender) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
            if (!sender) {
                db.run('ROLLBACK');
                return res.status(404).json({ success: false, message: 'المرسل غير موجود' });
            }

            const senderReserve = sender.reserve_army ?? 0;
            if (amount > senderReserve) {
                db.run('ROLLBACK');
                return res.status(400).json({ success: false, message: 'رصيد جيش الاحتياط غير كافٍ' });
            }

            db.get('SELECT reserve_army FROM users WHERE id = ?', [friendId], (err, friend) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
                }
                if (!friend) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ success: false, message: 'الصديق غير موجود' });
                }

                const newSenderReserve = senderReserve - amount;
                const newFriendReserve = (friend.reserve_army ?? 0) + amount;

                db.run('UPDATE users SET reserve_army = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newSenderReserve, senderId], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ success: false, message: 'فشل تحديث رصيد المرسل' });
                    }

                    db.run('UPDATE users SET reserve_army = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [newFriendReserve, friendId], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ success: false, message: 'فشل تحديث رصيد الصديق' });
                        }

                        db.run('COMMIT');
                        res.json({
                            success: true,
                            senderReserve: newSenderReserve,
                            friendReserve: newFriendReserve,
                            message: `تم إرسال ${amount} جندي بنجاح`
                        });
                    });
                });
            });
        });
    });
});

// API للخروج
router.post('/logout', verifyToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    await redisService.deleteSession(token);

    if (isPostgresEnabled) {
        try {
            await pgQuery(`DELETE FROM sessions WHERE token = $1`, [token]);
            return res.json({ success: true, message: 'تم الخروج بنجاح' });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'خطأ في الخروج' });
        }
    }

    db.run(
        `DELETE FROM sessions WHERE token = ?`,
        [token],
        (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'خطأ في الخروج' 
                });
            }

            res.json({
                success: true,
                message: 'تم الخروج بنجاح'
            });
        }
    );
});

// API لتحديث الصورة الشخصية
router.post('/update-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'لم يتم رفع أي ملف'
        });
    }

    const userId = req.userId;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    if (isPostgresEnabled) {
        try {
            const updateResult = await pgQuery(
                `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
                [avatarPath, userId]
            );

            if ((updateResult.rowCount || 0) === 0) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('خطأ في حذف الملف:', unlinkErr);
                });
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود في PostgreSQL'
                });
            }

            return res.json({
                success: true,
                message: 'تم تحديث الصورة بنجاح',
                avatar: avatarPath
            });
        } catch (err) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('خطأ في حذف الملف:', unlinkErr);
            });
            return res.status(500).json({
                success: false,
                message: 'خطأ في تحديث الصورة'
            });
        }
    }

    // تحديث قاعدة البيانات
    db.run(
        `UPDATE users SET avatar_url = ? WHERE id = ?`,
        [avatarPath, userId],
        function(err) {
            if (err) {
                // حذف الملف المرفوع في حالة الخطأ
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('خطأ في حذف الملف:', unlinkErr);
                });
                
                return res.status(500).json({
                    success: false,
                    message: 'خطأ في تحديث الصورة'
                });
            }

            if ((this.changes || 0) === 0) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('خطأ في حذف الملف:', unlinkErr);
                });
                return res.status(404).json({
                    success: false,
                    message: 'المستخدم غير موجود في SQLite'
                });
            }

            res.json({
                success: true,
                message: 'تم تحديث الصورة بنجاح',
                avatar: avatarPath
            });
        }
    );
});

// API لجلب قائمة جميع المستخدمين
router.get('/users', verifyToken, async (req, res) => {
    if (isPostgresEnabled) {
        try {
            const result = await pgQuery('SELECT id, username, email, avatar_url FROM users ORDER BY username');
            return res.json({
                success: true,
                users: result.rows || []
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'خطأ في جلب المستخدمين'
            });
        }
    }

    db.all(
        'SELECT id, username, email, avatar_url FROM users ORDER BY username',
        [],
        (err, users) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'خطأ في جلب المستخدمين'
                });
            }

            res.json({
                success: true,
                users: users || []
            });
        }
    );
});

module.exports = router;
