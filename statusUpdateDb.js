const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateStatusDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to MySQL. Updating schema for Status Tracking System...');

        // Convert existing 'active' to 'Open' and 'resolved' to 'Resolved' for Lost & Found
        console.log('Updating lost_found_items table...');
        await connection.query(`ALTER TABLE lost_found_items MODIFY COLUMN status VARCHAR(255);`);
        await connection.query(`UPDATE lost_found_items SET status = 'Open' WHERE status = 'active';`);
        await connection.query(`UPDATE lost_found_items SET status = 'Resolved' WHERE status = 'resolved';`);
        await connection.query(`ALTER TABLE lost_found_items MODIFY COLUMN status ENUM('Open', 'Claimed', 'Resolved') DEFAULT 'Open';`);

        // Convert existing 'available' to 'Available' and 'claimed' to 'Donated' for Donations
        console.log('Updating donations table...');
        await connection.query(`ALTER TABLE donations MODIFY COLUMN status VARCHAR(255);`);
        await connection.query(`UPDATE donations SET status = 'Available' WHERE status = 'available';`);
        await connection.query(`UPDATE donations SET status = 'Donated' WHERE status = 'claimed';`);
        await connection.query(`ALTER TABLE donations MODIFY COLUMN status ENUM('Available', 'Requested', 'Donated') DEFAULT 'Available';`);

        try {
            await connection.query(`ALTER TABLE donations ADD COLUMN requester_id INT DEFAULT NULL;`);
            await connection.query(`ALTER TABLE donations ADD CONSTRAINT fk_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL;`);
        } catch(e) {
            if (e.errno === 1060) {
                console.log('Column requester_id already exists.');
            } else {
                throw e;
            }
        }

        console.log('Creating notifications table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                link VARCHAR(255),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Database schema update completed successfully.');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error updating the database:', error);
        process.exit(1);
    }
}

updateStatusDb();
