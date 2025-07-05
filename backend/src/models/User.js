const { getConnection } = require('../database/connection');
const database = getConnection();
const bcrypt = require('bcryptjs');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.phone = data.phone;
        this.role = data.role;
        this.is_active = data.is_active ?? true;
        this.email_verified = data.email_verified ?? false;
        this.last_login = data.last_login;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Static methods for database operations
    static async findById(id) {
        try {
            const user = await database.get(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const user = await database.get(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    static async findAll(filters = {}) {
        try {
            let query = 'SELECT * FROM users WHERE 1=1';
            const params = [];

            if (filters.role) {
                query += ' AND role = ?';
                params.push(filters.role);
            }

            if (filters.is_active !== undefined) {
                query += ' AND is_active = ?';
                params.push(filters.is_active);
            }

            if (filters.email_verified !== undefined) {
                query += ' AND email_verified = ?';
                params.push(filters.email_verified);
            }

            query += ' ORDER BY created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(filters.offset);
            }

            const users = await database.all(query, params);
            return users.map(user => new User(user));
        } catch (error) {
            console.error('Error finding users:', error);
            throw error;
        }
    }

    static async create(userData) {
        try {
            // Hash password if provided
            if (userData.password) {
                userData.password_hash = await bcrypt.hash(userData.password, 12);
                delete userData.password;
            }

            // Generate ID if not provided
            if (!userData.id) {
                userData.id = require('crypto').randomBytes(16).toString('hex');
            }

            const result = await database.run(`
                INSERT INTO users (
                    id, email, password_hash, first_name, last_name, 
                    phone, role, is_active, email_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.id,
                userData.email,
                userData.password_hash,
                userData.first_name,
                userData.last_name,
                userData.phone,
                userData.role,
                userData.is_active ?? true,
                userData.email_verified ?? false
            ]);

            return await User.findById(userData.id);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (!this.id) {
                // Create new user
                this.id = require('crypto').randomBytes(16).toString('hex');
                
                const result = await database.run(`
                    INSERT INTO users (
                        id, email, password_hash, first_name, last_name, 
                        phone, role, is_active, email_verified
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    this.id,
                    this.email,
                    this.password_hash,
                    this.first_name,
                    this.last_name,
                    this.phone,
                    this.role,
                    this.is_active,
                    this.email_verified
                ]);
            } else {
                // Update existing user
                await database.run(`
                    UPDATE users SET 
                        email = ?, first_name = ?, last_name = ?, 
                        phone = ?, role = ?, is_active = ?, 
                        email_verified = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    this.email,
                    this.first_name,
                    this.last_name,
                    this.phone,
                    this.role,
                    this.is_active,
                    this.email_verified,
                    this.id
                ]);
            }

            return this;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    async delete() {
        try {
            if (!this.id) {
                throw new Error('Cannot delete user without ID');
            }

            await database.run('DELETE FROM users WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Password methods
    async setPassword(plainPassword) {
        try {
            this.password_hash = await bcrypt.hash(plainPassword, 12);
            
            if (this.id) {
                await database.run(
                    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [this.password_hash, this.id]
                );
            }
        } catch (error) {
            console.error('Error setting password:', error);
            throw error;
        }
    }

    async verifyPassword(plainPassword) {
        try {
            if (!this.password_hash) {
                return false;
            }
            return await bcrypt.compare(plainPassword, this.password_hash);
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    // Utility methods
    async updateLastLogin() {
        try {
            if (!this.id) {
                throw new Error('Cannot update last login without user ID');
            }

            this.last_login = new Date().toISOString();
            await database.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );
        } catch (error) {
            console.error('Error updating last login:', error);
            throw error;
        }
    }

    async verifyEmail() {
        try {
            if (!this.id) {
                throw new Error('Cannot verify email without user ID');
            }

            this.email_verified = true;
            await database.run(
                'UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );
        } catch (error) {
            console.error('Error verifying email:', error);
            throw error;
        }
    }

    async deactivate() {
        try {
            if (!this.id) {
                throw new Error('Cannot deactivate user without ID');
            }

            this.is_active = false;
            await database.run(
                'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );
        } catch (error) {
            console.error('Error deactivating user:', error);
            throw error;
        }
    }

    async activate() {
        try {
            if (!this.id) {
                throw new Error('Cannot activate user without ID');
            }

            this.is_active = true;
            await database.run(
                'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );
        } catch (error) {
            console.error('Error activating user:', error);
            throw error;
        }
    }

    // Get user's full name
    getFullName() {
        return `${this.first_name} ${this.last_name}`.trim();
    }

    // Check if user has specific role
    hasRole(role) {
        return this.role === role;
    }

    // Check if user is admin
    isAdmin() {
        return this.role === 'admin';
    }

    // Check if user is coach
    isCoach() {
        return this.role === 'coach';
    }

    // Check if user is player
    isPlayer() {
        return this.role === 'player';
    }

    // Check if user is parent
    isParent() {
        return this.role === 'parent';
    }

    // Get user data without sensitive information
    toJSON() {
        const { password_hash, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }

    // Get public user data (even more limited)
    toPublic() {
        return {
            id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            role: this.role,
            is_active: this.is_active
        };
    }

    // Validation
    static validate(userData) {
        const errors = [];

        if (!userData.email || !userData.email.includes('@')) {
            errors.push('Valid email is required');
        }

        if (!userData.first_name || userData.first_name.trim().length < 2) {
            errors.push('First name must be at least 2 characters');
        }

        if (!userData.last_name || userData.last_name.trim().length < 2) {
            errors.push('Last name must be at least 2 characters');
        }

        if (!userData.role || !['admin', 'coach', 'player', 'parent'].includes(userData.role)) {
            errors.push('Valid role is required (admin, coach, player, parent)');
        }

        if (userData.password && userData.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        if (userData.phone && !/^\+?[\d\s\-\(\)]+$/.test(userData.phone)) {
            errors.push('Invalid phone number format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Static method to get user statistics
    static async getStats() {
        try {
            const stats = await database.all(`
                SELECT 
                    role,
                    COUNT(*) as count,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_count
                FROM users 
                GROUP BY role
            `);

            return stats.reduce((acc, stat) => {
                acc[stat.role] = {
                    total: stat.count,
                    active: stat.active_count,
                    verified: stat.verified_count
                };
                return acc;
            }, {});
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    // Authentication method
    static async authenticate(email, password) {
        try {
            const user = await User.findByEmail(email);
            if (!user || !user.is_active) {
                return null;
            }

            const isValid = await user.verifyPassword(password);
            if (!isValid) {
                return null;
            }

            await user.updateLastLogin();
            return user;
        } catch (error) {
            console.error('Error authenticating user:', error);
            throw error;
        }
    }
}

module.exports = User;