# تحديث نظام الألوان - وحدات الضيف

## الملخص:
تم تحديث نظام اختيار الألوان للوحدات بحيث يستخدم كل لاعب (المضيف والضيف) وحدات بلونه الخاص.

## التغييرات:

### 1. في دالة `populateUnitsPanel` (السطور 1375-1420):
- **المضيف**: يرى وحداته بلونه المختار (playerColor)
- **الضيف**: يرى وحداته بلون معاكس (guestColor)

```javascript
// تحديد لون اللاعب الحالي
const currentPlayerColor = isGuestUser ? guestColor : unitColor;
const isCurrentPlayerBlack = currentPlayerColor === 'black';

// تحديد لون الخصم (معاكس للاعب الحالي)
const opponentPlayerColor = isGuestUser ? unitColor : guestColor;
const isOpponentPlayerBlack = opponentPlayerColor === 'black';
```

### 2. في معالج الإنزال على الخريطة (السطور 1599-1650):
- **اللاعب الحالي**: يستخدم وحداته بلونه الصحيح
- **الخصم**: يستخدم وحداته بلونه الصحيح

```javascript
const currentUnitColor = isGuestUserForUnits ? opponentColor : playerColor;
const opponentUnitColor = isGuestUserForUnits ? playerColor : opponentColor;
```

## الألوان المستخدمة:

| اللاعب | اللون | الوحدات |
|--------|-------|---------|
| المضيف (اختار أبيض) | أبيض | Pawn.svg, Knight.svg, archer.svg, Queen.svg, King.svg, Rook.svg |
| الضيف | أسود | BPawn.svg, BKnight.svg, Barcher.svg, BQueen.svg, BKing.svg, BRook.svg |
| --- | --- | --- |
| المضيف (اختار أسود) | أسود | BPawn.svg, BKnight.svg, Barcher.svg, BQueen.svg, BKing.svg, BRook.svg |
| الضيف | أبيض | Pawn.svg, Knight.svg, archer.svg, Queen.svg, King.svg, Rook.svg |

## الميزات:

✅ **كل لاعب يرى وحداته بلونه الخاص**
- المضيف يرى وحداته بلونه المختار
- الضيف يرى وحداته بلون معاكس (تلقائياً)

✅ **متطابق مع نظام الأعلام الملونة**
- علم اللاعب يطابق لون وحداته

✅ **يعمل في موقعين:**
1. في بار الوحدات على اليسار (unit panel)
2. على الخريطة عند إنزال الوحدات

✅ **منطق ذكي:**
- يحسب لون الضيف تلقائياً (معاكس لون المضيف)
- يحفظ لون الضيف في localStorage.guestPieceColor
- يستخدم اللون الصحيح بناءً على نوع اللاعب الحالي

## ملفات معدلة:
- [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html)
  - السطور 1375-1388: تحديد الألوان للوحدات الحالية والخصم
  - السطور 1408-1421: تحديد الألوان للخصم في المربع الثاني
  - السطور 1599-1650: تحديد الألوان الصحيحة عند إنزال الوحدات على الخريطة
