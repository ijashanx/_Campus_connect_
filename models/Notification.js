const db = require('../config/database');

class Notification {
    static async create(user_id, message, link = null) {
        const [result] = await db.execute(
            'INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)',
            [user_id, message, link]
        );
        return result.insertId;
    }

    static async getUnreadByUser(user_id) {
        const [rows] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC',
            [user_id]
        );
        return rows;
    }

    static async markAsRead(id, user_id) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, user_id]
        );
        return result.affectedRows > 0;
    }

    static async markAllAsRead(user_id) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [user_id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Notification;
