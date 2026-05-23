const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE role = "admin"');
        if (rows.length > 0) {
            console.log('Admin found:');
            console.log('Email:', rows[0].email);
            console.log('Note: We cannot see the password as it is hashed. If you do not know the password, you can change the email in this script and rerun it to create a new one.');
        } else {
            console.log('No admin found. Creating a default admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.execute(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'admin@campusconnect.com', hashedPassword, 'System Admin', 'admin']
            );
            console.log('Admin created successfully!');
            console.log('Email: admin@campusconnect.com');
            console.log('Password: admin123');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit();
    }
}

checkAdmin();
