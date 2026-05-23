const db = require('../config/database');

class LostFoundClaim {
    static async create(item_id, claimer_id, proof_color, proof_location, proof_description, proof_image_url) {
        const [result] = await db.execute(
            'INSERT INTO lost_found_claims (item_id, claimer_id, proof_color, proof_location, proof_description, proof_image_url, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
            [item_id, claimer_id, proof_color, proof_location, proof_description, proof_image_url]
        );
        return result.insertId;
    }

    static async findByItemId(item_id) {
        const [rows] = await db.execute(
            'SELECT claims.*, users.username, users.full_name FROM lost_found_claims claims JOIN users ON claims.claimer_id = users.id WHERE claims.item_id = ? ORDER BY claims.created_at DESC',
            [item_id]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT claims.*, users.username, users.full_name FROM lost_found_claims claims JOIN users ON claims.claimer_id = users.id WHERE claims.id = ?',
            [id]
        );
        return rows[0];
    }

    static async findByClaimerAndItem(claimer_id, item_id) {
        const [rows] = await db.execute(
            'SELECT * FROM lost_found_claims WHERE claimer_id = ? AND item_id = ? ORDER BY created_at DESC LIMIT 1',
            [claimer_id, item_id]
        );
        return rows[0];
    }

    static async updateStatus(id, status) {
        const [result] = await db.execute(
            'UPDATE lost_found_claims SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows;
    }

    static async rejectOtherClaims(item_id, approved_claim_id) {
        const [result] = await db.execute(
            'UPDATE lost_found_claims SET status = "Rejected" WHERE item_id = ? AND id != ? AND status = "Pending"',
            [item_id, approved_claim_id]
        );
        return result.affectedRows;
    }

    static async saveOtps(id, claimer_otp, poster_otp) {
        const [result] = await db.execute(
            'UPDATE lost_found_claims SET claimer_otp = ?, poster_otp = ? WHERE id = ?',
            [claimer_otp, poster_otp, id]
        );
        return result.affectedRows;
    }

    static async verifyClaimer(id) {
        const [result] = await db.execute(
            'UPDATE lost_found_claims SET claimer_verified = 1 WHERE id = ?',
            [id]
        );
        return result.affectedRows;
    }

    static async verifyPoster(id) {
        const [result] = await db.execute(
            'UPDATE lost_found_claims SET poster_verified = 1 WHERE id = ?',
            [id]
        );
        return result.affectedRows;
    }

    static async findAllClaimsForAdmin() {
        const [rows] = await db.execute(
            `SELECT claims.*, 
                    claimer.username AS claimer_username, claimer.full_name AS claimer_full_name, claimer.email AS claimer_email,
                    items.title AS item_title, items.description AS item_description, items.hidden_details AS item_hidden_details, items.location AS item_location, items.contact_info AS item_contact_info, items.type AS item_type, items.verification_pin AS item_verification_pin, items.status AS item_status,
                    poster.username AS poster_username, poster.full_name AS poster_full_name, poster.email AS poster_email
             FROM lost_found_claims claims
             JOIN users claimer ON claims.claimer_id = claimer.id
             JOIN lost_found_items items ON claims.item_id = items.id
             JOIN users poster ON items.user_id = poster.id
             ORDER BY claims.created_at DESC`
        );
        return rows;
    }
}

module.exports = LostFoundClaim;
