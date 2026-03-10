@echo off
REM نظام الاستقرار والمراقبة - نسخة Windows
REM تم تطويره لحل مشكلة انقطاع السيرفر المتكرر

color 0B
cls

:menu
echo.
echo ============================================
echo    ^^!  نظام التشغيل المحسّن للسيرفر  ^^!
echo ============================================
echo.
echo 1) بدء السيرفر بشكل طبيعي
echo 2) بدء السيرفر مع تحسين قاعدة البيانات
echo 3) بدء السيرفر مع المراقبة
echo 4) بدء الكامل (الأفضل للاستقرار)
echo 5) تحسين قاعدة البيانات فقط
echo 6) مراقبة الصحة فقط
echo 7) تشخيص المشاكل
echo 8) عرض السجلات
echo 0) خروج
echo.
set /p choice="اختر الخيار: "

if "%choice%"=="1" goto start_normal
if "%choice%"=="2" goto start_optimize
if "%choice%"=="3" goto start_monitor
if "%choice%"=="4" goto start_full
if "%choice%"=="5" goto optimize_only
if "%choice%"=="6" goto monitor_only
if "%choice%"=="7" goto diagnose
if "%choice%"=="8" goto view_logs
if "%choice%"=="0" goto exit_app

echo خيار غير صحيح
timeout /t 2 /nobreak
goto menu

:start_normal
cls
echo.
echo ============================================
echo    بدء السيرفر...
echo ============================================
echo.
node server.js
pause
goto menu

:start_optimize
cls
echo.
echo ============================================
echo    تحسين قاعدة البيانات...
echo ============================================
echo.
node database-optimizer.js
timeout /t 3 /nobreak
echo.
echo ============================================
echo    بدء السيرفر...
echo ============================================
echo.
node server.js
pause
goto menu

:start_monitor
cls
echo.
echo ============================================
echo    بدء السيرفر مع المراقب...
echo ============================================
echo.
echo ملاحظة: سيتم فتح نافذتي CMD
echo.
timeout /t 2 /nobreak
start "السيرفر" cmd /k "cd /d %cd% && node server.js"
timeout /t 3 /nobreak
start "المراقب" cmd /k "cd /d %cd% && node server-monitor.js"
goto menu

:start_full
cls
echo.
echo ============================================
echo    النظام الكامل (الأفضل)...
echo ============================================
echo.
echo 1. تحسين قاعدة البيانات...
echo.
node database-optimizer.js
timeout /t 3 /nobreak
echo.
echo 2. فتح نافذة السيرفر...
echo.
start "السيرفر" cmd /k "cd /d %cd% && node server.js"
timeout /t 3 /nobreak
echo.
echo 3. فتح نافذة المراقب...
echo.
start "المراقب" cmd /k "cd /d %cd% && node server-monitor.js"
echo.
echo ✓ تم بدء النظام الكامل!
echo ✓ السيرفر يعمل الآن مع مراقبة مستمرة
echo.
pause
goto menu

:optimize_only
cls
echo.
echo ============================================
echo    تحسين قاعدة البيانات...
echo ============================================
echo.
node database-optimizer.js
echo.
pause
goto menu

:monitor_only
cls
echo.
echo ============================================
echo    مراقب الصحة...
echo ============================================
echo.
echo ملاحظة: اضغط Ctrl+C للإيقاف
echo.
node server-monitor.js
pause
goto menu

:diagnose
cls
echo.
echo ============================================
echo    تشخيص المشاكل...
echo ============================================
echo.
node quick-diagnostic.js
echo.
pause
goto menu

:view_logs
cls
echo.
echo ============================================
echo    عرض السجلات (آخر 50 سطر)
echo ============================================
echo.
if exist "server-health.log" (
    powershell -Command "Get-Content 'server-health.log' -Tail 50"
) else (
    echo لم يتم العثور على ملف السجل
    echo قم بتشغيل المراقب أولاً: npm run start:monitor
)
echo.
pause
goto menu

:exit_app
cls
echo وداعاً! 👋
timeout /t 2 /nobreak
exit /b 0
