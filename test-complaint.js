const Complaint = require('./models/Complaint');

async function test() {
    try {
        console.log('Testing complaint insert...');
        // user_id 1 assuming it exists
        await Complaint.create(1, 'Test Title', 'Test Desc', 'WiFi Issue', 'Medium', 'Room 1', null);
        console.log('Success!');
        process.exit(0);
    } catch(err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
test();
