const db = require('../config/database');

class Report {
    static async create(reporter_id, item_type, item_id, reason) {
        const [result] = await db.execute(
            'INSERT INTO reports (reporter_id, item_type, item_id, reason) VALUES (?, ?, ?, ?)',
            [reporter_id, item_type, item_id, reason]
        );
        return result.insertId;
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT r.*, u.username as reporter_username 
            FROM reports r 
            JOIN users u ON r.reporter_id = u.id
        `;
        let queryParams = [];
        let conditions = [];

        if (filters.status) {
            conditions.push('r.status = ?');
            queryParams.push(filters.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY r.created_at DESC';

        const [rows] = await db.execute(query, queryParams);
        return rows;
    }

    static async updateStatus(id, status, admin_remarks = null) {
        const [result] = await db.execute(
            'UPDATE reports SET status = ?, admin_remarks = ? WHERE id = ?',
            [status, admin_remarks, id]
        );
        return result.affectedRows > 0;
    }
    
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM reports WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = Report;
