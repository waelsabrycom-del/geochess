# 💬 نظام الشات - وثائق الميزة

## نظرة عامة

تم إضافة نظام شات متكامل يسمح للاعبين بالتواصل مع بعضهم البعض بشكل خاص أو جماعي.

---

## الميزات

### 1. **المحادثات الخاصة (Private Chat)**
- محادثة فردية بين صديقين
- معرف المحادثة: `user_{minId}_{maxId}`
- تعريف فريد لكل زوج من المستخدمين

### 2. **المحادثات الجماعية (Group Chat)**
- محادثات متعددة المشاركين
- معرف المحادثة: `group_{timestamp}_{creatorId}`
- قائمة المستقبلين تخزن كنص مفصول بفواصل

### 3. **تتبع الرسائل**
- حالة المقروئية (read/unread)
- طابع زمني للرسالة (timestamp)
- معلومات المُرسل والمستقبل

---

## قاعدة البيانات

### جدول `messages`

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_ids TEXT NOT NULL,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    is_group_chat INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_status TEXT DEFAULT 'unread',
    FOREIGN KEY (sender_id) REFERENCES users(id)
)
```

#### الأعمدة:
- **chat_id**: معرف فريد للمحادثة
- **sender_id**: معرف المستخدم المُرسل
- **recipient_ids**: معرف(ات) المستقبل(ين) - مفصول بفاصلة
- **message_text**: نص الرسالة
- **message_type**: نوع الرسالة (text, image, file, إلخ)
- **is_group_chat**: 0 = خاص، 1 = جماعي
- **created_at**: وقت الإنشاء
- **read_status**: حالة القراءة

---

## API Endpoints

### 1. إرسال رسالة جديدة
```
POST /api/messages/send
Headers: Authorization: Bearer {token}
Body: {
    recipientIds: [friendId],
    messageText: "مرحبا",
    isGroupChat: false
}
Response: {
    success: true,
    messageId: 1,
    chatId: "user_1_2"
}
```

### 2. جلب رسائل المحادثة
```
GET /api/messages/{chatId}
Headers: Authorization: Bearer {token}
Response: {
    success: true,
    messages: [
        {
            id: 1,
            sender_id: 1,
            username: "أحمد",
            avatar_url: "...",
            message_text: "مرحبا",
            created_at: "2024-01-01T12:00:00Z"
        }
    ]
}
```

### 3. جلب قائمة المحادثات
```
GET /api/messages/conversations
Headers: Authorization: Bearer {token}
Response: {
    success: true,
    conversations: [
        {
            chat_id: "user_1_2",
            is_group_chat: 0,
            last_message_time: "2024-01-01T12:00:00Z",
            last_message: "آخر رسالة...",
            unread_count: 3,
            participants: "أحمد، محمد"
        }
    ]
}
```

### 4. تحديث حالة الرسالة
```
PUT /api/messages/{messageId}/read
Headers: Authorization: Bearer {token}
Response: {
    success: true,
    message: "تم تحديث حالة الرسالة"
}
```

### 5. إنشاء محادثة جماعية
```
POST /api/messages/group/create
Headers: Authorization: Bearer {token}
Body: {
    participantIds: [userId1, userId2, userId3],
    groupName: "مجموعة اللعب"
}
Response: {
    success: true,
    chatId: "group_1704110400000_1",
    participants: [1, 2, 3]
}
```

### 6. حذف محادثة
```
DELETE /api/messages/{chatId}
Headers: Authorization: Bearer {token}
Response: {
    success: true,
    deletedMessages: 5
}
```

---

## واجهة المستخدم (Frontend)

### 1. زر الشات في قائمة الأصدقاء
- يظهر بجانب كل صديق مقبول
- يفتح نافذة الشات
- أيقونة: `chat`

### 2. نافذة الشات (Chat Modal)
- **الرأس**: اسم الصديق وصورته
- **قسم الرسائل**: عرض الرسائل السابقة
- **قسم الإدخال**: حقل إدخال الرسالة وزر الإرسال

### 3. معرف الرسالة
- رسائل المستخدم الحالي: على اليمين بلون ذهبي
- رسائل الصديق: على اليسار بلون رمادي

---

## دوال JavaScript

### `openChat(friendId, friendName, friendAvatar)`
فتح نافذة الشات مع صديق معين
```javascript
openChat(2, 'أحمد', 'https://...jpg')
```

### `loadChatMessages(chatId)`
تحميل الرسائل السابقة من المحادثة
```javascript
await loadChatMessages('user_1_2')
```

### `sendChatMessage()`
إرسال رسالة جديدة
```javascript
await sendChatMessage()
```

### `closeChat()`
إغلاق نافذة الشات
```javascript
closeChat()
```

### `displayChatMessages(messages)`
عرض الرسائل في نافذة الشات
```javascript
displayChatMessages(messagesArray)
```

---

## تدفق العمل

### البداية:
1. المستخدم يذهب إلى ملف اللاعب الشخصي
2. يظهر قسم "قائمة الأصدقاء" مع جميع الأصدقاء المقبولين

### فتح اللشات:
1. يضغط على زر "شات" بجانب الصديق
2. تظهر نافذة الشات مع اسم الصديق وصورته
3. يتم تحميل الرسائل السابقة تلقائياً

### إرسال رسالة:
1. يكتب الرسالة في حقل الإدخال
2. يضغط Enter أو زر "إرسال"
3. تتم الرسالة فوراً
4. يتم إعادة تحميل القائمة لعرض الرسالة الجديدة

### إغلاق الشات:
1. يضغط على زر الإغلاق (X)
2. أو يضغط خارج النافذة

---

## حالات الاستخدام

### 1. تنسيق اللعبة
- الأصدقاء يمكنهم التنسيق قبل بدء المباراة

### 2. مناقشة الاستراتيجيات
- يمكن مناقشة الحركات والخطط

### 3. التواصل العام
- الحوار الودي والاجتماعي

---

## الأمان والخصوصية

- ✅ جميع الطلبات تتطلب تحقق من الهوية (authentication)
- ✅ لا يمكن للمستخدم الوصول إلا لرسائله الخاصة
- ✅ جميع الرسائل مشفرة عند التخزين
- ✅ معرف الجلسة يتحقق من كل طلب

---

## التطوير المستقبلي

### الميزات المخططة:
- [ ] ربط الرسائل في الوقت الفعلي (WebSocket)
- [ ] الرسائل المرفقة (صور، ملفات)
- [ ] مؤشرات الكتابة (Typing indicators)
- [ ] تنبيهات الرسائل (Notifications)
- [ ] حذف الرسائل
- [ ] تعديل الرسائل
- [ ] البحث في الرسائل
- [ ] تصدير المحادثات

---

## الاختبار

### اختبار يدوي:
1. سجل دخول بحسابين مختلفين
2. أضف صديق من الحساب الأول
3. اقبل الطلب من الحساب الثاني
4. افتح الشات بين الحسابين
5. أرسل رسائل من الطرفين
6. تحقق من ظهور الرسائل بشكل صحيح

### اختبار API:
استخدام Postman أو curl:
```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"recipientIds": [2], "messageText": "مرحبا", "isGroupChat": false}'
```

---

## استكشاف الأخطاء

### المشكلة: لا تظهر الرسائل
- تحقق من قيمة `chatId` في الطلب
- تأكد من وجود رسائل في قاعدة البيانات
- تحقق من صحة التوكن

### المشكلة: خطأ في الإرسال
- تحقق من أن المستقبل موجود
- تأكد من أن هناك علاقة صداقة
- تحقق من سعة الجلسة

### المشكلة: نافذة الشات لا تفتح
- تحقق من وجود عنصر `chat-modal` في الـ HTML
- تأكد من وجود `friendId` و `friendAvatar`
- تحقق من وحدة التحكم (console) للأخطاء

---

## المراجع

- API Documentation: [server.js](server.js)
- Database: [database.js](database.js)
- Frontend: [ملف اللاعب الشخصي.html](ملف%20اللاعب%20الشخصي.html)

---

**آخر تحديث**: يناير 2024
**الإصدار**: 1.0
