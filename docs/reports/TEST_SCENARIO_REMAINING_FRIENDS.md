# Test Scenario: Inviting Remaining Friends to Duplicate Tournament

## Test Case 1: Duplicate Tournament in localStorage Only

### Setup
1. User is logged in (User A)
2. User A has 5 friends in the system
3. Tournament "البطولة الأولى" with start date "2024-12-20" exists in `upcomingTournaments` localStorage
4. Tournament was created by User A and some friends were already invited

### Test Steps
1. **Navigate to**: "إنشاء بطولة جديدة" page
2. **Fill form**:
   - Tournament Name: "البطولة الأولى"
   - Start Date: "2024-12-20"
   - Other fields: any values
3. **Click**: "دعوة الأصدقاء" button
4. **Expected Result**:
   - Modal opens with friends list
   - Apply `setActiveTournamentId(existingTournament.id)` from localStorage
   - Modal loads with "pending-invitees" from server: shows which friends already invited as disabled
   - User can select only remaining (non-invited) friends
5. **Select remaining friends** and click "تأكيد"
6. **Expected Result**:
   - Shows loading message "⏳ جاري إرسال الدعوات للأصدقاء..."
   - Calls `inviteFriendsToExistingTournament(tournamentId, selectedIds)`
   - Success message: "✅ تم إرسال 2 دعوة إضافية بنجاح!"
   - Modal closes

---

## Test Case 2: Duplicate Tournament on Server (Not in localStorage)

### Setup
1. User is logged in (User B)
2. Browser localStorage has been cleared
3. Tournament "البطولة الثانية" with start date "2024-12-21" exists in database
4. Tournament was created by User B previously
5. Some friends are already invited to this tournament in database

### Test Steps
1. **Navigate to**: "إنشاء بطولة جديدة" page
2. **Fill form**:
   - Tournament Name: "البطولة الثانية"
   - Start Date: "2024-12-21"
   - Other fields: any values
3. **Click**: "دعوة الأصدقاء" button
4. **Expected Result**:
   - Modal opens
   - `findExistingTournamentInStorage()` returns null (not in localStorage)
   - Modal hydrates `activeTournamentId` from localStorage if available, or null
   - All friends show as non-disabled (no pending invitees loaded yet since activeTournamentId was null)
5. **User selects friends** and clicks "تأكيد"
6. **Expected Result**:
   - Calls `createTournamentWithInvitations(selectedIds)`
   - POST to `/tournaments/create-with-invitations` fails with:
     ```json
     {
       "success": false,
       "code": "DUPLICATE_TOURNAMENT",
       "tournamentId": <existing-id>,
       "status": 409
     }
     ```
   - Client catches 409 with `code === 'DUPLICATE_TOURNAMENT'`
   - Calls `inviteFriendsToExistingTournament(tournamentId, selectedIds)`
   - Success message shows additional invitations sent
   - Modal closes

---

## Test Case 3: New Tournament (No Duplicate)

### Setup
1. User is logged in (User C)
2. No tournament with name "البطولة الجديدة" on "2024-12-22"

### Test Steps
1. **Fill form** with unique tournament data
2. **Click**: "دعوة الأصدقاء"
3. **Expected Result**:
   - Modal opens normally
   - `findExistingTournamentInStorage()` returns null
   - No pending invitees shown (all friends selectable)
4. **Select friends** and click "تأكيد"
5. **Expected Result**:
   - Normal flow: POST to `/tournaments/create-with-invitations` succeeds
   - New tournament created in database
   - Invitations sent to selected friends
   - Success message shows creation + invitations
   - Modal closes and redirects to profile

---

## Test Case 4: General Invite (Not Friends)

### Setup
1. User logged in
2. Tournament exists or not (doesn't matter for this flow)

### Test Steps
1. **Fill form** with any tournament data
2. **Click**: "إرسال دعوات عامة" button
3. **Expected Result**:
   - `createTournamentWithInvitations(null)` is called
   - `isFriendsInvite = false`
   - Skips `findExistingTournamentInStorage()` check
   - Attempts to create tournament via API normally
   - If duplicate error returned (but `isFriendsInvite = false`):
     - No invite-friends fallback
     - Shows error: "بطولة بنفس الاسم والتاريخ موجودة بالفعل..."

---

## Expected Visible Behavior

### Modal State After Opening for Duplicate
```
Friends List Modal (if existing tournament in storage):
├─ Friend 1 (Avatar) 
│  └─ "بانتظار الرد" badge + ☐ disabled
├─ Friend 2 (Avatar)
│  └─ "بانتظار الرد" badge + ☐ disabled  
├─ Friend 3 (Avatar)
│  └─ ☑ (selectable, not disabled)
├─ Friend 4 (Avatar)
│  └─ ☑ (selectable, not disabled)
├─ Friend 5 (Avatar)
│  └─ "بانتظار الرد" badge + ☐ disabled
└─ Selected: 2 محدد
   [تأكيد الدعوة]
```

---

## Database Verification

### SQL to Check Invitations
```sql
-- Check all invitations for a tournament
SELECT 
    ti.id,
    ti.status,
    u.username,
    ti.created_at,
    ti.responded_at
FROM tournament_invitations ti
JOIN users u ON ti.to_user_id = u.id
WHERE ti.tournament_id = <tournament_id>
ORDER BY ti.created_at DESC;

-- Check if user was already invited
SELECT COUNT(*) as already_invited
FROM tournament_invitations
WHERE tournament_id = <tournament_id> AND to_user_id = <user_id>;
```

---

## Integration Points Verification

### 1. activeTournamentId Flow
- [ ] Set in `sendFriendsInvite()` before modal opens
- [ ] Used in modal's `loadFriendsForTournamentInvite()` to fetch pending-invitees
- [ ] Passed to `inviteFriendsToExistingTournament()` function

### 2. API Error Response Handling
- [ ] Server returns HTTP 409 on duplicate
- [ ] Response includes `code: 'DUPLICATE_TOURNAMENT'` + `tournamentId`
- [ ] Client checks `response.ok === false` and parses `errorData.code`
- [ ] Client extracts `tournamentId` and calls invite-friends endpoint

### 3. localStorage Sync
- [ ] Duplicate check against `upcomingTournaments`
- [ ] `setActiveTournamentId()` saves to localStorage
- [ ] `findExistingTournamentInStorage()` reads from localStorage
- [ ] On success, tournament data is NOT re-added if duplicate in storage

---

## Console Log Verification

### Expected Logs on Successful Remaining Friend Invite

```
🚀 بدء إرسال دعوات الأصدقاء...
✅ تم التحقق من جميع الحقول بنجاح
📋 البيانات المجمعة: {tournamentName, startDate, endDate, participants}
(Checking localStorage for existing tournament)
✅ تم إرسال 3 دعوة إضافية بنجاح!
```

### Expected Logs on Server Duplicate Detection

```
🔍 التحقق من وجود بطولة مكررة...
⚠️ بطولة بنفس الاسم والتاريخ موجودة بالفعل
(Returns 409 with DUPLICATE_TOURNAMENT code and tournamentId)
```

---

## Rollback/Fix Instructions

If something breaks:

1. **Modal not showing pending invitees:** Check that `activeTournamentId` is set before modal opens → Check `loadFriendsForTournamentInvite()` is fetching `/tournaments/{id}/pending-invitees`

2. **Duplicate check not working:** Check that backend query returns `tournament_id` field → Check client error handling looks for `.tournamentId` in response

3. **Friends appear selectable when they shouldn't:** Check `renderInviteFriendsList()` passes `pendingIds` from API response → Check checkboxes have `disabled = isPending`

4. **Extra invitations not sending:** Check `inviteFriendsToExistingTournament()` is being called with correct `tournamentId` and `inviteUserIds` array → Check API endpoint filtering out already-invited users
