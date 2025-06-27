const db = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { username, email, password, full_name, role, team_id, player_id } = userData;
        
        // Hash password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        const sql = `
            INSERT INTO users (username, email, password_hash, full_name, role, team_id, player_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await db.run(sql, [username, email, password_hash, full_name, role, team_id, player_id]);
    }

    static async findAll() {
        const sql = `
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.active, 
                   u.last_login, u.created_at, u.updated_at,
                   t.name as team_name, p.name as player_name
            FROM users u 
            LEFT JOIN teams t ON u.team_id = t.id 
            LEFT JOIN players p ON u.player_id = p.id
            ORDER BY u.created_at DESC
        `;
        return await db.query(sql);
    }

    static async findById(id) {
        const sql = `
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.active,
                   u.team_id, u.player_id, u.last_login, u.created_at, u.updated_at,
                   t.name as team_name, p.name as player_name
            FROM users u 
            LEFT JOIN teams t ON u.team_id = t.id 
            LEFT JOIN players p ON u.player_id = p.id
            WHERE u.id = ?
        `;
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async findByIdWithPassword(id) {
        const sql = `
            SELECT u.*, t.name as team_name, p.name as player_name
            FROM users u 
            LEFT JOIN teams t ON u.team_id = t.id 
            LEFT JOIN players p ON u.player_id = p.id
            WHERE u.id = ?
        `;
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async findByUsername(username) {
        const sql = `
            SELECT u.*, t.name as team_name, p.name as player_name
            FROM users u 
            LEFT JOIN teams t ON u.team_id = t.id 
            LEFT JOIN players p ON u.player_id = p.id
            WHERE u.username = ? AND u.active = 1
        `;
        const results = await db.query(sql, [username]);
        return results[0] || null;
    }

    static async findByEmail(email) {
        const sql = `
            SELECT u.*, t.name as team_name, p.name as player_name
            FROM users u 
            LEFT JOIN teams t ON u.team_id = t.id 
            LEFT JOIN players p ON u.player_id = p.id
            WHERE u.email = ? AND u.active = 1
        `;
        const results = await db.query(sql, [email]);
        return results[0] || null;
    }

    static async findByRole(role) {
        const sql = `
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.active,
                   u.team_id, u.player_id, u.last_login, u.created_at,
                   t.name as team_name, p.name as player_name
            FROM users u 
            LEFT JOIN teams t ON u.team_id = t.id 
            LEFT JOIN players p ON u.player_id = p.id
            WHERE u.role = ? AND u.active = 1
            ORDER BY u.full_name
        `;
        return await db.query(sql, [role]);
    }

    static async update(id, userData) {
        const { username, email, full_name, role, team_id, player_id, active } = userData;
        
        const sql = `
            UPDATE users SET 
                username = ?, email = ?, full_name = ?, role = ?, 
                team_id = ?, player_id = ?, active = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(sql, [username, email, full_name, role, team_id, player_id, active, id]);
    }

    static async updatePassword(id, newPassword) {
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);
        
        const sql = `
            UPDATE users SET 
                password_hash = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(sql, [password_hash, id]);
    }

    static async updateLastLogin(id) {
        const sql = `
            UPDATE users SET 
                last_login = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(sql, [id]);
    }

    static async delete(id) {
        // Soft delete - set active to false instead of actual deletion
        const sql = 'UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async hardDelete(id) {
        // Hard delete - actually remove from database (use with caution)
        const sql = 'DELETE FROM users WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async authenticate(username, password) {
        const user = await this.findByUsername(username);
        if (!user) {
            return null;
        }

        const isValid = await this.verifyPassword(password, user.password_hash);
        if (!isValid) {
            return null;
        }

        // Update last login
        await this.updateLastLogin(user.id);

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    static async getUsersByTeam(teamId) {
        const sql = `
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.active,
                   u.last_login, u.created_at
            FROM users u 
            WHERE u.team_id = ? AND u.active = 1
            ORDER BY u.full_name
        `;
        return await db.query(sql, [teamId]);
    }

    static async getParentsByPlayer(playerId) {
        const sql = `
            SELECT u.id, u.username, u.email, u.full_name, u.last_login, u.created_at
            FROM users u 
            WHERE u.player_id = ? AND u.role = 'parent' AND u.active = 1
            ORDER BY u.full_name
        `;
        return await db.query(sql, [playerId]);
    }

    static async getCoachesByTeam(teamId) {
        const sql = `
            SELECT u.id, u.username, u.email, u.full_name, u.last_login, u.created_at
            FROM users u 
            WHERE u.team_id = ? AND u.role = 'coach' AND u.active = 1
            ORDER BY u.full_name
        `;
        return await db.query(sql, [teamId]);
    }

    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
                SUM(CASE WHEN role = 'coach' THEN 1 ELSE 0 END) as coach_count,
                SUM(CASE WHEN role = 'parent' THEN 1 ELSE 0 END) as parent_count,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN last_login > datetime('now', '-30 days') THEN 1 ELSE 0 END) as recent_logins
            FROM users
        `;
        const results = await db.query(sql);
        return results[0] || {};
    }
}

module.exports = User;