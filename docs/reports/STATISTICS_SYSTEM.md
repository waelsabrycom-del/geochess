# نظام إحصائيات اللاعب - Player Statistics System

## ✅ ما تم إنجازه

### 1. قاعدة البيانات (Database)
تم إنشاء جدول `player_statistics` في [database.js](database.js#L330-L382) مع الحقول التالية:

```sql
CREATE TABLE player_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    opponent_name TEXT NOT NULL,
    player_role TEXT NOT NULL,  -- 'host' أو 'guest'
    result TEXT,                -- 'win', 'loss', 'draw'
    battle_name TEXT,
    map_name TEXT,
    location_size INTEGER DEFAULT 0,     -- عدد المواقع المملوكة
    match_duration INTEGER DEFAULT 0,    -- مدة المباراة بالثواية
    pieces_killed INTEGER DEFAULT 0,     -- عدد القطع المقتولة
    moves_count INTEGER DEFAULT 0,       -- عدد الحركات
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### 2. واجهات برمجة التطبيقات (API Endpoints)
تم إضافة 3 endpoints في [server.js](server.js):

#### 📝 حفظ إحصائيات مباراة
```javascript
POST /api/statistics/save

// المرسل (Body):
{
    "game_id": 123,
    "user_id": 45,
    "username": "أحمد",
    "opponent_name": "محمد",
    "player_role": "host",
    "result": "win",
    "battle_name": "معركة القدس",
    "map_name": "خريطة الشرق الأوسط",
    "location_size": 15,
    "match_duration": 1200,
    "pieces_killed": 8,
    "moves_count": 45
}

// الرد (Response):
{
    "success": true,
    "id": 1
}
```

#### 📊 جلب إحصائيات لاعب
```javascript
GET /api/statistics/user/:userId

// مثال: GET /api/statistics/user/45

// الرد:
{
    "success": true,
    "statistics": [
        {
            "id": 1,
            "game_id": 123,
            "username": "أحمد",
            "opponent_name": "محمد",
            "player_role": "host",
            "result": "win",
            "battle_name": "معركة القدس",
            "map_name": "خريطة الشرق الأوسط",
            "location_size": 15,
            "match_duration": 1200,
            "pieces_killed": 8,
            "moves_count": 45,
            "wins": 1,
            "losses": 0,
            "draws": 0,
            "created_at": "2024-01-01 12:00:00"
        }
    ],
    "totals": {
        "wins": 10,
        "losses": 5,
        "draws": 2,
        "totalGames": 17,
        "totalPiecesKilled": 120,
        "totalMoves": 850
    }
}
```

#### 🎮 جلب إحصائيات مباراة معينة
```javascript
GET /api/statistics/game/:gameId

// مثال: GET /api/statistics/game/123

// الرد (يحتوي على بيانات اللاعبين):
{
    "success": true,
    "statistics": [
        {
            "player_role": "host",
            "username": "أحمد",
            "result": "win",
            "pieces_killed": 8,
            "moves_count": 45
        },
        {
            "player_role": "guest",
            "username": "محمد",
            "result": "loss",
            "pieces_killed": 5,
            "moves_count": 42
        }
    ]
}
```

---

## ⏳ ما يحتاج إنجازه

### 3. جمع البيانات في مرحلة المعركة
تحتاج لتعديل [مرحلة توزيع الجيش.html](مرحلة%20توزيع%20الجيش.html) لجمع البيانات:

#### أ) تتبع عدد القطع المقتولة
```javascript
// أضف متغير عالمي
let playerPiecesKilled = 0;
let opponentPiecesKilled = 0;

// في دالة حذف القطعة (عند قتل قطعة خصم):
function removePieceFromCell(cell, pieceOwner) {
    // ... الكود الحالي ...
    
    // إذا كانت القطعة للخصم
    if (pieceOwner !== currentPlayer) {
        playerPiecesKilled++;
        console.log('قطع مقتولة:', playerPiecesKilled);
    }
}
```

#### ب) تتبع عدد الحركات
```javascript
// أضف متغير عالمي
let playerMovesCount = 0;

// في دالة تحريك القطعة:
function movePiece(fromCell, toCell) {
    // ... الكود الحالي ...
    
    playerMovesCount++;
    console.log('عدد الحركات:', playerMovesCount);
}
```

#### ج) حساب مدة المباراة
```javascript
// عند بداية المباراة
let battleStartTime = Date.now();

// عند انتهاء المباراة
function endGame(winner) {
    const matchDuration = Math.floor((Date.now() - battleStartTime) / 1000);
    console.log('مدة المباراة:', matchDuration, 'ثانية');
}
```

#### د) حساب حجم المنطقة
```javascript
// استخدم المتغير الموجود
const locationSize = window.mapLocations[currentPlayerLocationNum]?.length || 0;
console.log('عدد المواقع:', locationSize);
```

### 4. حفظ الإحصائيات عند انتهاء المباراة
```javascript
async function saveGameStatistics(winner) {
    const gameId = new URLSearchParams(window.location.search).get('gameId');
    
    // بيانات اللاعب الحالي
    const currentPlayerStats = {
        game_id: parseInt(gameId),
        user_id: window.currentUserId,
        username: window.currentUsername,
        opponent_name: window.opponentUsername,
        player_role: window.isHost ? 'host' : 'guest',
        result: winner === window.currentUserId ? 'win' : (winner === 'draw' ? 'draw' : 'loss'),
        battle_name: window.battleName,
        map_name: window.mapName,
        location_size: window.mapLocations[window.currentPlayerLocationNum]?.length || 0,
        match_duration: Math.floor((Date.now() - battleStartTime) / 1000),
        pieces_killed: playerPiecesKilled,
        moves_count: playerMovesCount
    };

    // بيانات اللاعب الخصم (إذا كان متاحة)
    const opponentStats = {
        game_id: parseInt(gameId),
        user_id: window.opponentUserId,
        username: window.opponentUsername,
        opponent_name: window.currentUsername,
        player_role: window.isHost ? 'guest' : 'host',
        result: winner === window.opponentUserId ? 'win' : (winner === 'draw' ? 'draw' : 'loss'),
        battle_name: window.battleName,
        map_name: window.mapName,
        location_size: window.mapLocations[window.opponentLocationNum]?.length || 0,
        match_duration: Math.floor((Date.now() - battleStartTime) / 1000),
        pieces_killed: opponentPiecesKilled,
        moves_count: 0 // سيتم حسابها من طرف الخصم
    };

    try {
        // حفظ إحصائيات اللاعب الحالي
        await fetch('/api/statistics/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentPlayerStats)
        });

        console.log('✅ تم حفظ الإحصائيات بنجاح');
    } catch (error) {
        console.error('❌ خطأ في حفظ الإحصائيات:', error);
    }
}

// استدعاء الدالة عند انتهاء المباراة
function declareWinner(winnerId) {
    // ... عرض النتيجة ...
    
    saveGameStatistics(winnerId);
}
```

### 5. عرض الإحصائيات في صفحة الملف الشخصي
في [ملف اللاعب الشخصي.html](ملف%20اللاعب%20الشخصي.html):

```javascript
async function loadPlayerStatistics() {
    const userId = localStorage.getItem('currentUserId');
    
    try {
        const response = await fetch(`/api/statistics/user/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            // عرض الإجماليات
            document.getElementById('totalWins').textContent = data.totals.wins;
            document.getElementById('totalLosses').textContent = data.totals.losses;
            document.getElementById('totalDraws').textContent = data.totals.draws;
            document.getElementById('totalGames').textContent = data.totals.totalGames;
            document.getElementById('totalKills').textContent = data.totals.totalPiecesKilled;
            document.getElementById('totalMoves').textContent = data.totals.totalMoves;
            
            // عرض جدول المباريات
            const tableBody = document.getElementById('statsTableBody');
            tableBody.innerHTML = '';
            
            data.statistics.forEach(stat => {
                const row = `
                    <tr>
                        <td>${stat.battle_name}</td>
                        <td>${stat.opponent_name}</td>
                        <td>${stat.result === 'win' ? 'فوز' : stat.result === 'loss' ? 'خسارة' : 'تعادل'}</td>
                        <td>${stat.pieces_killed}</td>
                        <td>${stat.moves_count}</td>
                        <td>${Math.floor(stat.match_duration / 60)} دقيقة</td>
                        <td>${new Date(stat.created_at).toLocaleDateString('ar-EG')}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error('❌ خطأ في جلب الإحصائيات:', error);
    }
}

// استدعاء عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', loadPlayerStatistics);
```

---

## 📋 قائمة المهام

### ✅ تم إنجازه
- [x] إنشاء جدول player_statistics
- [x] إضافة API endpoint لحفظ الإحصائيات
- [x] إضافة API endpoint لجلب إحصائيات لاعب
- [x] إضافة API endpoint لجلب إحصائيات مباراة

### ⏳ يحتاج إنجاز
- [ ] إضافة متغيرات تتبع في مرحلة توزيع الجيش.html:
  - [ ] `playerPiecesKilled`
  - [ ] `opponentPiecesKilled`
  - [ ] `playerMovesCount`
  - [ ] `battleStartTime`
- [ ] تحديث دالة حذف القطعة لزيادة العداد
- [ ] تحديث دالة تحريك القطعة لزيادة العداد
- [ ] إنشاء دالة `saveGameStatistics()`
- [ ] استدعاء الدالة عند انتهاء المباراة
- [ ] إضافة قسم الإحصائيات في ملف اللاعب الشخصي.html
- [ ] تصميم واجهة عرض الإحصائيات بـ Tailwind CSS

---

## 🎯 ملاحظات مهمة

1. **كل مباراة = سجلين**: واحد للـ host وواحد للـ guest
2. **حفظ الإحصائيات مرة واحدة**: عند انتهاء المباراة فقط
3. **التعامل مع الانقطاع**: إذا غادر لاعب، احسب النتيجة كـ loss له
4. **التزامن**: استخدم `await` للتأكد من حفظ البيانات قبل الانتقال

---

## 🔍 أمثلة استخدام الـ API

### حفظ نتيجة مباراة
```bash
curl -X POST http://localhost:3000/api/statistics/save \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": 1,
    "user_id": 1,
    "username": "أحمد",
    "opponent_name": "محمد",
    "player_role": "host",
    "result": "win",
    "battle_name": "معركة دمشق",
    "map_name": "الشام",
    "location_size": 20,
    "match_duration": 900,
    "pieces_killed": 12,
    "moves_count": 67
  }'
```

### جلب إحصائيات لاعب
```bash
curl http://localhost:3000/api/statistics/user/1
```

### جلب إحصائيات مباراة
```bash
curl http://localhost:3000/api/statistics/game/1
```
