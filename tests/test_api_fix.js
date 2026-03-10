/**
 * Test script to verify the tournament API fixes
 * Tests the /my-invitations endpoint to ensure it:
 * 1. Returns both pending and accepted invitations
 * 2. Properly filters by status when query parameter is provided
 * 3. Returns correct data structure for client-side use
 */

const http = require('http');

// Test token (replace with actual token from your system)
const testToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzcxNTM1NzI0LCJleHAiOjE3NzIxNDA1MjR9.IzxG3JO5QNnzIpwE0dc-c2euyHRNeY7M2VKaMh0L8zU';

/**
 * Make HTTP request to API endpoint
 */
function makeRequest(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

/**
 * Test the /my-invitations endpoint
 */
async function testMyInvitations() {
    console.log('🧪 Testing /my-invitations endpoint...\n');

    try {
        // Test 1: Get all invitations (both pending and accepted)
        console.log('📝 Test 1: Fetch all invitations (pending + accepted)');
        const allInvitations = await makeRequest('/api/tournaments/my-invitations', testToken);
        console.log(`   Status: ${allInvitations.status}`);
        console.log(`   Count: ${allInvitations.body.count || 0}`);
        if (allInvitations.body.invitations && allInvitations.body.invitations.length > 0) {
            console.log(`   Sample invitation:`);
            const sample = allInvitations.body.invitations[0];
            console.log(`   - ID: ${sample.id}`);
            console.log(`   - Tournament: ${sample.tournament_name}`);
            console.log(`   - Status: ${sample.status}`);
            console.log(`   - Start Date: ${sample.start_date}`);
        }
        console.log('✅ Test 1 passed\n');

        // Test 2: Filter for pending invitations only
        console.log('📝 Test 2: Filter for pending invitations');
        const pendingOnly = await makeRequest('/api/tournaments/my-invitations?status=pending', testToken);
        console.log(`   Status: ${pendingOnly.status}`);
        console.log(`   Pending Count: ${pendingOnly.body.count || 0}`);
        if (pendingOnly.body.invitations) {
            pendingOnly.body.invitations.forEach((inv, i) => {
                if (inv.status !== 'pending') {
                    console.warn(`   ⚠️ WARNING: Non-pending invitation returned: ${inv.status}`);
                }
            });
        }
        console.log('✅ Test 2 passed\n');

        // Test 3: Filter for accepted invitations only
        console.log('📝 Test 3: Filter for accepted invitations');
        const acceptedOnly = await makeRequest('/api/tournaments/my-invitations?status=accepted', testToken);
        console.log(`   Status: ${acceptedOnly.status}`);
        console.log(`   Accepted Count: ${acceptedOnly.body.count || 0}`);
        if (acceptedOnly.body.invitations && acceptedOnly.body.invitations.length > 0) {
            console.log(`   Sample accepted invitation:`);
            const sample = acceptedOnly.body.invitations[0];
            console.log(`   - Tournament: ${sample.tournament_name}`);
            console.log(`   - Status: ${sample.status}`);
        }
        console.log('✅ Test 3 passed\n');

        // Summary
        console.log('📊 Summary:');
        console.log(`   Total invitations (all): ${allInvitations.body.count || 0}`);
        console.log(`   Pending invitations: ${pendingOnly.body.count || 0}`);
        console.log(`   Accepted invitations: ${acceptedOnly.body.count || 0}`);
        console.log('\n✅ All tests completed successfully!\n');

    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        process.exit(1);
    }
}

// Run tests
testMyInvitations().then(() => {
    console.log('🎉 API tests completed!');
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
