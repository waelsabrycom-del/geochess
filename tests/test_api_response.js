const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'chess_game.db'));
const SECRET_KEY = 'your-secret-key-change-in-production';

// Get a test user
db.get('SELECT id FROM users LIMIT 1', [], (err, user) => {
    if (err || !user) {
        console.error('No users found');
        db.close();
        return;
    }

    const token = jwt.sign({ id: user.id, type: 'player' }, SECRET_KEY, { expiresIn: '24h' });
    console.log('Token:', token);
    
    // Now test the API
    const http = require('http');
    const options = {
        hostname: 'localhost',
        port: 3000,  
        path: '/api/tournaments/1771622687179/participants',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('\n🧪 API Response:');
                console.log(JSON.stringify(result, null, 2));
            } catch (err) {
                console.error('Parse error:', err.message);
            }
            db.close();
        });
    });

    req.on('error', (err) => {
        console.error('Request error:', err.message);
        db.close();
    });

    req.end();
});
