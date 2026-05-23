const mysql = require('mysql2/promise');
require('dotenv').config();

async function optimizeAndFix() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to MySQL. Optimizing database indexes and bookmarks table...');

        // 1. Alter bookmarks item_type Enum
        try {
            await connection.query(`
                ALTER TABLE bookmarks 
                MODIFY COLUMN item_type ENUM('Note', 'Donation', 'LostFound', 'Complaint') NOT NULL;
            `);
            console.log('Successfully altered bookmarks table item_type ENUM to support Complaints.');
        } catch (err) {
            console.error('Error altering bookmarks table ENUM:', err.message);
        }

        // 2. Add Index on fingerprint
        try {
            await connection.query(`
                CREATE INDEX idx_lost_found_fingerprint ON lost_found_items (fingerprint);
            `);
            console.log('Successfully added index idx_lost_found_fingerprint on fingerprint.');
        } catch (err) {
            if (err.errno === 1061) {
                console.log('Index idx_lost_found_fingerprint already exists. Skipping.');
            } else {
                console.error('Error creating fingerprint index:', err.message);
            }
        }

        // 3. Add Index on type and status
        try {
            await connection.query(`
                CREATE INDEX idx_lost_found_type_status ON lost_found_items (type, status);
            `);
            console.log('Successfully added index idx_lost_found_type_status on (type, status).');
        } catch (err) {
            if (err.errno === 1061) {
                console.log('Index idx_lost_found_type_status already exists. Skipping.');
            } else {
                console.error('Error creating type_status index:', err.message);
            }
        }

        // 4. Add Index on feed sorting (status, is_approved, created_at DESC)
        try {
            await connection.query(`
                CREATE INDEX idx_lost_found_feed ON lost_found_items (status, is_approved, created_at DESC);
            `);
            console.log('Successfully added feed sorting index idx_lost_found_feed.');
        } catch (err) {
            if (err.errno === 1061) {
                console.log('Index idx_lost_found_feed already exists. Skipping.');
            } else {
                console.error('Error creating feed index:', err.message);
            }
        }

        console.log('Database optimization completed.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

optimizeAndFix();
