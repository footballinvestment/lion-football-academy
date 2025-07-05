import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './QRCode.css';

const QRCode = () => {
    const { user } = useAuth();
    const qrRef = useRef(null);
    const [qrData, setQRData] = useState({
        qrCode: '',
        attendanceHistory: [],
        stats: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('qrcode');
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        fetchQRData();
        generateQRCode();
    }, []);

    const fetchQRData = async () => {
        try {
            setLoading(true);
            setError('');

            const [qrRes, historyRes, statsRes] = await Promise.all([
                api.get('/player/qr-code'),
                api.get('/player/qr-attendance-history'),
                api.get('/player/qr-stats')
            ]);

            setQRData({
                qrCode: qrRes.data.qrCode,
                attendanceHistory: historyRes.data,
                stats: statsRes.data
            });
        } catch (error) {
            console.error('Error fetching QR data:', error);
            setError('Failed to load QR code data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async () => {
        try {
            // Generate QR code with player ID and timestamp for security
            const qrData = {
                playerId: user?.id,
                playerName: `${user?.first_name} ${user?.last_name}`,
                timestamp: new Date().toISOString(),
                type: 'attendance'
            };

            // In a real implementation, you would use a QR code library like 'qrcode'
            // For this demo, we'll simulate the QR code generation
            const qrCodeSVG = generateQRCodeSVG(JSON.stringify(qrData));
            setQRData(prev => ({
                ...prev,
                qrCode: qrCodeSVG
            }));
        } catch (error) {
            console.error('Error generating QR code:', error);
            setError('Failed to generate QR code.');
        }
    };

    // Simulated QR code generation (in real app, use a proper QR library)
    const generateQRCodeSVG = (data) => {
        const size = 200;
        const modules = 25; // QR code grid size
        const moduleSize = size / modules;
        
        // Create a simple pattern for demo purposes
        let pattern = '';
        for (let row = 0; row < modules; row++) {
            for (let col = 0; col < modules; col++) {
                // Simple pattern based on data hash and position
                const hash = data.charCodeAt((row * modules + col) % data.length);
                if ((hash + row + col) % 2 === 0) {
                    const x = col * moduleSize;
                    const y = row * moduleSize;
                    pattern += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
                }
            }
        }

        return `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${size}" height="${size}" fill="white"/>
                ${pattern}
                <!-- Corner markers -->
                <rect x="0" y="0" width="${moduleSize * 7}" height="${moduleSize * 7}" fill="black"/>
                <rect x="${moduleSize}" y="${moduleSize}" width="${moduleSize * 5}" height="${moduleSize * 5}" fill="white"/>
                <rect x="${moduleSize * 2}" y="${moduleSize * 2}" width="${moduleSize * 3}" height="${moduleSize * 3}" fill="black"/>
                
                <rect x="${size - moduleSize * 7}" y="0" width="${moduleSize * 7}" height="${moduleSize * 7}" fill="black"/>
                <rect x="${size - moduleSize * 6}" y="${moduleSize}" width="${moduleSize * 5}" height="${moduleSize * 5}" fill="white"/>
                <rect x="${size - moduleSize * 5}" y="${moduleSize * 2}" width="${moduleSize * 3}" height="${moduleSize * 3}" fill="black"/>
                
                <rect x="0" y="${size - moduleSize * 7}" width="${moduleSize * 7}" height="${moduleSize * 7}" fill="black"/>
                <rect x="${moduleSize}" y="${size - moduleSize * 6}" width="${moduleSize * 5}" height="${moduleSize * 5}" fill="white"/>
                <rect x="${moduleSize * 2}" y="${size - moduleSize * 5}" width="${moduleSize * 3}" height="${moduleSize * 3}" fill="black"/>
            </svg>
        `;
    };

    const downloadQRCode = () => {
        if (!qrData.qrCode) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const svgBlob = new Blob([qrData.qrCode], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            canvas.width = 400;
            canvas.height = 500;
            
            // Background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 400, 500);
            
            // QR Code
            ctx.drawImage(img, 100, 50, 200, 200);
            
            // Player info
            ctx.fillStyle = 'black';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${user?.first_name} ${user?.last_name}`, 200, 280);
            
            ctx.font = '14px Arial';
            ctx.fillText(`Player ID: ${user?.id}`, 200, 300);
            ctx.fillText('Lion Football Academy', 200, 320);
            
            ctx.font = '12px Arial';
            ctx.fillText('Scan this code for quick attendance', 200, 350);
            ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 200, 370);
            
            // Download
            const link = document.createElement('a');
            link.download = `${user?.first_name}_${user?.last_name}_QR_Code.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
    };

    const printQRCode = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${user?.first_name} ${user?.last_name}</title>
                <style>
                    @page { margin: 1cm; }
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 20px;
                    }
                    .qr-container { 
                        border: 2px solid #2c5530; 
                        padding: 30px; 
                        margin: 20px auto; 
                        max-width: 400px;
                        border-radius: 10px;
                    }
                    .qr-code { margin: 20px 0; }
                    .player-info { margin: 20px 0; }
                    .academy-logo { 
                        font-size: 24px; 
                        font-weight: bold; 
                        color: #2c5530; 
                        margin-bottom: 10px;
                    }
                    .instructions {
                        font-size: 12px;
                        color: #666;
                        margin-top: 20px;
                        line-height: 1.4;
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <div class="academy-logo">🦁 Lion Football Academy</div>
                    <div class="player-info">
                        <h2>${user?.first_name} ${user?.last_name}</h2>
                        <p>Player ID: ${user?.id}</p>
                        <p>Position: ${user?.position || 'Not assigned'}</p>
                    </div>
                    <div class="qr-code">
                        ${qrData.qrCode}
                    </div>
                    <div class="instructions">
                        <p><strong>How to use:</strong></p>
                        <p>1. Show this QR code to your coach for attendance</p>
                        <p>2. Make sure the code is clearly visible</p>
                        <p>3. Wait for confirmation beep or message</p>
                        <p><br>Generated: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const refreshQRCode = () => {
        generateQRCode();
        fetchQRData();
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getAttendanceIcon = (type) => {
        const icons = {
            training: '🏃',
            match: '⚽',
            meeting: '💬',
            event: '📅'
        };
        return icons[type] || '📝';
    };

    if (loading) {
        return (
            <div className="qr-code-page">
                <div className="qr-code-page__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading your QR code...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="qr-code-page">
            {/* Header */}
            <div className="qr-code-page__header">
                <div className="qr-code-page__title">
                    <h1>📱 My QR Code</h1>
                    <p>Your personal attendance code - quick and easy check-in!</p>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Main Content */}
            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="qrcode">My QR Code</Tabs.Trigger>
                        <Tabs.Trigger value="history">Attendance History</Tabs.Trigger>
                        <Tabs.Trigger value="stats">QR Stats</Tabs.Trigger>
                    </Tabs.List>

                    {/* QR Code Tab */}
                    <Tabs.Content value="qrcode">
                        <div className="qr-code-page__main">
                            <div className="qr-code-page__qr-section">
                                <div className="qr-code-page__qr-container">
                                    <div className="qr-code-page__qr-header">
                                        <h3>🦁 {user?.first_name} {user?.last_name}</h3>
                                        <p>Player ID: {user?.id}</p>
                                        {user?.position && (
                                            <span className="qr-code-page__position">
                                                {user.position}
                                            </span>
                                        )}
                                    </div>

                                    <div className="qr-code-page__qr-display" ref={qrRef}>
                                        {qrData.qrCode ? (
                                            <div 
                                                className="qr-code-page__qr-code"
                                                dangerouslySetInnerHTML={{ __html: qrData.qrCode }}
                                            />
                                        ) : (
                                            <div className="qr-code-page__qr-placeholder">
                                                <div className="qr-code-page__qr-loading">
                                                    <LoadingSpinner />
                                                    <p>Generating QR code...</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="qr-code-page__qr-info">
                                        <p className="qr-code-page__qr-subtitle">
                                            Show this code to your coach for quick attendance
                                        </p>
                                        <div className="qr-code-page__qr-timestamp">
                                            Last updated: {new Date().toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="qr-code-page__qr-actions">
                                        <Button 
                                            onClick={downloadQRCode}
                                            variant="primary"
                                            disabled={!qrData.qrCode}
                                        >
                                            📥 Download
                                        </Button>
                                        <Button 
                                            onClick={printQRCode}
                                            variant="secondary"
                                            disabled={!qrData.qrCode}
                                        >
                                            🖨️ Print
                                        </Button>
                                        <Button 
                                            onClick={refreshQRCode}
                                            variant="ghost"
                                        >
                                            🔄 Refresh
                                        </Button>
                                        <Button 
                                            onClick={() => setShowInstructions(!showInstructions)}
                                            variant="ghost"
                                        >
                                            ❓ Help
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            {showInstructions && (
                                <div className="qr-code-page__instructions">
                                    <Card>
                                        <Card.Header>
                                            <h3>📋 How to Use Your QR Code</h3>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="qr-code-page__instructions-grid">
                                                <div className="qr-code-page__instruction-step">
                                                    <div className="qr-code-page__step-number">1</div>
                                                    <div className="qr-code-page__step-content">
                                                        <h4>Show Your Code</h4>
                                                        <p>Hold your phone or printed code so your coach can scan it easily</p>
                                                    </div>
                                                </div>

                                                <div className="qr-code-page__instruction-step">
                                                    <div className="qr-code-page__step-number">2</div>
                                                    <div className="qr-code-page__step-content">
                                                        <h4>Wait for Scan</h4>
                                                        <p>Keep the code steady while your coach scans it with their device</p>
                                                    </div>
                                                </div>

                                                <div className="qr-code-page__instruction-step">
                                                    <div className="qr-code-page__step-number">3</div>
                                                    <div className="qr-code-page__step-content">
                                                        <h4>Get Confirmation</h4>
                                                        <p>You'll hear a beep or see a message confirming your attendance</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="qr-code-page__tips">
                                                <h4>💡 Tips for Best Results:</h4>
                                                <ul>
                                                    <li>Make sure your screen brightness is turned up</li>
                                                    <li>Keep the code clean and uncracked if printed</li>
                                                    <li>Don't let others use your personal QR code</li>
                                                    <li>Download or print a backup copy</li>
                                                    <li>Ask your coach if you have scanning problems</li>
                                                </ul>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Attendance History Tab */}
                    <Tabs.Content value="history">
                        <div className="qr-code-page__section">
                            <h3>📅 QR Attendance History</h3>
                            <p className="qr-code-page__section-subtitle">
                                All the times you've used your QR code for check-in
                            </p>

                            {qrData.attendanceHistory.length > 0 ? (
                                <div className="qr-code-page__history-list">
                                    {qrData.attendanceHistory.map((record, index) => (
                                        <div key={index} className="qr-code-page__history-item">
                                            <div className="qr-code-page__history-icon">
                                                {getAttendanceIcon(record.type)}
                                            </div>
                                            <div className="qr-code-page__history-content">
                                                <h4>{record.event_name}</h4>
                                                <p className="qr-code-page__history-type">
                                                    {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                                                </p>
                                                <p className="qr-code-page__history-date">
                                                    {formatDate(record.checked_in_at)}
                                                </p>
                                                {record.location && (
                                                    <p className="qr-code-page__history-location">
                                                        📍 {record.location}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="qr-code-page__history-status">
                                                <span className={`qr-code-page__status-badge qr-code-page__status-badge--${record.status}`}>
                                                    {record.status === 'on_time' && '✅ On Time'}
                                                    {record.status === 'late' && '⏰ Late'}
                                                    {record.status === 'early' && '🚀 Early'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="qr-code-page__empty-state">
                                    <div className="qr-code-page__empty-icon">📱</div>
                                    <h4>No QR Check-ins Yet</h4>
                                    <p>Start using your QR code for attendance and your history will appear here!</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* QR Stats Tab */}
                    <Tabs.Content value="stats">
                        <div className="qr-code-page__section">
                            <h3>📊 QR Usage Statistics</h3>
                            <p className="qr-code-page__section-subtitle">
                                See how often you use your QR code for attendance
                            </p>

                            <div className="qr-code-page__stats-grid">
                                <div className="qr-code-page__stat-card">
                                    <div className="qr-code-page__stat-icon">📱</div>
                                    <div className="qr-code-page__stat-content">
                                        <h4>Total QR Scans</h4>
                                        <div className="qr-code-page__stat-value">
                                            {qrData.stats.totalScans || 0}
                                        </div>
                                        <p>All-time check-ins</p>
                                    </div>
                                </div>

                                <div className="qr-code-page__stat-card">
                                    <div className="qr-code-page__stat-icon">✅</div>
                                    <div className="qr-code-page__stat-content">
                                        <h4>On-Time Check-ins</h4>
                                        <div className="qr-code-page__stat-value">
                                            {qrData.stats.onTimeScans || 0}
                                        </div>
                                        <p>Punctual arrivals</p>
                                    </div>
                                </div>

                                <div className="qr-code-page__stat-card">
                                    <div className="qr-code-page__stat-icon">🎯</div>
                                    <div className="qr-code-page__stat-content">
                                        <h4>Attendance Rate</h4>
                                        <div className="qr-code-page__stat-value">
                                            {qrData.stats.attendanceRate || 0}%
                                        </div>
                                        <p>Via QR check-in</p>
                                    </div>
                                </div>

                                <div className="qr-code-page__stat-card">
                                    <div className="qr-code-page__stat-icon">📅</div>
                                    <div className="qr-code-page__stat-content">
                                        <h4>This Month</h4>
                                        <div className="qr-code-page__stat-value">
                                            {qrData.stats.monthlyScans || 0}
                                        </div>
                                        <p>QR check-ins</p>
                                    </div>
                                </div>

                                <div className="qr-code-page__stat-card">
                                    <div className="qr-code-page__stat-icon">🏃</div>
                                    <div className="qr-code-page__stat-content">
                                        <h4>Training Sessions</h4>
                                        <div className="qr-code-page__stat-value">
                                            {qrData.stats.trainingScans || 0}
                                        </div>
                                        <p>QR check-ins</p>
                                    </div>
                                </div>

                                <div className="qr-code-page__stat-card">
                                    <div className="qr-code-page__stat-icon">⚽</div>
                                    <div className="qr-code-page__stat-content">
                                        <h4>Matches</h4>
                                        <div className="qr-code-page__stat-value">
                                            {qrData.stats.matchScans || 0}
                                        </div>
                                        <p>QR check-ins</p>
                                    </div>
                                </div>
                            </div>

                            {qrData.stats.totalScans > 0 && (
                                <div className="qr-code-page__achievements">
                                    <h4>🏆 QR Achievements</h4>
                                    <div className="qr-code-page__achievements-list">
                                        {qrData.stats.totalScans >= 10 && (
                                            <div className="qr-code-page__achievement">
                                                <span className="qr-code-page__achievement-icon">🥉</span>
                                                <span className="qr-code-page__achievement-name">QR Rookie</span>
                                                <span className="qr-code-page__achievement-desc">10 QR check-ins</span>
                                            </div>
                                        )}
                                        {qrData.stats.totalScans >= 25 && (
                                            <div className="qr-code-page__achievement">
                                                <span className="qr-code-page__achievement-icon">🥈</span>
                                                <span className="qr-code-page__achievement-name">QR Pro</span>
                                                <span className="qr-code-page__achievement-desc">25 QR check-ins</span>
                                            </div>
                                        )}
                                        {qrData.stats.totalScans >= 50 && (
                                            <div className="qr-code-page__achievement">
                                                <span className="qr-code-page__achievement-icon">🥇</span>
                                                <span className="qr-code-page__achievement-name">QR Master</span>
                                                <span className="qr-code-page__achievement-desc">50 QR check-ins</span>
                                            </div>
                                        )}
                                        {qrData.stats.attendanceRate >= 90 && (
                                            <div className="qr-code-page__achievement">
                                                <span className="qr-code-page__achievement-icon">🎯</span>
                                                <span className="qr-code-page__achievement-name">Perfect Attendance</span>
                                                <span className="qr-code-page__achievement-desc">90%+ attendance rate</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>
        </div>
    );
};

export default QRCode;