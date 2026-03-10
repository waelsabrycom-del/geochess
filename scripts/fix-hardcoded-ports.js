/**
 * إصلاح المنافذ المكتوبة يدوياً في ملفات HTML و JS
 * يحول :3000 المكتوب يدوياً إلى window.location.origin
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// الملفات المطلوب إصلاحها
const htmlFiles = [
    'ملف اللاعب الشخصي.html',
    '_preview_rendered.html',
    'إنشاء بطولة جديدة.html',
    'تسجيل دخول.html',
    'غرفة_الانتظار_نسخة_مصححة.html',
    'إنشاء مباراة.html',
    'إنشاء حساب جديد.html',
    'سجل البطولات.html',
    'معاينة-المعركة.html',
    'تفاصيل البطولة والمتابعة.html',
    'غرفة الانتظار.html',
    'مرحلة توزيع الجيش.html',
    'تحديد مساحة الخريطة.html',
    'محرر الخرائط الجغرافي.html',
];

const jsFiles = [
    '_preview_script_check.js',
];

let totalReplacements = 0;
let filesChanged = 0;

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⏭ ملف غير موجود: ${path.basename(filePath)}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Pattern 1: const API_URL = `http://${window.location.hostname || '127.0.0.1'}:3000/api`;
    // Pattern 2: const API_URL = `http://${window.location.hostname}:3000/api`;
    // Pattern 3: const API_URL = `http://${location.hostname}:3000/api`;
    // Replace all with: const API_URL = `${window.location.origin}/api`;
    content = content.replace(
        /const\s+API_URL\s*=\s*`http:\/\/\$\{(?:window\.)?location\.hostname(?:\s*\|\|\s*'[^']*')?\}:3000\/api`\s*;/g,
        "const API_URL = `${window.location.origin}/api`;"
    );

    // Pattern: const API_HOST = window.location.hostname || '127.0.0.1';
    //          const API_URL = `http://${API_HOST}:3000/api`;
    // Replace API_URL line:
    content = content.replace(
        /const\s+API_URL\s*=\s*`http:\/\/\$\{API_HOST\}:3000\/api`\s*;/g,
        "const API_URL = `${window.location.origin}/api`;"
    );

    // Pattern: fetch(`http://${window.location.hostname}:3000/api/...`)
    content = content.replace(
        /fetch\s*\(\s*`http:\/\/\$\{(?:window\.)?location\.hostname(?:\s*\|\|\s*'[^']*')?\}:3000\//g,
        "fetch(`${window.location.origin}/"
    );

    // Pattern: new URL(`http://${window.location.hostname}:3000/...`)
    content = content.replace(
        /`http:\/\/\$\{(?:window\.)?location\.hostname(?:\s*\|\|\s*'[^']*')?\}:3000\//g,
        "`${window.location.origin}/"
    );

    // Pattern for Socket.io connection: `http://${window.location.hostname}:3000`
    content = content.replace(
        /`http:\/\/\$\{(?:window\.)?location\.hostname(?:\s*\|\|\s*'[^']*')?\}:3000`/g,
        "window.location.origin"
    );

    // Pattern: 'http://' + window.location.hostname + ':3000/api'
    content = content.replace(
        /'http:\/\/'\s*\+\s*(?:window\.)?location\.hostname\s*\+\s*':3000\/api'/g,
        "window.location.origin + '/api'"
    );

    // Pattern: "http://" + window.location.hostname + ":3000/api"
    content = content.replace(
        /"http:\/\/"\s*\+\s*(?:window\.)?location\.hostname\s*\+\s*":3000\/api"/g,
        "window.location.origin + '/api'"
    );

    if (content !== original) {
        const changes = countDifferences(original, content);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ${path.basename(filePath)} - ${changes} تعديل`);
        totalReplacements += changes;
        filesChanged++;
    } else {
        console.log(`⏭ ${path.basename(filePath)} - لا تغييرات`);
    }
}

function countDifferences(a, b) {
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    let diffs = 0;
    const maxLen = Math.max(aLines.length, bLines.length);
    for (let i = 0; i < maxLen; i++) {
        if (aLines[i] !== bLines[i]) diffs++;
    }
    return diffs;
}

console.log('🔧 إصلاح المنافذ المكتوبة يدوياً...\n');

// HTML files
htmlFiles.forEach(f => fixFile(path.join(rootDir, f)));

// JS files
jsFiles.forEach(f => fixFile(path.join(rootDir, f)));

console.log(`\n✅ تم! ${filesChanged} ملف تم تعديله، ${totalReplacements} سطر تم تغييره`);
