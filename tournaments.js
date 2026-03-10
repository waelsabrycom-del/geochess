const express = require('express');
const db = require('./database');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// دالة للتحقق من التوكن
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

// إنشاء بطولة وإرسال دعوات
router.post('/create-with-invitations', verifyToken, (req, res) => {
    try {
        const { tournamentName, prizes, startDate, endDate, participants, inviteUserIds } = req.body;
        const creatorId = req.userId;

        console.log('\n🎯 ===== طلب إنشاء بطولة جديدة =====');
        console.log('📝 البيانات المستلمة:', { tournamentName, prizes, startDate, endDate, participants, creatorId });

        if (!tournamentName || !startDate || !endDate) {
            console.error('❌ بيانات غير مكتملة');
            return res.status(400).json({ 
                success: false, 
                message: 'البيانات المطلوبة غير مكتملة' 
            });
        }

        // 🔍 التحقق من عدم وجود بطولة بنفس الاسم والتاريخ من نفس المدير
        const checkDuplicateSQL = `
            SELECT COUNT(*) as count FROM tournaments 
            WHERE creator_id = ? AND name = ? AND start_date = ? AND end_date = ?
        `;

        console.log('🔍 التحقق من وجود بطولة مكررة...');
        db.get(checkDuplicateSQL, [creatorId, tournamentName, startDate, endDate], (err, result) => {
            if (err) {
                console.error('❌ خطأ في التحقق من البطولات:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'فشل في التحقق من البطولات' 
                });
            }

            if (result && result.count > 0) {
                console.warn('⚠️ بطولة بنفس الاسم والتاريخ موجودة بالفعل');
                return res.status(400).json({ 
                    success: false, 
                    message: 'بطولة بنفس الاسم والتاريخ موجودة بالفعل. يرجى تغيير الاسم أو التاريخ' 
                });
            }

            proceedWithCreation();
        });

        function proceedWithCreation() {
            // إنشاء معرف فريد للبطولة (نفس النمط من العميل)
            const tournamentId = Date.now();

            // إدراج البطولة في قاعدة البيانات
            const insertTournamentSQL = `
                INSERT INTO tournaments (tournament_id, name, creator_id, start_date, end_date, max_participants, prizes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // تحديد حالة البطولة
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDateObj = new Date(startDate);
            const status = startDateObj <= today ? 'جارية' : 'قادمة';

            console.log(`💾 حفظ البطولة: tournament_id=${tournamentId}, status=${status}`);

            db.run(insertTournamentSQL, 
                [tournamentId, tournamentName, creatorId, startDate, endDate, participants || 16, prizes, status],
            (err) => {
                if (err) {
                    console.error('❌ خطأ في إدراج البطولة:', err.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'فشل في إنشاء البطولة: ' + err.message
                    });
                }

                console.log('✅ تم إنشاء البطولة بنجاح:', tournamentId);

                // إذا لم يكن هناك مستخدمين محددين، نحصل على جميع المستخدمين
                if (!inviteUserIds || inviteUserIds.length === 0) {
                    // جلب جميع المستخدمين ما عدا المنشئ
                    console.log('👥 جلب جميع المستخدمين...');
                    db.all(
                        'SELECT id, username, email, avatar_url FROM users WHERE id != ?',
                        [creatorId],
                        (err, users) => {
                            if (err) {
                                console.error('❌ خطأ في جلب المستخدمين:', err.message);
                                return res.status(500).json({ 
                                    success: false, 
                                    message: 'فشل في جلب المستخدمين: ' + err.message
                                });
                            }

                            console.log(`📋 عدد المستخدمين المسترجع: ${users ? users.length : 0}`);
                            console.log('👤 المستخدمون:', users);
                            
                            sendInvitations(users);
                        }
                    );
                } else {
                    // جلب المستخدمين المحددين فقط
                    console.log('👥 جلب المستخدمين المحددين...');
                    const placeholders = inviteUserIds.map(() => '?').join(',');
                    db.all(
                        `SELECT id, username, email, avatar_url FROM users WHERE id IN (${placeholders}) AND id != ?`,
                        [...inviteUserIds, creatorId],
                        (err, users) => {
                            if (err) {
                                console.error('❌ خطأ في جلب المستخدمين:', err.message);
                                return res.status(500).json({ 
                                    success: false, 
                                    message: 'فشل في جلب المستخدمين: ' + err.message
                                });
                            }

                            console.log(`📋 عدد المستخدمين المسترجع: ${users ? users.length : 0}`);
                            
                            sendInvitations(users);
                        }
                    );
                }

                function sendInvitations(users) {
                    console.log(`\n📧 ===== إرسال الدعوات =====`);
                    console.log(`المستخدمون المستقبلون: ${users ? users.length : 0}`);
                    
                    if (!users || users.length === 0) {
                        console.log('⚠️ لا توجد مستخدمون لإرسال دعوات لهم');
                        return res.status(200).json({ 
                            success: true, 
                            message: 'تم إنشاء البطولة بدون دعوات',
                            tournament: { id: tournamentId, name: tournamentName },
                            invitationsSent: 0
                        });
                    }

                    let invitationsSent = 0;
                    let invitationsCompleted = 0;

                    const insertInvitationSQL = `
                        INSERT INTO tournament_invitations 
                        (tournament_id, from_user_id, to_user_id, tournament_name, start_date, end_date, status)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending')
                    `;

                    users.forEach((user, index) => {
                        console.log(`👤 إرسال دعوة ${index + 1}/${users.length} إلى المستخدم ${user.id} (${user.username})`);
                        
                        db.run(insertInvitationSQL,
                            [tournamentId, creatorId, user.id, tournamentName, startDate, endDate],
                            (err) => {
                                invitationsCompleted++;

                                if (!err) {
                                    invitationsSent++;
                                    console.log(`   ✅ نجحت الدعوة لـ ${user.username}`);
                                } else {
                                    console.error(`   ❌ خطأ في إرسال دعوة لـ ${user.username}:`, err.message);
                                }

                                // التحقق من انتهاء جميع العمليات
                                if (invitationsCompleted === users.length) {
                                    console.log(`\n🎉 ===== انتهاء الإرسال =====`);
                                    console.log(`✅ تم إرسال ${invitationsSent} دعوة من أصل ${users.length}`);

                                    res.status(200).json({ 
                                        success: true, 
                                        message: `تم إنشاء البطولة وإرسال ${invitationsSent} دعوة بنجاح`,
                                        tournament: { 
                                            id: tournamentId, 
                                            name: tournamentName,
                                            startDate,
                                            endDate,
                                            status
                                        },
                                        invitationsSent
                                    });
                                }
                            }
                        );
                    });
                }
            }
        );
        } // end of proceedWithCreation

    } catch (error) {
        console.error('❌ خطأ في معالج البطولة:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في المعالج' 
        });
    }
});

// جلب دعوات البطولات للمستخدم الحالي
router.get('/my-invitations', verifyToken, (req, res) => {
    try {
        const userId = req.userId;
        // Support filtering by status: ?status=pending or ?status=accepted or show all (default)
        const statusFilter = req.query.status;

        console.log(`\n📬 ===== جلب دعوات البطولات =====`);
        console.log(`👤 معرف المستخدم: ${userId}`);
        console.log(`   نوع البيانات: ${typeof userId}`);
        console.log(`🔍 تصفية الحالة: ${statusFilter || 'الكل (pending + accepted)'}`);

        // Build dynamic query based on status filter
        let whereClause = `WHERE ti.to_user_id = ?`;
        const queryParams = [userId];

        if (statusFilter === 'pending') {
            whereClause += ` AND ti.status = 'pending'`;
        } else if (statusFilter === 'accepted') {
            whereClause += ` AND ti.status = 'accepted'`;
        } else {
            // Default: return both pending and accepted invitations
            whereClause += ` AND ti.status IN ('pending', 'accepted')`;
        }

        const query = `
            SELECT 
                ti.id,
                ti.tournament_id,
                ti.tournament_name,
                ti.from_user_id,
                ti.start_date,
                ti.end_date,
                ti.status,
                ti.created_at,
                ti.responded_at,
                u.username as from_username,
                u.avatar_url as from_avatar_url
            FROM tournament_invitations ti
            LEFT JOIN users u ON ti.from_user_id = u.id
            ${whereClause}
            ORDER BY 
                CASE WHEN ti.status = 'accepted' THEN 0 ELSE 1 END,
                ti.created_at DESC
        `;

        console.log('🔍 تنفيذ الاستعلام بقيمة userId:', userId);

        db.all(query, queryParams, (err, invitations) => {
            if (err) {
                console.error('❌ خطأ في جلب الدعوات:', err.message);
                console.error('📍 التفاصيل الكاملة:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'فشل في جلب الدعوات: ' + err.message
                });
            }

            console.log(`✅ تم جلب ${invitations.length} دعوة`);
            if (invitations.length > 0) {
                console.log('📋 البيانات المسترجعة:');
                invitations.forEach((inv, i) => {
                    const statusLabel = inv.status === 'accepted' ? '✅ مقبولة' : '⏳ قيد الانتظار';
                    console.log(`   ${i + 1}. من ${inv.from_username} (ID: ${inv.from_user_id}) - ${inv.tournament_name} - ${statusLabel}`);
                });
            } else {
                console.log('📭 لا توجد دعوات للمستخدم');
            }

            res.status(200).json({ 
                success: true, 
                invitations: invitations || [],
                count: invitations?.length || 0
            });
        });

    } catch (error) {
        console.error('❌ خطأ في معالج جلب الدعوات:', error.message);
        console.error('📍 التفاصيل الكاملة:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في المعالج: ' + error.message
        });
    }
});

// جلب البطولات التي أنشأها المستخدم الحالي
router.get('/my-created', verifyToken, (req, res) => {
    try {
        const userId = req.userId;

        const query = `
            SELECT
                tournament_id,
                name,
                creator_id,
                start_date,
                end_date,
                max_participants,
                prizes,
                status,
                created_at
            FROM tournaments
            WHERE creator_id = ?
            ORDER BY created_at DESC
        `;

        db.all(query, [userId], (err, tournaments) => {
            if (err) {
                console.error('❌ خطأ في جلب بطولات المستخدم المنشأة:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'فشل في جلب البطولات المنشأة'
                });
            }

            res.status(200).json({
                success: true,
                tournaments: tournaments || []
            });
        });
    } catch (error) {
        console.error('❌ خطأ غير متوقع في my-created:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ غير متوقع'
        });
    }
});

// الرد على دعوة بطولة
router.post('/respond-invitation', verifyToken, (req, res) => {
    try {
        const { invitationId, response } = req.body;
        const userId = req.userId;

        if (!invitationId || !response || !['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({ 
                success: false, 
                message: 'بيانات غير صحيحة' 
            });
        }

        console.log(`📬 الرد على الدعوة ${invitationId}:`, response);

        const updateQuery = `
            UPDATE tournament_invitations 
            SET status = ?, responded_at = CURRENT_TIMESTAMP
            WHERE id = ? AND to_user_id = ?
        `;

        db.run(updateQuery, [response, invitationId, userId], function(err) {
            if (err) {
                console.error('❌ خطأ في تحديث الدعوة:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'فشل في معالجة الرد' 
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'الدعوة غير موجودة أو لا تخصك' 
                });
            }

            console.log(`✅ تم تحديث الدعوة: ${response}`);

            res.status(200).json({ 
                success: true, 
                message: `تم ${response === 'accepted' ? 'قبول' : 'رفض'} الدعوة بنجاح`,
                response
            });
        });

    } catch (error) {
        console.error('❌ خطأ في معالج الرد:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في المعالج' 
        });
    }
});

// جلب قائمة المدعوين المعلقين لبطولة محددة (للمُنشئ فقط)
router.get('/:tournamentId/pending-invitees', verifyToken, (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.userId;

        // تحويل معرف البطولة إلى رقم
        const numericTournamentId = parseInt(tournamentId, 10);
        console.log(`🔍 جلب الدعوات المعلقة: tournamentId=${tournamentId}, numeric=${numericTournamentId}, userId=${userId}`);

        const tournamentQuery = `
            SELECT tournament_id, creator_id
            FROM tournaments
            WHERE tournament_id = ?
        `;

        db.get(tournamentQuery, [numericTournamentId], (err, tournament) => {
            if (err) {
                console.error('❌ خطأ في التحقق من البطولة:', err);
                return res.status(500).json({
                    success: false,
                    message: 'فشل في التحقق من البطولة'
                });
            }

            if (!tournament) {
                return res.status(404).json({
                    success: false,
                    message: 'البطولة غير موجودة'
                });
            }

            if (Number(tournament.creator_id) !== Number(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'غير مصرح لك بعرض الدعوات'
                });
            }

            const invitesQuery = `
                SELECT to_user_id
                FROM tournament_invitations
                WHERE tournament_id = ? AND status = 'pending'
            `;

            db.all(invitesQuery, [numericTournamentId], (invErr, rows) => {
                if (invErr) {
                    console.error('❌ خطأ في جلب الدعوات المعلقة:', invErr);
                    return res.status(500).json({
                        success: false,
                        message: 'فشل في جلب الدعوات المعلقة'
                    });
                }

                const inviteeIds = rows.map(row => row.to_user_id);
                return res.status(200).json({
                    success: true,
                    inviteeIds
                });
            });
        });
    } catch (error) {
        console.error('❌ خطأ في معالج الدعوات المعلقة:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في المعالج'
        });
    }
});

// جلب المشاركين في بطولة محددة (المدير + الدعوات المقبولة فقط)
router.get('/:tournamentId/participants', verifyToken, (req, res) => {
    try {
        const { tournamentId } = req.params;
        const numericTournamentId = parseInt(tournamentId, 10);

        if (!Number.isFinite(numericTournamentId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف البطولة غير صالح'
            });
        }

        const tournamentQuery = `
            SELECT t.tournament_id, t.creator_id, t.max_participants
            FROM tournaments t
            WHERE t.tournament_id = ?
        `;

        db.get(tournamentQuery, [numericTournamentId], (err, tournament) => {
            if (err) {
                console.error('❌ خطأ في جلب بيانات البطولة للمشاركين:', err);
                return res.status(500).json({
                    success: false,
                    message: 'فشل في جلب بيانات البطولة'
                });
            }

            if (!tournament) {
                return res.status(404).json({
                    success: false,
                    message: 'البطولة غير موجودة'
                });
            }

            const participantsQuery = `
                SELECT DISTINCT
                    u.id,
                    u.username,
                    u.avatar_url,
                    CASE WHEN u.id = ? THEN 1 ELSE 0 END AS is_creator,
                    0 AS is_online
                FROM users u
                WHERE u.id = ?
                UNION
                SELECT DISTINCT
                    u.id,
                    u.username,
                    u.avatar_url,
                    0 AS is_creator,
                    0 AS is_online
                FROM tournament_invitations ti
                INNER JOIN users u ON u.id = ti.to_user_id
                WHERE ti.tournament_id = ? AND ti.status = 'accepted'
            `;

            db.all(
                participantsQuery,
                [Number(tournament.creator_id), Number(tournament.creator_id), numericTournamentId],
                (participantsErr, participantsRows) => {
                    if (participantsErr) {
                        console.error('❌ خطأ في جلب المشاركين:', participantsErr);
                        return res.status(500).json({
                            success: false,
                            message: 'فشل في جلب المشاركين'
                        });
                    }

                    const participants = Array.isArray(participantsRows) ? participantsRows : [];
                    const participantCount = participants.length;

                    return res.status(200).json({
                        success: true,
                        participants,
                        participantCount,
                        maxParticipants: tournament.max_participants || 64
                    });
                }
            );
        });
    } catch (error) {
        console.error('❌ خطأ في معالج جلب المشاركين:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في المعالج'
        });
    }
});

// حذف بطولة (للمدير المنشئ فقط)
router.delete('/:tournamentId', verifyToken, (req, res) => {
    try {
        const { tournamentId } = req.params;
        const numericTournamentId = parseInt(tournamentId, 10);
        const userId = req.userId;

        if (!Number.isFinite(numericTournamentId)) {
            return res.status(400).json({
                success: false,
                message: 'معرف البطولة غير صالح'
            });
        }

        db.get(
            `SELECT tournament_id, creator_id, name FROM tournaments WHERE tournament_id = ?`,
            [numericTournamentId],
            (err, tournament) => {
                if (err) {
                    console.error('❌ خطأ في التحقق من البطولة قبل الحذف:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'فشل في التحقق من البطولة'
                    });
                }

                if (!tournament) {
                    return res.status(404).json({
                        success: false,
                        message: 'البطولة غير موجودة'
                    });
                }

                if (Number(tournament.creator_id) !== Number(userId)) {
                    return res.status(403).json({
                        success: false,
                        message: 'غير مصرح لك بحذف هذه البطولة'
                    });
                }

                db.serialize(() => {
                    db.run(
                        `DELETE FROM tournament_results WHERE tournament_id = ?`,
                        [numericTournamentId],
                        (resultsErr) => {
                            if (resultsErr) {
                                console.error('❌ خطأ في حذف نتائج البطولة:', resultsErr);
                            }
                        }
                    );

                    db.run(
                        `DELETE FROM tournament_chat_messages WHERE tournament_id = ?`,
                        [numericTournamentId],
                        (chatErr) => {
                            if (chatErr) {
                                console.error('❌ خطأ في حذف شات البطولة:', chatErr);
                            }
                        }
                    );

                    db.run(
                        `DELETE FROM tournament_invitations WHERE tournament_id = ?`,
                        [numericTournamentId],
                        (invErr) => {
                            if (invErr) {
                                console.error('❌ خطأ في حذف دعوات البطولة:', invErr);
                            }
                        }
                    );

                    db.run(
                        `DELETE FROM tournaments WHERE tournament_id = ?`,
                        [numericTournamentId],
                        function(deleteErr) {
                            if (deleteErr) {
                                console.error('❌ خطأ في حذف البطولة:', deleteErr);
                                return res.status(500).json({
                                    success: false,
                                    message: 'فشل في حذف البطولة'
                                });
                            }

                            if (this.changes === 0) {
                                return res.status(404).json({
                                    success: false,
                                    message: 'البطولة غير موجودة'
                                });
                            }

                            return res.status(200).json({
                                success: true,
                                message: `تم حذف البطولة "${tournament.name}" بنجاح`
                            });
                        }
                    );
                });
            }
        );
    } catch (error) {
        console.error('❌ خطأ في معالج حذف البطولة:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في المعالج'
        });
    }
});

// جلب معلومات بطولة معينة
router.get('/:tournamentId', (req, res) => {
    try {
        const { tournamentId } = req.params;
        const numericTournamentId = parseInt(tournamentId, 10);

        const query = `
            SELECT * FROM tournaments WHERE tournament_id = ?
        `;

        db.get(query, [numericTournamentId], (err, tournament) => {
            if (err) {
                console.error('❌ خطأ في جلب البطولة:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'فشل في جلب البطولة' 
                });
            }

            if (!tournament) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'البطولة غير موجودة' 
                });
            }

            res.status(200).json({ 
                success: true, 
                tournament 
            });
        });

    } catch (error) {
        console.error('❌ خطأ في جلب البطولة:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في المعالج' 
        });
    }
});

module.exports = router;
