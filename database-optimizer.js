#!/usr/bin/env node

/**
 * أداة تحسين أداء قاعدة البيانات
 * تقوم بتنظيف وتحسين قاعدة البيانات
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'chess_game.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err);
        process.exit(1);
    } else {
        console.log('✓ تم الاتصال بقاعدة البيانات\n');
        optimizeDatabase();
    }
});

function optimizeDatabase() {
    console.log('🔧 بدء تحسين أداء قاعدة البيانات...\n');
    
    db.serialize(() => {
        // 1. تحليل سلامة قاعدة البيانات
        console.log('📋 1. التحقق من سلامة قاعدة البيانات...');
        db.all('PRAGMA integrity_check', (err, rows) => {
            if (err) {
                console.error('❌ خطأ:', err);
            } else {
                if (rows[0].integrity_check === 'ok') {
                    console.log('✓ قاعدة البيانات سليمة');
                } else {
                    console.log('⚠️  توجد مشاكل:', rows[0].integrity_check);
                }
            }
        });
        
        // 2. تحسين قاعدة البيانات
        console.log('\n📋 2. تحسين قاعدة البيانات (VACUUM)...');
        db.run('VACUUM', (err) => {
            if (err) {
                console.error('❌ خطأ:', err);
            } else {
                console.log('✓ تم تحسين قاعدة البيانات بنجاح');
            }
        });
        
        // 3. تنظيف الجلسات المنتهية
        console.log('\n📋 3. تنظيف الجلسات المنتهية...');
        db.run('DELETE FROM sessions WHERE expires_at < datetime("now")', function(err) {
            if (err) {
                console.error('❌ خطأ:', err);
            } else {
                console.log(`✓ تم حذف ${this.changes} جلسة منتهية الصلاحية`);
            }
        });
        
        // 4. تنظيف المباريات المنتهية القديمة (أكثر من 90 يوم)
        console.log('\n📋 4. تنظيف المباريات القديمة (أكثر من 90 يوم)...');
        db.run(
            'DELETE FROM games WHERE status = "finished" AND ended_at < datetime("now", "-90 days")',
            function(err) {
                if (err) {
                    console.error('❌ خطأ:', err);
                } else {
                    console.log(`✓ تم حذف ${this.changes} مباراة قديمة`);
                }
            }
        );
        
        // 5. إصلاح الألعاب المعلقة (بدون opponent)
        console.log('\n📋 5. إصلاح الألعاب المعلقة...');
        db.run(
            'UPDATE games SET status = "abandoned" WHERE status = "waiting" AND created_at < datetime("now", "-24 hours") AND opponent_id IS NULL',
            function(err) {
                if (err) {
                    console.error('❌ خطأ:', err);
                } else {
                    console.log(`✓ تم تحديث ${this.changes} لعبة معلقة إلى "مهجورة"`);
                }
            }
        );
        
        // 6. إحصائيات قاعدة البيانات
        console.log('\n📋 6. إحصائيات قاعدة البيانات:\n');
        
        db.all(
            'SELECT COUNT(*) as count FROM users',
            (err, rows) => {
                if (!err) console.log(`👥 عدد المستخدمين: ${rows[0].count}`);
            }
        );
        
        db.all(
            'SELECT COUNT(*) as count FROM games',
            (err, rows) => {
                if (!err) console.log(`🎮 عدد المباريات: ${rows[0].count}`);
            }
        );
        
        db.all(
            'SELECT COUNT(*) as count FROM games WHERE status = "waiting"',
            (err, rows) => {
                if (!err) console.log(`⏳ المباريات في الانتظار: ${rows[0].count}`);
            }
        );
        
        db.all(
            'SELECT COUNT(*) as count FROM games WHERE status = "finished"',
            (err, rows) => {
                if (!err) console.log(`✓ المباريات المنتهية: ${rows[0].count}`);
            }
        );
        
        db.all(
            'SELECT COUNT(*) as count FROM sessions',
            (err, rows) => {
                if (!err) console.log(`🔑 الجلسات النشطة: ${rows[0].count}`);
            }
        );
        
        // 7. معلومات حجم قاعدة البيانات
        console.log('\n📋 7. معلومات حجم قاعدة البيانات:');
        db.all(
            'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',
            (err, rows) => {
                if (!err) {
                    const sizeInMB = (rows[0].size / 1024 / 1024).toFixed(2);
                    console.log(`💾 حجم قاعدة البيانات: ${sizeInMB} MB`);
                }
            }
        );
        
        // 8. تفعيل المفاتيح الأجنبية
        console.log('\n📋 8. تفعيل المفاتيح الأجنبية...');
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('❌ خطأ:', err);
            } else {
                console.log('✓ تم تفعيل المفاتيح الأجنبية');
            }
        });
        
        // إغلاق قاعدة البيانات بعد 3 ثواني
        setTimeout(() => {
            console.log('\n✅ اكتمل تحسين الأداء!');
            db.close(() => {
                console.log('✓ تم إغلاق قاعدة البيانات');
                process.exit(0);
            });
        }, 3000);
    });
}

// معالج الأخطاء
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ:', err);
    process.exit(1);
});
