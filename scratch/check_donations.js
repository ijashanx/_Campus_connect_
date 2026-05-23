const pool = require('../config/database');

async function check() {
    try {
        const [cols] = await pool.execute("DESCRIBE donations");
        console.log("DONATIONS COLUMNS:");
        console.log(cols);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
