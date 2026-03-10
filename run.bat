@echo off
REM ملف تشغيل تلقائي للمشروع (Windows Batch)
REM استخدام: اضغط نقرتين على الملف

color 0A
cls

echo.
echo ==========================================
echo   ^> شطرنج القائد الجغرافي
echo ==========================================
echo.

echo التحقق من المكتبات...
echo.

REM التحقق من وجود node_modules
if not exist "node_modules\" (
    echo تثبيت المكتبات المطلوبة... (قد يستغرق دقائق)
    echo.
    call npm install
    echo.
)

echo.
echo ==========================================
echo   ^> بدء الخادم
echo ==========================================
echo.
echo نصائح:
echo   * الرابط: http://localhost:3000
echo   * اضغط Ctrl+C لإيقاف الخادم
echo   * افتح متصفحك وانتظر قليلاً
echo.

call npm start

pause
