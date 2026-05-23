const pool = require('./config/database');

async function updateDatabase() {
    try {
        console.log("Creating 'bookmarks' table...");
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    item_type ENUM('Note', 'Donation', 'LostFound') NOT NULL,
                    item_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_bookmark (user_id, item_type, item_id)
                )
            `);
            console.log("Success.");
        } catch (e) {
            console.log("Error creating bookmarks table:", e.message);
        }

        console.log("Feature Database updates complete.");
    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        process.exit();
    }
}

updateDatabase();
