const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'chess_game.db'), (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        return;
    }
});

const tournamentId = 1771622687179;

const query = `
    SELECT COUNT(*) as count
    FROM tournament_invitations
    WHERE tournament_id = ? AND status = 'accepted'
`;

db.get(query, [tournamentId], (err, row) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }

    const participantCount = row.count;
    const bracketsCount = Math.ceil(participantCount / 2);
    
    console.log('📊 Tournament Invitations:');
    console.log(`   Accepted invitations: ${participantCount}`);
    console.log(`   Calculated brackets: Math.ceil(${participantCount}/2) = ${bracketsCount}`);
    console.log(`   Expected display: عدد الأقواس: ${bracketsCount}`);
    console.log(`   But showing: عدد الأقواس: 2`);
    console.log(`   \n🔴 Issue: Should show ${bracketsCount}, but showing 2`);
    
    db.close();
});
