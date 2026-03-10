#!/usr/bin/env node

/**
 * أداة تشخيص سريعة للسيرفر
 * تفحص صحة النظام والسيرفر
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

log('\n╔════════════════════════════════════════╗', 'cyan');
log('║   🔍 أداة التشخيص السريع للسيرفر    ║', 'cyan');
log('╚════════════════════════════════════════╝\n', 'cyan');

const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
};

async function runDiagnostics() {
    // 1. فحص ملفات النظام
    await checkSystemFiles();
    
    // 2. فحص الموارد
    await checkResources();
    
    // 3. فحص قاعدة البيانات
    await checkDatabase();
    
    // 4. فحص السيرفر
    await checkServer();
    
    // 5. فحص السجلات
    await checkLogs();
    
    // الملخص
    printSummary();
}

async function checkSystemFiles() {
    log('\n📋 فحص ملفات النظام...', 'cyan');
    log('─'.repeat(40));
    
    const requiredFiles = [
        'server.js',
        'database.js',
        'auth.js',
        'package.json',
        'database/chess_game.db'
    ];
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024).toFixed(2);
            log(`✓ ${file} (${size} KB)`, 'green');
            checks.passed++;
        } else {
            log(`✗ ${file} مفقود`, 'red');
            checks.failed++;
        }
    });
}

async function checkResources() {
    log('\n💾 فحص موارد النظام...', 'cyan');
    log('─'.repeat(40));
    
    // الذاكرة
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(2);
    
    log(`إجمالي الذاكرة: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`, 'cyan');
    log(`الذاكرة المستخدمة: ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB (${memoryPercent}%)`, 
        memoryPercent > 80 ? 'red' : memoryPercent > 60 ? 'yellow' : 'green'
    );
    log(`الذاكرة الحرة: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`, 'green');
    
    if (memoryPercent < 50) {
        checks.passed++;
    } else if (memoryPercent < 80) {
        checks.warnings++;
    } else {
        checks.failed++;
    }
    
    // المعالج
    const cpus = os.cpus();
    log(`\nعدد أنوية المعالج: ${cpus.length}`, 'cyan');
    log(`نوع المعالج: ${cpus[0].model}`, 'cyan');
    checks.passed++;
    
    // مساحة التخزين (تقريبي)
    log(`نظام التشغيل: ${os.platform()} ${os.arch()}`, 'cyan');
    checks.passed++;
}

async function checkDatabase() {
    log('\n🗄️  فحص قاعدة البيانات...', 'cyan');
    log('─'.repeat(40));
    
    const dbPath = path.join(__dirname, 'database', 'chess_game.db');
    
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                log(`✗ خطأ في الاتصال: ${err.message}`, 'red');
                checks.failed++;
                resolve();
                return;
            }
            
            log('✓ الاتصال بقاعدة البيانات نجح', 'green');
            checks.passed++;
            
            // فحص الجداول
            db.all(
                "SELECT name FROM sqlite_master WHERE type='table'",
                (err, tables) => {
                    if (err) {
                        log(`✗ خطأ في فحص الجداول: ${err.message}`, 'red');
                        checks.failed++;
                    } else {
                        log(`✓ عدد الجداول: ${tables.length}`, 'green');
                        tables.forEach(t => log(`  - ${t.name}`, 'cyan'));
                        checks.passed++;
                    }
                    
                    // فحص الإحصائيات
                    db.all('SELECT COUNT(*) as count FROM users', (err, rows) => {
                        if (!err) {
                            log(`✓ عدد المستخدمين: ${rows[0].count}`, 'green');
                            checks.passed++;
                        }
                        
                        db.all('SELECT COUNT(*) as count FROM games', (err, rows) => {
                            if (!err) {
                                log(`✓ عدد المباريات: ${rows[0].count}`, 'green');
                                checks.passed++;
                            }
                            
                            // فحص حجم قاعدة البيانات
                            const stats = fs.statSync(dbPath);
                            const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
                            log(`✓ حجم قاعدة البيانات: ${sizeInMB} MB`, 'green');
                            checks.passed++;
                            
                            db.close(() => resolve());
                        });
                    });
                }
            );
        });
    });
}

async function checkServer() {
    log('\n🌐 فحص السيرفر...', 'cyan');
    log('─'.repeat(40));
    
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:3000', (res) => {
            if (res.statusCode === 404 || res.statusCode === 200) {
                log('✓ السيرفر يعمل بشكل صحيح', 'green');
                checks.passed++;
            } else {
                log(`⚠️  السيرفر يرد برمز ${res.statusCode}`, 'yellow');
                checks.warnings++;
            }
            res.on('data', () => {});
            res.on('end', () => resolve());
        });
        
        req.on('error', (err) => {
            log(`✗ السيرفر لا يعمل: ${err.message}`, 'red');
            log('  اضغط: npm start', 'yellow');
            checks.failed++;
            resolve();
        });
        
        req.setTimeout(3000);
    });
}

async function checkLogs() {
    log('\n📝 فحص السجلات...', 'cyan');
    log('─'.repeat(40));
    
    const logFile = path.join(__dirname, 'server-health.log');
    const statsFile = path.join(__dirname, 'server-stats.json');
    
    if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        log(`✓ ملف السجل موجود (${(stats.size / 1024).toFixed(2)} KB)`, 'green');
        checks.passed++;
        
        // عرض آخر أخطاء
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').reverse();
        const errors = lines.filter(l => l.includes('❌')).slice(0, 5);
        
        if (errors.length > 0) {
            log(`\nآخر ${errors.length} أخطاء:`, 'yellow');
            errors.forEach((err, i) => {
                log(`  ${i + 1}. ${err.substring(0, 70)}...`, 'yellow');
            });
            checks.warnings++;
        } else {
            log('✓ لا توجد أخطاء حديثة', 'green');
            checks.passed++;
        }
    } else {
        log('⚠️  ملف السجل لم ينشأ بعد (قم بتشغيل المراقب أولاً)', 'yellow');
        checks.warnings++;
    }
    
    if (fs.existsSync(statsFile)) {
        const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        const uptime = stats.uptime || 0;
        const successRate = stats.healthChecks > 0 
            ? ((stats.successfulChecks / stats.healthChecks) * 100).toFixed(2)
            : 0;
        
        log(`✓ ملف الإحصائيات موجود`, 'green');
        log(`  - وقت التشغيل: ${formatUptime(uptime)}`, 'cyan');
        log(`  - نسبة النجاح: ${successRate}%`, successRate > 95 ? 'green' : 'yellow');
        checks.passed++;
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    
    return parts.length > 0 ? parts.join(' و ') : 'قليل جداً';
}

function printSummary() {
    const total = checks.passed + checks.failed + checks.warnings;
    const health = checks.failed === 0 ? 100 : 
                   ((checks.passed / total) * 100).toFixed(0);
    
    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║           📊 ملخص التشخيص            ║', 'cyan');
    log('╠════════════════════════════════════════╣', 'cyan');
    log(`║ الفحوصات الناجحة:     ${checks.passed.toString().padEnd(20)} ║`, 'green');
    log(`║ التحذيرات:            ${checks.warnings.toString().padEnd(20)} ║`, 'yellow');
    log(`║ الفشل:                ${checks.failed.toString().padEnd(20)} ║`, 'red');
    log('╠════════════════════════════════════════╣', 'cyan');
    log(`║ صحة النظام:           ${health}%${' '.repeat(31 - health.toString().length)}║`, 'cyan');
    log('╚════════════════════════════════════════╝', 'cyan');
    
    if (checks.failed === 0) {
        log('\n✓ النظام سليم وجاهز للعمل!', 'green');
    } else if (checks.failed > 0) {
        log('\n⚠️  توجد مشاكل تحتاج إلى إصلاح', 'red');
        log('\nقدماً جرّب:', 'yellow');
        log('  1. npm run optimize', 'yellow');
        log('  2. npm start', 'yellow');
    }
    
    log('\nللمزيد من المعلومات، راجع:', 'cyan');
    log('  - MONITORING_GUIDE.md', 'cyan');
    log('  - SERVER_STABILITY_GUIDE.md\n', 'cyan');
}

// تشغيل التشخيص
runDiagnostics().catch(err => {
    console.error('❌ خطأ في التشخيص:', err);
    process.exit(1);
});
