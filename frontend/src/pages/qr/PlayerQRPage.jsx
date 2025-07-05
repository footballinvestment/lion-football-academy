import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Select } from '../../components/ui';
import { PlayerQRCode, QRCodeHistory } from '../../components/qr';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { QR_CODE_TYPES } from '../../utils/qrGenerator';
import './PlayerQRPage.css';

const PlayerQRPage = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [qrType, setQrType] = useState(QR_CODE_TYPES.ATTENDANCE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('current');

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            setLoading(true);
            // Get sessions where this player can attend
            const response = await api.get('/qr/sessions');
            
            // Filter sessions based on player's team or upcoming sessions
            const playerSessions = response.data.sessions?.filter(session => {
                const sessionDate = new Date(session.date);
                const now = new Date();
                // Show sessions from today and future
                return sessionDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }) || [];
            
            setSessions(playerSessions);
        } catch (error) {
            console.error('Error loading sessions:', error);
            setError('Failed to load available sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleSessionChange = (sessionId) => {
        if (!sessionId) {
            setSelectedSession(null);
            return;
        }

        const session = sessions.find(s => s.id === parseInt(sessionId));
        setSelectedSession(session);
        
        // Update QR type based on session type
        if (session) {
            switch (session.type) {
                case 'training':
                    setQrType(QR_CODE_TYPES.TRAINING);
                    break;
                case 'match':
                    setQrType(QR_CODE_TYPES.MATCH);
                    break;
                case 'event':
                    setQrType(QR_CODE_TYPES.EVENT);
                    break;
                default:
                    setQrType(QR_CODE_TYPES.ATTENDANCE);
            }
        }
    };

    const handleQRGenerate = (qrCode, player, session) => {
        console.log('QR code generated:', { qrCode, player, session });
        // You could add success notifications here
    };

    return (
        <div className="player-qr-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>🎫 My QR Code</h1>
                    <p>Generate your personal QR code for attendance at training sessions and matches</p>
                </div>
                <div className="player-info">
                    <h3>👋 Welcome, {user?.first_name}!</h3>
                    <p>Player ID: {user?.id}</p>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <div className="qr-tabs">
                <button 
                    className={`tab ${activeTab === 'current' ? 'active' : ''}`}
                    onClick={() => setActiveTab('current')}
                >
                    🎫 Current QR Code
                </button>
                <button 
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📊 Usage History
                </button>
            </div>

            <div className="qr-content">
                {activeTab === 'current' && (
                    <div className="current-qr-tab">
                        <Card className="session-selection">
                            <div className="selection-header">
                                <h3>📅 Select Session (Optional)</h3>
                                <p>Choose a specific session for targeted attendance, or leave blank for general attendance</p>
                            </div>
                            
                            <div className="selection-controls">
                                <div className="session-selector">
                                    <label>Available Sessions:</label>
                                    <Select
                                        value={selectedSession?.id || ''}
                                        onChange={(e) => handleSessionChange(e.target.value)}
                                        placeholder="General attendance (no specific session)"
                                    >
                                        <option value="">General Attendance</option>
                                        {sessions.map(session => (
                                            <option key={session.id} value={session.id}>
                                                {session.name} - {new Date(session.date).toLocaleDateString()} 
                                                ({session.type}) - {session.team_name}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                                
                                <Button 
                                    onClick={loadSessions} 
                                    variant="ghost" 
                                    size="sm"
                                    disabled={loading}
                                >
                                    🔄 Refresh Sessions
                                </Button>
                            </div>

                            {selectedSession && (
                                <div className="selected-session-info">
                                    <div className="session-details">
                                        <h4>{selectedSession.name}</h4>
                                        <div className="session-meta">
                                            <span className="session-date">
                                                📅 {new Date(selectedSession.date).toLocaleDateString()}
                                            </span>
                                            <span className="session-type">
                                                🏷️ {selectedSession.type}
                                            </span>
                                            <span className="session-location">
                                                📍 {selectedSession.location}
                                            </span>
                                            <span className="session-team">
                                                👥 {selectedSession.team_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        <PlayerQRCode
                            playerId={user?.id}
                            sessionId={selectedSession?.id}
                            sessionType={qrType}
                            size="large"
                            showDownloadOptions={true}
                            showInstructions={true}
                            onGenerate={handleQRGenerate}
                            className="main-qr-code"
                        />

                        <Card className="qr-instructions">
                            <h3>📱 How to Use Your QR Code</h3>
                            <div className="instruction-grid">
                                <div className="instruction-step">
                                    <div className="step-number">1</div>
                                    <div className="step-content">
                                        <h4>Generate QR Code</h4>
                                        <p>Your QR code is automatically generated and refreshes every 30 minutes for security</p>
                                    </div>
                                </div>
                                <div className="instruction-step">
                                    <div className="step-number">2</div>
                                    <div className="step-content">
                                        <h4>Show to Coach</h4>
                                        <p>Present your device screen with the QR code to your coach during attendance check</p>
                                    </div>
                                </div>
                                <div className="instruction-step">
                                    <div className="step-number">3</div>
                                    <div className="step-content">
                                        <h4>Attendance Recorded</h4>
                                        <p>Your coach will scan the code and your attendance will be automatically recorded</p>
                                    </div>
                                </div>
                                <div className="instruction-step">
                                    <div className="step-number">4</div>
                                    <div className="step-content">
                                        <h4>Download (Optional)</h4>
                                        <p>You can download your QR code as an image or PDF for offline use</p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="security-notice">
                            <div className="security-header">
                                <h3>🔒 Security Information</h3>
                            </div>
                            <div className="security-content">
                                <ul>
                                    <li><strong>Personal Use Only:</strong> This QR code is unique to you and should not be shared with other players</li>
                                    <li><strong>Time-Limited:</strong> QR codes expire after 30 minutes and must be refreshed for security</li>
                                    <li><strong>Session-Specific:</strong> When generated for a specific session, the code only works for that session</li>
                                    <li><strong>Fraud Prevention:</strong> Each scan is logged and verified to prevent attendance fraud</li>
                                    <li><strong>One-Time Use:</strong> Each QR code can only be scanned once per session</li>
                                </ul>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-tab">
                        <QRCodeHistory 
                            playerId={user?.id}
                            showPlayerSelector={false}
                            className="player-history"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerQRPage;