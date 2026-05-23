const nodemailer = require('nodemailer');
require('dotenv').config();

const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter = null;

if (hasCredentials) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
} else {
    console.warn('⚠️ Nodemailer: EMAIL_USER and EMAIL_PASS are not configured in your .env file. Emails will not be sent, but OTPs will be logged to the console for testing.');
}

async function sendEmail({ to, subject, html, text }) {
    if (transporter) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || `"CampusConnect" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                text,
                html
            });
            console.log(`✉️ Email successfully sent to ${to}`);
        } catch (error) {
            console.error(`❌ Error sending email to ${to}:`, error);
        }
    } else {
        console.log(`✉️ [SMTP Not Configured] To: ${to}\nSubject: ${subject}\nContent:\n${text || html}\n----------------------------------`);
    }
}

module.exports = { sendEmail };
