#!/usr/bin/env pwsh

# نظام الاستقرار والمراقبة - نسخة PowerShell
# تم تطويره لحل مشكلة انقطاع السيرفر المتكرر

$ErrorActionPreference = 'Continue'

# الألوان
$colors = @{
    'Green'  = 'Green'
    'Yellow' = 'Yellow'
    'Red'    = 'Red'
    'Cyan'   = 'Cyan'
}

function Write-Header {
    param([string]$Text)
    Clear-Host
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "    ⚙️  نظام التشغيل المحسّن للسيرفر" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Write-Host "1) بدء السيرفر بشكل طبيعي" -ForegroundColor Green
    Write-Host "2) بدء السيرفر مع تحسين قاعدة البيانات" -ForegroundColor Green
    Write-Host "3) بدء السيرفر مع المراقبة" -ForegroundColor Yellow
    Write-Host "4) بدء الكامل (الأفضل للاستقرار)" -ForegroundColor Cyan
    Write-Host "5) تحسين قاعدة البيانات فقط" -ForegroundColor Green
    Write-Host "6) مراقبة الصحة فقط" -ForegroundColor Green
    Write-Host "7) تشخيص المشاكل" -ForegroundColor Cyan
    Write-Host "8) عرض السجلات" -ForegroundColor Yellow
    Write-Host "0) خروج" -ForegroundColor Red
    Write-Host ""
}

function Start-Menu {
    do {
        Write-Header "القائمة الرئيسية"
        Show-Menu
        $choice = Read-Host "اختر الخيار"
        
        switch ($choice) {
            '1' { Start-Normal }
            '2' { Start-Optimize }
            '3' { Start-Monitor }
            '4' { Start-Full }
            '5' { Optimize-Only }
            '6' { Monitor-Only }
            '7' { Run-Diagnostic }
            '8' { View-Logs }
            '0' { 
                Write-Host ""
                Write-Host "وداعاً! 👋" -ForegroundColor Green
                exit 0 
            }
            default {
                Write-Host "خيار غير صحيح" -ForegroundColor Red
                Start-Sleep -Seconds 2
            }
        }
    } while ($true)
}

function Start-Normal {
    Write-Header "بدء السيرفر"
    Write-Host "🚀 بدء السيرفر..." -ForegroundColor Green
    Write-Host ""
    & node server.js
    Pause-Menu
}

function Start-Optimize {
    Write-Header "تحسين قاعدة البيانات ثم بدء السيرفر"
    Write-Host "🔧 تحسين قاعدة البيانات..." -ForegroundColor Green
    Write-Host ""
    & node database-optimizer.js
    Write-Host ""
    Write-Host "✓ اكتمل التحسين" -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "🚀 بدء السيرفر..." -ForegroundColor Green
    Write-Host ""
    & node server.js
    Pause-Menu
}

function Start-Monitor {
    Write-Header "بدء السيرفر مع المراقبة"
    Write-Host "⚠️  سيتم فتح نافذتي PowerShell" -ForegroundColor Yellow
    Write-Host ""
    
    $job1 = Start-Process -FilePath "pwsh.exe" -ArgumentList "-NoExit", "-Command", "cd '$($PWD.Path)'; node server.js" -WindowStyle Normal -PassThru
    Start-Sleep -Seconds 3
    
    $job2 = Start-Process -FilePath "pwsh.exe" -ArgumentList "-NoExit", "-Command", "cd '$($PWD.Path)'; node server-monitor.js" -WindowStyle Normal -PassThru
    
    Write-Host "✓ تم بدء السيرفر والمراقب" -ForegroundColor Green
    Pause-Menu
}

function Start-Full {
    Write-Header "النظام الكامل (الموصى به)"
    
    Write-Host "1️⃣ تحسين قاعدة البيانات..." -ForegroundColor Cyan
    Write-Host ""
    & node database-optimizer.js
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "2️⃣ فتح نافذة السيرفر..." -ForegroundColor Cyan
    Write-Host ""
    $job1 = Start-Process -FilePath "pwsh.exe" -ArgumentList "-NoExit", "-Command", "cd '$($PWD.Path)'; node server.js" -WindowStyle Normal -PassThru
    Start-Sleep -Seconds 3
    
    Write-Host "3️⃣ فتح نافذة المراقب..." -ForegroundColor Cyan
    Write-Host ""
    $job2 = Start-Process -FilePath "pwsh.exe" -ArgumentList "-NoExit", "-Command", "cd '$($PWD.Path)'; node server-monitor.js" -WindowStyle Normal -PassThru
    
    Write-Host ""
    Write-Host "✓ تم بدء النظام الكامل!" -ForegroundColor Green
    Write-Host "✓ السيرفر يعمل الآن مع مراقبة مستمرة" -ForegroundColor Green
    Write-Host ""
    Pause-Menu
}

function Optimize-Only {
    Write-Header "تحسين قاعدة البيانات"
    Write-Host "🔧 تحسين قاعدة البيانات..." -ForegroundColor Green
    Write-Host ""
    & node database-optimizer.js
    Write-Host ""
    Pause-Menu
}

function Monitor-Only {
    Write-Header "مراقب الصحة"
    Write-Host "⚠️  اضغط Ctrl+C للإيقاف" -ForegroundColor Yellow
    Write-Host ""
    & node server-monitor.js
    Pause-Menu
}

function Run-Diagnostic {
    Write-Header "تشخيص المشاكل"
    Write-Host "🔍 تشغيل أداة التشخيص..." -ForegroundColor Green
    Write-Host ""
    & node quick-diagnostic.js
    Write-Host ""
    Pause-Menu
}

function View-Logs {
    Write-Header "عرض السجلات"
    
    $logFile = "server-health.log"
    
    if (Test-Path $logFile) {
        Write-Host "📋 السجلات (آخر 50 سطر):" -ForegroundColor Cyan
        Write-Host ""
        Get-Content $logFile -Tail 50 | ForEach-Object {
            if ($_ -match "❌") {
                Write-Host $_ -ForegroundColor Red
            } elseif ($_ -match "⚠️") {
                Write-Host $_ -ForegroundColor Yellow
            } elseif ($_ -match "✓") {
                Write-Host $_ -ForegroundColor Green
            } else {
                Write-Host $_
            }
        }
    } else {
        Write-Host "❌ لم يتم العثور على ملف السجل" -ForegroundColor Red
        Write-Host "قم بتشغيل المراقب أولاً: npm run start:monitor" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Pause-Menu
}

function Pause-Menu {
    Read-Host "اضغط Enter للعودة للقائمة الرئيسية"
}

# تشغيل التطبيق
Clear-Host
Write-Host ""
Write-Host "⏳ جاري تحميل النظام..." -ForegroundColor Cyan
Start-Sleep -Seconds 1

Start-Menu
