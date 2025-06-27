import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AIInsightsDashboard = ({ teamId }) => {
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (teamId) {
      loadAIData();
    }
  }, [teamId]);

  const loadAIData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/ai/dashboard/${teamId}`);
      setAiData(response.data.data);

    } catch (error) {
      console.error('AI Dashboard Error:', error);
      setError('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  if (!teamId) {
    return (
      <div className="alert alert-info">
        <i className="fas fa-info-circle me-2"></i>
        Select a team to view AI insights
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading AI insights...</span>
        </div>
        <p className="mt-2 text-muted">
          <i className="fas fa-brain me-2"></i>
          AI analyzing team data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-circle me-2"></i>
        {error}
        <div className="mt-2">
          <button 
            className="btn btn-outline-danger btn-sm"
            onClick={loadAIData}
          >
            <i className="fas fa-sync-alt me-1"></i>
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!aiData) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        No AI data available for this team
      </div>
    );
  }

  const renderOverview = () => (
    <div className="row">
      {/* AI Insights Summary */}
      <div className="col-md-6 mb-4">
        <div className="card h-100">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">
              <i className="fas fa-lightbulb me-2"></i>
              AI Key Insights
            </h6>
          </div>
          <div className="card-body">
            {aiData.aiInsights.attendanceInsights?.map((insight, index) => (
              <div key={index} className="mb-3">
                <div className="d-flex align-items-start">
                  <i className="fas fa-chart-line text-success me-2 mt-1"></i>
                  <div>
                    <strong className="text-capitalize">{insight.type.replace('_', ' ')}</strong>
                    <p className="small text-muted mb-0">{insight.insight}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {aiData.aiInsights.performanceInsights?.map((insight, index) => (
              <div key={index} className="mb-3">
                <div className="d-flex align-items-start">
                  <i className="fas fa-trophy text-warning me-2 mt-1"></i>
                  <div>
                    <strong>{insight.type}</strong>
                    <p className="small text-muted mb-0">{insight.insight}</p>
                    <span className={`badge badge-${insight.confidence === 'high' ? 'success' : 'warning'}`}>
                      {insight.confidence} confidence
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="col-md-6 mb-4">
        <div className="card h-100">
          <div className="card-header bg-warning text-dark">
            <h6 className="mb-0">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Risk Assessment
            </h6>
          </div>
          <div className="card-body">
            <div className="row text-center">
              <div className="col-4">
                <div className="risk-metric">
                  <div className={`risk-number ${aiData.riskAssessment.attendanceRisks > 2 ? 'text-danger' : 'text-success'}`}>
                    {aiData.riskAssessment.attendanceRisks}
                  </div>
                  <small className="text-muted">Attendance Risks</small>
                </div>
              </div>
              <div className="col-4">
                <div className="risk-metric">
                  <div className={`risk-number ${aiData.riskAssessment.performanceRisks > 1 ? 'text-danger' : 'text-success'}`}>
                    {aiData.riskAssessment.performanceRisks}
                  </div>
                  <small className="text-muted">Performance Risks</small>
                </div>
              </div>
              <div className="col-4">
                <div className="risk-metric">
                  <div className={`risk-number ${aiData.riskAssessment.positionRisks > 3 ? 'text-danger' : 'text-success'}`}>
                    {aiData.riskAssessment.positionRisks}
                  </div>
                  <small className="text-muted">Position Risks</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Prediction */}
      <div className="col-md-12 mb-4">
        <div className="card">
          <div className="card-header bg-info text-white">
            <h6 className="mb-0">
              <i className="fas fa-crystal-ball me-2"></i>
              AI Performance Prediction
            </h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>Current Metrics</h6>
                <ul className="list-unstyled">
                  <li>
                    <strong>Attendance Rate:</strong> {aiData.performancePrediction.currentMetrics.avgAttendanceRate}%
                  </li>
                  <li>
                    <strong>Performance Rating:</strong> {aiData.performancePrediction.currentMetrics.avgPerformance}/5
                  </li>
                  <li>
                    <strong>Trend:</strong> 
                    <span className={`ms-2 text-${aiData.performancePrediction.currentMetrics.trend.direction === 'improving' ? 'success' : 
                      aiData.performancePrediction.currentMetrics.trend.direction === 'declining' ? 'danger' : 'warning'}`}>
                      {aiData.performancePrediction.currentMetrics.trend.direction}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6>Predicted Metrics ({aiData.performancePrediction.predictionHorizon})</h6>
                <ul className="list-unstyled">
                  <li>
                    <strong>Expected Attendance:</strong> {aiData.performancePrediction.prediction.predictedMetrics.attendanceRate}%
                  </li>
                  <li>
                    <strong>Expected Performance:</strong> {aiData.performancePrediction.prediction.predictedMetrics.performanceRating}/5
                  </li>
                  <li>
                    <strong>Confidence:</strong> 
                    <span className={`ms-2 badge bg-${aiData.performancePrediction.prediction.confidence === 'high' ? 'success' : 'warning'}`}>
                      {aiData.performancePrediction.prediction.confidence}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendanceAnalysis = () => (
    <div className="row">
      {/* Day of Week Patterns */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-calendar-week me-2"></i>
              Best Training Days
            </h6>
          </div>
          <div className="card-body">
            {aiData.attendancePatterns.patterns.dayOfWeekPatterns?.slice(0, 5).map((day, index) => (
              <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                <span>{day.dayName}</span>
                <div>
                  <span className="me-2">{Math.round(day.attendanceRate * 100)}%</span>
                  <div className="progress" style={{ width: '60px', height: '8px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      style={{ width: `${day.attendanceRate * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Patterns */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-clock me-2"></i>
              Optimal Time Slots
            </h6>
          </div>
          <div className="card-body">
            {aiData.attendancePatterns.patterns.timePatterns?.map((time, index) => (
              <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-capitalize">{time.timeSlot}</span>
                <div>
                  <span className="me-2">{Math.round(time.attendanceRate * 100)}%</span>
                  <div className="progress" style={{ width: '60px', height: '8px' }}>
                    <div 
                      className="progress-bar bg-info" 
                      style={{ width: `${time.attendanceRate * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player Behavior Clusters */}
      <div className="col-md-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-users me-2"></i>
              Player Attendance Clusters
            </h6>
          </div>
          <div className="card-body">
            <div className="row">
              {['exemplary', 'reliable', 'inconsistent', 'punctuality_concern'].map(cluster => {
                const players = aiData.attendancePatterns.patterns.playerBehaviorClusters?.filter(p => p.cluster === cluster) || [];
                return (
                  <div key={cluster} className="col-md-3 mb-3">
                    <div className={`card border-${cluster === 'exemplary' ? 'success' : cluster === 'reliable' ? 'primary' : 'warning'}`}>
                      <div className="card-body text-center">
                        <h6 className="text-capitalize">{cluster.replace('_', ' ')}</h6>
                        <div className="h4 mb-0">{players.length}</div>
                        <small className="text-muted">players</small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPositionOptimization = () => (
    <div className="row">
      {/* Formation Recommendation */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h6 className="mb-0">
              <i className="fas fa-chess-board me-2"></i>
              AI Formation Recommendation
            </h6>
          </div>
          <div className="card-body text-center">
            <div className="h2 text-success mb-2">
              {aiData.positionOptimization.optimizedFormation.recommendedFormation}
            </div>
            <p className="text-muted">
              {aiData.positionOptimization.optimizedFormation.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Position Fitness Overview */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-chart-pie me-2"></i>
              Position Fitness Overview
            </h6>
          </div>
          <div className="card-body">
            <div className="text-center">
              <div className="h4 text-success">
                {aiData.positionOptimization.positionAnalysis?.filter(p => p.positionOptimal).length}
              </div>
              <small className="text-muted">Players in optimal positions</small>
            </div>
            <div className="text-center mt-3">
              <div className="h4 text-warning">
                {aiData.positionOptimization.positionAnalysis?.filter(p => !p.positionOptimal).length}
              </div>
              <small className="text-muted">Players needing position review</small>
            </div>
          </div>
        </div>
      </div>

      {/* Position Analysis Details */}
      <div className="col-md-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-list me-2"></i>
              Individual Position Analysis
            </h6>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Current Position</th>
                    <th>Fitness Score</th>
                    <th>Status</th>
                    <th>Suggestions</th>
                  </tr>
                </thead>
                <tbody>
                  {aiData.positionOptimization.positionAnalysis?.map((player, index) => (
                    <tr key={index}>
                      <td>{player.name}</td>
                      <td>{player.position}</td>
                      <td>
                        <span className={`badge bg-${player.currentFitnessScore >= 0.8 ? 'success' : 'warning'}`}>
                          {Math.round(player.currentFitnessScore * 100)}%
                        </span>
                      </td>
                      <td>
                        <i className={`fas ${player.positionOptimal ? 'fa-check-circle text-success' : 'fa-exclamation-circle text-warning'}`}></i>
                        {player.positionOptimal ? ' Optimal' : ' Review Needed'}
                      </td>
                      <td>
                        {player.suggestedPositions?.slice(0, 2).join(', ') || 'Current position'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrainingPlan = () => (
    <div className="row">
      {/* AI Training Schedule */}
      <div className="col-md-12 mb-4">
        <div className="card">
          <div className="card-header bg-purple text-white">
            <h6 className="mb-0">
              <i className="fas fa-calendar-alt me-2"></i>
              AI-Optimized Training Schedule
            </h6>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Day</th>
                    <th>Time Slot</th>
                    <th>Training Type</th>
                    <th>Expected Attendance</th>
                    <th>AI Optimized</th>
                  </tr>
                </thead>
                <tbody>
                  {aiData.trainingPlan.aiOptimizedPlan?.map((session, index) => (
                    <tr key={index}>
                      <td>Week {session.week}</td>
                      <td>{session.dayOfWeek}</td>
                      <td className="text-capitalize">{session.timeSlot}</td>
                      <td>{session.type}</td>
                      <td>
                        <span className={`badge bg-${session.expectedAttendance >= 80 ? 'success' : 'warning'}`}>
                          {session.expectedAttendance}%
                        </span>
                      </td>
                      <td>
                        {session.aiOptimized && (
                          <i className="fas fa-robot text-primary" title="AI Optimized"></i>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Training Recommendations */}
      <div className="col-md-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="fas fa-lightbulb me-2"></i>
              AI Training Recommendations
            </h6>
          </div>
          <div className="card-body">
            {aiData.trainingPlan.recommendations?.map((rec, index) => (
              <div key={index} className="alert alert-info">
                <h6 className="alert-heading text-capitalize">{rec.category}</h6>
                <p className="mb-1">{rec.recommendation}</p>
                <small className="text-muted">
                  <strong>Impact:</strong> {rec.impact} | <strong>Details:</strong> {rec.details}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ai-insights-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>
          <i className="fas fa-brain text-primary me-2"></i>
          AI Insights Dashboard
        </h4>
        <div className="d-flex align-items-center">
          <small className="text-muted me-3">
            Last updated: {new Date(aiData.lastUpdated).toLocaleString()}
          </small>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={loadAIData}
            disabled={loading}
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-1`}></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            <i className="fas fa-tachometer-alt me-2"></i>
            Overview
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setSelectedTab('attendance')}
          >
            <i className="fas fa-calendar-check me-2"></i>
            Attendance Analysis
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedTab === 'positions' ? 'active' : ''}`}
            onClick={() => setSelectedTab('positions')}
          >
            <i className="fas fa-chess-board me-2"></i>
            Position Optimization
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedTab === 'training' ? 'active' : ''}`}
            onClick={() => setSelectedTab('training')}
          >
            <i className="fas fa-calendar-alt me-2"></i>
            Training Plan
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'attendance' && renderAttendanceAnalysis()}
        {selectedTab === 'positions' && renderPositionOptimization()}
        {selectedTab === 'training' && renderTrainingPlan()}
      </div>

      <style jsx>{`
        .risk-metric {
          padding: 15px 0;
        }
        
        .risk-number {
          font-size: 2rem;
          font-weight: bold;
        }
        
        .ai-insights-dashboard .nav-tabs .nav-link {
          border-color: transparent transparent #dee2e6 transparent;
          color: #6c757d;
        }
        
        .ai-insights-dashboard .nav-tabs .nav-link.active {
          background-color: #fff;
          border-color: #dee2e6 #dee2e6 #fff #dee2e6;
          color: #007bff;
        }
        
        .bg-purple {
          background-color: #6f42c1 !important;
        }
        
        @media (max-width: 768px) {
          .ai-insights-dashboard .nav-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
          }
          
          .ai-insights-dashboard .nav-tabs .nav-item {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
};

export default AIInsightsDashboard;