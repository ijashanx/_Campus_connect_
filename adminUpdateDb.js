const pool = require('./config/database');

async function updateDatabase() {
    try {
        console.log("Adding 'status' to users...");
        try {
            await pool.execute("ALTER TABLE users ADD COLUMN status ENUM('Active', 'Suspended', 'Banned') DEFAULT 'Active'");
            console.log("Success.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }

        console.log("Creating 'reports' table...");
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    reporter_id INT NOT NULL,
                    item_type ENUM('LostFound', 'Donation', 'Note', 'Complaint', 'User') NOT NULL,
                    item_id INT NOT NULL,
                    reason VARCHAR(255) NOT NULL,
                    status ENUM('Pending', 'Resolved', 'Ignored') DEFAULT 'Pending',
                    admin_remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log("Success.");
        } catch (e) {
            console.log("Error creating reports table:", e.message);
        }

        console.log("Creating 'activity_logs' table...");
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    admin_id INT NOT NULL,
                    action_type VARCHAR(100) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log("Success.");
        } catch (e) {
            console.log("Error creating activity_logs table:", e.message);
        }

        console.log("Admin Database updates complete.");
    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        process.exit();
    }
}

updateDatabase();
