#!/usr/bin/env node

/**
 * مراقب صحة السيرفر
 * يراقب استقرار السيرفر وسجلات الأخطاء
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// الإعدادات
const SERVER_URL = 'http://127.0.0.1:3000';
const HEALTH_CHECK_INTERVAL = 30000; // كل 30 ثانية
const LOG_FILE = path.join(__dirname, 'server-health.log');
const STATS_FILE = path.join(__dirname, 'server-stats.json');

// إحصائيات
let stats = {
    startTime: new Date(),
    healthChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    uptime: 0,
    lastCheckTime: null,
    errors: []
};

// تحميل الإحصائيات السابقة إن وجدت
function loadStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            const saved = JSON.parse(data);
            stats.startTime = new Date(saved.startTime);
            stats.healthChecks = saved.healthChecks;
            stats.successfulChecks = saved.successfulChecks;
            stats.failedChecks = saved.failedChecks;
            console.log('✓ تم تحميل الإحصائيات السابقة');
        }
    } catch (err) {
        console.error('❌ خطأ في تحميل الإحصائيات:', err.message);
    }
}

// حفظ الإحصائيات
function saveStats() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error('❌ خطأ في حفظ الإحصائيات:', err.message);
    }
}

// كتابة السجل
function writeLog(message) {
    const timestamp = new Date().toLocaleString('ar-SA');
    const logMessage = `[${timestamp}] ${message}\n`;
    
    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (err) {
        console.error('❌ خطأ في كتابة السجل:', err.message);
    }
    
    console.log(logMessage);
}

// فحص صحة السيرفر
function checkHealth() {
    stats.healthChecks++;
    stats.lastCheckTime = new Date();
    
    const req = http.get(SERVER_URL, (res) => {
        if (res.statusCode === 404 || res.statusCode === 200) {
            // 404 طبيعي لأننا نطلب الجذر
            stats.successfulChecks++;
            writeLog(`✓ فحص صحة السيرفر: نجح (${stats.successfulChecks}/${stats.healthChecks})`);
        } else {
            stats.failedChecks++;
            writeLog(`❌ فحص صحة السيرفر: فشل - رمز الحالة ${res.statusCode}`);
            stats.errors.push({
                time: new Date(),
                error: `رمز الحالة: ${res.statusCode}`
            });
        }
        res.on('data', () => {}); // استهلاك البيانات
        res.on('end', () => saveStats());
    });
    
    req.on('error', (err) => {
        stats.failedChecks++;
        writeLog(`❌ فحص صحة السيرفر: خطأ في الاتصال - ${err.message}`);
        stats.errors.push({
            time: new Date(),
            error: err.message
        });
        saveStats();
    });
    
    req.on('timeout', () => {
        stats.failedChecks++;
        writeLog(`❌ فحص صحة السيرفر: انتهت المهلة الزمنية`);
        req.destroy();
        saveStats();
    });
    
    req.setTimeout(5000);
}

// حساب وقت التشغيل
function updateUptime() {
    const now = new Date();
    stats.uptime = Math.round((now - stats.startTime) / 1000); // بالثواني
}

// طباعة ملخص الإحصائيات
function printSummary() {
    updateUptime();
    
    const successRate = stats.healthChecks > 0 
        ? ((stats.successfulChecks / stats.healthChecks) * 100).toFixed(2)
        : '0.00';
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 ملخص صحة السيرفر');
    console.log('='.repeat(50));
    console.log(`وقت التشغيل: ${formatUptime(stats.uptime)}`);
    console.log(`عدد الفحوصات: ${stats.healthChecks}`);
    console.log(`الفحوصات الناجحة: ${stats.successfulChecks}`);
    console.log(`الفحوصات الفاشلة: ${stats.failedChecks}`);
    console.log(`نسبة النجاح: ${successRate}%`);
    console.log(`آخر فحص: ${stats.lastCheckTime ? new Date(stats.lastCheckTime).toLocaleString('ar-SA') : 'لم يتم بعد'}`);
    
    if (stats.errors.length > 0) {
        console.log(`\nآخر ${Math.min(5, stats.errors.length)} أخطاء:`);
        stats.errors.slice(-5).forEach((err, i) => {
            console.log(`  ${i + 1}. ${err.error} (${new Date(err.time).toLocaleTimeString('ar-SA')})`);
        });
    }
    
    console.log('='.repeat(50) + '\n');
}

// تنسيق وقت التشغيل
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} ثانية`);
    
    return parts.join(' و ');
}

// البدء
function start() {
    console.log('\n🔍 بدء مراقبة صحة السيرفر...\n');
    
    loadStats();
    writeLog('🔍 بدء مراقبة السيرفر');
    
    // فحص أولي
    checkHealth();
    
    // فحص دوري
    const intervalId = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    
    // ملخص كل دقيقة
    const summaryId = setInterval(printSummary, 60000);
    
    // معالج الإنهاء
    process.on('SIGINT', () => {
        console.log('\n\n⏹️ إيقاف المراقبة...');
        clearInterval(intervalId);
        clearInterval(summaryId);
        printSummary();
        writeLog('⏹️ تم إيقاف المراقبة');
        process.exit(0);
    });
    
    // عرض المساعدة
    console.log('ℹ️ اضغط Ctrl+C لإيقاف المراقبة\n');
}

// تشغيل المراقب
start();

// التعامل مع الأخطاء غير المعالجة
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ غير معالج في المراقب:', err);
    writeLog(`❌ خطأ غير معالج في المراقب: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ وعد غير معالج في المراقب:', reason);
    writeLog(`❌ وعد غير معالج في المراقب: ${reason}`);
});
