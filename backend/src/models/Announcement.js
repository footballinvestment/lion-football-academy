const db = require('../database/connection');

class Announcement {
    static async create(announcementData) {
        const { title, content, category, team_id, urgent } = announcementData;
        const sql = `
            INSERT INTO announcements (title, content, category, team_id, urgent)
            VALUES (?, ?, ?, ?, ?)
        `;
        return await db.run(sql, [title, content, category, team_id, urgent]);
    }

    static async findAll() {
        const sql = `
            SELECT a.*, t.name as team_name 
            FROM announcements a 
            LEFT JOIN teams t ON a.team_id = t.id 
            ORDER BY a.urgent DESC, a.created_at DESC
        `;
        return await db.query(sql);
    }

    static async findById(id) {
        const sql = `
            SELECT a.*, t.name as team_name 
            FROM announcements a 
            LEFT JOIN teams t ON a.team_id = t.id 
            WHERE a.id = ?
        `;
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async findByTeam(teamId) {
        const sql = `
            SELECT * FROM announcements 
            WHERE team_id = ? OR team_id IS NULL
            ORDER BY urgent DESC, created_at DESC
        `;
        return await db.query(sql, [teamId]);
    }

    static async findByCategory(category) {
        const sql = `
            SELECT a.*, t.name as team_name 
            FROM announcements a 
            LEFT JOIN teams t ON a.team_id = t.id 
            WHERE a.category = ?
            ORDER BY a.urgent DESC, a.created_at DESC
        `;
        return await db.query(sql, [category]);
    }

    static async findUrgent() {
        const sql = `
            SELECT a.*, t.name as team_name 
            FROM announcements a 
            LEFT JOIN teams t ON a.team_id = t.id 
            WHERE a.urgent = 1
            ORDER BY a.created_at DESC
        `;
        return await db.query(sql);
    }

    static async findRecent(limit = 10) {
        const sql = `
            SELECT a.*, t.name as team_name 
            FROM announcements a 
            LEFT JOIN teams t ON a.team_id = t.id 
            ORDER BY a.created_at DESC
            LIMIT ?
        `;
        return await db.query(sql, [limit]);
    }

    static async update(id, announcementData) {
        const { title, content, category, team_id, urgent } = announcementData;
        const sql = `
            UPDATE announcements 
            SET title = ?, content = ?, category = ?, team_id = ?, urgent = ?
            WHERE id = ?
        `;
        return await db.run(sql, [title, content, category, team_id, urgent, id]);
    }

    static async delete(id) {
        const sql = 'DELETE FROM announcements WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async getCategories() {
        const sql = 'SELECT DISTINCT category FROM announcements ORDER BY category';
        return await db.query(sql);
    }
}

module.exports = Announcement;