const db = require('../config/database');
const LostFound = require('../models/LostFound');

async function testPerformance() {
    try {
        console.log("Connecting to DB and checking item count...");
        const [countResult] = await db.query("SELECT COUNT(*) as cnt FROM lost_found_items");
        const count = countResult[0].cnt;
        console.log(`Total items in lost_found_items: ${count}`);

        console.log("Timing LostFound.findAll...");
        let start = Date.now();
        const items = await LostFound.findAll({});
        console.log(`findAll returned ${items.length} items in ${Date.now() - start}ms`);

        console.log("Timing LostFound.findMatches for a sample item...");
        start = Date.now();
        const matches = await LostFound.findMatches('lost', 'Blue Water Bottle', 'Accessories', 'Blue', 'Tupperware', 'Block A');
        console.log(`findMatches completed in ${Date.now() - start}ms, found ${matches.length} matches`);

        console.log("Timing a sample checkDuplicateFingerprint...");
        start = Date.now();
        const fingerprint = LostFound.generateFingerprint('Blue Water Bottle', 'Accessories', 'Blue', 'Tupperware', 'Block A');
        const dup = await LostFound.checkDuplicateFingerprint(fingerprint);
        console.log(`checkDuplicateFingerprint completed in ${Date.now() - start}ms`);

    } catch (err) {
        console.error("Performance test error:", err);
    } finally {
        process.exit(0);
    }
}

testPerformance();
