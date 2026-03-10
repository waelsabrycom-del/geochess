const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
        req.userId = decoded.id;
        next();
    });
}

// API للتسجيل
router.post('/register', (req, res) => {
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

    // التحقق من نوع المستخدم - لا يسمح بتسجيل admin من الواجهة العامة
    const finalUserType = 'player';

    // تشفير كلمة المرور
    const hashedPassword = bcrypt.hashSync(password, 10);

    // إدراج المستخدم في قاعدة البيانات
    db.run(
        `INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, finalUserType],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ 
                        success: false, 
                        message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' 
                    });
                }
                return res.status(500).json({ 
                    success: false, 
                    message: 'خطأ في التسجيل' 
                });
            }

            const userId = this.lastID;
            
            // إنشاء توكن
            const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

            res.status(201).json({
                success: true,
                message: 'تم التسجيل بنجاح',
                user: {
                    id: userId,
                    username: username,
                    email: email,
                    user_type: finalUserType
                },
                token: token
            });
        }
    );
});

// API للدخول
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // التحقق من البيانات
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'البريد الإلكتروني وكلمة المرور مطلوبة' 
        });
    }

    // البحث عن المستخدم
    db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, user) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'خطأ في الخادم' 
                });
            }

            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
                });
            }

            // التحقق من كلمة المرور
            const isPasswordValid = bcrypt.compareSync(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
                });
            }

            // إنشاء توكن
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

            // حفظ الجلسة
            db.run(
                `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`,
                [user.id, token],
                (err) => {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'خطأ في إنشاء الجلسة' 
                        });
                    }

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
                        token: token
                    });
                }
            );
        }
    );
});

// API للحصول على بيانات المستخدم
router.get('/profile', verifyToken, (req, res) => {
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
router.post('/logout', verifyToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

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
router.post('/update-avatar', verifyToken, upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'لم يتم رفع أي ملف'
        });
    }

    const userId = req.userId;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

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

            res.json({
                success: true,
                message: 'تم تحديث الصورة بنجاح',
                avatar: avatarPath
            });
        }
    );
});

// API لجلب قائمة جميع المستخدمين
router.get('/users', verifyToken, (req, res) => {
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
