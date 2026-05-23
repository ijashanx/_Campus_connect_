const db = require('../config/database');

class LostFound {
    static async create(user_id, title, description, image_url, location, date, contact_info, type, category, hidden_details = null, color = null, brand = null, fingerprint = null, matchScore = null, matchedItemId = null) {
        let pin = null;
        // Both "lost" and "found" listings use a 4-digit PIN for in-person verification.
        if (type === 'found' || type === 'lost') {
            pin = Math.floor(1000 + Math.random() * 9000).toString();
        }

        const [result] = await db.execute(
            'INSERT INTO lost_found_items (user_id, title, description, image_url, location, date, contact_info, type, verification_pin, category, hidden_details, is_approved, color, brand, fingerprint, matchScore, matchedItemId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)',
            [user_id, title, description, image_url, location, date, contact_info, type, pin, category || 'Other', hidden_details, color, brand, fingerprint, matchScore, matchedItemId]
        );
        return result.insertId;
    }

    static async checkDuplicate(title, description, location, type, user_id) {
        const [rows] = await db.execute(
            `SELECT id FROM lost_found_items 
             WHERE status = "Open" 
             AND (
                 (TRIM(LOWER(title)) = TRIM(LOWER(?)) AND type = ? AND user_id = ?)
                 OR
                 (TRIM(LOWER(description)) = TRIM(LOWER(?)) AND TRIM(LOWER(location)) = TRIM(LOWER(?)))
                 OR
                 (TRIM(LOWER(title)) = TRIM(LOWER(?)) AND TRIM(LOWER(location)) = TRIM(LOWER(?)) AND type = ?)
             )`,
            [title, type, user_id, description, location, title, location, type]
        );
        return rows.length > 0;
    }

    static async findAll(filters = {}) {
        let query = 'SELECT items.*, users.username FROM lost_found_items items JOIN users ON items.user_id = users.id';
        let queryParams = [];
        let conditions = [];

        if (filters.keyword) {
            conditions.push('(items.title LIKE ? OR items.description LIKE ? OR items.location LIKE ?)');
            queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
        }
        if (filters.category) {
            conditions.push('items.category = ?');
            queryParams.push(filters.category);
        }
        if (filters.location) {
            conditions.push('items.location LIKE ?');
            queryParams.push(`%${filters.location}%`);
        }
        if (filters.date) {
            conditions.push('items.date >= ?');
            queryParams.push(filters.date);
        }
        if (filters.type) {
            conditions.push('items.type = ?');
            queryParams.push(filters.type);
        }
        if (filters.status) {
            conditions.push('items.status = ?');
            queryParams.push(filters.status);
        }
        if (filters.user_id) {
            conditions.push('items.user_id = ?');
            queryParams.push(filters.user_id);
        }
        if (filters.exclude_user_id) {
            conditions.push('items.user_id != ? AND (items.returned_by_id IS NULL OR items.returned_by_id != ?) AND (items.received_by_id IS NULL OR items.received_by_id != ?)');
            queryParams.push(filters.exclude_user_id, filters.exclude_user_id, filters.exclude_user_id);
        }
        if (filters.returned_by_id) {
            conditions.push('items.returned_by_id = ?');
            queryParams.push(filters.returned_by_id);
        }
        if (filters.received_by_id) {
            conditions.push('items.received_by_id = ?');
            queryParams.push(filters.received_by_id);
        }
        if (filters.is_approved !== undefined) {
            if (filters.is_approved !== 'all') {
                conditions.push('items.is_approved = ?');
                queryParams.push(filters.is_approved);
            }
        } else {
            // Default behavior: only show approved items to general users
            conditions.push('items.is_approved = 1');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        if (filters.sort === 'oldest') {
            query += ' ORDER BY items.created_at ASC';
        } else {
            query += ' ORDER BY items.created_at DESC';
        }

        if (filters.limit) {
            query += ' LIMIT ?';
            queryParams.push(parseInt(filters.limit, 10));
        }

        const [rows] = await db.query(query, queryParams);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT items.*, users.username FROM lost_found_items items JOIN users ON items.user_id = users.id WHERE items.id = ?', [id]);
        return rows[0];
    }

    static async updateStatus(id, status) {
        const [result] = await db.execute('UPDATE lost_found_items SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows;
    }

    static async setReturnedReceived(id, returned_by_id, received_by_id) {
        const [result] = await db.execute(
            'UPDATE lost_found_items SET status = ?, returned_by_id = ?, received_by_id = ? WHERE id = ?',
            ['Resolved', returned_by_id, received_by_id, id]
        );
        return result.affectedRows;
    }

    static async approve(id) {
        const [result] = await db.execute('UPDATE lost_found_items SET is_approved = 1 WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async incrementReportCount(id) {
        const [result] = await db.execute('UPDATE lost_found_items SET report_count = report_count + 1 WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async suspend(id) {
        const [result] = await db.execute('UPDATE lost_found_items SET is_approved = 0 WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async deleteById(id) {
        const [result] = await db.execute('DELETE FROM lost_found_items WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static generateFingerprint(title, category, color, brand, location) {
        return [title, category, color, brand || '', location]
            .map(s => (s || '').trim().toLowerCase().replace(/\s+/g, ''))
            .join('|');
    }

    static async checkDuplicateFingerprint(fingerprint) {
        const [rows] = await db.execute(
            'SELECT * FROM lost_found_items WHERE fingerprint = ? AND status = "Open"',
            [fingerprint]
        );
        return rows[0] || null;
    }

    static calculateMatchScore(item1, item2) {
        let score = 0;
        
        // Item Name Match = 40 points
        const name1 = (item1.title || '').trim().toLowerCase();
        const name2 = (item2.title || '').trim().toLowerCase();
        if (name1 === name2 && name1 !== '') {
            score += 40;
        } else if (name1 !== '' && name2 !== '' && (name1.includes(name2) || name2.includes(name1))) {
            score += 40;
        }

        // Category Match = 20 points
        const cat1 = (item1.category || '').trim().toLowerCase();
        const cat2 = (item2.category || '').trim().toLowerCase();
        if (cat1 === cat2 && cat1 !== '') {
            score += 20;
        }

        // Color Match = 20 points
        const col1 = (item1.color || '').trim().toLowerCase();
        const col2 = (item2.color || '').trim().toLowerCase();
        if (col1 === col2 && col1 !== '') {
            score += 20;
        }

        // Location Match = 20 points
        const loc1 = (item1.location || '').trim().toLowerCase();
        const loc2 = (item2.location || '').trim().toLowerCase();
        if (loc1 === loc2 && loc1 !== '') {
            score += 20;
        } else if (loc1 !== '' && loc2 !== '' && (loc1.includes(loc2) || loc2.includes(loc1))) {
            score += 20;
        }

        return score;
    }

    static async findMatches(type, title, category, color, brand, location) {
        const oppositeType = type === 'lost' ? 'found' : 'lost';
        // Retrieve only fields needed for matching, avoiding JOIN users table
        const [candidates] = await db.execute(
            'SELECT id, user_id, title, category, color, brand, location, date, image_url FROM lost_found_items WHERE type = ? AND status = "Open"',
            [oppositeType]
        );
        
        const newItem = { title, category, color, brand, location };
        const matches = [];

        for (let candidate of candidates) {
            const score = LostFound.calculateMatchScore(newItem, candidate);
            if (score >= 80) {
                matches.push({
                    item: candidate,
                    score: score
                });
            }
        }

        // Sort matches by score descending
        matches.sort((a, b) => b.score - a.score);
        return matches;
    }
}

module.exports = LostFound;
