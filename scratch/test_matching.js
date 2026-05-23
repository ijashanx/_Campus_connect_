const LostFound = require('../models/LostFound');

async function test() {
    try {
        console.log("=== Testing Fingerprint Generation ===");
        const f1 = LostFound.generateFingerprint("Blue Tupperware Bottle", "Accessories", "Blue", "Tupperware", "Block A");
        const f2 = LostFound.generateFingerprint("  blue tupperware   bottle  ", "Accessories", "blue", "tupperware", "  block a  ");
        console.log("Fingerprint 1:", f1);
        console.log("Fingerprint 2:", f2);
        console.log("Fingerprints Match?", f1 === f2 ? "YES (Pass)" : "NO (Fail)");

        console.log("\n=== Testing Match Scoring ===");
        const item1 = {
            title: "Blue Tupperware Bottle",
            category: "Accessories",
            color: "Blue",
            brand: "Tupperware",
            location: "Block A"
        };

        const item2 = {
            title: "Tupperware Bottle",
            category: "Accessories",
            color: "Blue",
            brand: "Tupperware",
            location: "Block A"
        };

        const score1 = LostFound.calculateMatchScore(item1, item2);
        console.log(`Match score between "${item1.title}" and "${item2.title}":`, score1);
        console.log("Score meets 80% threshold?", score1 >= 80 ? "YES (Pass)" : "NO (Fail)");

        const item3 = {
            title: "Red Nike Shoe",
            category: "Accessories",
            color: "Red",
            brand: "Nike",
            location: "Cafeteria"
        };
        const score2 = LostFound.calculateMatchScore(item1, item3);
        console.log(`Match score between "${item1.title}" and "${item3.title}":`, score2);
        console.log("Score below 80% threshold?", score2 < 80 ? "YES (Pass)" : "NO (Fail)");

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
