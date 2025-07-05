const database = require('../database/database');

class Team {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
        this.age_group = data.age_group;
        this.division = data.division;
        this.season = data.season;
        this.max_players = data.max_players || 25;
        this.description = data.description;
        this.is_active = data.is_active ?? true;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const team = await database.get('SELECT * FROM teams WHERE id = ?', [id]);
            return team ? new Team(team) : null;
        } catch (error) {
            console.error('Error finding team by ID:', error);
            throw error;
        }
    }

    static async findAll(filters = {}) {
        try {
            let query = 'SELECT * FROM teams WHERE 1=1';
            const params = [];

            if (filters.is_active !== undefined) {
                query += ' AND is_active = ?';
                params.push(filters.is_active);
            }

            if (filters.season) {
                query += ' AND season = ?';
                params.push(filters.season);
            }

            if (filters.age_group) {
                query += ' AND age_group = ?';
                params.push(filters.age_group);
            }

            query += ' ORDER BY name ASC';

            const teams = await database.all(query, params);
            return teams.map(team => new Team(team));
        } catch (error) {
            console.error('Error finding teams:', error);
            throw error;
        }
    }

    static async create(teamData) {
        try {
            if (!teamData.id) {
                teamData.id = require('crypto').randomBytes(16).toString('hex');
            }

            await database.run(`
                INSERT INTO teams (id, name, age_group, division, season, max_players, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                teamData.id,
                teamData.name,
                teamData.age_group,
                teamData.division,
                teamData.season,
                teamData.max_players || 25,
                teamData.description,
                teamData.is_active ?? true
            ]);

            return await Team.findById(teamData.id);
        } catch (error) {
            console.error('Error creating team:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (!this.id) {
                this.id = require('crypto').randomBytes(16).toString('hex');
                await database.run(`
                    INSERT INTO teams (id, name, age_group, division, season, max_players, description, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [this.id, this.name, this.age_group, this.division, this.season, this.max_players, this.description, this.is_active]);
            } else {
                await database.run(`
                    UPDATE teams SET name = ?, age_group = ?, division = ?, season = ?, 
                                   max_players = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [this.name, this.age_group, this.division, this.season, this.max_players, this.description, this.is_active, this.id]);
            }
            return this;
        } catch (error) {
            console.error('Error saving team:', error);
            throw error;
        }
    }

    async delete() {
        try {
            if (!this.id) throw new Error('Cannot delete team without ID');
            await database.run('DELETE FROM teams WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting team:', error);
            throw error;
        }
    }

    async getPlayers() {
        try {
            const players = await database.all(`
                SELECT p.*, u.first_name, u.last_name, u.email, u.phone
                FROM players p
                JOIN users u ON p.user_id = u.id
                WHERE p.team_id = ? AND p.is_active = 1
                ORDER BY p.jersey_number ASC
            `, [this.id]);
            return players;
        } catch (error) {
            console.error('Error getting team players:', error);
            throw error;
        }
    }

    async getCoaches() {
        try {
            const coaches = await database.all(`
                SELECT c.*, u.first_name, u.last_name, u.email, u.phone
                FROM coaches c
                JOIN users u ON c.user_id = u.id
                WHERE c.team_id = ? AND c.is_active = 1
                ORDER BY c.is_head_coach DESC, u.first_name ASC
            `, [this.id]);
            return coaches;
        } catch (error) {
            console.error('Error getting team coaches:', error);
            throw error;
        }
    }

    async getMatches(filters = {}) {
        try {
            let query = `
                SELECT * FROM matches 
                WHERE team_id = ?
            `;
            const params = [this.id];

            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.match_type) {
                query += ' AND match_type = ?';
                params.push(filters.match_type);
            }

            query += ' ORDER BY match_date DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            return await database.all(query, params);
        } catch (error) {
            console.error('Error getting team matches:', error);
            throw error;
        }
    }

    async getTrainings(filters = {}) {
        try {
            let query = `
                SELECT t.*, c.user_id as coach_user_id, u.first_name as coach_first_name, u.last_name as coach_last_name
                FROM trainings t
                JOIN coaches c ON t.coach_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE t.team_id = ?
            `;
            const params = [this.id];

            if (filters.status) {
                query += ' AND t.status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY t.training_date DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            return await database.all(query, params);
        } catch (error) {
            console.error('Error getting team trainings:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const stats = {
                player_count: 0,
                coach_count: 0,
                matches_played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                trainings_completed: 0
            };

            // Get player count
            const playerCount = await database.get(
                'SELECT COUNT(*) as count FROM players WHERE team_id = ? AND is_active = 1',
                [this.id]
            );
            stats.player_count = playerCount.count;

            // Get coach count
            const coachCount = await database.get(
                'SELECT COUNT(*) as count FROM coaches WHERE team_id = ? AND is_active = 1',
                [this.id]
            );
            stats.coach_count = coachCount.count;

            // Get match stats
            const matchStats = await database.all(`
                SELECT 
                    COUNT(*) as total_matches,
                    SUM(CASE WHEN home_score > away_score AND is_home_game = 1 THEN 1 
                             WHEN home_score < away_score AND is_home_game = 0 THEN 1 
                             ELSE 0 END) as wins,
                    SUM(CASE WHEN home_score = away_score THEN 1 ELSE 0 END) as draws,
                    SUM(CASE WHEN home_score < away_score AND is_home_game = 1 THEN 1 
                             WHEN home_score > away_score AND is_home_game = 0 THEN 1 
                             ELSE 0 END) as losses
                FROM matches 
                WHERE team_id = ? AND status = 'completed'
            `, [this.id]);

            if (matchStats.length > 0) {
                stats.matches_played = matchStats[0].total_matches;
                stats.wins = matchStats[0].wins;
                stats.draws = matchStats[0].draws;
                stats.losses = matchStats[0].losses;
            }

            // Get training stats
            const trainingStats = await database.get(
                'SELECT COUNT(*) as count FROM trainings WHERE team_id = ? AND status = "completed"',
                [this.id]
            );
            stats.trainings_completed = trainingStats.count;

            return stats;
        } catch (error) {
            console.error('Error getting team stats:', error);
            throw error;
        }
    }

    static validate(teamData) {
        const errors = [];

        if (!teamData.name || teamData.name.trim().length < 2) {
            errors.push('Team name must be at least 2 characters');
        }

        if (!teamData.age_group || teamData.age_group.trim().length < 2) {
            errors.push('Age group is required');
        }

        if (!teamData.season || teamData.season.trim().length < 4) {
            errors.push('Season is required');
        }

        if (teamData.max_players && (teamData.max_players < 10 || teamData.max_players > 50)) {
            errors.push('Max players must be between 10 and 50');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = Team;