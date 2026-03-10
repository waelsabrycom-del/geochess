#!/usr/bin/env node

/**
 * سكريبت البدء المحسّن للسيرفر
 * يقوم بـ:
 * 1. تحسين قاعدة البيانات
 * 2. بدء السيرفر
 * 3. مراقبة صحة السيرفر
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const cwd = __dirname;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// الألوان للطباعة
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

function showMenu() {
    console.clear();
    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║   🎮 نظام تشغيل السيرفر المحسّن     ║', 'cyan');
    log('╚════════════════════════════════════════╝\n', 'cyan');
    
    console.log('اختر الخيار المطلوب:');
    console.log('─────────────────────');
    console.log('1️⃣  بدء السيرفر بشكل طبيعي');
    console.log('2️⃣  بدء السيرفر مع تحسين قاعدة البيانات أولاً');
    console.log('3️⃣  بدء السيرفر + مراقبة الصحة');
    console.log('4️⃣  بدء السيرفر + تحسين قاعدة البيانات + المراقبة');
    console.log('5️⃣  تحسين قاعدة البيانات فقط');
    console.log('6️⃣  مراقبة الصحة فقط');
    console.log('7️⃣  عرض سجل الأخطاء');
    console.log('8️⃣  إعادة تشغيل شاملة');
    console.log('0️⃣  خروج\n');
    
    rl.question('الخيار: ', handleChoice);
}

function handleChoice(choice) {
    switch (choice.trim()) {
        case '1':
            startServer();
            break;
        case '2':
            optimizeThenStart();
            break;
        case '3':
            startServerWithMonitor();
            break;
        case '4':
            optimizeStartAndMonitor();
            break;
        case '5':
            optimizeDatabase();
            break;
        case '6':
            startMonitor();
            break;
        case '7':
            showErrorLog();
            break;
        case '8':
            fullRestart();
            break;
        case '0':
            log('\nوداعاً! 👋', 'green');
            process.exit(0);
            break;
        default:
            log('\n❌ خيار غير صحيح', 'red');
            setTimeout(showMenu, 2000);
    }
}

function startServer() {
    log('\n🚀 بدء السيرفر...\n', 'green');
    
    const server = spawn('node', ['server.js'], { cwd, stdio: 'inherit' });
    
    server.on('close', (code) => {
        log(`\n⚠️  السيرفر توقف برمز ${code}`, 'yellow');
        askRestart();
    });
}

function optimizeThenStart() {
    log('\n🔧 تحسين قاعدة البيانات...\n', 'green');
    
    const optimizer = spawn('node', ['database-optimizer.js'], { cwd, stdio: 'inherit' });
    
    optimizer.on('close', (code) => {
        if (code === 0) {
            log('\n✓ تم التحسين بنجاح', 'green');
            setTimeout(() => startServer(), 1000);
        } else {
            log(`\n❌ فشل التحسين برمز ${code}`, 'red');
            askRestart();
        }
    });
}

function startServerWithMonitor() {
    log('\n🚀 بدء السيرفر + المراقب...\n', 'green');
    log('ملاحظة: اضغط Ctrl+C لإيقاف كلاهما\n', 'yellow');
    
    const server = spawn('node', ['server.js'], { cwd });
    const monitor = spawn('node', ['server-monitor.js'], { cwd });
    
    // إعادة توجيه المخرجات
    server.stdout.on('data', (data) => {
        log(`[السيرفر] ${data.toString().trim()}`, 'cyan');
    });
    
    server.stderr.on('data', (data) => {
        log(`[السيرفر - خطأ] ${data.toString().trim()}`, 'red');
    });
    
    monitor.stdout.on('data', (data) => {
        console.log(`[المراقب] ${data.toString().trim()}`);
    });
    
    monitor.stderr.on('data', (data) => {
        console.log(`[المراقب - خطأ] ${data.toString().trim()}`);
    });
    
    const exitHandler = () => {
        log('\n⏹️  إيقاف العمليات...', 'yellow');
        server.kill();
        monitor.kill();
        setTimeout(() => askRestart(), 1000);
    };
    
    process.on('SIGINT', exitHandler);
}

function optimizeStartAndMonitor() {
    log('\n🔧 تحسين قاعدة البيانات...\n', 'green');
    
    const optimizer = spawn('node', ['database-optimizer.js'], { cwd, stdio: 'inherit' });
    
    optimizer.on('close', (code) => {
        if (code === 0) {
            log('\n✓ تم التحسين بنجاح', 'green');
            setTimeout(() => startServerWithMonitor(), 1000);
        } else {
            log(`\n❌ فشل التحسين برمز ${code}`, 'red');
            askRestart();
        }
    });
}

function optimizeDatabase() {
    log('\n🔧 تحسين قاعدة البيانات...\n', 'green');
    
    const optimizer = spawn('node', ['database-optimizer.js'], { cwd, stdio: 'inherit' });
    
    optimizer.on('close', (code) => {
        if (code === 0) {
            log('\n✓ تم التحسين بنجاح', 'green');
        } else {
            log(`\n❌ فشل التحسين برمز ${code}`, 'red');
        }
        setTimeout(askRestart, 2000);
    });
}

function startMonitor() {
    log('\n📊 بدء المراقب...\n', 'green');
    log('ملاحظة: اضغط Ctrl+C للإيقاف\n', 'yellow');
    
    const monitor = spawn('node', ['server-monitor.js'], { cwd, stdio: 'inherit' });
    
    monitor.on('close', (code) => {
        log(`\n⚠️  توقف المراقب برمز ${code}`, 'yellow');
        askRestart();
    });
}

function showErrorLog() {
    const logFile = path.join(cwd, 'server-health.log');
    
    if (!fs.existsSync(logFile)) {
        log('\n❌ لم يتم العثور على ملف السجل\n', 'red');
        setTimeout(showMenu, 2000);
        return;
    }
    
    log('\n📋 سجل الأخطاء (آخر 50 سطر):\n', 'cyan');
    console.log('─'.repeat(50));
    
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n');
    const lastLines = lines.slice(-51, -1); // آخر 50 سطر
    
    lastLines.forEach(line => {
        if (line.includes('❌')) {
            log(line, 'red');
        } else if (line.includes('⚠️')) {
            log(line, 'yellow');
        } else if (line.includes('✓')) {
            log(line, 'green');
        } else {
            console.log(line);
        }
    });
    
    console.log('─'.repeat(50) + '\n');
    setTimeout(askRestart, 2000);
}

function fullRestart() {
    log('\n🔄 إعادة تشغيل شاملة...\n', 'yellow');
    log('1. إيقاف جميع عمليات Node القديمة...', 'cyan');
    
    // محاولة إيقاف جميع عمليات Node
    exec('taskkill /F /IM node.exe 2>nul || true', () => {
        log('✓ تم الإيقاف\n', 'green');
        
        log('2. تحسين قاعدة البيانات...', 'cyan');
        const optimizer = spawn('node', ['database-optimizer.js'], { cwd, stdio: 'inherit' });
        
        optimizer.on('close', () => {
            log('\n✓ تم التحسين\n', 'green');
            
            log('3. بدء السيرفر...\n', 'cyan');
            setTimeout(() => startServerWithMonitor(), 1000);
        });
    });
}

function askRestart() {
    rl.question('\n\nهل تريد العودة للقائمة الرئيسية؟ (نعم/لا): ', (answer) => {
        if (answer.toLowerCase() === 'نعم' || answer.toLowerCase() === 'y') {
            showMenu();
        } else {
            log('\nوداعاً! 👋', 'green');
            process.exit(0);
        }
    });
}

// عرض القائمة عند البدء
console.clear();
log('\n⏳ جاري تحميل النظام...', 'cyan');
setTimeout(showMenu, 1000);

// معالج الأخطاء
process.on('uncaughtException', (err) => {
    log(`\n❌ خطأ: ${err.message}`, 'red');
    setTimeout(showMenu, 2000);
});
