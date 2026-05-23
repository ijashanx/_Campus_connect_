const { sendEmail } = require('./config/mailer');
require('dotenv').config();

async function runTest() {
    console.log("🚀 Starting CampusConnect Nodemailer Test...");
    console.log("-----------------------------------------");
    console.log(`Current Env Credentials:`);
    console.log(`- EMAIL_USER: ${process.env.EMAIL_USER || '(Not set)'}`);
    console.log(`- EMAIL_PASS: ${process.env.EMAIL_PASS ? '********' : '(Not set)'}`);
    console.log(`- EMAIL_HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com (default)'}`);
    console.log(`- EMAIL_PORT: ${process.env.EMAIL_PORT || '587 (default)'}`);
    console.log("-----------------------------------------");

    try {
        await sendEmail({
            to: process.env.EMAIL_USER || "test-recipient@example.com",
            subject: "CampusConnect Mailer Test ✔",
            text: "Hello! This is a test email from your CampusConnect project to verify that Nodemailer is configured correctly.",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #4A90E2;">CampusConnect Mailer Test</h2>
                    <p>Hello!</p>
                    <p>This is a test email to verify that your Nodemailer configuration is working successfully.</p>
                    <p>If you see this in your inbox (or Ethereal Dashboard), everything is configured correctly!</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 0.8rem; color: #888;">Sent at: ${new Date().toLocaleString()}</p>
                </div>
            `
        });
        console.log("-----------------------------------------");
        console.log("🏁 Test script finished executing.");
    } catch (err) {
        console.error("❌ Unexpected test script error:", err);
    }
}

runTest();
