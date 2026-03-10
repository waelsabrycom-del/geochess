# 📁 هيكل المشروع (محدّث)

آخر تحديث: 2026-03-08

## نظرة سريعة
- الجذر يحتوي الآن فقط على ملفات التشغيل الأساسية والصفحات الرئيسية.
- التوثيق المفصل نُقل إلى `docs/`.
- أدوات الفحص والتنظيف نُقلت إلى `scripts/`.
- الاختبارات الإضافية نُقلت إلى `tests/`.

## الشجرة الحالية

```text
geographical_chess_gameplay_board/
|- server.js
|- auth.js
|- database.js
|- package.json
|- package-lock.json
|- .env
|- .gitignore
|- index.html
|- [صفحات اللعبة الأساسية].html
|- docs/
|  |- chat/
|  |- reports/
|  |- general/
|  |- assets/
|     |- screenshots/
|- scripts/
|  |- checks/
|  |- tools/
|- tests/
|- assets/
|  |- design-sources/
|  |- backups/
|- logs/
|- maps/
|- uploads/
|- database/
|- node_modules/
```

## تصنيف الملفات المهمة

### 1) ملفات التشغيل الأساسية (Root)
- `server.js`
- `advanced-startup.js`
- `server-monitor.js`
- `database-optimizer.js`
- `quick-diagnostic.js`
- `test.js`
- `seedData.js`
- `package.json`

### 2) صفحات الواجهة (Root)
- `index.html`
- `تسجيل دخول.html`
- `إنشاء حساب جديد.html`
- `ملف اللاعب الشخصي.html`
- `إنشاء مباراة.html`
- `تحديد مساحة الخريطة.html`
- `غرفة الانتظار.html`
- `مرحلة توزيع الجيش.html`
- `محرر الخرائط الجغرافي.html`
- `تفاصيل البطولة والمتابعة.html`
- `سجل البطولات.html`

### 3) التوثيق
- `README.md` و `README_*`
- `QUICKSTART.md`
- `docs/chat/*`
- `docs/reports/*`
- `docs/general/*`
- `docs/assets/screenshots/*`

### 4) السكربتات المساندة
- `scripts/checks/*`: فحوصات قاعدة البيانات والحالة.
- `scripts/tools/*`: أدوات تنظيف/استعلام مساعدة.

### 5) الاختبارات
- `tests/*`: اختبارات إضافية منفصلة عن `test.js` الأساسي.

## ملاحظات تشغيل
- أوامر `npm start`, `npm run dev`, `npm test`, `npm run seed` تعمل عبر الملفات الأساسية الموجودة في الجذر.
- تم الحفاظ على المسارات الحساسة للتشغيل دون تغيير.
