# ملف تشغيل تلقائي للمشروع (Windows)
# استخدام: اضغط نقرتين على الملف أو قم بتشغيل PowerShell وأكتب: .\run.ps1

Write-Host "🎮 شطرنج القائد الجغرافي" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 التحقق من المكتبات..." -ForegroundColor Yellow

# التحقق من وجود node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "تثبيت المكتبات المطلوبة..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "🚀 بدء الخادم..." -ForegroundColor Green
Write-Host ""
Write-Host "💡 نصائح:" -ForegroundColor Cyan
Write-Host "   • الرابط: http://localhost:3000" -ForegroundColor White
Write-Host "   • اضغط Ctrl+C لإيقاف الخادم" -ForegroundColor White
Write-Host "   • افتح متصفحك وانتظر قليلاً" -ForegroundColor White
Write-Host ""
Write-Host "🔌 الخادم يعمل..." -ForegroundColor Green
Write-Host ""

npm start
