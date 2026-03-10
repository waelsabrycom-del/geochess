# ملاحظات إعادة التنظيم (Migration Notes)

تاريخ التنفيذ: 2026-03-08

## الهدف
- تقليل الزحام في جذر المشروع.
- فصل التوثيق، الأدوات، الاختبارات، والأصول غير التشغيلية في مجلدات واضحة.
- الإبقاء على ملفات التشغيل الأساسية في الجذر لتفادي كسر أوامر `npm`.

## ما تم نقله

### 1) ملفات التوثيق
- نقل ملفات `*.md` (باستثناء `README*` و`QUICKSTART.md`) إلى:
  - `docs/chat`
  - `docs/reports`
  - `docs/general`
- نقل ملفات `*.txt` غير الأساسية إلى `docs/reports`.

### 2) سكربتات الفحص والأدوات
- نقل سكربتات الفحص من الجذر إلى `scripts/checks` (مثل `check_*.js`, `list_tables*.js`).
- نقل أدوات مساعدة مختارة إلى `scripts/tools`:
  - `query_user.js`
  - `delete_games.js`
  - `create_game_pieces_table.js`
  - `fix-database.js`

### 3) الاختبارات
- نقل اختبارات إضافية من الجذر إلى `tests` (مثل `test-*.js`, `test_*.js`, `temp_test.js`).
- تم الإبقاء على `test.js` في الجذر لأنه مرتبط بأمر `npm test`.

### 4) الأصول والنسخ
- نقل ملفات التصميم المصدرية `*.cdr` إلى `assets/design-sources`.
- نقل نسخ احتياطية تصميمية إلى `assets/backups`.
- نقل صور لقطات الواجهات إلى `docs/assets/screenshots`.
- الإبقاء على الصور المحتمل استخدامها وقت التشغيل في الجذر:
  - `mountain-pattern.png`
  - `zwF4Lyn.png`

### 5) السجلات
- نقل `server.log` إلى `logs`.

## تحقق السلامة
تم التأكد من بقاء ملفات التشغيل الأساسية في الجذر:
- `server.js`
- `advanced-startup.js`
- `server-monitor.js`
- `database-optimizer.js`
- `quick-diagnostic.js`
- `test.js`
- `seedData.js`
- `package.json`

## النتيجة
- انخفض عدد ملفات الجذر بشكل كبير.
- أصبحت بنية المشروع أوضح وأسهل في التصفح والصيانة.
