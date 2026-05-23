const pool = require('../config/database');

async function run() {
    try {
        const [rows] = await pool.query("DESCRIBE lost_found_items");
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
