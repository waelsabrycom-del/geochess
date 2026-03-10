#!/usr/bin/env node

/**
 * ملف اختبار بسيط للتحقق من سلامة النظام
 * استخدم: node test.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('\n🧪 بدء اختبار النظام...\n');

// 1. اختبار وجود الملفات المهمة
console.log('📝 فحص الملفات المطلوبة...');
const requiredFiles = [
    'package.json',
    'server.js',
    'database.js',
    'auth.js',
    'إنشاء حساب جديد.html',
    'ملف اللاعب الشخصي.html'
];

let filesOk = true;
requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) filesOk = false;
});

if (!filesOk) {
    console.log('\n❌ بعض الملفات المطلوبة غير موجودة');
    process.exit(1);
}

// 2. اختبار قاعدة البيانات
console.log('\n🗄️  فحص قاعدة البيانات...');

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
    console.log('  ✅ تم إنشاء مجلد database');
}

const dbPath = path.join(dbDir, 'chess_game.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('  ❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    }
    console.log('  ✅ تم الاتصال بقاعدة البيانات');

    // اختبار الجداول
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.log('  ❌ خطأ في قراءة الجداول:', err.message);
            db.close();
            process.exit(1);
        }

        console.log('\n📊 الجداول الموجودة:');
        const expectedTables = [
            'users',
            'games',
            'game_players',
            'maps',
            'friends',
            'battle_history',
            'achievements',
            'sessions'
        ];

        if (tables && tables.length > 0) {
            tables.forEach(t => {
                const exists = expectedTables.includes(t.name);
                console.log(`  ${exists ? '✅' : '⚠️'} ${t.name}`);
            });
        } else {
            console.log('  ⚠️  لا توجد جداول بعد. سيتم إنشاؤها عند بدء الخادم.');
        }

        // 3. اختبار المكتبات المطلوبة
        console.log('\n📦 فحص المكتبات المطلوبة...');
        
        const requiredPackages = [
            'express',
            'sqlite3',
            'bcryptjs',
            'jsonwebtoken',
            'cors'
        ];

        let packagesOk = true;
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));
        
        requiredPackages.forEach(pkg => {
            const exists = !!packageJson.dependencies[pkg];
            console.log(`  ${exists ? '✅' : '❌'} ${pkg}`);
            if (!exists) packagesOk = false;
        });

        // 4. النتيجة النهائية
        console.log('\n' + '='.repeat(50));
        if (filesOk && packagesOk) {
            console.log('✅ جميع الاختبارات نجحت! النظام جاهز للعمل');
            console.log('\n🚀 الخطوات التالية:');
            console.log('  1. قم بتشغيل: npm install');
            console.log('  2. قم بتشغيل: npm start');
            console.log('  3. افتح: http://localhost:3000');
            console.log('='.repeat(50) + '\n');
        } else {
            console.log('❌ هناك بعض المشاكل التي تحتاج إلى حل');
            console.log('='.repeat(50) + '\n');
        }
        db.close();
    });
});
