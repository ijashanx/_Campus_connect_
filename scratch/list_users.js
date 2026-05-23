const db = require('../config/database');

async function listUsers() {
    try {
        const [users] = await db.query("SELECT id, username, email, role FROM users");
        console.log("Users in DB:", users);

        const [items] = await db.query("SELECT id, title, type, user_id FROM lost_found_items");
        console.log("Lost/Found Items in DB:", items);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

listUsers();
