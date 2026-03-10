const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tournaments/1771622687179/participants',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer test',
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log('🧪 API Response:', JSON.stringify(result, null, 2));
            console.log('\n📊 Summary:');
            console.log(`   participantCount: ${result.participantCount}`);
            console.log(`   bracketsCount: ${result.bracketsCount}`);
            console.log(`   total in array: ${result.participants ? result.participants.length : 0}`);
        } catch (err) {
            console.error('Parse error:', err.message);
        }
    });
});

req.on('error', (err) => {
    console.error('Request error:', err.message);
});

req.end();
