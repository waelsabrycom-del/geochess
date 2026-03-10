# حالات الخسارة في اللعبة - Loss Conditions

## ✅ قاعدة انتهاء اللعب وقاعدة الفوز المعتمدة

### انتهاء اللعب:
1. قتل القائد.
2. انتهاء وقت اللعب.

بعد انتهاء اللعب يتم تحديد الفائز طبقًا لقاعدة الفوز أدناه.

### الفائز:
1. من يقتل القائد (الملك).
2. أو من يحقق شرط السيطرة بالقوة، كالتالي:
  - قوة جيش الفائز **130 فأكثر**.
  - قوة جيش الخاسر **120 فأقل**.

### التعادل:
- إذا لم يستطع أي لاعب قتل قائد الخصم.
- ولم يتحقق شرط السيطرة بالقوة أعلاه.

### مغادرة صفحة مرحلة التوزيع:
- إذا خرج أحد اللاعبين من صفحة مرحلة التوزيع قبل انتهاء المباراة، يُعتبر خاسرًا تلقائيًا، واللاعب الآخر هو الفائز.

### معادلة قوة الجيش:
$$
	ext{Army Power} = (\#Pawn \times 1) + (\#Knight \times 10) + (\#Archer \times 4) + (\#Rook \times 3) + (\#Queen \times 40) + (\#King \times 100)
$$

تم تنفيذ **4 حالات للخسارة** في اللعبة:

---

## 1️⃣ الخروج من المعركة (Leaving Battle)

### الوصف:
إذا غادر اللاعب صفحة المعركة أثناء اللعب، يخسر تلقائياً.

### التنفيذ:
- **الكود**: في [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html#L821-L860)
- **الآلية**:
  ```javascript
  window.addEventListener('beforeunload', function(e) {
    if (gamePhase === 'battle' && !hasLeftBattle) {
      // حفظ الإحصائيات بنتيجة خسارة
      navigator.sendBeacon(`${API_URL}/statistics/save`, ...);
      // عرض رسالة تحذير
      e.returnValue = 'ستخسر المعركة إذا غادرت الآن...';
    }
  });
  ```

### النتيجة:
- يتم حفظ الإحصائيات مع `result: 'loss'`
- يظهر تحذير للمستخدم قبل المغادرة
- يستخدم `navigator.sendBeacon` للإرسال الموثوق حتى عند إغلاق الصفحة

---

## 2️⃣ عدم إنزال القائد أثناء التوزيع (No King Placement)

### الوصف:
إذا لم يضع اللاعب قطعة القائد (King) على الخريطة أثناء مرحلة التوزيع، يخسر المعركة تلقائياً.

### التنفيذ:
- **الكود**: في [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html#L794-L818)
- **الآلية**:
  ```javascript
  function checkKingPlacement() {
    const playerRole = isHost ? 'host' : 'guest';
    const allPieces = document.querySelectorAll('.placed-unit');
    
    let hasKing = false;
    allPieces.forEach(piece => {
      if (piece.getAttribute('data-player-role') === playerRole &&
          piece.getAttribute('data-unit-type') === 'king') {
        hasKing = true;
      }
    });
    
    return hasKing;
  }
  
  // التحقق قبل بدء المعركة
  if (!checkKingPlacement()) {
    alert('❌ لم تقم بوضع القائد على الخريطة!\n\nلقد خسرت المعركة تلقائياً.');
    endGameWithWinner(null, 'no_king');
  }
  ```

### النتيجة:
- فحص جميع القطع على الخريطة
- إذا لم يوجد `king` للاعب، يتم إنهاء اللعبة فوراً
- عرض رسالة توضح السبب
- حفظ الإحصائيات مع السبب: `no_king`

---

## 3️⃣ قتل القائد أثناء المعركة (King Killed)

### الوصف:
إذا تم قتل قطعة القائد (King) أثناء المعركة، يخسر صاحبها فوراً.

### التنفيذ:
- **الكود**: في [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html#L1386-L1393)
- **الآلية**:
  ```javascript
  // عند تحريك القطعة والهجوم
  if (existingPiece && capturedOwner !== currentPlayerRole) {
    existingPiece.remove();
    playerPiecesKilled++;
    
    // التحقق من قتل القائد
    if (capturedPieceType === 'king') {
      console.log('👑 تم قتل القائد! انتهت المباراة!');
      setTimeout(() => {
        endGameWithWinner(currentPlayerRole, 'king_killed');
      }, 500);
      return;
    }
  }
  ```

### النتيجة:
- فحص نوع القطعة المقتولة بعد كل حركة
- إذا كانت `king`، إنهاء اللعبة فوراً
- الفائز هو من قتل القائد
- حفظ الإحصائيات مع السبب: `king_killed`

---

## 4️⃣ السيطرة على 90% من مساحة القاعدة (Base Dominance)

### الوصف:
إذا سيطر لاعب على 90% أو أكثر من خلايا قاعدة الخصم، يفوز تلقائياً.

### التنفيذ:
- **الكود**: في [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html#L820-L857)
- **الآلية**:
  ```javascript
  function calculateBaseDominance() {
    const opponentLocationNum = isHost ? window.player2LocationNum : window.player1LocationNum;
    const opponentBaseCells = window.mapLocations[opponentLocationNum] || [];
    
    let controlledCells = 0;
    opponentBaseCells.forEach(cellIndex => {
      const cell = document.querySelector(`.map-cell[data-index="${cellIndex}"]`);
      const piece = cell?.querySelector('.placed-unit');
      if (piece?.getAttribute('data-player-role') === playerRole) {
        controlledCells++;
      }
    });
    
    return (controlledCells / opponentBaseCells.length) * 100;
  }
  
  // بعد كل حركة
  const dominance = calculateBaseDominance();
  if (dominance >= 90) {
    endGameWithWinner(playerRole, 'base_dominance');
  }
  ```

### النتيجة:
- حساب عدد خلايا قاعدة الخصم التي يوجد بها قطع اللاعب
- إذا كانت النسبة ≥ 90%، الفوز الفوري
- يتم الفحص بعد كل حركة
- حفظ الإحصائيات مع السبب: `base_dominance`

---

## 🎯 نظام الإحصائيات

### جميع حالات الخسارة تحفظ في قاعدة البيانات:

```javascript
function endGameWithWinner(winnerRole, reason = 'king_killed') {
  // تحديد النتيجة
  let result = 'loss';
  if (winnerRole === currentPlayerRole) {
    result = 'win';
  }
  
  // حفظ الإحصائيات مع السبب
  saveGameStatistics(winnerRole, result);
  
  // عرض رسالة مخصصة حسب السبب
  let reasonText = '';
  switch(reason) {
    case 'king_killed': reasonText = '👑 قتل القائد'; break;
    case 'base_dominance': reasonText = '🏰 السيطرة على 90% من القاعدة'; break;
    case 'no_king': reasonText = '❌ عدم وضع القائد في التوزيع'; break;
    case 'left_battle': reasonText = '🚪 الخروج من المعركة'; break;
  }
  
  alert(`النتيجة: ${result}\nالسبب: ${reasonText}\n\nإحصائيات: ...`);
}
```

---

## 🧪 كيفية الاختبار:

### 1. اختبار "عدم وضع القائد":
```
1. ابدأ مباراة جديدة
2. وزع وحدات فقط (بدون القائد)
3. انتظر انتهاء وقت التوزيع
4. النتيجة: ❌ خسارة تلقائية
```

### 2. اختبار "قتل القائد":
```
1. ابدأ مباراة وضع جميع الوحدات
2. انتقل لمرحلة القتال
3. اقتل قائد الخصم
4. النتيجة: 🏆 فوز فوري
```

### 3. اختبار "السيطرة على القاعدة":
```
1. ابدأ مباراة وانتقل للقتال
2. حرك قطعك لاحتلال خلايا قاعدة الخصم
3. عندما تصل لـ 90%
4. النتيجة: 🏆 فوز فوري
```

### 4. اختبار "الخروج من المعركة":
```
1. ابدأ معركة
2. حاول إغلاق الصفحة
3. النتيجة: تحذير → ❌ خسارة إذا أكملت الإغلاق
```

---

## 📊 عرض النتائج في الملف الشخصي:

جميع حالات الخسارة تُحفظ مع الإحصائيات في:
- **الملف الشخصي** → قسم "إحصائيات المعارك التفصيلية"
- **قاعدة البيانات** → جدول `player_statistics`
- **عرض السبب** → في جدول المباريات

---

## ✅ الميزات المضافة:

1. ✅ كشف الخروج من المعركة (beforeunload)
2. ✅ التحقق من وضع القائد قبل البدء
3. ✅ كشف قتل القائد أثناء اللعب
4. ✅ حساب السيطرة على القاعدة (90%)
5. ✅ حفظ الإحصائيات مع السبب
6. ✅ رسائل مخصصة لكل حالة
7. ✅ استخدام `navigator.sendBeacon` للموثوقية

---

## 🔧 الملفات المعدلة:

- [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html)
  - إضافة `checkKingPlacement()`
  - إضافة `calculateBaseDominance()`
  - إضافة معالج `beforeunload`
  - تحديث `endGameWithWinner()` لدعم الأسباب

---

الآن اللعبة تدعم **جميع حالات الخسارة الأربعة** بشكل كامل! 🎮
