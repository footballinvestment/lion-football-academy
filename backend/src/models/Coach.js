const database = require('../database/database');

class Coach {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.team_id = data.team_id;
        this.certification_level = data.certification_level;
        this.experience_years = data.experience_years;
        this.specialization = data.specialization;
        this.bio = data.bio;
        this.hire_date = data.hire_date;
        this.is_head_coach = data.is_head_coach;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const coach = await database.get('SELECT * FROM coaches WHERE id = ?', [id]);
            return coach ? new Coach(coach) : null;
        } catch (error) {
            console.error('Error finding coach by ID:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const coach = await database.get('SELECT * FROM coaches WHERE user_id = ?', [userId]);
            return coach ? new Coach(coach) : null;
        } catch (error) {
            console.error('Error finding coach by user ID:', error);
            throw error;
        }
    }

    static async findAll(filters = {}) {
        try {
            let query = 'SELECT * FROM coaches WHERE 1=1';
            const params = [];

            if (filters.team_id) {
                query += ' AND team_id = ?';
                params.push(filters.team_id);
            }

            if (filters.is_active !== undefined) {
                query += ' AND is_active = ?';
                params.push(filters.is_active);
            }

            query += ' ORDER BY is_head_coach DESC, created_at DESC';

            const coaches = await database.all(query, params);
            return coaches.map(coach => new Coach(coach));
        } catch (error) {
            console.error('Error finding coaches:', error);
            throw error;
        }
    }

    static async create(coachData) {
        try {
            if (!coachData.id) {
                coachData.id = require('crypto').randomBytes(16).toString('hex');
            }

            await database.run(`
                INSERT INTO coaches (
                    id, user_id, team_id, certification_level, experience_years, 
                    specialization, bio, hire_date, is_head_coach, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                coachData.id,
                coachData.user_id,
                coachData.team_id,
                coachData.certification_level,
                coachData.experience_years || 0,
                coachData.specialization,
                coachData.bio,
                coachData.hire_date || new Date().toISOString().split('T')[0],
                coachData.is_head_coach || false,
                coachData.is_active ?? true
            ]);

            return await Coach.findById(coachData.id);
        } catch (error) {
            console.error('Error creating coach:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (!this.id) {
                this.id = require('crypto').randomBytes(16).toString('hex');
                await database.run(`
                    INSERT INTO coaches (
                        id, user_id, team_id, certification_level, experience_years, 
                        specialization, bio, hire_date, is_head_coach, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    this.id, this.user_id, this.team_id, this.certification_level, 
                    this.experience_years, this.specialization, this.bio, 
                    this.hire_date, this.is_head_coach, this.is_active
                ]);
            } else {
                await database.run(`
                    UPDATE coaches SET 
                        user_id = ?, team_id = ?, certification_level = ?, experience_years = ?, 
                        specialization = ?, bio = ?, hire_date = ?, is_head_coach = ?, 
                        is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    this.user_id, this.team_id, this.certification_level, this.experience_years,
                    this.specialization, this.bio, this.hire_date, this.is_head_coach,
                    this.is_active, this.id
                ]);
            }
            return this;
        } catch (error) {
            console.error('Error saving coach:', error);
            throw error;
        }
    }

    async delete() {
        try {
            if (!this.id) throw new Error('Cannot delete coach without ID');
            await database.run('DELETE FROM coaches WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting coach:', error);
            throw error;
        }
    }

    async getTeam() {
        try {
            if (!this.team_id) return null;
            const Team = require('./Team');
            return await Team.findById(this.team_id);
        } catch (error) {
            console.error('Error getting coach team:', error);
            throw error;
        }
    }

    async getUser() {
        try {
            const User = require('./User');
            return await User.findById(this.user_id);
        } catch (error) {
            console.error('Error getting coach user:', error);
            throw error;
        }
    }

    static validate(coachData) {
        const errors = [];

        if (!coachData.user_id) {
            errors.push('User ID is required');
        }

        if (coachData.experience_years !== undefined && coachData.experience_years < 0) {
            errors.push('Experience years cannot be negative');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = Coach;