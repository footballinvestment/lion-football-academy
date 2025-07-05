import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, LoadingSpinner, Alert } from '../ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { validateScanResult } from '../../utils/qrGenerator';
import './QRScanner.css';

const QRScanner = ({
    sessionId = null,
    sessionType = 'training',
    location = '',
    onScanSuccess = null,
    onScanError = null,
    className = ''
}) => {
    const { user } = useAuth();
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [scanHistory, setScanHistory] = useState([]);
    const [manualInput, setManualInput] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);

    useEffect(() => {
        checkCameraAvailability();
        
        return () => {
            stopScanning();
        };
    }, []);

    const checkCameraAvailability = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideoInput = devices.some(device => device.kind === 'videoinput');
            setHasCamera(hasVideoInput);
        } catch (error) {
            console.error('Error checking camera availability:', error);
            setHasCamera(false);
        }
    };

    const startScanning = async () => {
        try {
            setError('');
            setIsScanning(true);

            // Get camera stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();

                // Start scanning loop
                scanIntervalRef.current = setInterval(scanQRCode, 500);
            }
        } catch (error) {
            console.error('Error starting camera:', error);
            setError('Unable to access camera. Please check permissions and try again.');
            setIsScanning(false);
        }
    };

    const stopScanning = () => {
        setIsScanning(false);
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const scanQRCode = async () => {
        if (!videoRef.current || !canvasRef.current || !isScanning) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Try to decode QR code using imageData
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            try {
                // Use a QR code library like jsQR if available
                if (window.jsQR) {
                    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'dontInvert',
                    });

                    if (code) {
                        await processQRScan(code.data);
                    }
                }
            } catch (error) {
                console.error('QR scanning error:', error);
            }
        }
    };

    const processQRScan = async (qrData) => {
        try {
            stopScanning();
            setLoading(true);
            setError('');

            // Validate QR code format
            const validation = validateScanResult(qrData, sessionId);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            // Send scan request to backend
            const response = await api.post('/qr/scan', {
                qrData,
                sessionId,
                location: location || undefined
            });

            if (response.data.success) {
                const { attendance, player } = response.data;
                
                setSuccess(`✅ ${player.name} checked in successfully!`);
                
                // Add to scan history
                setScanHistory(prev => [{
                    id: Date.now(),
                    player: player.name,
                    team: player.team,
                    time: new Date().toLocaleTimeString(),
                    status: 'success'
                }, ...prev.slice(0, 9)]); // Keep last 10 scans
                
                if (onScanSuccess) {
                    onScanSuccess(attendance, player);
                }

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000);
                
                // Auto-restart scanning after 2 seconds
                setTimeout(() => {
                    if (hasCamera) {
                        startScanning();
                    }
                }, 2000);
            } else {
                throw new Error(response.data.error || 'Scan failed');
            }
        } catch (error) {
            console.error('Error processing QR scan:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to process scan';
            setError(errorMessage);
            
            // Add to scan history
            setScanHistory(prev => [{
                id: Date.now(),
                player: 'Unknown',
                team: '',
                time: new Date().toLocaleTimeString(),
                status: 'error',
                error: errorMessage
            }, ...prev.slice(0, 9)]);
            
            if (onScanError) {
                onScanError(error);
            }

            // Auto-restart scanning after error
            setTimeout(() => {
                if (hasCamera) {
                    startScanning();
                }
            }, 2000);
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        
        await processQRScan(manualInput.trim());
        setManualInput('');
        setShowManualInput(false);
    };

    const clearHistory = () => {
        setScanHistory([]);
    };

    return (
        <Card className={`qr-scanner ${className}`}>
            <div className="qr-scanner-header">
                <h3>📱 QR Code Scanner</h3>
                <div className="scanner-status">
                    {isScanning && <span className="status-scanning">🔴 Scanning...</span>}
                    {!isScanning && hasCamera && <span className="status-ready">🟢 Ready</span>}
                    {!hasCamera && <span className="status-no-camera">🟡 No Camera</span>}
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert type="success" onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <div className="qr-scanner-content">
                {hasCamera && (
                    <div className="camera-section">
                        <div className="camera-container">
                            <video
                                ref={videoRef}
                                className="camera-video"
                                autoPlay
                                playsInline
                                muted
                            />
                            <canvas
                                ref={canvasRef}
                                className="camera-canvas"
                                style={{ display: 'none' }}
                            />
                            
                            {isScanning && (
                                <div className="scanner-overlay">
                                    <div className="scanner-frame">
                                        <div className="scanner-corner tl"></div>
                                        <div className="scanner-corner tr"></div>
                                        <div className="scanner-corner bl"></div>
                                        <div className="scanner-corner br"></div>
                                        <div className="scanner-line"></div>
                                    </div>
                                    <p className="scanner-instruction">
                                        Position QR code within the frame
                                    </p>
                                </div>
                            )}
                            
                            {loading && (
                                <div className="scanner-processing">
                                    <LoadingSpinner size="large" />
                                    <p>Processing...</p>
                                </div>
                            )}
                        </div>

                        <div className="camera-controls">
                            {!isScanning ? (
                                <Button 
                                    onClick={startScanning}
                                    variant="primary"
                                    size="lg"
                                    disabled={loading}
                                >
                                    📷 Start Scanning
                                </Button>
                            ) : (
                                <Button 
                                    onClick={stopScanning}
                                    variant="secondary"
                                    size="lg"
                                >
                                    ⏹️ Stop Scanning
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {!hasCamera && (
                    <div className="no-camera-section">
                        <div className="no-camera-message">
                            <h4>📷 Camera Not Available</h4>
                            <p>Camera access is required for QR code scanning. Please check your device permissions or use manual input below.</p>
                        </div>
                    </div>
                )}

                <div className="manual-input-section">
                    <Button
                        onClick={() => setShowManualInput(!showManualInput)}
                        variant="outline"
                        size="sm"
                    >
                        ✏️ Manual Input
                    </Button>

                    {showManualInput && (
                        <form onSubmit={handleManualSubmit} className="manual-input-form">
                            <div className="input-group">
                                <textarea
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    placeholder="Paste QR code data here..."
                                    rows={3}
                                    className="manual-input-textarea"
                                />
                            </div>
                            <div className="input-actions">
                                <Button type="submit" variant="primary" size="sm" disabled={!manualInput.trim() || loading}>
                                    Process QR Data
                                </Button>
                                <Button 
                                    type="button" 
                                    onClick={() => {
                                        setManualInput('');
                                        setShowManualInput(false);
                                    }}
                                    variant="ghost" 
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {scanHistory.length > 0 && (
                    <div className="scan-history">
                        <div className="history-header">
                            <h4>📋 Recent Scans</h4>
                            <Button onClick={clearHistory} variant="ghost" size="xs">
                                Clear
                            </Button>
                        </div>
                        <div className="history-list">
                            {scanHistory.map(scan => (
                                <div key={scan.id} className={`history-item ${scan.status}`}>
                                    <div className="history-info">
                                        <span className="player-name">{scan.player}</span>
                                        {scan.team && <span className="team-name">{scan.team}</span>}
                                        <span className="scan-time">{scan.time}</span>
                                    </div>
                                    <div className="history-status">
                                        {scan.status === 'success' ? (
                                            <span className="status-success">✅</span>
                                        ) : (
                                            <span className="status-error" title={scan.error}>❌</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="qr-scanner-info">
                <small>
                    {sessionId && `Session ID: ${sessionId}`}
                    {sessionType && ` | Type: ${sessionType}`}
                    {location && ` | Location: ${location}`}
                </small>
            </div>
        </Card>
    );
};

export default QRScanner;