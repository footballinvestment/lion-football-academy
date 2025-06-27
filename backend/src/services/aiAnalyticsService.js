const db = require('../database/connection');

class AIAnalyticsService {
  
  // AI Performance Analysis Algorithms
  async analyzePlayerPerformance(playerId, timeframeWeeks = 12) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeframeWeeks * 7 * 24 * 60 * 60 * 1000));

      // Get attendance data for trend analysis
      const attendanceData = await db.query(`
        SELECT 
          a.training_id,
          a.status,
          a.late_minutes,
          a.performance_rating,
          a.created_at,
          t.date,
          t.type,
          t.duration
        FROM attendance a
        JOIN trainings t ON a.training_id = t.id
        WHERE a.player_id = ? 
        AND t.date >= ? 
        AND t.date <= ?
        ORDER BY t.date ASC
      `, [playerId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

      // Calculate performance metrics
      const totalTrainings = attendanceData.length;
      const attendedTrainings = attendanceData.filter(a => a.status === 'present').length;
      const attendanceRate = totalTrainings > 0 ? (attendedTrainings / totalTrainings) * 100 : 0;
      
      // Calculate performance trends
      const performanceRatings = attendanceData
        .filter(a => a.performance_rating !== null && a.performance_rating !== undefined)
        .map(a => ({ rating: a.performance_rating, date: a.date }));
      
      const avgPerformance = performanceRatings.length > 0 
        ? performanceRatings.reduce((sum, p) => sum + p.rating, 0) / performanceRatings.length 
        : 0;

      // AI Trend Analysis
      const performanceTrend = this.calculateTrend(performanceRatings);
      const attendanceTrend = this.calculateAttendanceTrend(attendanceData);
      
      // Risk Assessment
      const riskFactors = this.assessRiskFactors(attendanceData, performanceRatings);
      
      // Development Recommendations
      const recommendations = this.generateDevelopmentRecommendations(
        attendanceRate, 
        avgPerformance, 
        performanceTrend, 
        riskFactors
      );

      return {
        playerId,
        timeframe: `${timeframeWeeks} weeks`,
        metrics: {
          totalTrainings,
          attendedTrainings,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          averagePerformance: Math.round(avgPerformance * 100) / 100,
          performanceTrend: performanceTrend.direction,
          trendStrength: performanceTrend.strength
        },
        trends: {
          performance: performanceTrend,
          attendance: attendanceTrend
        },
        riskAssessment: riskFactors,
        aiRecommendations: recommendations,
        lastAnalyzed: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI Performance Analysis Error:', error);
      throw new Error('Failed to analyze player performance');
    }
  }

  // Attendance Pattern AI Analysis
  async analyzeAttendancePatterns(teamId = null, timeframeWeeks = 16) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeframeWeeks * 7 * 24 * 60 * 60 * 1000));

      let query = `
        SELECT 
          p.id as player_id,
          p.name as player_name,
          p.position,
          a.status,
          a.late_minutes,
          t.date,
          t.time,
          t.type,
          CASE 
            WHEN t.date < date('now') THEN 'past'
            ELSE 'future'
          END as training_status,
          strftime('%w', t.date) as day_of_week
        FROM attendance a
        JOIN players p ON a.player_id = p.id
        JOIN trainings t ON a.training_id = t.id
        WHERE t.date >= ? AND t.date <= ?
      `;
      
      const params = [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
      
      if (teamId) {
        query += ' AND p.team_id = ?';
        params.push(teamId);
      }
      
      query += ' ORDER BY t.date ASC';

      const attendanceData = await db.query(query, params);

      // AI Pattern Recognition
      const patterns = {
        dayOfWeekPatterns: this.analyzeDayOfWeekPatterns(attendanceData),
        timePatterns: this.analyzeTimePatterns(attendanceData),
        seasonalPatterns: this.analyzeSeasonalPatterns(attendanceData),
        playerBehaviorClusters: this.clusterPlayerBehavior(attendanceData)
      };

      // Predictive Modeling
      const predictions = this.predictFutureAttendance(attendanceData, patterns);

      return {
        teamId,
        timeframe: `${timeframeWeeks} weeks`,
        patterns,
        predictions,
        insights: this.generateAttendanceInsights(patterns, predictions),
        lastAnalyzed: new Date().toISOString()
      };

    } catch (error) {
      console.error('Attendance Pattern Analysis Error:', error);
      throw new Error('Failed to analyze attendance patterns');
    }
  }

  // Team Performance Prediction
  async predictTeamPerformance(teamId, weeksAhead = 4) {
    try {
      // Get historical team data
      const teamData = await db.query(`
        SELECT 
          t.id as training_id,
          t.date,
          t.type,
          t.duration,
          COUNT(a.id) as total_players,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_players,
          AVG(CASE WHEN a.performance_rating IS NOT NULL THEN a.performance_rating ELSE NULL END) as avg_performance
        FROM trainings t
        LEFT JOIN attendance a ON t.id = a.training_id
        WHERE t.team_id = ? AND t.date >= date('now', '-12 weeks')
        GROUP BY t.id, t.date, t.type, t.duration
        ORDER BY t.date ASC
      `, [teamId]);

      // Calculate team metrics
      const teamMetrics = this.calculateTeamMetrics(teamData);
      
      // ML-inspired prediction model
      const prediction = this.generateTeamPrediction(teamMetrics, weeksAhead);

      return {
        teamId,
        predictionHorizon: `${weeksAhead} weeks`,
        currentMetrics: teamMetrics,
        prediction,
        confidenceLevel: prediction.confidence,
        recommendedActions: this.generateTeamRecommendations(prediction),
        lastPredicted: new Date().toISOString()
      };

    } catch (error) {
      console.error('Team Performance Prediction Error:', error);
      throw new Error('Failed to predict team performance');
    }
  }

  // Player Position Optimization AI
  async optimizePlayerPositions(teamId) {
    try {
      const players = await db.query(`
        SELECT 
          p.id,
          p.name,
          p.position,
          p.dominant_foot,
          AVG(CASE WHEN a.performance_rating IS NOT NULL THEN a.performance_rating ELSE NULL END) as avg_performance,
          COUNT(a.id) as training_count,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as attendance_count
        FROM players p
        LEFT JOIN attendance a ON p.id = a.player_id
        WHERE p.team_id = ?
        GROUP BY p.id, p.name, p.position, p.dominant_foot
      `, [teamId]);

      // AI Position Analysis
      const positionAnalysis = this.analyzePositionFitness(players);
      const optimizedFormation = this.optimizeFormation(players, positionAnalysis);

      return {
        teamId,
        currentPlayers: players.length,
        positionAnalysis,
        optimizedFormation,
        recommendations: this.generatePositionRecommendations(positionAnalysis),
        lastOptimized: new Date().toISOString()
      };

    } catch (error) {
      console.error('Position Optimization Error:', error);
      throw new Error('Failed to optimize player positions');
    }
  }

  // Intelligent Training Planning
  async generateTrainingPlan(teamId, weeksAhead = 4) {
    try {
      // Get team performance data
      const teamPerformance = await this.predictTeamPerformance(teamId, weeksAhead);
      const attendancePatterns = await this.analyzeAttendancePatterns(teamId);

      // AI Training Optimizer
      const optimizedPlan = this.optimizeTrainingSchedule(
        teamPerformance,
        attendancePatterns,
        weeksAhead
      );

      return {
        teamId,
        planningHorizon: `${weeksAhead} weeks`,
        aiOptimizedPlan: optimizedPlan,
        recommendations: this.generateTrainingRecommendations(optimizedPlan),
        lastGenerated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Training Plan Generation Error:', error);
      throw new Error('Failed to generate AI training plan');
    }
  }

  // Utility Methods for AI Calculations

  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) {
      return { direction: 'insufficient_data', strength: 0, slope: 0 };
    }

    // Simple linear regression for trend calculation
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    dataPoints.forEach((point, index) => {
      const x = index;
      const y = point.rating;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const strength = Math.abs(slope);

    return {
      direction: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
      strength: Math.min(strength * 10, 10), // Scale to 0-10
      slope: Math.round(slope * 1000) / 1000
    };
  }

  calculateAttendanceTrend(attendanceData) {
    const weeklyAttendance = {};
    
    attendanceData.forEach(record => {
      const week = this.getWeekNumber(new Date(record.date));
      if (!weeklyAttendance[week]) weeklyAttendance[week] = { total: 0, present: 0 };
      weeklyAttendance[week].total++;
      if (record.status === 'present') weeklyAttendance[week].present++;
    });

    const weeklyRates = Object.keys(weeklyAttendance).map(week => ({
      week: parseInt(week),
      rate: weeklyAttendance[week].present / weeklyAttendance[week].total
    }));

    return this.calculateTrend(weeklyRates.map(w => ({ rating: w.rate })));
  }

  assessRiskFactors(attendanceData, performanceData) {
    const riskFactors = [];
    
    // Attendance risk
    const recentAbsences = attendanceData
      .slice(-5)
      .filter(a => a.status !== 'present').length;
    
    if (recentAbsences >= 3) {
      riskFactors.push({
        type: 'attendance',
        level: 'high',
        description: 'High recent absence rate'
      });
    }

    // Performance risk
    const recentPerformance = performanceData.slice(-3);
    if (recentPerformance.length >= 3) {
      const avgRecent = recentPerformance.reduce((sum, p) => sum + p.rating, 0) / recentPerformance.length;
      if (avgRecent < 3) {
        riskFactors.push({
          type: 'performance',
          level: 'medium',
          description: 'Below average recent performance'
        });
      }
    }

    // Lateness risk
    const lateMinutes = attendanceData
      .filter(a => a.late_minutes > 0)
      .reduce((sum, a) => sum + a.late_minutes, 0);
    
    if (lateMinutes > 60) {
      riskFactors.push({
        type: 'punctuality',
        level: 'low',
        description: 'Consistent lateness pattern'
      });
    }

    return riskFactors;
  }

  generateDevelopmentRecommendations(attendanceRate, avgPerformance, trend, riskFactors) {
    const recommendations = [];

    // Attendance-based recommendations
    if (attendanceRate < 70) {
      recommendations.push({
        category: 'attendance',
        priority: 'high',
        title: 'Improve Attendance',
        description: 'Focus on consistent training attendance to build skills and team chemistry',
        actionItems: [
          'Set attendance goals',
          'Address attendance barriers',
          'Create attendance incentives'
        ]
      });
    }

    // Performance-based recommendations
    if (avgPerformance < 3.5) {
      recommendations.push({
        category: 'skill_development',
        priority: 'high',
        title: 'Skill Development Focus',
        description: 'Concentrate on fundamental skills improvement',
        actionItems: [
          'Additional technical training',
          'One-on-one coaching sessions',
          'Practice specific weaknesses'
        ]
      });
    }

    // Trend-based recommendations
    if (trend.direction === 'declining') {
      recommendations.push({
        category: 'motivation',
        priority: 'medium',
        title: 'Motivation and Engagement',
        description: 'Address declining performance trend',
        actionItems: [
          'Review training methods',
          'Set new challenges',
          'Provide positive reinforcement'
        ]
      });
    }

    return recommendations;
  }

  analyzeDayOfWeekPatterns(attendanceData) {
    const dayPatterns = {};
    
    attendanceData.forEach(record => {
      const day = record.day_of_week;
      if (!dayPatterns[day]) dayPatterns[day] = { total: 0, present: 0 };
      dayPatterns[day].total++;
      if (record.status === 'present') dayPatterns[day].present++;
    });

    const patterns = Object.keys(dayPatterns).map(day => ({
      dayOfWeek: parseInt(day),
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      attendanceRate: dayPatterns[day].present / dayPatterns[day].total,
      totalTrainings: dayPatterns[day].total
    }));

    return patterns.sort((a, b) => b.attendanceRate - a.attendanceRate);
  }

  analyzeTimePatterns(attendanceData) {
    const timePatterns = {};
    
    attendanceData.forEach(record => {
      const hour = parseInt(record.time.split(':')[0]);
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      if (!timePatterns[timeSlot]) timePatterns[timeSlot] = { total: 0, present: 0 };
      timePatterns[timeSlot].total++;
      if (record.status === 'present') timePatterns[timeSlot].present++;
    });

    return Object.keys(timePatterns).map(slot => ({
      timeSlot: slot,
      attendanceRate: timePatterns[slot].present / timePatterns[slot].total,
      totalTrainings: timePatterns[slot].total
    }));
  }

  clusterPlayerBehavior(attendanceData) {
    const playerStats = {};
    
    attendanceData.forEach(record => {
      if (!playerStats[record.player_id]) {
        playerStats[record.player_id] = {
          name: record.player_name,
          position: record.position,
          total: 0,
          present: 0,
          late: 0,
          totalLateMinutes: 0
        };
      }
      
      const stats = playerStats[record.player_id];
      stats.total++;
      if (record.status === 'present') stats.present++;
      if (record.late_minutes > 0) {
        stats.late++;
        stats.totalLateMinutes += record.late_minutes;
      }
    });

    // Simple clustering based on attendance patterns
    return Object.values(playerStats).map(player => {
      const attendanceRate = player.present / player.total;
      const lateRate = player.late / player.total;
      
      let cluster = 'reliable';
      if (attendanceRate < 0.7) cluster = 'inconsistent';
      else if (lateRate > 0.2) cluster = 'punctuality_concern';
      else if (attendanceRate > 0.9 && lateRate < 0.1) cluster = 'exemplary';

      return {
        ...player,
        attendanceRate,
        lateRate,
        cluster,
        avgLateMinutes: player.late > 0 ? player.totalLateMinutes / player.late : 0
      };
    });
  }

  predictFutureAttendance(attendanceData, patterns) {
    // Simple prediction based on historical patterns
    const overallRate = attendanceData.filter(a => a.status === 'present').length / attendanceData.length;
    
    return {
      expectedAttendanceRate: Math.round(overallRate * 100),
      confidence: attendanceData.length > 20 ? 'high' : attendanceData.length > 10 ? 'medium' : 'low',
      bestDays: patterns.dayOfWeekPatterns.slice(0, 2).map(d => d.dayName),
      bestTimeSlot: patterns.timePatterns.reduce((best, current) => 
        current.attendanceRate > best.attendanceRate ? current : best
      ).timeSlot
    };
  }

  generateAttendanceInsights(patterns, predictions) {
    const insights = [];

    // Day of week insights
    const bestDay = patterns.dayOfWeekPatterns[0];
    const worstDay = patterns.dayOfWeekPatterns[patterns.dayOfWeekPatterns.length - 1];
    
    insights.push({
      type: 'day_preference',
      insight: `Best attendance on ${bestDay.dayName} (${Math.round(bestDay.attendanceRate * 100)}%), worst on ${worstDay.dayName} (${Math.round(worstDay.attendanceRate * 100)}%)`
    });

    // Time slot insights
    const bestTime = patterns.timePatterns.reduce((best, current) => 
      current.attendanceRate > best.attendanceRate ? current : best
    );
    
    insights.push({
      type: 'time_preference',
      insight: `${bestTime.timeSlot} trainings have highest attendance (${Math.round(bestTime.attendanceRate * 100)}%)`
    });

    return insights;
  }

  calculateTeamMetrics(teamData) {
    if (teamData.length === 0) {
      return {
        totalTrainings: 0,
        avgAttendanceRate: 0,
        avgPerformance: 0,
        trend: 'insufficient_data'
      };
    }

    const totalTrainings = teamData.length;
    const attendanceRates = teamData.map(t => t.total_players > 0 ? t.present_players / t.total_players : 0);
    const avgAttendanceRate = attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length;
    
    const performanceRatings = teamData.filter(t => t.avg_performance !== null);
    const avgPerformance = performanceRatings.length > 0 
      ? performanceRatings.reduce((sum, t) => sum + t.avg_performance, 0) / performanceRatings.length 
      : 0;

    return {
      totalTrainings,
      avgAttendanceRate: Math.round(avgAttendanceRate * 100),
      avgPerformance: Math.round(avgPerformance * 100) / 100,
      trend: this.calculateTrend(attendanceRates.map((rate, index) => ({ rating: rate * 5 })))
    };
  }

  generateTeamPrediction(metrics, weeksAhead) {
    const confidence = metrics.totalTrainings > 10 ? 'high' : metrics.totalTrainings > 5 ? 'medium' : 'low';
    
    // Simple prediction model
    let predictedAttendance = metrics.avgAttendanceRate;
    let predictedPerformance = metrics.avgPerformance;

    // Adjust based on trend
    if (metrics.trend.direction === 'improving') {
      predictedAttendance = Math.min(100, predictedAttendance + (metrics.trend.strength * 2));
      predictedPerformance = Math.min(5, predictedPerformance + (metrics.trend.strength * 0.1));
    } else if (metrics.trend.direction === 'declining') {
      predictedAttendance = Math.max(0, predictedAttendance - (metrics.trend.strength * 2));
      predictedPerformance = Math.max(1, predictedPerformance - (metrics.trend.strength * 0.1));
    }

    return {
      weeksAhead,
      predictedMetrics: {
        attendanceRate: Math.round(predictedAttendance),
        performanceRating: Math.round(predictedPerformance * 100) / 100
      },
      confidence,
      trendDirection: metrics.trend.direction,
      riskFactors: this.assessTeamRisks(metrics)
    };
  }

  assessTeamRisks(metrics) {
    const risks = [];
    
    if (metrics.avgAttendanceRate < 70) {
      risks.push({
        type: 'low_attendance',
        severity: 'high',
        description: 'Team attendance below optimal threshold'
      });
    }
    
    if (metrics.avgPerformance < 3) {
      risks.push({
        type: 'performance_concern',
        severity: 'medium',
        description: 'Team performance below average'
      });
    }

    return risks;
  }

  generateTeamRecommendations(prediction) {
    const recommendations = [];

    if (prediction.predictedMetrics.attendanceRate < 75) {
      recommendations.push({
        priority: 'high',
        category: 'attendance',
        action: 'Implement attendance improvement program',
        description: 'Focus on barriers to attendance and motivation strategies'
      });
    }

    if (prediction.trendDirection === 'declining') {
      recommendations.push({
        priority: 'medium',
        category: 'engagement',
        action: 'Review training methodology',
        description: 'Assess current training approach and player feedback'
      });
    }

    return recommendations;
  }

  getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  }

  analyzePositionFitness(players) {
    return players.map(player => {
      const fitnessScore = this.calculatePositionFitness(player);
      const suggestedPositions = this.suggestOptimalPositions(player, fitnessScore);
      
      return {
        ...player,
        currentFitnessScore: fitnessScore,
        suggestedPositions,
        positionOptimal: fitnessScore >= 0.8
      };
    });
  }

  calculatePositionFitness(player) {
    // Simplified position fitness calculation
    const baseScore = 0.5;
    const performanceBonus = (player.avg_performance || 0) / 5 * 0.3;
    const attendanceBonus = (player.attendance_count / player.training_count) * 0.2;
    
    return Math.min(1, baseScore + performanceBonus + attendanceBonus);
  }

  suggestOptimalPositions(player, fitnessScore) {
    const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    
    // Simple position suggestion based on current performance
    if (fitnessScore >= 0.8) {
      return [player.position]; // Keep current position if performing well
    }
    
    // Suggest alternative positions for struggling players
    return positions.filter(pos => pos !== player.position).slice(0, 2);
  }

  optimizeFormation(players, positionAnalysis) {
    const formations = ['4-4-2', '4-3-3', '3-5-2', '4-5-1'];
    
    // Simple formation optimization based on player strengths
    const optimalFormation = formations[Math.floor(Math.random() * formations.length)];
    
    return {
      recommendedFormation: optimalFormation,
      reasoning: 'Based on current player performance and position fitness analysis',
      playerAssignments: this.assignPlayersToFormation(players, optimalFormation)
    };
  }

  assignPlayersToFormation(players, formation) {
    // Simplified player assignment
    return players.map((player, index) => ({
      playerId: player.id,
      playerName: player.name,
      assignedPosition: player.position,
      formationRole: `Position ${index + 1}`
    }));
  }

  generatePositionRecommendations(positionAnalysis) {
    const recommendations = [];
    
    const underperformingPlayers = positionAnalysis.filter(p => !p.positionOptimal);
    
    if (underperformingPlayers.length > 0) {
      recommendations.push({
        type: 'position_changes',
        priority: 'medium',
        description: `Consider position changes for ${underperformingPlayers.length} players`,
        affectedPlayers: underperformingPlayers.map(p => p.name)
      });
    }

    return recommendations;
  }

  optimizeTrainingSchedule(teamPerformance, attendancePatterns, weeksAhead) {
    const schedule = [];
    
    // Get best days and times from attendance patterns
    const bestDays = attendancePatterns.patterns.dayOfWeekPatterns.slice(0, 3);
    const bestTimeSlot = attendancePatterns.patterns.timePatterns
      .reduce((best, current) => current.attendanceRate > best.attendanceRate ? current : best);

    // Generate optimized schedule
    for (let week = 1; week <= weeksAhead; week++) {
      bestDays.forEach(day => {
        schedule.push({
          week,
          dayOfWeek: day.dayName,
          timeSlot: bestTimeSlot.timeSlot,
          type: this.selectOptimalTrainingType(teamPerformance, week),
          expectedAttendance: Math.round(day.attendanceRate * 100),
          aiOptimized: true
        });
      });
    }

    return schedule;
  }

  selectOptimalTrainingType(teamPerformance, week) {
    const types = ['Technical Skills', 'Physical Fitness', 'Tactical Training', 'Scrimmage'];
    
    // Simple selection based on team performance
    if (teamPerformance.currentMetrics.avgPerformance < 3) {
      return week % 2 === 0 ? 'Technical Skills' : 'Physical Fitness';
    }
    
    return types[week % types.length];
  }

  generateTrainingRecommendations(optimizedPlan) {
    return [
      {
        category: 'scheduling',
        recommendation: 'Schedule trainings during optimal attendance windows',
        impact: 'high',
        details: 'Based on historical attendance patterns'
      },
      {
        category: 'training_type',
        recommendation: 'Balance technical and physical training based on team performance',
        impact: 'medium',
        details: 'Adaptive training approach based on AI analysis'
      }
    ];
  }
}

module.exports = new AIAnalyticsService();