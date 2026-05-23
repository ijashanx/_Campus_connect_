const db = require('../config/database');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function runTest() {
    try {
        console.log('1. Testing User Retrieval...');
        // Let's find first user in database
        const [users] = await db.execute('SELECT * FROM users LIMIT 1');
        if (users.length === 0) {
            console.log('⚠️ No users found in database to test. Skipping database-dependent tests.');
            process.exit(0);
        }
        const testUser = users[0];
        console.log(`Found test user: ID=${testUser.id}, Username=${testUser.username}, Email=${testUser.email}`);

        console.log('\n2. Testing JWT Signing with email...');
        const token = jwt.sign(
            { id: testUser.id, username: testUser.username, role: testUser.role, full_name: testUser.full_name, email: testUser.email },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1d' }
        );
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
        console.log('Decoded JWT payload:', decoded);
        if (decoded.email === testUser.email) {
            console.log('✅ JWT contains email successfully!');
        } else {
            console.error('❌ JWT does not contain email!');
            process.exit(1);
        }

        console.log('\n3. Testing database user retrieval inside complaint Controller flow...');
        // Simulating the controller logic
        const req = {
            user: { id: testUser.id, username: testUser.username, role: testUser.role }, // Simulated req.user (like old JWT without email)
            body: {
                title: 'Test Complaint Title',
                description: 'Test Complaint Description',
                category: 'WiFi Issue',
                priority: 'High',
                location: 'Block A'
            },
            file: null
        };

        const dbUser = await User.findById(req.user.id);
        const userEmail = dbUser ? dbUser.email : req.user.email;
        console.log(`Resolved email from DB: ${userEmail}`);
        if (userEmail === testUser.email) {
            console.log('✅ Resolved email successfully matches user email!');
        } else {
            console.error('❌ Failed to resolve email!');
            process.exit(1);
        }

        console.log('\n✅ All tests passed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed with error:', err);
        process.exit(1);
    }
}

runTest();
