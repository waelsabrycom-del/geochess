# Feature Implementation: Invite Remaining Friends to Duplicate Tournaments

## Summary
Allows users to invite additional friends (not yet invited) to an existing tournament with the same name and date, instead of showing an error. This enhances UX by enabling multiple invitation batches without recreating campaigns.

## Changes Made

### File 1: `/tournaments.js` (Backend)

#### Change 1: Duplicate Detection Response (Lines 45-62)
**Location**: `POST /tournaments/create-with-invitations`

**What Changed:**
- Query now returns `tournament_id` instead of just `COUNT(*)`
- HTTP status changed from `400` to `409` (Conflict)
- Response includes `code: 'DUPLICATE_TOURNAMENT'` and `tournamentId`

**Code:**
```javascript
const checkDuplicateSQL = `
    SELECT tournament_id FROM tournaments 
    WHERE creator_id = ? AND name = ? AND start_date = ? AND end_date = ?
    LIMIT 1
`;

if (result && result.tournament_id) {
    return res.status(409).json({ 
        success: false, 
        code: 'DUPLICATE_TOURNAMENT',
        tournamentId: result.tournament_id,
        message: 'بطولة بنفس الاسم والتاريخ موجودة بالفعل. يرجى تغيير الاسم أو التاريخ' 
    });
}
```

#### Change 2: New Endpoint - Invite Friends to Existing Tournament (Lines 297-520)
**Endpoint**: `POST /tournaments/:tournamentId/invite-friends`

**Authentication**: Required (Bearer token)

**Request Body:**
```json
{
    "inviteUserIds": [1, 2, 3]  // Array of user IDs to invite
}
```

**Response:**
```json
{
    "success": true,
    "invitationsSent": 3,
    "message": "تم إرسال 3 دعوة إضافية بنجاح"
}
```

**Logic:**
1. Verify tournament exists
2. Verify request user is tournament creator
3. Remove duplicates from invite list
4. Exclude tournament creator
5. Find users not already invited
6. Insert new invitation records
7. Return count of new invitations

**Edge Cases Handled:**
- Duplicate user IDs in request → deduplicated
- Tournament creator in invite list → filtered out
- User already invited → skipped
- No new users → returns 200 with `invitationsSent: 0`
- Unauthorized user → returns 403

---

### File 2: `/إنشاء بطولة جديدة.html` (Frontend)

#### Change 1: Helper Function - Find Existing Tournament (Lines 688-695)
```javascript
function findExistingTournamentInStorage(tournamentName, startDate, endDate) {
    const tournaments = JSON.parse(localStorage.getItem('upcomingTournaments')) || [];
    return tournaments.find(t =>
        t.name === tournamentName &&
        t.startDate === startDate &&
        t.endDate === endDate
    );
}
```
**Purpose**: Quickly check if tournament already exists in browser storage without API call

---

#### Change 2: New Function - Invite Friends to Existing Tournament (Lines 697-730)
```javascript
async function inviteFriendsToExistingTournament(tournamentId, inviteUserIds) {
    const API_URL = `http://${window.location.hostname}:3000/api`;
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
        throw new Error('لم تقم بتسجيل الدخول. يرجى تسجيل الدخول أولاً');
    }

    const response = await fetch(`${API_URL}/tournaments/${tournamentId}/invite-friends`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteUserIds })
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || `فشل في إرسال الدعوات: ${response.status}`);
    }

    return responseData;
}
```
**Purpose**: Call backend endpoint to send invitations to remaining friends for existing tournament

---

#### Change 3: Enhanced `createTournamentWithInvitations()` (Lines 760-876)
**New Logic for Friends Invite:**

1. **Check localStorage first** (Lines 760-773):
   ```javascript
   const existingTournament = isFriendsInvite
       ? findExistingTournamentInStorage(tournamentName, startDate, endDate)
       : null;

   if (existingTournament && existingTournament.id) {
       setActiveTournamentId(existingTournament.id);
       const inviteResult = await inviteFriendsToExistingTournament(
           existingTournament.id, 
           inviteUserIds
       );
       // Show success and return
   }
   ```

2. **Handle 409 Duplicate Error** (Lines 813-828):
   ```javascript
   if (errorData?.code === 'DUPLICATE_TOURNAMENT' && isFriendsInvite && errorData.tournamentId) {
       setActiveTournamentId(errorData.tournamentId);
       const inviteResult = await inviteFriendsToExistingTournament(
           errorData.tournamentId, 
           inviteUserIds
       );
       // Show success from additional invites
       return;
   }
   ```

3. **Handle localStorage duplicate** (Lines 859-872):
   ```javascript
   const existingStoredTournament = tournaments.find(t => 
       t.name === tournament.name && 
       t.startDate === tournament.startDate && 
       t.endDate === tournament.endDate
   );

   if (existingStoredTournament) {
       if (!isFriendsInvite) {
           throw new Error('بطولة بنفس الاسم والتاريخ موجودة بالفعل...');
       }
       setActiveTournamentId(existingStoredTournament.id);
   } else {
       tournaments.push(tournament);
       localStorage.setItem('upcomingTournaments', JSON.stringify(tournaments));
   }
   ```

---

#### Change 4: Enhanced `sendFriendsInvite()` (Lines 918-933)
**New Logic:**
- Before opening modal, check if tournament already exists locally
- If exists, set `activeTournamentId` so modal can load existing pending invitees
- This prevents showing invited friends as selectable

```javascript
function sendFriendsInvite() {
    if (!validateAllFields()) return;

    const tournamentName = document.getElementById('tournament-name').value.trim();
    const startDate = document.getElementById('tournament-start-date').value;
    const endDate = document.getElementById('tournament-end-date').value;
    const existingTournament = findExistingTournamentInStorage(tournamentName, startDate, endDate);

    if (existingTournament && existingTournament.id) {
        setActiveTournamentId(existingTournament.id);
    }

    openFriendsInviteModal();
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User fills form & clicks "دعوة الأصدقاء"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ sendFriendsInvite()             │
        │ 1. Check localStorage           │
        │ 2. Set activeTournamentId       │
        │ 3. Open modal                   │
        └───────────────┬──────────────────┘
                        │
                        ▼
      ┌──────────────────────────────────────┐
      │ Modal Opens                          │
      │ loadFriendsForTournamentInvite()     │
      │ - Loads friends list                 │
      │ - Fetches pending-invitees for      │
      │   activeTournamentId                 │
      │ - Marks already-invited as disabled │
      └───────────┬──────────────────────────┘
                  │
                  ▼
     ┌────────────────────────────────────┐
     │ User selects remaining friends     │
     │ Click "تأكيد"                       │
     │ confirmInviteFriendsToTournament() │
     └──────────┬───────────────────────┘
                │
                ▼
    ┌─────────────────────────────────┐
    │ createTournamentWithInvitations()│
    │ with inviteUserIds array        │
    └──────┬────────────┬────┬────────┘
           │            │    │
           ▼            │    ▼
    ┌─────────────┐    │  ┌──────────────────┐
    │Check        │    │  │Attempt to create  │
    │localStorage │    │  │tournament via API │
    │for existing │    │  │POST /create-with- │
    │tournament   │    │  │invitations        │
    └─────┬───────┘    │  └────┬─────────┬────┘
          │            │       │         │
    Found │            │       │    409 Duplicate
          ▼            │       ▼         ▼
    ┌─────────────┐    │  ┌──────────────────────┐
    │Invite via   │    │  │Error with tournament │
    │new endpoint │    │  │ID returned           │
    │            │    │  └────┬──────────────────┘
    └──────┬──────┘    │       │
           │            │  Use returned ID ▼
           │            │  ┌──────────────────────┐
           │            │  │Invite remaining      │
           │            │  │friends via endpoint  │
           │            │  └────┬──────────────────┘
           │            │       │
           └───────┬────┴───┬───┘
                   │        │
                   ▼        ▼
          ┌──────────────────────────┐
          │ inviteFriendsTo            │
          │ ExistingTournament()      │
          │ POST /:id/invite-friends  │
          └────────┬──────────────────┘
                   │
                   ▼
          ┌──────────────────────────┐
          │ Server filters out       │
          │ already-invited users    │
          │ Inserts new invitations  │
          │ Returns count            │
          └────────┬──────────────────┘
                   │
                   ▼
          ┌──────────────────────────┐
          │ Success message displayed│
          │ Modal closes             │
          │ User returns to form     │
          └──────────────────────────┘
```

---

## Testing Checklist

- [ ] Syntax validation: `node -c tournaments.js` passes
- [ ] Backend: POST to `/tournaments/create-with-invitations` with existing tournament returns 409
- [ ] Backend: New endpoint `/tournaments/{id}/invite-friends` accepts requests with Bearer token
- [ ] Backend: Endpoint filters out already-invited users correctly
- [ ] Frontend: `findExistingTournamentInStorage()` returns tournament if exists
- [ ] Frontend: Modal opens with `activeTournamentId` set
- [ ] Frontend: Modal disables friends that are already invited
- [ ] Frontend: Modal allows selecting remaining friends
- [ ] Frontend: Submitting calls correct API endpoint
- [ ] Frontend: Success message shows count of new invitations
- [ ] Frontend: Modal closes after success
- [ ] End-to-end: Can invite batches of friends to same tournament

---

## Deployment Notes

1. **No database migrations needed** - Uses existing `tournament_invitations` table
2. **No breaking changes** - Original create-tournament flow works as before
3. **Backward compatible** - Old clients can still use the system
4. **Error codes** - Added HTTP 409 status for duplicates; clients checking `!response.ok` will handle it
5. **localStorage** - Existing auto-sync logic continues to work

---

## Future Enhancements

Possible future improvements:
1. Show count of already-invited vs remaining friends before modal opens
2. Batch multiple tournament invitation operations
3. Search/filter friends by name in modal
4. Remember last invited friends for quick selection
5. SMS/Email notifications for newly invited friends
