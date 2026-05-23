const Bookmark = require('../models/Bookmark');

async function testBookmark() {
    try {
        console.log("=== Testing Bookmark ===");
        console.log("Adding bookmark for user 5, item 10...");
        const insertId = await Bookmark.create(5, 'LostFound', 10);
        console.log("Inserted Bookmark ID:", insertId);

        console.log("Checking if bookmarked...");
        const bookmark = await Bookmark.findByUserAndItem(5, 'LostFound', 10);
        console.log("Bookmark found:", bookmark);

        console.log("Retrieving saved lost and found items for user 5...");
        const saved = await Bookmark.findSavedLostFoundsByUser(5);
        console.log("Saved LostFound items:", saved);

        console.log("Deleting bookmark...");
        const deleted = await Bookmark.delete(5, 'LostFound', 10);
        console.log("Bookmark deleted?", deleted);
    } catch (err) {
        console.error("Bookmark test error:", err);
    } finally {
        process.exit(0);
    }
}

testBookmark();
