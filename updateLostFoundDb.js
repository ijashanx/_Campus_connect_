const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to MySQL. Modifying lost_found_items table...');

        const columnsToAdd = [
            'ADD COLUMN hidden_details TEXT DEFAULT NULL',
            'ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 0',
            'ADD COLUMN report_count INT NOT NULL DEFAULT 0'
        ];

        for (let col of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE lost_found_items ${col};`);
                console.log(`Successfully executed: ALTER TABLE lost_found_items ${col}`);
            } catch (err) {
                // Ignore duplicate column errors (ER_DUP_FIELDNAME - 1060)
                if (err.errno === 1060) {
                    console.log(`Column already exists, skipping: ${col}`);
                } else {
                    console.error(`Error executing ${col}:`, err);
                }
            }
        }

        // Set existing items to approved = 1 so existing data doesn't disappear
        try {
            await connection.query(`UPDATE lost_found_items SET is_approved = 1;`);
            console.log('Successfully set existing items to is_approved = 1');
        } catch (err) {
            console.error('Error updating existing items:', err);
        }

        console.log('Creating lost_found_claims table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS lost_found_claims (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                claimer_id INT NOT NULL,
                proof_color VARCHAR(255) NOT NULL,
                proof_location VARCHAR(255) NOT NULL,
                proof_description TEXT NOT NULL,
                proof_image_url VARCHAR(255) DEFAULT NULL,
                status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES lost_found_items(id) ON DELETE CASCADE,
                FOREIGN KEY (claimer_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('Successfully created lost_found_claims table.');

        await connection.end();
        console.log('Database migration successfully completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}

updateDatabase();
