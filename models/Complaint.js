const db = require('../config/database');

class Complaint {
    static async create(user_id, title, description, category, priority, location, image_url = null) {
        const [result] = await db.execute(
            'INSERT INTO complaints (user_id, title, description, category, priority, location, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, title, description, category, priority, location, image_url]
        );
        return result.insertId;
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT c.*, u.username, u.full_name 
            FROM complaints c
            JOIN users u ON c.user_id = u.id
        `;
        let queryParams = [];
        let conditions = [];

        if (filters.keyword) {
            conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
            queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
        }
        if (filters.category) {
            conditions.push('c.category = ?');
            queryParams.push(filters.category);
        }
        if (filters.status) {
            conditions.push('c.status = ?');
            queryParams.push(filters.status);
        }
        if (filters.priority) {
            conditions.push('c.priority = ?');
            queryParams.push(filters.priority);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        if (filters.sort === 'high_priority') {
            query += " ORDER BY CASE c.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END ASC, c.created_at DESC";
        } else if (filters.sort === 'oldest') {
            query += ' ORDER BY c.created_at ASC';
        } else {
            query += ' ORDER BY c.created_at DESC';
        }

        if (filters.limit) {
            query += ' LIMIT ?';
            queryParams.push(parseInt(filters.limit, 10));
        }

        const [rows] = await db.query(query, queryParams);
        return rows;
    }

    static async findByUser(user_id, filters = {}) {
        let query = 'SELECT * FROM complaints WHERE user_id = ?';
        let queryParams = [user_id];

        if (filters.keyword) {
            query += ' AND (title LIKE ? OR description LIKE ?)';
            queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
        }
        if (filters.category) {
            query += ' AND category = ?';
            queryParams.push(filters.category);
        }
        if (filters.status) {
            query += ' AND status = ?';
            queryParams.push(filters.status);
        }
        if (filters.priority) {
            query += ' AND priority = ?';
            queryParams.push(filters.priority);
        }

        if (filters.sort === 'high_priority') {
            query += " ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END ASC, created_at DESC";
        } else if (filters.sort === 'oldest') {
            query += ' ORDER BY created_at ASC';
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT c.*, u.username, u.full_name, u.email
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [id]);
        return rows[0];
    }

    static async updateStatus(id, status, admin_remarks = null) {
        const [result] = await db.execute(
            'UPDATE complaints SET status = ?, admin_remarks = ? WHERE id = ?',
            [status, admin_remarks, id]
        );
        return result.affectedRows > 0;
    }

    static async getStats() {
        const [total] = await db.execute('SELECT COUNT(*) as count FROM complaints');
        const [pending] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status = "Pending"');
        const [inProgress] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status = "In Progress"');
        const [resolved] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status = "Resolved"');
        const [rejected] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status = "Rejected"');

        return {
            total: total[0].count,
            pending: pending[0].count,
            inProgress: inProgress[0].count,
            resolved: resolved[0].count,
            rejected: rejected[0].count
        };
    }
}

module.exports = Complaint;
