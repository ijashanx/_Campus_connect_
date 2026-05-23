const pool = require('./config/database');

async function updateDatabase() {
    try {
        console.log("Adding 'category' to lost_found_items...");
        try {
            await pool.execute("ALTER TABLE lost_found_items ADD COLUMN category VARCHAR(100) DEFAULT 'Other'");
            console.log("Success.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }

        console.log("Adding 'category' to donations...");
        try {
            await pool.execute("ALTER TABLE donations ADD COLUMN category VARCHAR(100) DEFAULT 'Other'");
            console.log("Success.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }

        console.log("Adding 'downloads' to notes...");
        try {
            await pool.execute("ALTER TABLE notes ADD COLUMN downloads INT DEFAULT 0");
            console.log("Success.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }
        
        console.log("Database update complete.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

updateDatabase();
