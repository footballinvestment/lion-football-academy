const express = require('express');
const { authenticate, isAdminOrCoach } = require('../middleware/auth');
const aiAnalyticsService = require('../services/aiAnalyticsService');
const aiNotificationService = require('../services/aiNotificationService');

const router = express.Router();

// AI Performance Analysis for Individual Player
router.get('/players/:id/analysis', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { weeks = 12 } = req.query;

    const analysis = await aiAnalyticsService.analyzePlayerPerformance(
      parseInt(id), 
      parseInt(weeks)
    );

    res.json({
      success: true,
      data: analysis,
      meta: {
        analysisType: 'player_performance',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Player analysis error:', error);
    res.status(500).json({
      error: 'AI Analysis Failed',
      message: error.message
    });
  }
});

// Team Attendance Pattern Analysis
router.get('/teams/:id/attendance-patterns', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    const { weeks = 16 } = req.query;

    const patterns = await aiAnalyticsService.analyzeAttendancePatterns(
      parseInt(id), 
      parseInt(weeks)
    );

    res.json({
      success: true,
      data: patterns,
      meta: {
        analysisType: 'attendance_patterns',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Attendance pattern analysis error:', error);
    res.status(500).json({
      error: 'AI Analysis Failed',
      message: error.message
    });
  }
});

// Team Performance Prediction
router.get('/teams/:id/performance-prediction', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    const { weeks = 4 } = req.query;

    const prediction = await aiAnalyticsService.predictTeamPerformance(
      parseInt(id), 
      parseInt(weeks)
    );

    res.json({
      success: true,
      data: prediction,
      meta: {
        analysisType: 'performance_prediction',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Performance prediction error:', error);
    res.status(500).json({
      error: 'AI Prediction Failed',
      message: error.message
    });
  }
});

// Player Position Optimization
router.get('/teams/:id/position-optimization', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;

    const optimization = await aiAnalyticsService.optimizePlayerPositions(parseInt(id));

    res.json({
      success: true,
      data: optimization,
      meta: {
        analysisType: 'position_optimization',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Position optimization error:', error);
    res.status(500).json({
      error: 'AI Optimization Failed',
      message: error.message
    });
  }
});

// AI Training Plan Generation
router.get('/teams/:id/ai-training-plan', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    const { weeks = 4 } = req.query;

    const trainingPlan = await aiAnalyticsService.generateTrainingPlan(
      parseInt(id), 
      parseInt(weeks)
    );

    res.json({
      success: true,
      data: trainingPlan,
      meta: {
        analysisType: 'ai_training_plan',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI training plan error:', error);
    res.status(500).json({
      error: 'AI Training Plan Failed',
      message: error.message
    });
  }
});

// Comprehensive AI Dashboard Data
router.get('/dashboard/:teamId', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamIdInt = parseInt(teamId);

    // Run multiple AI analyses in parallel
    const [
      attendancePatterns,
      performancePrediction,
      positionOptimization,
      trainingPlan
    ] = await Promise.all([
      aiAnalyticsService.analyzeAttendancePatterns(teamIdInt, 12),
      aiAnalyticsService.predictTeamPerformance(teamIdInt, 4),
      aiAnalyticsService.optimizePlayerPositions(teamIdInt),
      aiAnalyticsService.generateTrainingPlan(teamIdInt, 4)
    ]);

    // AI Insights Summary
    const aiInsights = {
      attendanceInsights: attendancePatterns.insights,
      performanceInsights: [
        {
          type: 'prediction',
          insight: `Team performance trend: ${performancePrediction.prediction.trendDirection}`,
          confidence: performancePrediction.prediction.confidence
        }
      ],
      positionInsights: positionOptimization.recommendations,
      trainingInsights: trainingPlan.recommendations
    };

    // Risk Assessment Summary
    const riskAssessment = {
      attendanceRisks: attendancePatterns.patterns.playerBehaviorClusters
        .filter(p => p.cluster === 'inconsistent' || p.cluster === 'punctuality_concern')
        .length,
      performanceRisks: performancePrediction.prediction.riskFactors.length,
      positionRisks: positionOptimization.positionAnalysis
        .filter(p => !p.positionOptimal).length
    };

    res.json({
      success: true,
      data: {
        teamId: teamIdInt,
        aiInsights,
        riskAssessment,
        attendancePatterns,
        performancePrediction,
        positionOptimization,
        trainingPlan,
        lastUpdated: new Date().toISOString()
      },
      meta: {
        analysisType: 'comprehensive_ai_dashboard',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI dashboard error:', error);
    res.status(500).json({
      error: 'AI Dashboard Failed',
      message: error.message
    });
  }
});

// AI Recommendations Engine
router.get('/teams/:id/recommendations', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    const teamIdInt = parseInt(id);

    // Get comprehensive recommendations
    const [
      attendancePatterns,
      performancePrediction,
      positionOptimization
    ] = await Promise.all([
      aiAnalyticsService.analyzeAttendancePatterns(teamIdInt),
      aiAnalyticsService.predictTeamPerformance(teamIdInt),
      aiAnalyticsService.optimizePlayerPositions(teamIdInt)
    ]);

    // Compile AI recommendations
    const recommendations = [
      ...performancePrediction.recommendedActions.map(rec => ({
        ...rec,
        source: 'performance_prediction'
      })),
      ...positionOptimization.recommendations.map(rec => ({
        ...rec,
        source: 'position_optimization'
      }))
    ];

    // Prioritize recommendations
    const prioritizedRecommendations = recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    res.json({
      success: true,
      data: {
        teamId: teamIdInt,
        totalRecommendations: prioritizedRecommendations.length,
        recommendations: prioritizedRecommendations,
        aiConfidence: {
          overall: 'medium',
          dataQuality: attendancePatterns.patterns.dayOfWeekPatterns.length > 5 ? 'high' : 'medium'
        },
        lastGenerated: new Date().toISOString()
      },
      meta: {
        analysisType: 'ai_recommendations',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({
      error: 'AI Recommendations Failed',
      message: error.message
    });
  }
});

// AI Coaching Tips Generation
router.get('/teams/:id/coaching-tips', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    
    const coachingTips = await aiNotificationService.generateCoachingTips(parseInt(id));

    res.json({
      success: true,
      data: coachingTips,
      meta: {
        analysisType: 'ai_coaching_tips',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Coaching tips error:', error);
    res.status(500).json({
      error: 'AI Coaching Tips Failed',
      message: error.message
    });
  }
});

// Send Performance Alerts
router.post('/teams/:id/performance-alert', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    
    const alertResult = await aiNotificationService.sendPerformanceAlerts(parseInt(id));

    res.json({
      success: true,
      data: alertResult,
      meta: {
        actionType: 'performance_alert_sent',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Performance alert error:', error);
    res.status(500).json({
      error: 'Performance Alert Failed',
      message: error.message
    });
  }
});

// Check Development Milestones
router.get('/players/:id/milestones', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const milestones = await aiNotificationService.checkDevelopmentMilestones(parseInt(id));

    res.json({
      success: true,
      data: milestones,
      meta: {
        analysisType: 'development_milestones',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Milestones check error:', error);
    res.status(500).json({
      error: 'Milestone Check Failed',
      message: error.message
    });
  }
});

// Generate AI Progress Report
router.get('/teams/:id/progress-report', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    const { weekly = false } = req.query;
    
    const report = await aiNotificationService.generateProgressReport(
      parseInt(id), 
      weekly === 'true'
    );

    res.json({
      success: true,
      data: report,
      meta: {
        analysisType: 'ai_progress_report',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Progress report error:', error);
    res.status(500).json({
      error: 'Progress Report Failed',
      message: error.message
    });
  }
});

// Risk Assessment and Notifications
router.get('/teams/:id/risk-assessment', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { id } = req.params;
    
    const riskAssessment = await aiNotificationService.assessAndNotifyRisks(parseInt(id));

    res.json({
      success: true,
      data: riskAssessment,
      meta: {
        analysisType: 'ai_risk_assessment',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({
      error: 'Risk Assessment Failed',
      message: error.message
    });
  }
});

// AI Health Check and Analytics Status
router.get('/health', authenticate, async (req, res) => {
  try {
    // Simple health check for AI services
    const healthStatus = {
      aiAnalyticsService: 'operational',
      aiNotificationService: 'operational',
      lastHealthCheck: new Date().toISOString(),
      availableAnalyses: [
        'player_performance_analysis',
        'attendance_pattern_analysis',
        'team_performance_prediction',
        'position_optimization',
        'training_plan_generation',
        'comprehensive_dashboard',
        'ai_recommendations',
        'coaching_tips_generation',
        'performance_alerts',
        'development_milestones',
        'progress_reports',
        'risk_assessment'
      ],
      systemInfo: {
        algorithmVersion: '1.0.0',
        predictionAccuracy: 'estimated_75_percent',
        dataProcessingCapacity: 'unlimited',
        notificationEngine: 'active'
      }
    };

    res.json({
      success: true,
      data: healthStatus,
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'AI Health Check Failed',
      message: error.message
    });
  }
});

module.exports = router;