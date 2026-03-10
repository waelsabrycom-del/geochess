# Implementation: Invite Remaining Friends for Duplicate Tournaments

## Overview
When a user tries to create a tournament with the same name and date as an existing tournament they created, instead of blocking the operation, the system now allows them to invite remaining friends (those not already invited) to the existing tournament.

## Key Changes

### Backend (`tournaments.js`)

#### 1. Updated Duplicate Detection Response (Lines 45-62)
**Changed from:**
- Returns HTTP 400 with only error message
- Returns `count` from database query

**Changed to:**
- Returns HTTP 409 (Conflict) status code
- Returns `tournament_id` of the existing tournament
- Includes `code: 'DUPLICATE_TOURNAMENT'` for client-side handling
- Allows client to reuse the existing tournament

```javascript
if (result && result.tournament_id) {
    return res.status(409).json({ 
        success: false, 
        code: 'DUPLICATE_TOURNAMENT',
        tournamentId: result.tournament_id,
        message: 'بطولة بنفس الاسم والتاريخ موجودة بالفعل...' 
    });
}
```

#### 2. New Endpoint: `POST /:tournamentId/invite-friends` (Lines 297-520)
**Purpose:** Invite additional friends to an existing tournament, excluding those already invited.

**Logic Flow:**
1. Verify tournament exists and user is the creator
2. Deduplicate invite user IDs
3. Query existing invitations for the tournament
4. Filter out users who were already invited
5. Fetch remaining user details
6. Insert new invitation records with 'pending' status

**Features:**
- Removes duplicates from input list
- Excludes the tournament creator
- Checks for already-invited users
- Returns count of newly sent invitations
- Returns success message with count

### Frontend (`إنشاء بطولة جديدة.html`)

#### 1. New Helper Function: `findExistingTournamentInStorage()` (Lines 688-695)
Searches localStorage for a tournament matching the name and dates provided.
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

#### 2. New Function: `inviteFriendsToExistingTournament()` (Lines 697-730)
Calls the new backend endpoint to invite remaining friends.
```javascript
async function inviteFriendsToExistingTournament(tournamentId, inviteUserIds) {
    const API_URL = `http://${window.location.hostname}:3000/api`;
    const authToken = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_URL}/tournaments/${tournamentId}/invite-friends`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteUserIds })
    });
    // ... error handling and response
}
```

#### 3. Updated: `createTournamentWithInvitations()` (Lines 760-876)
**New Behavior for Friends Invite:**
1. Check if tournament already exists in localStorage
   - If yes, reuse it for inviting remaining friends
2. Attempt to create via API
3. On 409 (DUPLICATE_TOURNAMENT) response:
   - Extract `tournamentId` from response
   - Call `inviteFriendsToExistingTournament()` to send invites
   - Close modal and show success message
4. On localStorage duplicate:
   - Set `activeTournamentId` for modal to use
   - User can then invite remaining friends

#### 4. Updated: `sendFriendsInvite()` (Lines 918-933)
**New Behavior:**
- Checks localStorage for existing tournament before opening modal
- Sets `activeTournamentId` if tournament already exists
- Opens invite modal with `activeTournamentId` set (modal loads pending invitees for this tournament)

## User Flow

### Scenario: Inviting Remaining Friends to Duplicate Tournament

1. **User enters tournament form** with same name & dates as existing tournament
2. **Clicks "دعوة الأصدقاء"** (Invite Friends)
3. **System checks:**
   - If tournament exists in localStorage, sets it as active
   - Opens modal with friends list
   - Friends already invited appear as "بانتظار الرد" (Pending) - disabled checkboxes
4. **User selects remaining friends** and clicks "تأكيد"
5. **Two possible paths:**
   - **Path A (Tournament in storage):** API call to `/tournaments/{id}/invite-friends` → sends invites to remaining friends
   - **Path B (Tournament only on server):** API attempts creation → gets 409 → uses returned tournamentId → calls `/invite-friends` → sends invites
6. **Success message** shows count of newly sent invitations
7. **Modal closes**, user returns to form

## Error Handling

### Client-side:
- Catches API 409 response with `code: 'DUPLICATE_TOURNAMENT'`
- Extracts `tournamentId` from response
- Falls back to inviting friends to existing tournament
- Shows appropriate success/error messages

### Server-side:
- Validates tournament exists and user is creator
- Returns 403 if user is not tournament creator
- Returns 400 if no valid user IDs provided
- Returns 200 with `invitationsSent: 0` if all users already invited
- Handles duplicate insertion gracefully

## Benefits

1. **Better UX:** No error message blocking user workflow
2. **Convenience:** Allows multiple invitation batches to same tournament
3. **Flexibility:** Can invite more friends later without recreating tournament
4. **Data Integrity:** Prevents duplicate invitations via database checks
5. **Backward Compatible:** General invite flow unchanged, works for new tournaments as before

## Database Schema (No Changes Required)
Uses existing `tournament_invitations` table with `status` column already supporting 'pending', 'accepted', 'rejected' states.
