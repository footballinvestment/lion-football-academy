const db = require('../database/connection');

/**
 * Development Model
 * Comprehensive development tracking including plans, assessments, milestones, and progress
 */
class Development {
    // =====================================================================
    // SKILLS ASSESSMENTS
    // =====================================================================

    /**
     * Create a new skills assessment
     * @param {Object} assessmentData - Assessment data object
     * @returns {Promise<Object>} Created assessment with ID
     */
    static async createSkillAssessment(assessmentData) {
        try {
            if (!assessmentData.player_id || !assessmentData.assessed_by || !assessmentData.skill_category || !assessmentData.skill_name) {
                throw new Error('Missing required fields: player_id, assessed_by, skill_category, skill_name');
            }

            const query = `
                INSERT INTO skills_assessments (
                    player_id, assessment_date, assessed_by, skill_category,
                    skill_name, score, notes, improvement_suggestions, next_assessment_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await db.run(query, [
                assessmentData.player_id,
                assessmentData.assessment_date || new Date().toISOString().split('T')[0],
                assessmentData.assessed_by,
                assessmentData.skill_category,
                assessmentData.skill_name,
                assessmentData.score || null,
                assessmentData.notes || null,
                assessmentData.improvement_suggestions || null,
                assessmentData.next_assessment_date || null
            ]);
            
            return { id: result.lastID };
        } catch (error) {
            throw new Error(`Failed to create skill assessment: ${error.message}`);
        }
    }

    /**
     * Update skills assessment
     * @param {number} id - Assessment ID
     * @param {Object} assessmentData - Updated assessment data
     * @returns {Promise<Object>} Update result
     */
    static async updateSkillAssessment(id, assessmentData) {
        try {
            const query = `
                UPDATE skills_assessments SET
                    skill_category = ?, skill_name = ?, score = ?, notes = ?,
                    improvement_suggestions = ?, next_assessment_date = ?
                WHERE id = ?
            `;
            
            return await db.run(query, [
                assessmentData.skill_category,
                assessmentData.skill_name,
                assessmentData.score || null,
                assessmentData.notes || null,
                assessmentData.improvement_suggestions || null,
                assessmentData.next_assessment_date || null,
                id
            ]);
        } catch (error) {
            throw new Error(`Failed to update skill assessment: ${error.message}`);
        }
    }

    /**
     * Get skills assessments by player
     * @param {number} playerId - Player ID
     * @param {Object} filters - Optional filters (skill_category, date_from, date_to)
     * @returns {Promise<Array>} Skills assessments
     */
    static async getSkillAssessmentsByPlayer(playerId, filters = {}) {
        try {
            let query = `
                SELECT sa.*, u.full_name as assessed_by_name
                FROM skills_assessments sa
                LEFT JOIN users u ON sa.assessed_by = u.id
                WHERE sa.player_id = ?
            `;
            
            const params = [playerId];
            
            if (filters.skill_category) {
                query += ' AND sa.skill_category = ?';
                params.push(filters.skill_category);
            }
            
            if (filters.date_from) {
                query += ' AND sa.assessment_date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND sa.assessment_date <= ?';
                params.push(filters.date_to);
            }
            
            query += ' ORDER BY sa.assessment_date DESC, sa.skill_category';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get skill assessments: ${error.message}`);
        }
    }

    /**
     * Get latest skill scores for a player
     * @param {number} playerId - Player ID
     * @returns {Promise<Array>} Latest skill scores by category
     */
    static async getLatestSkillScores(playerId) {
        try {
            const query = `
                SELECT DISTINCT
                    sa1.skill_category,
                    sa1.skill_name,
                    sa1.score,
                    sa1.assessment_date,
                    sa1.notes,
                    u.full_name as assessed_by_name
                FROM skills_assessments sa1
                LEFT JOIN users u ON sa1.assessed_by = u.id
                WHERE sa1.player_id = ?
                AND sa1.assessment_date = (
                    SELECT MAX(sa2.assessment_date)
                    FROM skills_assessments sa2
                    WHERE sa2.player_id = sa1.player_id
                    AND sa2.skill_name = sa1.skill_name
                )
                ORDER BY sa1.skill_category, sa1.skill_name
            `;
            
            return await db.query(query, [playerId]);
        } catch (error) {
            throw new Error(`Failed to get latest skill scores: ${error.message}`);
        }
    }

    /**
     * Get skill progression over time
     * @param {number} playerId - Player ID
     * @param {string} skillName - Specific skill name
     * @returns {Promise<Array>} Skill progression data
     */
    static async getSkillProgression(playerId, skillName) {
        try {
            const query = `
                SELECT 
                    assessment_date,
                    score,
                    notes,
                    improvement_suggestions,
                    u.full_name as assessed_by_name
                FROM skills_assessments sa
                LEFT JOIN users u ON sa.assessed_by = u.id
                WHERE sa.player_id = ? AND sa.skill_name = ?
                ORDER BY sa.assessment_date ASC
            `;
            
            return await db.query(query, [playerId, skillName]);
        } catch (error) {
            throw new Error(`Failed to get skill progression: ${error.message}`);
        }
    }

    // =====================================================================
    // DEVELOPMENT MILESTONES
    // =====================================================================

    /**
     * Create a development milestone
     * @param {Object} milestoneData - Milestone data object
     * @returns {Promise<Object>} Created milestone with ID
     */
    static async createMilestone(milestoneData) {
        try {
            if (!milestoneData.plan_id || !milestoneData.milestone_title) {
                throw new Error('Missing required fields: plan_id, milestone_title');
            }

            const query = `
                INSERT INTO development_milestones (
                    plan_id, milestone_title, description, target_date,
                    completion_date, achieved, achievement_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await db.run(query, [
                milestoneData.plan_id,
                milestoneData.milestone_title,
                milestoneData.description || null,
                milestoneData.target_date || null,
                milestoneData.completion_date || null,
                milestoneData.achieved || 0,
                milestoneData.achievement_notes || null
            ]);
            
            return { id: result.lastID };
        } catch (error) {
            throw new Error(`Failed to create milestone: ${error.message}`);
        }
    }

    /**
     * Update milestone
     * @param {number} id - Milestone ID
     * @param {Object} milestoneData - Updated milestone data
     * @returns {Promise<Object>} Update result
     */
    static async updateMilestone(id, milestoneData) {
        try {
            const query = `
                UPDATE development_milestones SET
                    milestone_title = ?, description = ?, target_date = ?,
                    completion_date = ?, achieved = ?, achievement_notes = ?
                WHERE id = ?
            `;
            
            return await db.run(query, [
                milestoneData.milestone_title,
                milestoneData.description || null,
                milestoneData.target_date || null,
                milestoneData.completion_date || null,
                milestoneData.achieved || 0,
                milestoneData.achievement_notes || null,
                id
            ]);
        } catch (error) {
            throw new Error(`Failed to update milestone: ${error.message}`);
        }
    }

    /**
     * Mark milestone as achieved
     * @param {number} id - Milestone ID
     * @param {string} achievementNotes - Optional achievement notes
     * @returns {Promise<Object>} Update result
     */
    static async achieveMilestone(id, achievementNotes = null) {
        try {
            const completionDate = new Date().toISOString().split('T')[0];
            const query = `
                UPDATE development_milestones SET
                    achieved = 1, completion_date = ?, achievement_notes = ?
                WHERE id = ?
            `;
            
            return await db.run(query, [completionDate, achievementNotes, id]);
        } catch (error) {
            throw new Error(`Failed to mark milestone as achieved: ${error.message}`);
        }
    }

    /**
     * Get milestones by development plan
     * @param {number} planId - Development plan ID
     * @returns {Promise<Array>} Milestones for the plan
     */
    static async getMilestonesByPlan(planId) {
        try {
            const query = `
                SELECT * FROM development_milestones
                WHERE plan_id = ?
                ORDER BY target_date ASC, created_at ASC
            `;
            
            return await db.query(query, [planId]);
        } catch (error) {
            throw new Error(`Failed to get milestones: ${error.message}`);
        }
    }

    /**
     * Get upcoming milestones
     * @param {number} playerId - Optional player ID filter
     * @param {number} days - Days ahead to look (default 30)
     * @returns {Promise<Array>} Upcoming milestones
     */
    static async getUpcomingMilestones(playerId = null, days = 30) {
        try {
            let query = `
                SELECT dm.*, dp.player_id, p.name as player_name, dp.plan_type
                FROM development_milestones dm
                JOIN development_plans dp ON dm.plan_id = dp.id
                JOIN players p ON dp.player_id = p.id
                WHERE dm.achieved = 0 
                AND dm.target_date IS NOT NULL
                AND dm.target_date BETWEEN DATE('now') AND DATE('now', '+${days} days')
            `;
            
            const params = [];
            
            if (playerId) {
                query += ' AND dp.player_id = ?';
                params.push(playerId);
            }
            
            query += ' ORDER BY dm.target_date ASC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get upcoming milestones: ${error.message}`);
        }
    }

    // =====================================================================
    // PROGRESS TRACKING
    // =====================================================================

    /**
     * Create progress tracking entry
     * @param {Object} progressData - Progress data object
     * @returns {Promise<Object>} Created progress entry with ID
     */
    static async createProgressEntry(progressData) {
        try {
            if (!progressData.plan_id || !progressData.recorded_by) {
                throw new Error('Missing required fields: plan_id, recorded_by');
            }

            const query = `
                INSERT INTO progress_tracking (
                    plan_id, tracking_date, progress_percentage, activities_completed,
                    challenges_faced, next_week_goals, coach_feedback,
                    player_self_assessment, parent_input, recorded_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await db.run(query, [
                progressData.plan_id,
                progressData.tracking_date || new Date().toISOString().split('T')[0],
                progressData.progress_percentage || null,
                progressData.activities_completed || null,
                progressData.challenges_faced || null,
                progressData.next_week_goals || null,
                progressData.coach_feedback || null,
                progressData.player_self_assessment || null,
                progressData.parent_input || null,
                progressData.recorded_by
            ]);
            
            return { id: result.lastID };
        } catch (error) {
            throw new Error(`Failed to create progress entry: ${error.message}`);
        }
    }

    /**
     * Get progress tracking for a plan
     * @param {number} planId - Development plan ID
     * @param {Object} filters - Optional filters (date_from, date_to, limit)
     * @returns {Promise<Array>} Progress tracking entries
     */
    static async getProgressByPlan(planId, filters = {}) {
        try {
            let query = `
                SELECT pt.*, u.full_name as recorded_by_name
                FROM progress_tracking pt
                LEFT JOIN users u ON pt.recorded_by = u.id
                WHERE pt.plan_id = ?
            `;
            
            const params = [planId];
            
            if (filters.date_from) {
                query += ' AND pt.tracking_date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND pt.tracking_date <= ?';
                params.push(filters.date_to);
            }
            
            query += ' ORDER BY pt.tracking_date DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get progress tracking: ${error.message}`);
        }
    }

    /**
     * Get latest progress for all active plans
     * @param {number} playerId - Optional player ID filter
     * @param {number} teamId - Optional team ID filter
     * @returns {Promise<Array>} Latest progress entries
     */
    static async getLatestProgress(playerId = null, teamId = null) {
        try {
            let query = `
                SELECT 
                    dp.id as plan_id, dp.plan_type, dp.season,
                    p.name as player_name, t.name as team_name,
                    pt.tracking_date, pt.progress_percentage,
                    pt.player_self_assessment, pt.coach_feedback
                FROM development_plans dp
                JOIN players p ON dp.player_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                LEFT JOIN progress_tracking pt ON dp.id = pt.plan_id
                WHERE dp.status = 'active'
                AND pt.tracking_date = (
                    SELECT MAX(pt2.tracking_date)
                    FROM progress_tracking pt2
                    WHERE pt2.plan_id = dp.id
                )
            `;
            
            const params = [];
            
            if (playerId) {
                query += ' AND dp.player_id = ?';
                params.push(playerId);
            }
            
            if (teamId) {
                query += ' AND p.team_id = ?';
                params.push(teamId);
            }
            
            query += ' ORDER BY p.name, dp.plan_type';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get latest progress: ${error.message}`);
        }
    }

    // =====================================================================
    // COMPREHENSIVE ANALYTICS
    // =====================================================================

    /**
     * Get comprehensive development summary for a player
     * @param {number} playerId - Player ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Development summary
     */
    static async getPlayerDevelopmentSummary(playerId, season = null) {
        try {
            // Get development plans
            let plansQuery = `
                SELECT * FROM development_plans
                WHERE player_id = ? AND status = 'active'
            `;
            const planParams = [playerId];
            
            if (season) {
                plansQuery += ' AND season = ?';
                planParams.push(season);
            }
            
            const plans = await db.query(plansQuery, planParams);
            
            // Get latest skill assessments
            const skills = await this.getLatestSkillScores(playerId);
            
            // Get milestone completion rate
            const milestoneQuery = `
                SELECT 
                    COUNT(*) as total_milestones,
                    COUNT(CASE WHEN achieved = 1 THEN 1 END) as completed_milestones
                FROM development_milestones dm
                JOIN development_plans dp ON dm.plan_id = dp.id
                WHERE dp.player_id = ?
            `;
            const milestoneParams = [playerId];
            
            if (season) {
                // Add season filter to milestone query if needed
            }
            
            const milestoneStats = await db.query(milestoneQuery, milestoneParams);
            
            // Get recent progress
            const recentProgress = await this.getLatestProgress(playerId);
            
            return {
                development_plans: plans,
                latest_skills: skills,
                milestone_stats: milestoneStats[0] || { total_milestones: 0, completed_milestones: 0 },
                recent_progress: recentProgress,
                summary: {
                    active_plans: plans.length,
                    avg_completion: plans.length > 0 ? plans.reduce((sum, p) => sum + p.completion_percentage, 0) / plans.length : 0,
                    milestone_completion_rate: milestoneStats[0]?.total_milestones > 0 
                        ? (milestoneStats[0].completed_milestones / milestoneStats[0].total_milestones) * 100 
                        : 0
                }
            };
        } catch (error) {
            throw new Error(`Failed to get development summary: ${error.message}`);
        }
    }

    /**
     * Get team development overview
     * @param {number} teamId - Team ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Team development overview
     */
    static async getTeamDevelopmentOverview(teamId, season = null) {
        try {
            let query = `
                SELECT 
                    p.id, p.name as player_name,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as avg_completion,
                    COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans,
                    COUNT(CASE WHEN dp.status = 'completed' THEN 1 END) as completed_plans
                FROM players p
                LEFT JOIN development_plans dp ON p.id = dp.player_id
                WHERE p.team_id = ?
            `;
            
            const params = [teamId];
            
            if (season) {
                query += ' AND dp.season = ?';
                params.push(season);
            }
            
            query += ' GROUP BY p.id, p.name ORDER BY avg_completion DESC';
            
            const playerProgress = await db.query(query, params);
            
            // Get team-wide statistics
            let statsQuery = `
                SELECT 
                    COUNT(DISTINCT dp.player_id) as players_with_plans,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as team_avg_completion,
                    COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans,
                    COUNT(CASE WHEN dp.plan_type = 'technical' THEN 1 END) as technical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'physical' THEN 1 END) as physical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'tactical' THEN 1 END) as tactical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'mental' THEN 1 END) as mental_plans
                FROM development_plans dp
                JOIN players p ON dp.player_id = p.id
                WHERE p.team_id = ?
            `;
            
            const statsParams = [teamId];
            
            if (season) {
                statsQuery += ' AND dp.season = ?';
                statsParams.push(season);
            }
            
            const teamStats = await db.query(statsQuery, statsParams);
            
            return {
                player_progress: playerProgress,
                team_statistics: teamStats[0] || {},
                upcoming_milestones: await this.getUpcomingMilestones(null, 30)
            };
        } catch (error) {
            throw new Error(`Failed to get team development overview: ${error.message}`);
        }
    }

    /**
     * Delete skills assessment
     * @param {number} id - Assessment ID
     * @returns {Promise<Object>} Delete result
     */
    static async deleteSkillAssessment(id) {
        try {
            return await db.run('DELETE FROM skills_assessments WHERE id = ?', [id]);
        } catch (error) {
            throw new Error(`Failed to delete skill assessment: ${error.message}`);
        }
    }

    /**
     * Delete milestone
     * @param {number} id - Milestone ID
     * @returns {Promise<Object>} Delete result
     */
    static async deleteMilestone(id) {
        try {
            return await db.run('DELETE FROM development_milestones WHERE id = ?', [id]);
        } catch (error) {
            throw new Error(`Failed to delete milestone: ${error.message}`);
        }
    }

    /**
     * Delete progress entry
     * @param {number} id - Progress entry ID
     * @returns {Promise<Object>} Delete result
     */
    static async deleteProgressEntry(id) {
        try {
            return await db.run('DELETE FROM progress_tracking WHERE id = ?', [id]);
        } catch (error) {
            throw new Error(`Failed to delete progress entry: ${error.message}`);
        }
    }
}

module.exports = Development;