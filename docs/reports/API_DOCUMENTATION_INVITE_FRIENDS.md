# API Documentation: Tournament Invitations Feature

## Base URL
```
http://localhost:3000/api
```

## Endpoints

---

## 1. Create Tournament with Invitations

### Endpoint
```
POST /tournaments/create-with-invitations
```

### Authentication
Required: Bearer Token

### Request Headers
```
Authorization: Bearer <authToken>
Content-Type: application/json
```

### Request Body
```json
{
    "tournamentName": "string",
    "prizes": "string",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "participants": number,
    "inviteUserIds": [number] // Optional, array of user IDs
}
```

### Success Response (200)
```json
{
    "success": true,
    "message": "تم إنشاء البطولة وإرسال 5 دعوة بنجاح",
    "tournament": {
        "id": 1771234567890,
        "name": "البطولة الأولى",
        "startDate": "2024-12-20",
        "endDate": "2024-12-25",
        "status": "قادمة"
    },
    "invitationsSent": 5
}
```

### Error Responses

#### Duplicate Tournament (409)
```json
{
    "success": false,
    "code": "DUPLICATE_TOURNAMENT",
    "tournamentId": 1771234567890,
    "message": "بطولة بنفس الاسم والتاريخ موجودة بالفعل. يرجى تغيير الاسم أو التاريخ",
    "status": 409
}
```

**Client Action**: Extract `tournamentId` and call `/tournaments/{id}/invite-friends` endpoint

#### Missing Auth (401)
```json
{
    "success": false,
    "message": "لا توجد صلاحية"
}
```

#### Invalid Data (400)
```json
{
    "success": false,
    "message": "البيانات المطلوبة غير مكتملة"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "فشل في إنشاء البطولة: <error details>"
}
```

---

## 2. Invite Friends to Existing Tournament ⭐ NEW

### Endpoint
```
POST /tournaments/:tournamentId/invite-friends
```

### Authentication
Required: Bearer Token (Must be tournament creator)

### URL Parameters
```
tournamentId: number (tournament ID in database)
```

### Request Headers
```
Authorization: Bearer <authToken>
Content-Type: application/json
```

### Request Body
```json
{
    "inviteUserIds": [1, 2, 3, 4, 5]  // Array of user IDs to invite
}
```

### Success Response (200)
```json
{
    "success": true,
    "invitationsSent": 3,
    "message": "تم إرسال 3 دعوة إضافية بنجاح"
}
```

**Note**: `invitationsSent` can be 0 if all users were already invited

### No New Invitations Response (200)
```json
{
    "success": true,
    "invitationsSent": 0,
    "message": "لا يوجد أصدقاء جدد لدعوتهم"
}
```

### Error Responses

#### Tournament Not Found (404)
```json
{
    "success": false,
    "message": "البطولة غير موجودة"
}
```

#### Unauthorized (403)
```json
{
    "success": false,
    "message": "غير مصرح لك بإرسال دعوات لهذه البطولة"
}
```

**Cause**: Requesting user is not the tournament creator

#### Invalid Tournament ID (400)
```json
{
    "success": false,
    "message": "معرف بطولة غير صالح"
}
```

#### Invalid Request Data (400)
```json
{
    "success": false,
    "message": "يجب تحديد أصدقاء لدعوتهم"
}
```

**Cause**: Empty or invalid `inviteUserIds` array

#### Server Error (500)
```json
{
    "success": false,
    "message": "فشل في التحقق من البطولة" | "فشل في جلب الدعوات السابقة" | "فشل في جلب المستخدمين"
}
```

---

## 3. Get Pending Invitees

### Endpoint
```
GET /tournaments/:tournamentId/pending-invitees
```

### Authentication
Required: Bearer Token (Must be tournament creator)

### URL Parameters
```
tournamentId: number
```

### Request Headers
```
Authorization: Bearer <authToken>
```

### Success Response (200)
```json
{
    "success": true,
    "inviteeIds": [1, 2, 3, 4]  // Array of user IDs with pending invitations
}
```

### Error Responses

#### Tournament Not Found (404)
```json
{
    "success": false,
    "message": "البطولة غير موجودة"
}
```

#### Unauthorized (403)
```json
{
    "success": false,
    "message": "غير مصرح لك بعرض الدعوات"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "فشل في جلب الدعوات المعلقة"
}
```

---

## 4. Get Tournament Participants

### Endpoint
```
GET /tournaments/:tournamentId/participants
```

### Authentication
Required: Bearer Token

### URL Parameters
```
tournamentId: number
```

### Request Headers
```
Authorization: Bearer <authToken>
```

### Success Response (200)
```json
{
    "success": true,
    "participants": [
        {
            "id": 1,
            "username": "Player1",
            "avatar_url": "https://...",
            "responded_at": "2024-12-15T10:30:00Z",
            "is_online": 1
        },
        {
            "id": 2,
            "username": "Player2",
            "avatar_url": "https://...",
            "responded_at": "2024-12-15T10:25:00Z",
            "is_online": 0
        }
    ],
    "count": 2
}
```

**Note**: Only includes users with `status = 'accepted'` invitations

### Empty Tournament Response (200)
```json
{
    "success": true,
    "participants": [],
    "count": 0
}
```

### Error Responses

#### Invalid Tournament ID (400)
```json
{
    "success": false,
    "message": "معرف بطولة غير صالح"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "فشل في جلب المشاركين"
}
```

---

## 5. My Invitations

### Endpoint
```
GET /tournaments/my-invitations
```

### Authentication
Required: Bearer Token

### Query Parameters (Optional)
```
?status=pending     // Only pending invitations
?status=accepted    // Only accepted invitations
// No parameter = All invitations (pending + accepted)
```

### Request Headers
```
Authorization: Bearer <authToken>
```

### Success Response (200)
```json
{
    "success": true,
    "invitations": [
        {
            "id": 1,
            "tournament_id": 1771234567890,
            "tournament_name": "البطولة الأولى",
            "from_user_id": 10,
            "from_username": "Admin1",
            "from_avatar_url": "https://...",
            "start_date": "2024-12-20",
            "end_date": "2024-12-25",
            "status": "accepted",
            "created_at": "2024-12-10T08:00:00Z",
            "responded_at": "2024-12-11T09:30:00Z"
        },
        {
            "id": 2,
            "tournament_id": 1771234567891,
            "tournament_name": "البطولة الثانية",
            "from_user_id": 11,
            "from_username": "Admin2",
            "from_avatar_url": "https://...",
            "start_date": "2024-12-27",
            "end_date": "2025-01-02",
            "status": "pending",
            "created_at": "2024-12-12T10:00:00Z",
            "responded_at": null
        }
    ],
    "count": 2
}
```

### Filter: Pending Only (200)
```
GET /tournaments/my-invitations?status=pending
```

```json
{
    "success": true,
    "invitations": [
        {
            // Only pending invitations (responded_at is null)
        }
    ],
    "count": 1
}
```

### Filter: Accepted Only (200)
```
GET /tournaments/my-invitations?status=accepted
```

```json
{
    "success": true,
    "invitations": [
        {
            // Only accepted invitations (responded_at is set, status='accepted')
        }
    ],
    "count": 1
}
```

### Error Responses

#### Missing Auth (401)
```json
{
    "success": false,
    "message": "لا توجد صلاحية"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "فشل في جلب الدعوات"
}
```

---

## 6. Respond to Invitation

### Endpoint
```
POST /tournaments/respond-invitation
```

### Authentication
Required: Bearer Token

### Request Headers
```
Authorization: Bearer <authToken>
Content-Type: application/json
```

### Request Body
```json
{
    "invitationId": number,
    "response": "accepted" | "rejected"
}
```

### Success Response (200)
```json
{
    "success": true,
    "message": "تم قبول الدعوة بنجاح",
    "response": "accepted"
}
```

### Error Responses

#### Invitation Not Found (404)
```json
{
    "success": false,
    "message": "الدعوة غير موجودة أو لا تخصك"
}
```

#### Invalid Data (400)
```json
{
    "success": false,
    "message": "بيانات غير صحيحة"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "فشل في معالجة الرد"
}
```

---

## Database Schema Reference

### tournaments table
```
tournament_id    INTEGER PRIMARY KEY
name             TEXT
creator_id       INTEGER FOREIGN KEY users(id)
start_date       DATE
end_date         DATE
max_participants INTEGER
prizes           TEXT
status           TEXT ('قادمة', 'جارية', 'انتهت')
created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### tournament_invitations table
```
id               INTEGER PRIMARY KEY AUTOINCREMENT
tournament_id    INTEGER FOREIGN KEY tournaments(tournament_id)
from_user_id     INTEGER FOREIGN KEY users(id)
to_user_id       INTEGER FOREIGN KEY users(id)
tournament_name  TEXT
start_date       DATE
end_date         DATE
status           TEXT DEFAULT 'pending' ('pending', 'accepted', 'rejected')
created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
responded_at     TIMESTAMP NULL
```

### sessions table (for is_online status)
```
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER FOREIGN KEY users(id)
token            TEXT
created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
expires_at       TIMESTAMP NULL
```

---

## Common Use Cases

### Use Case 1: Create Tournament and Invite Specific Friends
```javascript
POST /tournaments/create-with-invitations
{
    "tournamentName": "البطولة الجديدة",
    "startDate": "2024-12-20",
    "endDate": "2024-12-25",
    "prizes": "ميداليات ذهبية",
    "participants": 16,
    "inviteUserIds": [2, 5, 7]  // Invite only these friends
}
```

### Use Case 2: Invite Additional Friends to Existing Tournament
When duplicate error occurs:
```javascript
POST /tournaments/1771234567890/invite-friends
{
    "inviteUserIds": [3, 4, 6]  // Newly selected friends
}
```

### Use Case 3: Get List for Modal Display
```javascript
// Get pending invitees (for modal to disable)
GET /tournaments/1771234567890/pending-invitees

// Get all tournament participants
GET /tournaments/1771234567890/participants
```

### Use Case 4: View Your Tournament Invitations
```javascript
// Get all invitations (pending + accepted)
GET /tournaments/my-invitations

// Get only pending
GET /tournaments/my-invitations?status=pending

// Get only accepted  
GET /tournaments/my-invitations?status=accepted
```

---

## Error Handling Best Practices

### Client Implementation
```javascript
try {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        
        // Handle specific error codes
        if (error.code === 'DUPLICATE_TOURNAMENT') {
            // Use returned tournamentId for additional invites
            await inviteToExistingTournament(error.tournamentId, userIds);
        } else if (response.status === 403) {
            // Permission error - user is not creator
            console.error('Not authorized');
        } else if (response.status === 409) {
            // Conflict - duplicate
            console.error(error.message);
        } else {
            throw error;
        }
    }
    
    const success = await response.json();
    console.log(success.message);
    
} catch (error) {
    console.error('Network or parsing error:', error);
}
```

---

## Rate Limiting & Performance

- No explicit rate limiting currently implemented
- Duplicate checks use indexed query on (creator_id, name, start_date, end_date)
- Invitation filtering uses simple set operations for O(n) complexity
- Recommend caching friend lists client-side if multiple modals used

---

## Status Codes Summary

| Code | Meaning | Context |
|------|---------|---------|
| 200 | OK | Success |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | User not authorized (not creator) |
| 404 | Not Found | Tournament/invitation doesn't exist |
| 409 | Conflict | Duplicate tournament - use returned ID |
| 500 | Server Error | Database or processing error |

