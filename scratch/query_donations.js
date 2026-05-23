const pool = require('../config/database');

async function run() {
    try {
        const [rows] = await pool.query("SELECT d.*, u.username as creator_username, r.username as requester_username, dn.username as donor_username FROM donations d JOIN users u ON d.user_id = u.id LEFT JOIN users r ON d.requester_id = r.id LEFT JOIN users dn ON d.donor_id = dn.id");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
