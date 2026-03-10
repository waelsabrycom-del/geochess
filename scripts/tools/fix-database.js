#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'chess_game.db');

if (fs.existsSync(dbPath)) {
    console.log('🔄 حذف قاعدة البيانات القديمة:', dbPath);
    try {
        fs.unlinkSync(dbPath);
        console.log('✅ تم حذف قاعدة البيانات القديمة بنجاح');
        console.log('\n📝 الخطوات التالية:');
        console.log('1. قم بتشغيل السيرفر: node server.js');
        console.log('2. سيتم إنشاء قاعدة بيانات جديدة بالمخطط الصحيح');
        console.log('3. المشكلة حل! ');
    } catch (err) {
        console.error('❌ خطأ في حذف قاعدة البيانات:', err.message);
        process.exit(1);
    }
} else {
    console.log('✅ قاعدة البيانات غير موجودة - لا توجد مشكلة');
    console.log('📝 عند تشغيل السيرفر، سيتم إنشاء قاعدة بيانات جديدة بالمخطط الصحيح');
}
