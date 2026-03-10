# سجل التغييرات - ميزة الدردشة

## التاريخ: 2024
## الإصدار: 1.0

## الملفات المتأثرة
- `تفاصيل البطولة والمتابعة.html` (تم التعديل)

---

## التغييرات في `تفاصيل البطولة والمتابعة.html`

### 1. إضافة عناصر HTML جديدة (الأسطر 48-75)

#### نافذة الدردشة (Chat Modal)
```html
<!-- Chat Modal -->
<div class="fixed inset-0 z-[150] hidden items-center justify-center 
            bg-background-dark/95 backdrop-blur-sm p-4 lg:p-8" id="chat-modal">
    <div class="relative w-full max-w-2xl bg-neutral-dark rounded-2xl 
                border border-primary/30 shadow-2xl overflow-hidden 
                flex flex-col max-h-[80vh]">
        <!-- Header with participant name -->
        <div class="p-4 border-b border-white/10 flex items-center 
                    justify-between bg-neutral-dark/80">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary">chat</span>
                <h3 class="font-bold text-lg">دردشة مع 
                    <span id="chat-participant-name">قائد</span>
                </h3>
            </div>
            <button onclick="closeChatModal()" class="text-neutral-light 
                    hover:text-white transition-colors">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
        </div>
        
        <!-- Messages Display Area -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 
                    space-y-3 flex flex-col">
            <div class="text-center text-neutral-light text-sm py-4">
                لا توجد رسائل بعد
            </div>
        </div>
        
        <!-- Message Input Area -->
        <div class="p-4 border-t border-white/10 flex gap-3">
            <input id="chat-input" type="text" 
                   placeholder="اكتب رسالتك..." 
                   class="flex-1 px-4 py-2 bg-neutral-dark/70 
                          border border-neutral-dark rounded-lg 
                          text-white outline-none focus:border-primary text-sm" 
                   onkeypress="if(event.key==='Enter') sendChatMessage()"/>
            <button onclick="sendChatMessage()" 
                    class="px-4 py-2 bg-primary text-neutral-dark 
                           rounded-lg font-bold hover:opacity-90 transition-all">
                <span class="material-symbols-outlined">send</span>
            </button>
        </div>
    </div>
</div>
```

**الخصائص:**
- معرّف أساسي: `chat-modal`
- مخفي افتراضياً باستخدام `hidden` class
- يُعرض فوق جميع العناصر (z-[150])
- خلفية داكنة مع تأثير blur
- حجم متجاوب (mobile و desktop)

---

### 2. إضافة متغيرات عامة جديدة

#### موقع الإضافة: بعد سطر 560

```javascript
// Chat feature variables
let currentTournamentCreatorId = null;  // معرّف منشئ البطولة (المدير)
let currentChatParticipantId = null;    // معرّف المشارك الحالي للدردشة
let currentChatParticipantName = null;  // اسم المشارك الحالي للدردشة
```

**الاستخدام:**
- تُعيّن عند فتح نافذة الدردشة
- تُمسح عند إغلاق نافذة الدردشة
- تُستخدم في جميع الدوال المرتبطة بالدردشة

---

### 3. تحديث عرض المشاركين (الأسطر ~625-650)

#### إضافة أيقونة الدردشة

**قبل التعديل:**
```javascript
<div class="flex items-center gap-3">
    <span class="${isOnline ? 'live-dot' : ''} ...">
        ${participant.username}
    </span>
</div>
```

**بعد التعديل:**
```javascript
<div class="group relative flex items-center gap-3">
    ${isTournamentCreator ? `
        <button onclick="openChatModal(${participant.id}, '${participant.username}')" 
                class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 
                       transition-opacity duration-200 z-10">
            <span class="material-symbols-outlined text-primary text-lg">chat</span>
        </button>
    ` : ''}
    
    <span class="${isOnline ? 'live-dot' : ''} ...">
        ${participant.username}
    </span>
</div>
```

**الشروط:**
- تظهر الأيقونة فقط عندما يكون:
  - `isTournamentCreator = true` (المستخدم هو منشئ البطولة)
  - المشارك قد قبل الدعوة (status = 'accepted')
- الأيقونة مخفية بشكل افتراضي، تظهر عند الهوفر على البطاقة

---

### 4. إضافة دوال الدردشة الجديدة

#### أ) دالة فتح الدردشة - `openChatModal(participantId, participantName)`

**الموقع:** قبل `document.addEventListener('DOMContentLoaded')`

```javascript
function openChatModal(participantId, participantName) {
    // تخزين معرّفات المشارك
    currentChatParticipantId = participantId;
    currentChatParticipantName = participantName;
    
    // تحديث اسم المشارك في عنوان النافذة
    const nameEl = document.getElementById('chat-participant-name');
    if (nameEl) {
        nameEl.textContent = participantName;
    }
    
    // إظهار نافذة الدردشة
    const modal = document.getElementById('chat-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    // تحميل الرسائل السابقة
    loadChatMessages();
}
```

**الخطوات:**
1. حفظ معرّف زائر الدعوة وأيضاً اسمه
2. تحديث عنوان الـ modal ليعكس اسم المشارك
3. إزالة الـ hidden class لإظهار الـ modal
4. تحميل الرسائل السابقة من localStorage

#### ب) دالة إغلاق الدردشة - `closeChatModal()`

```javascript
function closeChatModal() {
    // إخفاء نافذة الدردشة
    const modal = document.getElementById('chat-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // مسح البيانات المخزنة
    currentChatParticipantId = null;
    currentChatParticipantName = null;
}
```

**الخطوات:**
1. إضافة الـ hidden class لإخفاء الـ modal
2. مسح معرّفات المشارك من الذاكرة

#### ج) دالة إنشاء مفتاح الدردشة - `getChatKey(participantId)`

```javascript
function getChatKey(participantId) {
    const tournamentId = currentTournamentId;
    const userId = localStorage.getItem('userId');
    const key = [userId, participantId, tournamentId].sort().join('_');
    return `chat_${key}`;
}
```

**الغرض:**
- إنشاء مفتاح فريد لكل دردشة بين مستخدمين في بطولة معينة
- الترتيب الأبجدي يضمن أن الدردشة بين A و B = الدردشة بين B و A

**مثال:**
```javascript
// محادثة بين المستخدم 123 والمشارك 456 في البطولة 789
getChatKey(456) → "chat_123_456_789"
```

#### د) دالة تحميل الرسائل - `loadChatMessages()`

```javascript
function loadChatMessages() {
    // الحصول على رسائل الدردشة من localStorage
    const chatKey = getChatKey(currentChatParticipantId);
    const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    const messagesContainer = document.getElementById('chat-messages');
    
    if (messagesContainer) {
        if (messages.length === 0) {
            // رسالة عدم وجود رسائل
            messagesContainer.innerHTML = '<div class="text-center text-neutral-light text-sm py-4">لا توجد رسائل بعد</div>';
        } else {
            // عرض جميع الرسائل
            const currentUserId = localStorage.getItem('userId');
            messagesContainer.innerHTML = messages.map(msg => {
                const isOwn = parseInt(msg.senderId) === parseInt(currentUserId);
                return `
                    <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
                        <div class="max-w-xs px-4 py-2 rounded-lg 
                                    ${isOwn ? 'bg-primary text-neutral-dark' : 'bg-neutral-dark/60 text-white'} text-sm">
                            <p>${escapeHtml(msg.text)}</p>
                            <span class="text-[10px] 
                                   ${isOwn ? 'text-neutral-dark/70' : 'text-neutral-light'} 
                                   block mt-1">
                                ${new Date(msg.timestamp).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
            
            // تمرير لأسفل تلقائياً
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}
```

**الميزات:**
- تحميل الرسائل من localStorage
- محاذاة الرسائل (يمين للمرسل، يسار للمستقبل)
- ألوان مختلفة حسب المرسل
- عرض الوقت بصيغة عربية
- التمرير التلقائي إلى آخر رسالة

#### هـ) دالة تنظيف HTML - `escapeHtml(text)`

```javascript
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
```

**الغرض:**
- حماية من هجمات Cross-Site Scripting (XSS)
- تحويل الأحرف الخاصة إلى entities آمنة

#### و) دالة إرسال الرسالة - `sendChatMessage()`

```javascript
function sendChatMessage() {
    // الحصول على حقل الإدخال والنص
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    // التحقق من أن النص ليس فارغاً
    if (!text || !currentChatParticipantId) {
        return;
    }

    // إنشاء كائن الرسالة
    const message = {
        senderId: localStorage.getItem('userId'),
        senderName: localStorage.getItem('username') || 'أنت',
        recipientId: currentChatParticipantId,
        text: text,
        timestamp: new Date().toISOString()
    };

    // حفظ الرسالة في localStorage
    const chatKey = getChatKey(currentChatParticipantId);
    const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    messages.push(message);
    localStorage.setItem(chatKey, JSON.stringify(messages));

    // تحديث العرض ومسح حقل الإدخال
    input.value = '';
    loadChatMessages();
}
```

**الخطوات:**
1. الحصول على نص الرسالة من صندوق الإدخال
2. التحقق من أن النص ليس فارغاً
3. إنشاء كائن رسالة بجميع المعلومات المطلوبة
4. جلب الرسائل السابقة من localStorage
5. إضافة الرسالة الجديدة إلى المصفوفة
6. حفظ المصفوفة المحدثة في localStorage
7. تحديث عرض الرسائل
8. مسح حقل الإدخال

---

## ملخص التغييرات

| النوع | الكمية | التفاصيل |
|-------|---------|---------|
| عناصر HTML جديدة | 1 | نافذة الدردشة الكاملة |
| متغيرات جديدة | 3 | معرّفات الدردشة |
| دوال جديدة | 6 | إدارة الدردشة والرسائل |
| تعديلات موجودة | 1 | تحديث عرض المشاركين |

---

## متطلبات التوافق

### البيانات المطلوبة من localStorage:
- `userId` - معرّف المستخدم الحالي
- `username` - اسم المستخدم الحالي

### المتغيرات العامة المطلوبة:
- `currentTournamentId` - معرّف البطولة الحالية (موجود بالفعل)

### الرموز المستخدمة:
- `chat` - رمز الدردشة (Material Symbols Outlined)
- `send` - رمز الإرسال (Material Symbols Outlined)
- `close` - رمز الإغلاق (Material Symbols Outlined)

---

## تعليمات الاختبار

### 1. اختبار الأداء الأساسي:
```
✅ تسجيل الدخول كمدير بطولة
✅ توجه إلى صفحة تفاصيل البطولة
✅ تحقق من ظهور أيقونة الدردشة على كل مشارك مقبول
✅ اضغط على أيقونة الدردشة
✅ يجب أن تظهر نافذة الدردشة بعنوان يحتوي على اسم المشارك
```

### 2. اختبار الرسائل:
```
✅ اكتب رسالة واضغط Enter أو زر الإرسال
✅ يجب أن تظهر الرسالة على اليمين بلون أزرق
✅ عد إلى صفحة المشاركين وافتح الدردشة مرة أخرى
✅ يجب أن تظهر الرسالة السابقة
```

### 3. اختبار الإغلاق:
```
✅ اضغط زر الإغلاق (X)
✅ يجب أن تختفي النافذة
✅ اضغط على أيقونة دردشة أخرى
✅ يجب أن تظهر نافذة جديدة بدون الرسائل السابقة
```

### 4. اختبار الأمان:
```
✅ اكتب رسالة تحتوي على إشارات HTML مثل <script>alert('test')</script>
✅ يجب أن تظهر كنص عادي وليس كـ script
```

---

## الملفات المعنية

### تم تعديل:
- `تفاصيل البطولة والمتابعة.html`

### لم يتم تعديل:
- `tournaments.js` (لا تتطلب تحديثات حالياً)
- `server.js` (لا تتطلب تحديثات حالياً)
- ملفات HTML أخرى

---

## الخطوات التالية

### في الإصدار القادم:
1. ⏳ نقل تخزين الرسائل إلى قاعدة البيانات
2. ⏳ إضافة تنبيهات عند استقبال رسائل جديدة
3. ⏳ إضافة حالة "مري" (read status)
4. ⏳ إضافة مؤشرات الكتابة
5. ⏳ دعم الرموز التعبيرية (Emoji)

---

## ملاحظات إضافية

### الحدود الحالية:
- ⚠️ الرسائل تُحفظ محلياً فقط (في localStorage)
- ⚠️ لا توجد مزامنة بين أجهزة مختلفة
- ⚠️ الرسائل تُفقد عند مسح بيانات المتصفح

### التحسينات المقترحة:
1. إضافة أيقونة لتحميل الرسائل من قاعدة البيانات
2. إضافة تنبيهات صوتية عند استقبال رسالة
3. إضافة بحث في الرسائل السابقة
4. إضافة خاصية المشاركة على مستوى المشاركين
