const mysql = require('mysql2/promise');
const UserActivity = require('../models/UserActivity');
const Bookmark = require('../models/Bookmark');
const LostFound = require('../models/LostFound');
const Donation = require('../models/Donation');
const Note = require('../models/Note');
const Complaint = require('../models/Complaint');
require('dotenv').config();

async function runTests() {
    try {
        console.log("Starting verification test run...");

        // 1. Get an existing user
        const db = require('../config/database');
        const [users] = await db.execute("SELECT * FROM users LIMIT 1;");
        if (users.length === 0) {
            console.log("No user found in database. Please run seedAdmin.js or register a user first.");
            process.exit(1);
        }
        const testUser = users[0];
        console.log(`Using test user: @${testUser.username} (ID: ${testUser.id})`);

        // 2. Test UserActivity insertion
        console.log("\n--- Testing UserActivity ---");
        const actId = await UserActivity.create(
            testUser.id,
            'TEST_ACTIVITY',
            'Verification test: Created a dummy activity for verification'
        );
        console.log(`Created activity log entry ID: ${actId}`);

        const activities = await UserActivity.findByUser(testUser.id, 5);
        console.log(`Fetched recent activities (count: ${activities.length}):`);
        console.table(activities.map(a => ({ ID: a.id, Type: a.activity_type, Description: a.description })));

        // 3. Test Bookmark creation and fetching
        console.log("\n--- Testing Bookmarks & Saved Items ---");
        
        // Find or create dummy item for Note
        const [notes] = await db.execute("SELECT * FROM notes LIMIT 1;");
        if (notes.length > 0) {
            const note = notes[0];
            await Bookmark.create(testUser.id, 'Note', note.id);
            console.log(`Bookmarked Note ID: ${note.id}`);
            const savedNotes = await Bookmark.findSavedNotesByUser(testUser.id);
            console.log(`Saved Notes count: ${savedNotes.length}`);
        } else {
            console.log("No notes available in DB to test bookmarking.");
        }

        // Find or create dummy item for Donation
        const [donations] = await db.execute("SELECT * FROM donations LIMIT 1;");
        if (donations.length > 0) {
            const donation = donations[0];
            await Bookmark.create(testUser.id, 'Donation', donation.id);
            console.log(`Bookmarked Donation ID: ${donation.id}`);
            const savedDonations = await Bookmark.findSavedDonationsByUser(testUser.id);
            console.log(`Saved Donations count: ${savedDonations.length}`);
        } else {
            console.log("No donations available in DB to test bookmarking.");
        }

        // Find or create dummy item for LostFound
        const [lfItems] = await db.execute("SELECT * FROM lost_found_items LIMIT 1;");
        if (lfItems.length > 0) {
            const lf = lfItems[0];
            await Bookmark.create(testUser.id, 'LostFound', lf.id);
            console.log(`Bookmarked LostFound ID: ${lf.id}`);
            const savedLfs = await Bookmark.findSavedLostFoundsByUser(testUser.id);
            console.log(`Saved LostFounds count: ${savedLfs.length}`);
        } else {
            console.log("No lost_found_items available in DB to test bookmarking.");
        }

        // Find or create dummy item for Complaint
        const [complaints] = await db.execute("SELECT * FROM complaints LIMIT 1;");
        if (complaints.length > 0) {
            const complaint = complaints[0];
            await Bookmark.create(testUser.id, 'Complaint', complaint.id);
            console.log(`Bookmarked Complaint ID: ${complaint.id}`);
            const savedComplaints = await Bookmark.findSavedComplaintsByUser(testUser.id);
            console.log(`Saved Complaints count: ${savedComplaints.length}`);
        } else {
            console.log("No complaints available in DB to test bookmarking.");
        }

        console.log("\n✅ Verification tests completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Verification tests encountered an error:", e);
        process.exit(1);
    }
}

runTests();
