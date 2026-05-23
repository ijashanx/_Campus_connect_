const db = require('../config/database');

async function showIndexes() {
    try {
        console.log("=== Indexes on lost_found_items ===");
        const [rows] = await db.query("SHOW INDEX FROM lost_found_items");
        console.log(rows.map(r => ({
            Table: r.Table,
            Non_unique: r.Non_unique,
            Key_name: r.Key_name,
            Seq_in_index: r.Seq_in_index,
            Column_name: r.Column_name,
            Collation: r.Collation,
            Index_type: r.Index_type
        })));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

showIndexes();
