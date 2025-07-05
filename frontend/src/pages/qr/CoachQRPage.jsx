import React, { useState } from 'react';
import { Card, Alert } from '../../components/ui';
import { AttendanceManager, QRCodeHistory } from '../../components/qr';
import { useAuth } from '../../hooks/useAuth';
import './CoachQRPage.css';

const CoachQRPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance');
    const [error, setError] = useState('');

    return (
        <div className="coach-qr-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>📱 QR Code Management</h1>
                    <p>Scan QR codes, manage attendance, and track player activity</p>
                </div>
                <div className="coach-info">
                    <h3>👨‍🏫 Coach Panel</h3>
                    <p>{user?.first_name} {user?.last_name}</p>
                    <p>Role: {user?.role}</p>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <div className="qr-tabs">
                <button 
                    className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    📊 Attendance Management
                </button>
                <button 
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📋 Player History
                </button>
                <button 
                    className={`tab ${activeTab === 'instructions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('instructions')}
                >
                    📖 Instructions
                </button>
            </div>

            <div className="qr-content">
                {activeTab === 'attendance' && (
                    <div className="attendance-tab">
                        <AttendanceManager 
                            className="coach-attendance-manager"
                        />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-tab">
                        <QRCodeHistory 
                            showPlayerSelector={true}
                            className="coach-history"
                        />
                    </div>
                )}

                {activeTab === 'instructions' && (
                    <div className="instructions-tab">
                        <div className="instructions-grid">
                            <Card className="instruction-card scanner">
                                <div className="card-header">
                                    <h3>📱 QR Scanner Usage</h3>
                                </div>
                                <div className="card-content">
                                    <div className="instruction-steps">
                                        <div className="step">
                                            <div className="step-number">1</div>
                                            <div className="step-text">
                                                <h4>Select Session</h4>
                                                <p>Choose the training session or match from the dropdown menu</p>
                                            </div>
                                        </div>
                                        <div className="step">
                                            <div className="step-number">2</div>
                                            <div className="step-text">
                                                <h4>Start Scanner</h4>
                                                <p>Click "Start Scanning" to activate the camera</p>
                                            </div>
                                        </div>
                                        <div className="step">
                                            <div className="step-number">3</div>
                                            <div className="step-text">
                                                <h4>Scan QR Codes</h4>
                                                <p>Point the camera at player QR codes to record attendance</p>
                                            </div>
                                        </div>
                                        <div className="step">
                                            <div className="step-number">4</div>
                                            <div className="step-text">
                                                <h4>Review Results</h4>
                                                <p>Check the attendance list and manually adjust if needed</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="instruction-card troubleshooting">
                                <div className="card-header">
                                    <h3>🔧 Troubleshooting</h3>
                                </div>
                                <div className="card-content">
                                    <div className="troubleshoot-item">
                                        <h4>📷 Camera Issues</h4>
                                        <ul>
                                            <li>Grant camera permissions in browser settings</li>
                                            <li>Ensure good lighting conditions</li>
                                            <li>Use manual input if camera fails</li>
                                            <li>Try refreshing the page</li>
                                        </ul>
                                    </div>
                                    <div className="troubleshoot-item">
                                        <h4>🎫 QR Code Problems</h4>
                                        <ul>
                                            <li>Check if QR code has expired (30 min limit)</li>
                                            <li>Verify player is in correct team</li>
                                            <li>Ensure QR code is for the right session</li>
                                            <li>Use manual attendance as backup</li>
                                        </ul>
                                    </div>
                                    <div className="troubleshoot-item">
                                        <h4>🔄 Scanning Tips</h4>
                                        <ul>
                                            <li>Hold device steady during scan</li>
                                            <li>Ensure QR code fills the scanner frame</li>
                                            <li>Avoid reflections on phone screens</li>
                                            <li>Ask players to increase screen brightness</li>
                                        </ul>
                                    </div>
                                </div>
                            </Card>

                            <Card className="instruction-card manual">
                                <div className="card-header">
                                    <h3>✏️ Manual Attendance</h3>
                                </div>
                                <div className="card-content">
                                    <div className="manual-steps">
                                        <div className="manual-step">
                                            <h4>When to Use</h4>
                                            <p>Use manual attendance when QR scanning fails or for players without devices</p>
                                        </div>
                                        <div className="manual-step">
                                            <h4>How to Mark</h4>
                                            <p>Go to "Absent Players" tab and click "Mark Present" for each player</p>
                                        </div>
                                        <div className="manual-step">
                                            <h4>Status Options</h4>
                                            <ul>
                                                <li><strong>Present:</strong> Player attended</li>
                                                <li><strong>Absent:</strong> Player did not attend</li>
                                                <li><strong>Late:</strong> Player arrived late</li>
                                                <li><strong>Excused:</strong> Authorized absence</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="instruction-card security">
                                <div className="card-header">
                                    <h3>🔒 Security Features</h3>
                                </div>
                                <div className="card-content">
                                    <div className="security-features">
                                        <div className="security-feature">
                                            <h4>🔐 QR Code Validation</h4>
                                            <p>Each QR code has a unique signature that prevents forgery and ensures authenticity</p>
                                        </div>
                                        <div className="security-feature">
                                            <h4>⏰ Time Expiration</h4>
                                            <p>QR codes expire after 30 minutes to prevent misuse and ensure real-time attendance</p>
                                        </div>
                                        <div className="security-feature">
                                            <h4>🔄 One-Time Use</h4>
                                            <p>Each QR code can only be scanned once per session to prevent duplicate check-ins</p>
                                        </div>
                                        <div className="security-feature">
                                            <h4>📊 Audit Trail</h4>
                                            <p>All scans are logged with timestamp, location, and scanner information for accountability</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="instruction-card export">
                                <div className="card-header">
                                    <h3>📥 Export & Reports</h3>
                                </div>
                                <div className="card-content">
                                    <div className="export-info">
                                        <div className="export-option">
                                            <h4>📊 CSV Export</h4>
                                            <p>Export attendance data as CSV for external analysis and record keeping</p>
                                        </div>
                                        <div className="export-option">
                                            <h4>📈 Real-time Stats</h4>
                                            <p>View attendance percentages and summaries for quick session overview</p>
                                        </div>
                                        <div className="export-option">
                                            <h4>📋 History Tracking</h4>
                                            <p>Access detailed history of all QR code activities for individual players</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="instruction-card contact">
                                <div className="card-header">
                                    <h3>🤝 Support</h3>
                                </div>
                                <div className="card-content">
                                    <div className="support-info">
                                        <p>Need help with the QR attendance system?</p>
                                        <div className="support-options">
                                            <div className="support-option">
                                                <h4>📧 Email Support</h4>
                                                <p>support@lionfootballacademy.com</p>
                                            </div>
                                            <div className="support-option">
                                                <h4>📱 Quick Help</h4>
                                                <p>Check the troubleshooting section above for common issues</p>
                                            </div>
                                            <div className="support-option">
                                                <h4>🎥 Video Guide</h4>
                                                <p>Watch tutorial videos in the academy's training materials</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoachQRPage;