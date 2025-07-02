import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import QRScanner from '../components/QRScanner';
import QRGenerator from '../components/QRGenerator';
import api from '../services/api';

const QRCheckIn = () => {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [mode, setMode] = useState('scanner'); // 'scanner' or 'generator'
  const [training, setTraining] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [trainingId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load training details
      const trainingResponse = await api.get(`/trainings/${trainingId}`);
      setTraining(trainingResponse.data);

      // Load players for the team (for parents/coaches to select)
      if (user.role !== 'player') {
        const playersResponse = await api.get(`/teams/${trainingResponse.data.team_id}/players`);
        setPlayers(playersResponse.data);
      }

      // Load existing check-ins
      loadCheckIns();

    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const loadCheckIns = async () => {
    try {
      const response = await api.get(`/qr/trainings/${trainingId}/check-ins`);
      setCheckIns(response.data.check_ins);
    } catch (error) {
      console.error('Failed to load check-ins:', error);
    }
  };

  const handleScanSuccess = (result) => {
    // Reload check-ins to show the new attendance
    loadCheckIns();
    
    // Show success message
    setTimeout(() => {
      navigate('/trainings');
    }, 3000);
  };

  const handleScanError = (error) => {
    console.error('Scan error:', error);
  };

  const handleQRGenerated = (data) => {
    console.log('QR code generated:', data);
  };

  const handleQRError = (error) => {
    console.error('QR generation error:', error);
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading training data...</p>
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
              className="btn btn-outline-danger btn-sm me-2"
              onClick={loadData}
            >
              Try Again
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/trainings')}
            >
              Back to Trainings
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canGenerateQR = user.role === 'admin' || user.role === 'coach';
  const canScan = true; // All users can scan

  const getPlayerIdForScanning = () => {
    if (user.role === 'player') {
      return user.player_id;
    }
    return selectedPlayer;
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          {/* Header */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="mb-1">
                    <i className="fas fa-qrcode me-2"></i>
                    QR Check-in System
                  </h4>
                  {training && (
                    <p className="text-muted mb-0">
                      {training.team_name} - {training.date} at {training.time}
                    </p>
                  )}
                </div>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => navigate('/trainings')}
                >
                  <i className="fas fa-arrow-left me-1"></i>
                  Back
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="btn-group w-100" role="group">
                {canScan && (
                  <button
                    className={`btn ${mode === 'scanner' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setMode('scanner')}
                  >
                    <i className="fas fa-camera me-2"></i>
                    Scan QR Code
                  </button>
                )}
                {canGenerateQR && (
                  <button
                    className={`btn ${mode === 'generator' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setMode('generator')}
                  >
                    <i className="fas fa-qrcode me-2"></i>
                    Generate QR Code
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Player Selection (for non-player users) */}
          {mode === 'scanner' && user.role !== 'player' && (
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="fas fa-user me-2"></i>
                  Select Player
                </h6>
                <select 
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                >
                  <option value="">Choose a player...</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} - {player.position}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* QR Scanner */}
          {mode === 'scanner' && (
            <QRScanner
              playerId={getPlayerIdForScanning()}
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
            />
          )}

          {/* QR Generator */}
          {mode === 'generator' && canGenerateQR && (
            <QRGenerator
              trainingId={trainingId}
              onGenerated={handleQRGenerated}
              onError={handleQRError}
            />
          )}

          {/* Check-ins List */}
          {checkIns.length > 0 && (
            <div className="card mt-4">
              <div className="card-header">
                <h6 className="mb-0">
                  <i className="fas fa-check-circle me-2"></i>
                  Check-ins ({checkIns.length})
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {checkIns.map((checkIn, index) => (
                    <div key={index} className="col-md-6 mb-2">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-user-check text-success me-2"></i>
                        <div>
                          <strong>{checkIn.player_name}</strong>
                          {checkIn.position && (
                            <span className="text-muted"> ({checkIn.position})</span>
                          )}
                          <br />
                          <small className="text-muted">
                            {new Date(checkIn.check_in_time).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCheckIn;