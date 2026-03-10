# Quick Reference: Testing the Invite Remaining Friends Feature

## Syntax Validation

### Check Backend JavaScript
```bash
node -c tournaments.js
# Expected: No output = success, any error = failure
```

### Check Frontend HTML/JavaScript
```bash
# Visual inspection in VS Code for syntax errors
# Open: إنشاء بطولة جديدة.html
# Look for red squiggles in search results
```

---

## API Testing (Using curl or Postman)

### 1. Create Tournament (First Time)
```bash
curl -X POST http://localhost:3000/api/tournaments/create-with-invitations \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentName": "البطولة الاختبار",
    "prizes": "جوائز ذهبية",
    "startDate": "2024-12-25",
    "endDate": "2024-12-30",
    "participants": 16,
    "inviteUserIds": [2, 3, 4, 5]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "tournament": { "id": 1771234567890, "name": "..." },
  "invitationsSent": 4
}
```

---

### 2. Attempt Duplicate Tournament Creation
```bash
curl -X POST http://localhost:3000/api/tournaments/create-with-invitations \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentName": "البطولة الاختبار",
    "prizes": "جوائز ذهبية",
    "startDate": "2024-12-25",
    "endDate": "2024-12-30",
    "participants": 16,
    "inviteUserIds": [6, 7, 8]
  }'
```

**Expected Response (409):**
```json
{
  "success": false,
  "code": "DUPLICATE_TOURNAMENT",
  "tournamentId": 1771234567890,
  "message": "بطولة بنفس الاسم والتاريخ موجودة بالفعل..."
}
```

---

### 3. Invite Remaining Friends to Existing Tournament
```bash
curl -X POST http://localhost:3000/api/tournaments/1771234567890/invite-friends \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteUserIds": [6, 7, 8]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "invitationsSent": 3,
  "message": "تم إرسال 3 دعوة إضافية بنجاح"
}
```

---

### 4. Get Pending Invitees (What Modal Uses)
```bash
curl -X GET http://localhost:3000/api/tournaments/1771234567890/pending-invitees \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "inviteeIds": [2, 3, 4, 5]
}
```

---

### 5. Get Participants
```bash
curl -X GET http://localhost:3000/api/tournaments/1771234567890/participants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "participants": [
    {
      "id": 2,
      "username": "Player2",
      "avatar_url": "...",
      "is_online": 1
    }
  ],
  "count": 1
}
```

---

## Database Testing

### Check Tournament Exists
```sql
SELECT tournament_id, name, creator_id, start_date, end_date 
FROM tournaments 
WHERE name = 'البطولة الاختبار' AND start_date = '2024-12-25'
LIMIT 1;
```

### Check Invitations Sent
```sql
SELECT ti.id, u.username, ti.status, ti.created_at
FROM tournament_invitations ti
JOIN users u ON ti.to_user_id = u.id
WHERE ti.tournament_id = 1771234567890
ORDER BY ti.created_at DESC;
```

### Check if User Already Invited
```sql
SELECT COUNT(*) as invitation_count
FROM tournament_invitations
WHERE tournament_id = 1771234567890 AND to_user_id = 2;
```

---

## Browser Console Testing

### Test JavaScript Functions

#### 1. Find Existing Tournament in Storage
```javascript
const result = findExistingTournamentInStorage('البطولة الاختبار', '2024-12-25', '2024-12-30');
console.log('Found:', result);
```

Expected: Tournament object with id, or undefined

#### 2. Invite Friends to Existing Tournament
```javascript
const result = await inviteFriendsToExistingTournament(1771234567890, [6, 7, 8]);
console.log('Invited:', result);
```

Expected: `{ success: true, invitationsSent: 3, message: '...' }`

#### 3. Check Active Tournament ID
```javascript
console.log('Active Tournament ID:', activeTournamentId);
console.log('From localStorage:', localStorage.getItem('activeTournamentId'));
```

#### 4. Set Active Tournament (simulate modal opening)
```javascript
setActiveTournamentId(1771234567890);
console.log('Set to:', activeTournamentId);
```

#### 5. Load Friends for Tournament Invite Modal
```javascript
await loadFriendsForTournamentInvite();
// Check console for "Loading friends..." messages
// Check modal for disabled friends
```

---

## Step-by-Step Manual Test

### Scenario: Create Tournament, Get Duplicate, Invite Remaining

**Step 1:** Open browser DevTools Console (F12)

**Step 2:** Navigate to "إنشاء بطولة جديدة" page

**Step 3:** Fill form:
- Tournament Name: "اختبار البطولة"
- Start Date: "2024-12-25" (use future date)
- End Date: "2024-12-30"
- Other fields: your choice

**Step 4:** Click "دعوة الأصدقاء" button

**Step 5:** In modal:
- Select friends: User 1, User 2
- Click "تأكيد الدعوة"

**Step 6:** Check console logs:
```
🚀 بدء إرسال دعوات الأصدقاء...
✅ تم التحقق من جميع الحقول بنجاح
📋 البيانات المجمعة: {...}
📊 استجابة API: 200 OK
✅ نتيجة العملية: {...}
✅ تم إرسال 2 دعوة بنجاح
```

**Step 7:** Clear form and fill with SAME date/name but different prizes

**Step 8:** Click "دعوة الأصدقاء" again

**Step 9:** In modal, you should see:
- User 1: "بانتظار الرد" badge + disabled checkbox
- User 2: "بانتظار الرد" badge + disabled checkbox
- Other users: selectable checkboxes

**Step 10:** Select User 3 and User 4

**Step 11:** Click "تأكيد الدعوة"

**Step 12:** Check console for:
```
✅ تم إرسال 2 دعوة إضافية بنجاح!
```

**Step 13:** Verify in database all 4 users have invitations to same tournament

---

## Troubleshooting Checklist

### Modal Shows All Friends as Selectable (Expecting Some Disabled)
- [ ] Check if `activeTournamentId` is set before modal opens
- [ ] Check if `/tournaments/{id}/pending-invitees` returns correct user IDs
- [ ] Check if `renderInviteFriendsList()` receives `pendingIds` Set
- [ ] Check if `isPending` variable is true for disabled friends
- [ ] Verify `disabled` attribute is set on checkbox

### Duplicate Not Detected (Should Get 409)
- [ ] Verify tournament exists in database for same creator/name/dates
- [ ] Check that duplicate-check query is running (check server logs)
- [ ] Verify server returns 409 status code (not 200 or 400)
- [ ] Check that response includes `code: 'DUPLICATE_TOURNAMENT'`

### Invitations Not Sending to Remaining Friends
- [ ] Verify you have selected friends with unchecked boxes
- [ ] Check server logs for "invite-friends" endpoint calls
- [ ] Verify `inviteUserIds` array is non-empty
- [ ] Check that already-invited users were filtered out
- [ ] Verify authorization token is valid

### Active Tournament ID Not Persisting
- [ ] Check localStorage for `activeTournamentId` key
- [ ] Verify `setActiveTournamentId()` is called with valid ID
- [ ] Check that modal's `loadFriendsForTournamentInvite()` uses the stored ID
- [ ] Ensure page doesn't refresh unexpectedly

### Success Message Not Showing
- [ ] Check if `showTopNotification()` function exists
- [ ] Verify response from server includes message
- [ ] Check for JavaScript errors in console
- [ ] Verify modal close happens after message display

---

## Success Indicators

✅ **Backend Ready:**
- `node -c tournaments.js` returns no errors
- Server starts without error messages
- Can reach tournament endpoints

✅ **Frontend Ready:**
- No red squiggles in HTML file
- Console logs show correct function calls
- Modal displays friends list correctly

✅ **Integration Ready:**
- Duplicate detection returns 409 with correct fields
- Invite-friends endpoint accepts requests
- Database shows new invitations inserted
- Modal reflects pending status correctly

✅ **Feature Ready:**
- Can create tournament with invites
- Duplicate attempt triggers fallback to invite-friends
- Can invite additional friends in second batch
- Database shows all invitations linked to same tournament
- No error messages in browser console

---

## Performance Notes

- Duplicate check: **O(1)** - indexed query on (creator_id, name, dates)
- Get pending invitees: **O(n)** where n = number of pending invitees
- Invite friends: **O(m)** where m = number of new friends to invite
- Modal opening: **O(f + p)** where f = friends count, p = pending count

For tournaments with 100+ invitations, consider implementing:
- Pagination for friends list modal
- Batch insertion of invitations (25 at a time)
- Connection pooling in database

---

## Version Info

- **Feature Version**: 1.0
- **Requires**: Node.js (Express), SQLite3, Vanilla JS, Modern Browser
- **Backward Compatible**: Yes, all existing features work
- **Breaking Changes**: No
- **Database Migration**: No
