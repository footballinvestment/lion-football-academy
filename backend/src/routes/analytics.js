const express = require('express');
const router = express.Router();
const PlayerPerformance = require('../models/PlayerPerformance');
const Development = require('../models/Development');
const Injury = require('../models/Injury');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, isAdmin, isAdminOrCoach } = require('../middleware/auth');

// Apply authentication to all analytics routes
router.use(authenticate);

/**
 * Pagination utility
 * @param {Object} req - Request object
 * @returns {Object} Pagination parameters
 */
const getPagination = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 items per page
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

// =====================================================================
// COMPREHENSIVE ANALYTICS ENDPOINTS
// =====================================================================

/**
 * GET /api/analytics/dashboard - Main analytics dashboard
 * Query params: team_id, season, period (week, month, quarter, year)
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { team_id, season, period = 'month' } = req.query;
        let teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        // If no team specified and user is admin, get academy-wide stats
        const isAcademyWide = !teamId && req.user.role === 'admin';
        
        const filters = { season, period };
        
        // Get comprehensive dashboard data
        const [
            overviewStats,
            performanceTrends,
            injuryOverview,
            developmentProgress,
            upcomingEvents,
            topPerformers,
            teamRankings
        ] = await Promise.all([
            getOverviewStats(teamId, filters),
            getPerformanceTrends(teamId, filters),
            getInjuryOverview(teamId, filters),
            getDevelopmentProgress(teamId, filters),
            getUpcomingEvents(teamId),
            getTopPerformers(teamId, filters),
            isAcademyWide ? getTeamRankings(season) : null
        ]);
        
        res.json({
            success: true,
            academy_wide: isAcademyWide,
            team_id: teamId,
            period: period,
            season: season,
            dashboard: {
                overview: overviewStats,
                performance_trends: performanceTrends,
                injury_overview: injuryOverview,
                development_progress: developmentProgress,
                upcoming_events: upcomingEvents,
                top_performers: topPerformers,
                ...(teamRankings && { team_rankings: teamRankings })
            }
        });
    } catch (error) {
        console.error('Dashboard analytics fetch error:', error);
        res.status(500).json({ error: 'Server error fetching dashboard analytics' });
    }
});

/**
 * GET /api/analytics/performance-comparison - Compare multiple players/teams
 * Query params: type (player|team), ids (comma-separated), metrics, season
 */
router.get('/performance-comparison', async (req, res) => {
    try {
        const { type, ids, metrics, season } = req.query;
        
        if (!type || !ids) {
            return res.status(400).json({ 
                error: 'Missing required parameters: type, ids' 
            });
        }
        
        const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        
        if (idList.length < 2 || idList.length > 10) {
            return res.status(400).json({ 
                error: 'Must compare between 2 and 10 entities' 
            });
        }
        
        let comparisonData;
        
        if (type === 'player') {
            // Validate access to all players
            for (const playerId of idList) {
                const player = await Player.findById(playerId);
                if (!player || (req.user.role === 'coach' && player.team_id !== req.user.team_id)) {
                    return res.status(403).json({ 
                        error: `Access denied to player data for player ID: ${playerId}` 
                    });
                }
            }
            
            comparisonData = await PlayerPerformance.comparePlayerPerformance(idList, season);
        } else if (type === 'team') {
            // Admin can compare any teams, coaches only their own
            if (req.user.role === 'coach' && !idList.includes(req.user.team_id)) {
                return res.status(403).json({ error: 'Access denied to team comparison data' });
            }
            
            comparisonData = await Team.compareTeamPerformance(idList, season);
        } else {
            return res.status(400).json({ 
                error: 'Invalid type. Must be: player or team' 
            });
        }
        
        res.json({
            success: true,
            comparison_type: type,
            entities: idList,
            season: season || 'all',
            metrics: metrics ? metrics.split(',') : 'all',
            comparison_data: comparisonData
        });
    } catch (error) {
        console.error('Performance comparison error:', error);
        res.status(500).json({ error: 'Server error generating performance comparison' });
    }
});

/**
 * GET /api/analytics/player-development-report/:playerId - Comprehensive player development report
 */
router.get('/player-development-report/:playerId', async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { season, date_from, date_to } = req.query;
        
        // Validate player exists and access
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (req.user.role !== 'admin' && 
            req.user.team_id !== player.team_id && 
            req.user.player_id !== playerId) {
            return res.status(403).json({ error: 'Access denied to this player\'s development report' });
        }
        
        const filters = { season, date_from, date_to };
        
        // Get comprehensive development data
        const [
            playerProfile,
            performanceHistory,
            skillProgression,
            developmentPlans,
            injuryHistory,
            attendanceStats,
            goalsAndMilestones,
            coachNotes
        ] = await Promise.all([
            Player.getPlayerProfile(playerId),
            PlayerPerformance.getPlayerStats(playerId, season),
            Development.getSkillProgression(playerId),
            Development.findPlansByPlayer(playerId, { status: 'active' }),
            Injury.getPlayerInjuryHistory(playerId),
            Player.getAttendanceStats(playerId, filters),
            Development.getPlayerMilestones(playerId, filters),
            Player.getCoachNotes(playerId, filters)
        ]);
        
        res.json({
            success: true,
            report_type: 'player_development',
            player: playerProfile,
            period: filters,
            development_report: {
                performance_summary: performanceHistory,
                skill_progression: skillProgression,
                active_development_plans: developmentPlans,
                injury_history: injuryHistory,
                attendance_statistics: attendanceStats,
                goals_and_milestones: goalsAndMilestones,
                coach_notes: coachNotes
            }
        });
    } catch (error) {
        console.error('Player development report error:', error);
        res.status(500).json({ error: 'Server error generating player development report' });
    }
});

/**
 * GET /api/analytics/team-performance-report/:teamId - Comprehensive team performance report
 */
router.get('/team-performance-report/:teamId', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const { season, include_players = 'true' } = req.query;
        
        // Access control
        if (req.user.role !== 'admin' && req.user.team_id !== teamId) {
            return res.status(403).json({ error: 'Access denied to this team\'s performance report' });
        }
        
        const includePlayerDetails = include_players === 'true';
        
        // Get comprehensive team data
        const [
            teamInfo,
            seasonStats,
            matchResults,
            playerPerformances,
            injuryStats,
            developmentOverview,
            teamForm,
            tacticalStats
        ] = await Promise.all([
            Team.findById(teamId),
            Team.getSeasonStats(teamId, season),
            Match.getTeamMatchResults(teamId, season),
            includePlayerDetails ? PlayerPerformance.getTeamPlayerStats(teamId, season) : null,
            Injury.getTeamHealthStats(teamId),
            Development.getTeamDevelopmentOverview(teamId),
            Team.getTeamForm(teamId, 10),
            Match.getTeamTacticalStats(teamId, season)
        ]);
        
        if (!teamInfo) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        res.json({
            success: true,
            report_type: 'team_performance',
            team: teamInfo,
            season: season || 'current',
            performance_report: {
                season_statistics: seasonStats,
                match_results: matchResults,
                team_form: teamForm,
                tactical_analysis: tacticalStats,
                injury_overview: injuryStats,
                development_summary: developmentOverview,
                ...(playerPerformances && { player_performances: playerPerformances })
            }
        });
    } catch (error) {
        console.error('Team performance report error:', error);
        res.status(500).json({ error: 'Server error generating team performance report' });
    }
});

/**
 * GET /api/analytics/academy-overview - Academy-wide analytics (admin only)
 */
router.get('/academy-overview', isAdmin, async (req, res) => {
    try {
        const { season, period = 'year' } = req.query;
        
        // Get academy-wide statistics
        const [
            academyStats,
            teamComparison,
            playerDistribution,
            injuryTrends,
            developmentMetrics,
            performanceTrends,
            facilityUsage,
            coachingStats
        ] = await Promise.all([
            getAcademyStats(season),
            getTeamComparison(season),
            getPlayerDistribution(),
            Injury.getInjuryTrends(null, period),
            Development.getAcademyDevelopmentMetrics(season),
            PlayerPerformance.getAcademyPerformanceTrends(season, period),
            getFacilityUsageStats(season),
            getCoachingStats(season)
        ]);
        
        res.json({
            success: true,
            report_type: 'academy_overview',
            season: season || 'current',
            period: period,
            academy_analytics: {
                general_statistics: academyStats,
                team_comparison: teamComparison,
                player_distribution: playerDistribution,
                injury_trends: injuryTrends,
                development_metrics: developmentMetrics,
                performance_trends: performanceTrends,
                facility_usage: facilityUsage,
                coaching_statistics: coachingStats
            }
        });
    } catch (error) {
        console.error('Academy overview error:', error);
        res.status(500).json({ error: 'Server error generating academy overview' });
    }
});

/**
 * GET /api/analytics/predictions - Performance predictions and trends
 * Query params: type (player|team), id, prediction_type (performance|injury|development)
 */
router.get('/predictions', async (req, res) => {
    try {
        const { type, id, prediction_type = 'performance' } = req.query;
        
        if (!type || !id) {
            return res.status(400).json({ 
                error: 'Missing required parameters: type, id' 
            });
        }
        
        const entityId = parseInt(id);
        let predictions;
        
        if (type === 'player') {
            // Validate access
            const player = await Player.findById(entityId);
            if (!player || (req.user.role === 'coach' && player.team_id !== req.user.team_id)) {
                return res.status(403).json({ error: 'Access denied to player data' });
            }
            
            predictions = await generatePlayerPredictions(entityId, prediction_type);
        } else if (type === 'team') {
            // Validate access
            if (req.user.role !== 'admin' && req.user.team_id !== entityId) {
                return res.status(403).json({ error: 'Access denied to team data' });
            }
            
            predictions = await generateTeamPredictions(entityId, prediction_type);
        } else {
            return res.status(400).json({ error: 'Invalid type. Must be: player or team' });
        }
        
        res.json({
            success: true,
            entity_type: type,
            entity_id: entityId,
            prediction_type: prediction_type,
            predictions: predictions
        });
    } catch (error) {
        console.error('Predictions error:', error);
        res.status(500).json({ error: 'Server error generating predictions' });
    }
});

/**
 * GET /api/analytics/export - Export analytics data
 * Query params: type (dashboard|player|team|academy), format (json|csv), ...filters
 */
router.get('/export', async (req, res) => {
    try {
        const { type, format = 'json', ...filters } = req.query;
        
        if (!type) {
            return res.status(400).json({ error: 'Missing required parameter: type' });
        }
        
        let exportData;
        
        switch (type) {
            case 'dashboard':
                exportData = await exportDashboardData(req.user, filters);
                break;
            case 'player':
                if (!filters.player_id) {
                    return res.status(400).json({ error: 'player_id required for player export' });
                }
                exportData = await exportPlayerData(filters.player_id, req.user, filters);
                break;
            case 'team':
                if (!filters.team_id) {
                    return res.status(400).json({ error: 'team_id required for team export' });
                }
                exportData = await exportTeamData(filters.team_id, req.user, filters);
                break;
            case 'academy':
                if (req.user.role !== 'admin') {
                    return res.status(403).json({ error: 'Admin access required for academy export' });
                }
                exportData = await exportAcademyData(filters);
                break;
            default:
                return res.status(400).json({ 
                    error: 'Invalid type. Must be: dashboard, player, team, or academy' 
                });
        }
        
        if (format === 'csv') {
            const csv = convertToCSV(exportData);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${Date.now()}.csv"`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                export_type: type,
                format: format,
                exported_at: new Date().toISOString(),
                data: exportData
            });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Server error exporting analytics data' });
    }
});

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

async function getOverviewStats(teamId, filters) {
    try {
        if (teamId) {
            // Team-specific stats
            const [playerCount, activeInjuries, upcomingMatches, recentPerformance] = await Promise.all([
                Team.getPlayersCount(teamId),
                Injury.findActive(teamId),
                Match.getUpcomingMatches(teamId, 5),
                PlayerPerformance.getTeamRecentPerformance(teamId, 5)
            ]);
            
            return {
                total_players: playerCount,
                active_injuries: activeInjuries.length,
                upcoming_matches: upcomingMatches.length,
                recent_match_performance: recentPerformance
            };
        } else {
            // Academy-wide stats
            const [totalPlayers, totalTeams, totalActiveInjuries, totalMatches] = await Promise.all([
                Player.getTotalCount(),
                Team.getTotalCount(),
                Injury.getTotalActiveCount(),
                Match.getTotalCount(filters.season)
            ]);
            
            return {
                total_players: totalPlayers,
                total_teams: totalTeams,
                active_injuries: totalActiveInjuries,
                total_matches: totalMatches
            };
        }
    } catch (error) {
        console.error('Overview stats error:', error);
        return {};
    }
}

async function getPerformanceTrends(teamId, filters) {
    try {
        return await PlayerPerformance.getPerformanceTrends(teamId, filters.period, filters.season);
    } catch (error) {
        console.error('Performance trends error:', error);
        return {};
    }
}

async function getInjuryOverview(teamId, filters) {
    try {
        const [activeInjuries, monthlyStats, typeStats] = await Promise.all([
            Injury.findActive(teamId),
            Injury.getMonthlyInjuryStats(filters.season, teamId),
            Injury.getInjuryTypeStats(teamId, filters)
        ]);
        
        return {
            active_count: activeInjuries.length,
            monthly_trends: monthlyStats,
            injury_types: typeStats
        };
    } catch (error) {
        console.error('Injury overview error:', error);
        return {};
    }
}

async function getDevelopmentProgress(teamId, filters) {
    try {
        if (teamId) {
            return await Development.getTeamDevelopmentOverview(teamId);
        } else {
            return await Development.getAcademyDevelopmentMetrics(filters.season);
        }
    } catch (error) {
        console.error('Development progress error:', error);
        return {};
    }
}

async function getUpcomingEvents(teamId) {
    try {
        const [upcomingMatches, activePlans, medicalAppointments] = await Promise.all([
            Match.getUpcomingMatches(teamId, 10),
            Development.getActivePlans(teamId),
            Injury.getUpcomingMedicalAppointments(teamId)
        ]);
        
        return {
            matches: upcomingMatches,
            development_plans: activePlans,
            medical_appointments: medicalAppointments
        };
    } catch (error) {
        console.error('Upcoming events error:', error);
        return {};
    }
}

async function getTopPerformers(teamId, filters) {
    try {
        const [topScorers, topAssists, topRated] = await Promise.all([
            PlayerPerformance.getTopPerformers('goals', { team_id: teamId, season: filters.season, limit: 5 }),
            PlayerPerformance.getTopPerformers('assists', { team_id: teamId, season: filters.season, limit: 5 }),
            PlayerPerformance.getTopPerformers('performance_rating', { team_id: teamId, season: filters.season, limit: 5 })
        ]);
        
        return {
            top_scorers: topScorers,
            top_assists: topAssists,
            top_rated: topRated
        };
    } catch (error) {
        console.error('Top performers error:', error);
        return {};
    }
}

async function getTeamRankings(season) {
    try {
        return await Team.getTeamRankings(season);
    } catch (error) {
        console.error('Team rankings error:', error);
        return [];
    }
}

// Additional helper functions would be implemented here...
async function getAcademyStats(season) {
    // Implementation for academy-wide statistics
    return {};
}

async function getTeamComparison(season) {
    // Implementation for team comparison data
    return {};
}

async function getPlayerDistribution() {
    // Implementation for player distribution by age, position, etc.
    return {};
}

async function getFacilityUsageStats(season) {
    // Implementation for facility usage statistics
    return {};
}

async function getCoachingStats(season) {
    // Implementation for coaching statistics
    return {};
}

async function generatePlayerPredictions(playerId, predictionType) {
    // Implementation for AI/ML-based player predictions
    return {};
}

async function generateTeamPredictions(teamId, predictionType) {
    // Implementation for AI/ML-based team predictions
    return {};
}

async function exportDashboardData(user, filters) {
    // Implementation for dashboard data export
    return {};
}

async function exportPlayerData(playerId, user, filters) {
    // Implementation for player data export
    return {};
}

async function exportTeamData(teamId, user, filters) {
    // Implementation for team data export
    return {};
}

async function exportAcademyData(filters) {
    // Implementation for academy data export
    return {};
}

function convertToCSV(data) {
    // Implementation for JSON to CSV conversion
    if (!data || typeof data !== 'object') {
        return '';
    }
    
    // Simple CSV conversion - would need more sophisticated handling for complex nested objects
    const headers = Object.keys(data);
    const values = Object.values(data);
    
    return `${headers.join(',')}\n${values.join(',')}`;
}

// =====================================================================
// NEW ROLE-BASED ANALYTICS ENDPOINTS
// =====================================================================

// Player Analytics Routes
router.get('/player/analytics/personal-stats', analyticsController.getPlayerPersonalStats);
router.get('/player/analytics/performance-history', analyticsController.getPlayerPerformanceHistory);
router.get('/player/analytics/skill-assessment', analyticsController.getPlayerSkillAssessment);
router.get('/player/analytics/goal-analysis', analyticsController.getPlayerGoalAnalysis);
router.get('/player/analytics/match-performance', analyticsController.getPlayerMatchPerformance);
router.get('/player/analytics/team-contribution', analyticsController.getPlayerTeamContribution);
router.get('/player/analytics/improvements', analyticsController.getPlayerImprovements);
router.get('/player/analytics/share-stats', analyticsController.sharePlayerStats);

// Parent Analytics Routes
router.get('/parent/children', analyticsController.getParentChildren);
router.get('/parent/analytics/child-progress', analyticsController.getParentChildProgress);
router.get('/parent/analytics/skill-development', analyticsController.getParentSkillDevelopment);
router.get('/parent/analytics/attendance-analysis', analyticsController.getParentAttendanceAnalysis);
router.get('/parent/analytics/performance-trends', analyticsController.getParentPerformanceTrends);
router.get('/parent/analytics/peer-comparison', analyticsController.getParentPeerComparison);
router.get('/parent/analytics/achievement-timeline', analyticsController.getParentAchievementTimeline);
router.get('/parent/analytics/generate-report', analyticsController.generateParentReport);

// Coach Analytics Routes
router.get('/coach/teams', analyticsController.getCoachTeams);
router.get('/coach/analytics/overview', analyticsController.getCoachOverview);
router.get('/coach/analytics/player-performance', analyticsController.getCoachPlayerPerformance);
router.get('/coach/analytics/training-effectiveness', analyticsController.getCoachTrainingEffectiveness);
router.get('/coach/analytics/match-analysis', analyticsController.getCoachMatchAnalysis);
router.get('/coach/analytics/development-tracking', analyticsController.getCoachDevelopmentTracking);
router.get('/coach/analytics/comparative-stats', analyticsController.getCoachComparativeStats);
router.get('/coach/analytics/export', analyticsController.exportCoachAnalytics);

module.exports = router;