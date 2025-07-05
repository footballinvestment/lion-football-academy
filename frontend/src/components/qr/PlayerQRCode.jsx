import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, LoadingSpinner, Alert } from '../ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
    generateQRCodeDataURL,
    downloadQRCodeImage,
    downloadQRCodePDF,
    calculateQRSize,
    QR_CODE_TYPES,
    QR_FORMATS
} from '../../utils/qrGenerator';
import './PlayerQRCode.css';

const PlayerQRCode = ({ 
    playerId = null, 
    sessionId = null, 
    sessionType = QR_CODE_TYPES.ATTENDANCE,
    size = 'medium',
    showDownloadOptions = true,
    showInstructions = true,
    onGenerate = null,
    className = ''
}) => {
    const { user } = useAuth();
    const [qrData, setQrData] = useState(null);
    const [qrImageUrl, setQrImageUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [playerInfo, setPlayerInfo] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);
    const qrContainerRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    const currentPlayerId = playerId || user?.id;

    // QR code size mapping
    const sizeMap = {
        small: 150,
        medium: 200,
        large: 300,
        xlarge: 400
    };

    const qrSize = sizeMap[size] || sizeMap.medium;

    useEffect(() => {
        if (currentPlayerId) {
            generateQRCode();
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [currentPlayerId, sessionId, sessionType]);

    useEffect(() => {
        if (qrData && qrData.expiresAt) {
            updateCountdown();
            countdownIntervalRef.current = setInterval(updateCountdown, 1000);
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [qrData]);

    const updateCountdown = () => {
        if (!qrData?.expiresAt) return;

        const now = Date.now();
        const expiresAt = new Date(qrData.expiresAt).getTime();
        const remaining = Math.max(0, expiresAt - now);
        
        setCountdown(Math.floor(remaining / 1000));

        // Auto-regenerate when expired
        if (remaining <= 0) {
            generateQRCode();
        }
    };

    const generateQRCode = async () => {
        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams();
            if (sessionId) params.append('sessionId', sessionId);
            if (sessionType) params.append('sessionType', sessionType);

            const response = await api.get(`/qr/generate/${currentPlayerId}?${params}`);
            
            if (response.data.success) {
                const { qrCode, player, session } = response.data;
                
                // Generate QR code image
                const result = await generateQRCodeDataURL(qrCode.data, {
                    width: qrSize,
                    color: {
                        dark: '#2c5530',
                        light: '#FFFFFF'
                    }
                });

                if (result.success) {
                    setQrData(qrCode);
                    setQrImageUrl(result.dataURL);
                    setPlayerInfo(player);
                    setSessionInfo(session);

                    if (onGenerate) {
                        onGenerate(qrCode, player, session);
                    }
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Failed to generate QR code');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            setError(error.response?.data?.error || error.message || 'Failed to generate QR code');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadImage = async (format = 'png') => {
        if (!qrData || !playerInfo) return;

        try {
            const filename = `QR_${playerInfo.name.replace(/\s+/g, '_')}_${Date.now()}`;
            const result = await downloadQRCodeImage(qrData.data, filename, format);
            
            if (!result.success) {
                setError(result.error);
            }
        } catch (error) {
            console.error('Error downloading QR image:', error);
            setError('Failed to download QR code');
        }
    };

    const handleDownloadPDF = async () => {
        if (!qrData || !playerInfo) return;

        try {
            const result = await downloadQRCodePDF(qrData.data, playerInfo, sessionInfo);
            
            if (!result.success) {
                setError(result.error);
            }
        } catch (error) {
            console.error('Error downloading QR PDF:', error);
            setError('Failed to download PDF');
        }
    };

    const formatCountdown = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getCountdownColor = () => {
        if (countdown > 300) return 'text-green-600'; // > 5 minutes
        if (countdown > 120) return 'text-yellow-600'; // > 2 minutes
        return 'text-red-600'; // < 2 minutes
    };

    const copyQRData = async () => {
        if (!qrData?.data) return;

        try {
            await navigator.clipboard.writeText(qrData.data);
            // You could add a toast notification here
        } catch (error) {
            console.error('Failed to copy QR data:', error);
        }
    };

    if (loading && !qrImageUrl) {
        return (
            <Card className={`qr-code-card ${className}`}>
                <div className="qr-code-loading">
                    <LoadingSpinner size="large" />
                    <p>Generating QR code...</p>
                </div>
            </Card>
        );
    }

    if (error && !qrImageUrl) {
        return (
            <Card className={`qr-code-card ${className}`}>
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
                <div className="qr-code-retry">
                    <Button onClick={generateQRCode} variant="primary">
                        Retry
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`qr-code-card ${className}`}>
            <div className="qr-code-header">
                <h3>🎫 Your Attendance QR Code</h3>
                {countdown > 0 && (
                    <div className={`qr-code-countdown ${getCountdownColor()}`}>
                        ⏱️ Expires in: {formatCountdown(countdown)}
                    </div>
                )}
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <div className="qr-code-content">
                <div className="qr-code-display" ref={qrContainerRef}>
                    {qrImageUrl ? (
                        <div className="qr-code-image-container">
                            <img 
                                src={qrImageUrl} 
                                alt="Attendance QR Code"
                                className="qr-code-image"
                                style={{ width: qrSize, height: qrSize }}
                            />
                            {countdown <= 0 && (
                                <div className="qr-code-expired-overlay">
                                    <span>Expired</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="qr-code-placeholder" style={{ width: qrSize, height: qrSize }}>
                            <span>No QR Code</span>
                        </div>
                    )}
                </div>

                {playerInfo && (
                    <div className="qr-code-info">
                        <div className="player-info">
                            <h4>{playerInfo.name}</h4>
                            <p>{playerInfo.team}</p>
                        </div>
                        
                        {sessionInfo && (
                            <div className="session-info">
                                <p><strong>Session:</strong> {sessionInfo.name}</p>
                                <p><strong>Date:</strong> {new Date(sessionInfo.date).toLocaleDateString()}</p>
                                <p><strong>Type:</strong> {sessionInfo.type}</p>
                                {sessionInfo.location && (
                                    <p><strong>Location:</strong> {sessionInfo.location}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {showInstructions && (
                    <div className="qr-code-instructions">
                        <h5>📋 Instructions:</h5>
                        <ol>
                            <li>Show this QR code to your coach during attendance check</li>
                            <li>Keep your device screen bright and steady</li>
                            <li>Don't share this QR code with other players</li>
                            <li>QR code expires in 30 minutes for security</li>
                        </ol>
                    </div>
                )}
            </div>

            <div className="qr-code-actions">
                <div className="qr-code-main-actions">
                    <Button 
                        onClick={generateQRCode} 
                        variant="primary"
                        size="sm"
                        disabled={loading}
                    >
                        {loading ? <LoadingSpinner size="xs" /> : '🔄'} Refresh
                    </Button>
                    
                    {qrData?.data && (
                        <Button 
                            onClick={copyQRData}
                            variant="ghost"
                            size="sm"
                        >
                            📋 Copy Data
                        </Button>
                    )}
                </div>

                {showDownloadOptions && qrData && (
                    <div className="qr-code-download-options">
                        <h6>Download Options:</h6>
                        <div className="download-buttons">
                            <Button 
                                onClick={() => handleDownloadImage('png')}
                                variant="outline"
                                size="xs"
                            >
                                PNG
                            </Button>
                            <Button 
                                onClick={() => handleDownloadImage('jpg')}
                                variant="outline"
                                size="xs"
                            >
                                JPG
                            </Button>
                            <Button 
                                onClick={handleDownloadPDF}
                                variant="outline"
                                size="xs"
                            >
                                📄 PDF
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {qrData && (
                <div className="qr-code-metadata">
                    <small>
                        Generated: {new Date(qrData.timestamp).toLocaleString()} | 
                        ID: {qrData.id} | 
                        Type: {qrData.sessionType}
                    </small>
                </div>
            )}
        </Card>
    );
};

export default PlayerQRCode;