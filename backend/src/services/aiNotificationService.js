const aiAnalyticsService = require('./aiAnalyticsService');
const emailService = require('./emailService');
const db = require('../database/connection');

class AINotificationService {
  
  // Generate AI-powered coaching tips
  async generateCoachingTips(teamId) {
    try {
      const aiAnalysis = await Promise.all([
        aiAnalyticsService.analyzeAttendancePatterns(teamId, 8),
        aiAnalyticsService.predictTeamPerformance(teamId, 2),
        aiAnalyticsService.optimizePlayerPositions(teamId)
      ]);

      const [attendancePatterns, performance, positions] = aiAnalysis;

      const tips = [];

      // Attendance-based tips
      if (attendancePatterns.predictions.expectedAttendanceRate < 75) {
        tips.push({
          category: 'attendance',
          priority: 'high',
          title: 'Boost Team Attendance',
          tip: `Your team's predicted attendance is ${attendancePatterns.predictions.expectedAttendanceRate}%. Consider scheduling training on ${attendancePatterns.predictions.bestDays.join(' or ')} during ${attendancePatterns.predictions.bestTimeSlot} hours for better participation.`,
          actionItems: [
            'Review current training schedule',
            'Send attendance reminders',
            'Address attendance barriers with parents'
          ]
        });
      }

      // Performance tips
      if (performance.prediction.trendDirection === 'declining') {
        tips.push({
          category: 'performance',
          priority: 'high',
          title: 'Performance Improvement Needed',
          tip: 'AI analysis shows declining team performance trend. Focus on fundamental skills and consider adjusting training intensity.',
          actionItems: [
            'Review recent training methods',
            'Increase individual skill work',
            'Provide more positive reinforcement'
          ]
        });
      }

      // Position optimization tips
      const suboptimalPlayers = positions.positionAnalysis.filter(p => !p.positionOptimal);
      if (suboptimalPlayers.length > 0) {
        tips.push({
          category: 'positions',
          priority: 'medium',
          title: 'Position Optimization Opportunity',
          tip: `${suboptimalPlayers.length} players may benefit from position changes. Consider trying ${suboptimalPlayers[0].name} in different roles during practice.`,
          actionItems: [
            'Experiment with position rotations',
            'Assess player strengths in different positions',
            'Communicate changes positively'
          ]
        });
      }

      return {
        teamId,
        generatedAt: new Date().toISOString(),
        totalTips: tips.length,
        tips,
        aiConfidence: performance.prediction.confidence
      };

    } catch (error) {
      console.error('Coaching tips generation error:', error);
      throw new Error('Failed to generate AI coaching tips');
    }
  }

  // Send performance alerts
  async sendPerformanceAlerts(teamId) {
    try {
      // Get team coach information
      const team = await db.query(`
        SELECT t.*, u.email as coach_email, u.full_name as coach_name
        FROM teams t
        LEFT JOIN users u ON u.role = 'coach' AND u.team_id = t.id
        WHERE t.id = ?
      `, [teamId]).then(rows => rows[0]);

      if (!team || !team.coach_email) {
        return { success: false, message: 'No coach found for team' };
      }

      // Analyze team performance
      const performance = await aiAnalyticsService.predictTeamPerformance(teamId, 4);
      const risks = performance.prediction.riskFactors;

      if (risks.length === 0) {
        return { success: true, message: 'No performance risks detected' };
      }

      // Generate alert email content
      const alertContent = this.generatePerformanceAlertEmail(team, performance, risks);

      // Send email alert
      await emailService.sendEmail({
        to: team.coach_email,
        subject: `🚨 AI Performance Alert - ${team.name}`,
        html: alertContent
      });

      return {
        success: true,
        message: 'Performance alert sent',
        alertsTriggered: risks.length,
        sentTo: team.coach_email
      };

    } catch (error) {
      console.error('Performance alert error:', error);
      throw new Error('Failed to send performance alert');
    }
  }

  // Generate development milestone notifications
  async checkDevelopmentMilestones(playerId) {
    try {
      const analysis = await aiAnalyticsService.analyzePlayerPerformance(playerId, 8);
      const milestones = [];

      // Attendance milestone
      if (analysis.metrics.attendanceRate >= 90) {
        milestones.push({
          type: 'attendance_excellence',
          title: 'Outstanding Attendance',
          description: `Congratulations! ${analysis.metrics.attendanceRate}% attendance rate shows exceptional commitment.`,
          level: 'gold'
        });
      }

      // Performance improvement milestone
      if (analysis.trends.performance.direction === 'improving' && analysis.trends.performance.strength >= 7) {
        milestones.push({
          type: 'performance_improvement',
          title: 'Significant Performance Growth',
          description: 'AI analysis shows strong upward performance trend - great progress!',
          level: 'silver'
        });
      }

      // Consistency milestone
      if (analysis.metrics.attendanceRate >= 80 && analysis.metrics.averagePerformance >= 4) {
        milestones.push({
          type: 'consistency',
          title: 'Consistent Excellence',
          description: 'Maintaining high performance and attendance - keep it up!',
          level: 'bronze'
        });
      }

      return {
        playerId,
        checkedAt: new Date().toISOString(),
        milestonesAchieved: milestones.length,
        milestones
      };

    } catch (error) {
      console.error('Milestone check error:', error);
      throw new Error('Failed to check development milestones');
    }
  }

  // Send AI-generated progress reports
  async generateProgressReport(teamId, weeklyReport = false) {
    try {
      const timeframe = weeklyReport ? 4 : 12;
      
      // Get comprehensive AI analysis
      const [attendance, performance, positions, trainingPlan] = await Promise.all([
        aiAnalyticsService.analyzeAttendancePatterns(teamId, timeframe),
        aiAnalyticsService.predictTeamPerformance(teamId, 4),
        aiAnalyticsService.optimizePlayerPositions(teamId),
        aiAnalyticsService.generateTrainingPlan(teamId, 2)
      ]);

      // Get team and coach info
      const team = await db.query(`
        SELECT t.*, u.email as coach_email, u.full_name as coach_name
        FROM teams t
        LEFT JOIN users u ON u.role = 'coach' AND u.team_id = t.id
        WHERE t.id = ?
      `, [teamId]).then(rows => rows[0]);

      if (!team) {
        throw new Error('Team not found');
      }

      const report = {
        teamId,
        teamName: team.name,
        reportType: weeklyReport ? 'weekly' : 'monthly',
        generatedAt: new Date().toISOString(),
        summary: {
          attendanceRate: attendance.patterns.dayOfWeekPatterns.reduce((acc, day) => acc + day.attendanceRate, 0) / attendance.patterns.dayOfWeekPatterns.length * 100,
          performanceTrend: performance.prediction.trendDirection,
          riskLevel: this.calculateOverallRiskLevel(performance.prediction.riskFactors),
          aiConfidence: performance.prediction.confidence
        },
        insights: {
          bestTrainingDays: attendance.patterns.dayOfWeekPatterns.slice(0, 2).map(d => d.dayName),
          optimalTimeSlot: attendance.patterns.timePatterns.reduce((best, current) => 
            current.attendanceRate > best.attendanceRate ? current : best
          ).timeSlot,
          positionRecommendations: positions.recommendations.length,
          upcomingChallenges: performance.prediction.riskFactors.map(r => r.description)
        },
        recommendations: trainingPlan.recommendations,
        aiGenerated: true
      };

      // Send email report if coach email available
      if (team.coach_email) {
        const emailContent = this.generateProgressReportEmail(report);
        await emailService.sendEmail({
          to: team.coach_email,
          subject: `🤖 AI ${report.reportType.toUpperCase()} Progress Report - ${team.name}`,
          html: emailContent
        });
      }

      return report;

    } catch (error) {
      console.error('Progress report generation error:', error);
      throw new Error('Failed to generate AI progress report');
    }
  }

  // Risk warning system
  async assessAndNotifyRisks(teamId) {
    try {
      const [attendance, performance] = await Promise.all([
        aiAnalyticsService.analyzeAttendancePatterns(teamId, 6),
        aiAnalyticsService.predictTeamPerformance(teamId, 2)
      ]);

      const risks = [];

      // High-risk attendance patterns
      const lowAttendancePlayers = attendance.patterns.playerBehaviorClusters
        .filter(p => p.cluster === 'inconsistent')
        .length;

      if (lowAttendancePlayers >= 3) {
        risks.push({
          type: 'attendance_crisis',
          severity: 'high',
          description: `${lowAttendancePlayers} players showing inconsistent attendance patterns`,
          recommendation: 'Immediate intervention needed - contact parents and review barriers'
        });
      }

      // Performance decline risk
      if (performance.prediction.trendDirection === 'declining' && 
          performance.prediction.confidence === 'high') {
        risks.push({
          type: 'performance_decline',
          severity: 'medium',
          description: 'Significant performance decline detected with high confidence',
          recommendation: 'Review training methods and increase individual attention'
        });
      }

      // Overtraining risk (hypothetical metric)
      const avgAttendance = attendance.patterns.dayOfWeekPatterns
        .reduce((acc, day) => acc + day.totalTrainings, 0) / attendance.patterns.dayOfWeekPatterns.length;
      
      if (avgAttendance > 5) {
        risks.push({
          type: 'overtraining_risk',
          severity: 'low',
          description: 'High training frequency detected - monitor for fatigue',
          recommendation: 'Consider rest days and lighter training sessions'
        });
      }

      return {
        teamId,
        assessmentDate: new Date().toISOString(),
        totalRisks: risks.length,
        highSeverityRisks: risks.filter(r => r.severity === 'high').length,
        risks,
        overallRiskLevel: this.calculateOverallRiskLevel(risks)
      };

    } catch (error) {
      console.error('Risk assessment error:', error);
      throw new Error('Failed to assess team risks');
    }
  }

  // Utility methods

  calculateOverallRiskLevel(risks) {
    if (!risks || risks.length === 0) return 'low';
    
    const highRisks = risks.filter(r => r.severity === 'high').length;
    const mediumRisks = risks.filter(r => r.severity === 'medium').length;
    
    if (highRisks >= 2) return 'critical';
    if (highRisks >= 1 || mediumRisks >= 3) return 'high';
    if (mediumRisks >= 1) return 'medium';
    return 'low';
  }

  generatePerformanceAlertEmail(team, performance, risks) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h2>🚨 AI Performance Alert</h2>
          <p>Team: ${team.name}</p>
        </div>
        
        <div style="padding: 20px;">
          <h3>Performance Analysis Summary</h3>
          <ul>
            <li><strong>Current Attendance:</strong> ${performance.currentMetrics.avgAttendanceRate}%</li>
            <li><strong>Performance Trend:</strong> ${performance.prediction.trendDirection}</li>
            <li><strong>AI Confidence:</strong> ${performance.prediction.confidence}</li>
          </ul>
          
          <h3>Risk Factors Detected</h3>
          ${risks.map(risk => `
            <div style="border-left: 4px solid #dc3545; padding: 10px; margin: 10px 0; background: #f8f9fa;">
              <strong>${risk.type.replace('_', ' ').toUpperCase()}</strong>
              <p>${risk.description}</p>
            </div>
          `).join('')}
          
          <h3>Recommended Actions</h3>
          ${performance.recommendedActions.map(action => `
            <div style="border-left: 4px solid #28a745; padding: 10px; margin: 10px 0; background: #f8f9fa;">
              <strong>${action.category.toUpperCase()}</strong>
              <p>${action.action}: ${action.description}</p>
            </div>
          `).join('')}
        </div>
        
        <div style="background: #6c757d; color: white; padding: 15px; text-align: center;">
          <p><small>This alert was generated by AI analysis of your team's data.</small></p>
        </div>
      </div>
    `;
  }

  generateProgressReportEmail(report) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
          <h2>🤖 AI ${report.reportType.toUpperCase()} Progress Report</h2>
          <p>Team: ${report.teamName}</p>
          <p>Generated: ${new Date(report.generatedAt).toLocaleDateString()}</p>
        </div>
        
        <div style="padding: 20px;">
          <h3>Key Metrics</h3>
          <div style="display: flex; justify-content: space-around; text-align: center; margin: 20px 0;">
            <div>
              <div style="font-size: 2em; color: #28a745;">${Math.round(report.summary.attendanceRate)}%</div>
              <div>Attendance Rate</div>
            </div>
            <div>
              <div style="font-size: 2em; color: #17a2b8;">${report.summary.performanceTrend}</div>
              <div>Performance Trend</div>
            </div>
            <div>
              <div style="font-size: 2em; color: #ffc107;">${report.summary.riskLevel}</div>
              <div>Risk Level</div>
            </div>
          </div>
          
          <h3>AI Insights</h3>
          <ul>
            <li><strong>Best Training Days:</strong> ${report.insights.bestTrainingDays.join(', ')}</li>
            <li><strong>Optimal Time Slot:</strong> ${report.insights.optimalTimeSlot}</li>
            <li><strong>Position Recommendations:</strong> ${report.insights.positionRecommendations} players</li>
          </ul>
          
          <h3>Recommendations</h3>
          ${report.recommendations.map(rec => `
            <div style="border-left: 4px solid #17a2b8; padding: 10px; margin: 10px 0; background: #f8f9fa;">
              <strong>${rec.category.toUpperCase()}</strong>
              <p>${rec.recommendation}</p>
              <small>Impact: ${rec.impact}</small>
            </div>
          `).join('')}
        </div>
        
        <div style="background: #6c757d; color: white; padding: 15px; text-align: center;">
          <p><small>AI Confidence: ${report.summary.aiConfidence} | Generated automatically by advanced analytics</small></p>
        </div>
      </div>
    `;
  }
}

module.exports = new AINotificationService();