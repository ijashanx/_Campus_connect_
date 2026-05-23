const db = require('../config/database');

async function showCreate() {
    try {
        const [rows] = await db.query("SHOW CREATE TABLE bookmarks");
        console.log(rows[0]['Create Table']);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

showCreate();
