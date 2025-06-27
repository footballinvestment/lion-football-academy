import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AIInsightsDashboard from '../components/AIInsightsDashboard';
import apiService from '../services/api';

const AIAnalytics = () => {
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.teams.getAll();
      setTeams(response.data);

      // Auto-select first team if available
      if (response.data.length > 0) {
        setSelectedTeam(response.data[0].id.toString());
      }

    } catch (error) {
      console.error('Error loading teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading AI Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
          <div className="mt-2">
            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={loadTeams}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>
                <i className="fas fa-robot text-primary me-2"></i>
                AI Analytics & Insights
              </h2>
              <p className="text-muted mb-0">
                Advanced artificial intelligence-powered analytics for team performance optimization
              </p>
            </div>
            
            {/* Team Selector */}
            {teams.length > 0 && (
              <div className="d-flex align-items-center">
                <label className="form-label me-2 mb-0">
                  <i className="fas fa-users me-1"></i>
                  Team:
                </label>
                <select 
                  className="form-select"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="">Select a team...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id.toString()}>
                      {team.name} ({team.age_group})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* AI Features Info */}
          {!selectedTeam && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card bg-light">
                  <div className="card-body">
                    <h5 className="card-title">
                      <i className="fas fa-brain text-primary me-2"></i>
                      AI-Powered Analytics Features
                    </h5>
                    <div className="row">
                      <div className="col-md-3 mb-3">
                        <div className="text-center">
                          <i className="fas fa-chart-line fa-2x text-success mb-2"></i>
                          <h6>Performance Analysis</h6>
                          <p className="small text-muted">
                            AI algorithms analyze player trends, attendance patterns, and predict future performance
                          </p>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="text-center">
                          <i className="fas fa-calendar-alt fa-2x text-info mb-2"></i>
                          <h6>Smart Training Planning</h6>
                          <p className="small text-muted">
                            Intelligent scheduling based on attendance patterns and team performance data
                          </p>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="text-center">
                          <i className="fas fa-chess-board fa-2x text-warning mb-2"></i>
                          <h6>Position Optimization</h6>
                          <p className="small text-muted">
                            AI recommendations for optimal player positions and team formations
                          </p>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="text-center">
                          <i className="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
                          <h6>Risk Assessment</h6>
                          <p className="small text-muted">
                            Early warning system for attendance issues and performance decline
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Teams Available */}
          {teams.length === 0 && (
            <div className="alert alert-info">
              <h5>
                <i className="fas fa-info-circle me-2"></i>
                No Teams Available
              </h5>
              <p className="mb-0">
                You need to have teams created to access AI analytics. 
                Please create a team first or contact your administrator.
              </p>
            </div>
          )}

          {/* AI Dashboard */}
          {selectedTeam && (
            <AIInsightsDashboard teamId={parseInt(selectedTeam)} />
          )}

          {/* AI Analytics Info Footer */}
          {selectedTeam && (
            <div className="row mt-5">
              <div className="col-12">
                <div className="card border-primary">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      About AI Analytics
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4">
                        <h6>
                          <i className="fas fa-cogs me-2"></i>
                          How It Works
                        </h6>
                        <p className="small">
                          Our AI system analyzes historical training data, attendance patterns, 
                          and performance metrics to generate insights and predictions.
                        </p>
                      </div>
                      <div className="col-md-4">
                        <h6>
                          <i className="fas fa-chart-bar me-2"></i>
                          Data Accuracy
                        </h6>
                        <p className="small">
                          Predictions become more accurate with more training data. 
                          We recommend at least 8-10 training sessions for reliable insights.
                        </p>
                      </div>
                      <div className="col-md-4">
                        <h6>
                          <i className="fas fa-sync-alt me-2"></i>
                          Real-time Updates
                        </h6>
                        <p className="small">
                          AI insights are updated automatically as new training data is recorded. 
                          Click refresh to get the latest analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .container-fluid {
          max-width: 1400px;
        }
        
        .card .fa-2x {
          color: inherit;
        }
        
        .text-center i.fa-2x {
          transition: transform 0.3s ease;
        }
        
        .text-center:hover i.fa-2x {
          transform: scale(1.1);
        }
        
        @media (max-width: 768px) {
          .d-flex.justify-content-between {
            flex-direction: column;
            align-items: start !important;
          }
          
          .d-flex.align-items-center {
            margin-top: 1rem;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default AIAnalytics;