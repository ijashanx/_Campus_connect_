const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to database. Checking for existing admin...');
        
        // Ensure Users table exists first
        const [rows] = await connection.execute("SELECT * FROM users WHERE email = 'admin@campusconnect.com'");
        
        if (rows.length > 0) {
            console.log('Admin account already exists! Login with: admin@campusconnect.com / admin123');
            process.exit(0);
        }

        console.log('Generating Master Admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await connection.execute(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
            ['System Admin', 'admin@campusconnect.com', hashedPassword]
        );

        console.log('=================================');
        console.log('SUCCESS! Master Admin created.');
        console.log('Email: admin@campusconnect.com');
        console.log('Password: admin123');
        console.log('=================================');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

seedAdmin();
