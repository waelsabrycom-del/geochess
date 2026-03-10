# 🚀 الأوامر السريعة

## تثبيت وتشغيل

```bash
# 1. تثبيت المكتبات
npm install

# 2. (اختياري) تحميل بيانات نموذجية
npm run seed

# 3. بدء الخادم
npm start

# 4. الوصول للتطبيق
# افتح: http://localhost:3000
```

## أثناء التطوير

```bash
# استخدام nodemon لإعادة التشغيل التلقائي
npm run dev
```

## الاختبار

```bash
# تشغيل اختبار النظام
npm test
```

## اختبارات سريعة

```bash
# اختبار تحميل وحدة database
node -e "const db = require('./database'); console.log('✅ OK'); process.exit(0);"

# اختبار تحميل وحدة auth
node -e "const auth = require('./auth'); console.log('✅ OK'); process.exit(0);"
```

## تغيير الإعدادات

### تغيير المنفذ:
```bash
# في ملف .env
PORT=3001
```

### تغيير المفاتيح السرية:
```bash
# في ملف .env
JWT_SECRET=your-new-secret-key
SESSION_SECRET=your-new-session-secret
```

## استكشاف الأخطاء

### إعادة تثبيت:
```bash
rm -rf node_modules package-lock.json
npm install
```

### حذف قاعدة البيانات:
```bash
rm -rf database/chess_game.db
npm start
```

### عرض سجل النشاط:
```bash
# سيتم طباعة السجلات في الكونسول عند بدء الخادم
npm start
```

## معلومات مفيدة

### بيانات تسجيل دخول تجريبية:
```
البريد: ahmed@example.com
كلمة المرور: password123
```

### الموارد:
- **الرئيسية:** http://localhost:3000
- **التسجيل:** http://localhost:3000 (زر التسجيل)
- **الدخول:** http://localhost:3000 (زر الدخول)

### الملفات الهامة:
- `.env` - متغيرات البيئة
- `server.js` - خادم Express الرئيسي
- `database.js` - إعدادات قاعدة البيانات
- `auth.js` - مسارات المصادقة
- `package.json` - إعدادات المشروع

---

**تم تحديثه:** 27 يناير 2026
