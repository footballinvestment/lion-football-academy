const db = require('../database/connection');

class DevelopmentPlan {
    // Core CRUD operations
    static async findAll(filters = {}) {
        let query = `
            SELECT dp.*, p.name as player_name, p.team_id,
                   u1.full_name as created_by_name,
                   u2.full_name as reviewed_by_name
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
            LEFT JOIN users u1 ON dp.created_by = u1.id
            LEFT JOIN users u2 ON dp.reviewed_by = u2.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.player_id) {
            query += ' AND dp.player_id = ?';
            params.push(filters.player_id);
        }
        
        if (filters.team_id) {
            query += ' AND p.team_id = ?';
            params.push(filters.team_id);
        }
        
        if (filters.season) {
            query += ' AND dp.season = ?';
            params.push(filters.season);
        }
        
        if (filters.plan_type) {
            query += ' AND dp.plan_type = ?';
            params.push(filters.plan_type);
        }
        
        if (filters.status) {
            query += ' AND dp.status = ?';
            params.push(filters.status);
        }
        
        query += ' ORDER BY dp.created_at DESC';
        
        return await db.query(query, params);
    }

    static async findById(id) {
        const query = `
            SELECT dp.*, p.name as player_name, p.team_id,
                   u1.full_name as created_by_name,
                   u2.full_name as reviewed_by_name
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
            LEFT JOIN users u1 ON dp.created_by = u1.id
            LEFT JOIN users u2 ON dp.reviewed_by = u2.id
            WHERE dp.id = ?
        `;
        const results = await db.query(query, [id]);
        return results[0] || null;
    }

    static async findByPlayer(playerId) {
        const query = `
            SELECT dp.*, u1.full_name as created_by_name
            FROM development_plans dp
            LEFT JOIN users u1 ON dp.created_by = u1.id
            WHERE dp.player_id = ?
            ORDER BY dp.created_at DESC
        `;
        return await db.query(query, [playerId]);
    }

    static async findByTeam(teamId) {
        const query = `
            SELECT dp.*, p.name as player_name, u1.full_name as created_by_name
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
            LEFT JOIN users u1 ON dp.created_by = u1.id
            WHERE p.team_id = ?
            ORDER BY dp.created_at DESC
        `;
        return await db.query(query, [teamId]);
    }

    static async create(planData) {
        const query = `
            INSERT INTO development_plans (
                player_id, season, plan_type, current_level, target_level,
                goals, action_steps, resources_needed, deadline,
                progress_notes, coach_notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            planData.player_id,
            planData.season,
            planData.plan_type,
            planData.current_level,
            planData.target_level,
            planData.goals,
            planData.action_steps,
            planData.resources_needed || null,
            planData.deadline || null,
            planData.progress_notes || null,
            planData.coach_notes || null,
            planData.created_by
        ]);
        
        return { id: result.lastID };
    }

    static async update(id, planData) {
        const query = `
            UPDATE development_plans SET
                season = ?, plan_type = ?, current_level = ?, target_level = ?,
                goals = ?, action_steps = ?, resources_needed = ?, deadline = ?,
                progress_notes = ?, coach_notes = ?, parent_feedback = ?,
                status = ?, completion_percentage = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(query, [
            planData.season,
            planData.plan_type,
            planData.current_level,
            planData.target_level,
            planData.goals,
            planData.action_steps,
            planData.resources_needed || null,
            planData.deadline || null,
            planData.progress_notes || null,
            planData.coach_notes || null,
            planData.parent_feedback || null,
            planData.status || 'active',
            planData.completion_percentage || 0,
            id
        ]);
    }

    static async delete(id) {
        return await db.run('DELETE FROM development_plans WHERE id = ?', [id]);
    }

    static async updateProgress(id, progressData) {
        const query = `
            UPDATE development_plans SET
                completion_percentage = ?, progress_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return await db.run(query, [progressData.completion_percentage, progressData.progress_notes, id]);
    }

    static async review(id, reviewData) {
        const query = `
            UPDATE development_plans SET
                reviewed_by = ?, review_date = ?, coach_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return await db.run(query, [reviewData.reviewed_by, reviewData.review_date, reviewData.coach_notes, id]);
    }

    // Statistics methods
    static async getStats(teamId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_plans,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_plans,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_plans,
                COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_plans,
                AVG(completion_percentage) as avg_completion,
                COUNT(CASE WHEN plan_type = 'technical' THEN 1 END) as technical_plans,
                COUNT(CASE WHEN plan_type = 'physical' THEN 1 END) as physical_plans,
                COUNT(CASE WHEN plan_type = 'tactical' THEN 1 END) as tactical_plans,
                COUNT(CASE WHEN plan_type = 'mental' THEN 1 END) as mental_plans,
                COUNT(CASE WHEN plan_type = 'academic' THEN 1 END) as academic_plans
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
        `;
        
        const params = [];
        if (teamId) {
            query += ' WHERE p.team_id = ?';
            params.push(teamId);
        }
        
        const results = await db.query(query, params);
        return results[0] || {};
    }

    static async getPlayerProgress(playerId) {
        const query = `
            SELECT 
                plan_type,
                AVG(completion_percentage) as avg_completion,
                COUNT(*) as total_plans,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_plans
            FROM development_plans
            WHERE player_id = ?
            GROUP BY plan_type
        `;
        return await db.query(query, [playerId]);
    }

    static async getTeamOverview(teamId) {
        const query = `
            SELECT 
                p.name as player_name,
                COUNT(dp.id) as total_plans,
                AVG(dp.completion_percentage) as avg_completion,
                COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans
            FROM players p
            LEFT JOIN development_plans dp ON p.id = dp.player_id
            WHERE p.team_id = ?
            GROUP BY p.id, p.name
            ORDER BY avg_completion DESC
        `;
        return await db.query(query, [teamId]);
    }

    static async getSeasonPlans(season, teamId = null) {
        let query = `
            SELECT dp.*, p.name as player_name, p.team_id
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
            WHERE dp.season = ?
        `;
        
        const params = [season];
        if (teamId) {
            query += ' AND p.team_id = ?';
            params.push(teamId);
        }
        
        query += ' ORDER BY dp.plan_type, p.name';
        return await db.query(query, params);
    }

    static async getActivePlans(teamId = null) {
        let query = `
            SELECT dp.*, p.name as player_name, p.team_id
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
            WHERE dp.status = 'active'
        `;
        
        const params = [];
        if (teamId) {
            query += ' AND p.team_id = ?';
            params.push(teamId);
        }
        
        query += ' ORDER BY dp.created_at DESC';
        return await db.query(query, params);
    }

    static async getCompletionTrends(teamId = null) {
        let query = `
            SELECT 
                plan_type,
                AVG(completion_percentage) as avg_completion,
                COUNT(*) as total_plans,
                COUNT(CASE WHEN completion_percentage >= 80 THEN 1 END) as high_completion_plans
            FROM development_plans dp
            JOIN players p ON dp.player_id = p.id
        `;
        
        const params = [];
        if (teamId) {
            query += ' WHERE p.team_id = ?';
            params.push(teamId);
        }
        
        query += ' GROUP BY plan_type ORDER BY avg_completion DESC';
        return await db.query(query, params);
    }
}

module.exports = DevelopmentPlan;