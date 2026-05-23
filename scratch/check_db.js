const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const configs = [
        {
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        },
        {
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '',
            database: 'campus_connect'
        }
    ];

    for (let i = 0; i < configs.length; i++) {
        try {
            console.log(`Trying config ${i + 1}...`);
            const conn = await mysql.createConnection(configs[i]);
            console.log("Success! Connected with config", i + 1);
            
            const [tables] = await conn.query("SHOW TABLES;");
            console.log("Tables:", tables);

            const [bookmarksDesc] = await conn.query("DESCRIBE bookmarks;");
            console.log("Bookmarks columns:", bookmarksDesc);

            const [bookmarks] = await conn.query("SELECT * FROM bookmarks;");
            console.log("Bookmarks content:", bookmarks);

            await conn.end();
            process.exit(0);
        } catch (err) {
            console.error(`Config ${i + 1} failed:`, err.message);
        }
    }
    console.error("All configs failed.");
    process.exit(1);
}

check();
