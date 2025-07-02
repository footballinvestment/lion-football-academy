import React, { useState, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';
import api from '../services/api';

const QRScanner = ({ onScanSuccess, onScanError, playerId }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const handleResult = useCallback(async (result, scanError) => {
    if (result) {
      const qrData = result?.text;
      
      try {
        setError(null);
        setScanResult('Processing...');

        // Stop the scanner
        setIsScanning(false);

        // Process the check-in
        const response = await api.post('/qr/trainings/check-in', {
          qr_data: qrData,
          player_id: playerId
        });

        setScanResult(`✅ ${response.data.message}`);
        if (onScanSuccess) {
          onScanSuccess(response.data);
        }

      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Check-in failed';
        setError(errorMessage);
        setScanResult(null);
        if (onScanError) {
          onScanError(errorMessage);
        }
      }
    }

    if (scanError) {
      // Ignore most scanning errors as they're expected during scanning
      // Only log to console for debugging
      console.debug('QR Scanner Error:', scanError);
    }
  }, [onScanSuccess, onScanError, playerId]);

  const handleStartScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setError(null);
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  if (!playerId) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Please select a player to enable QR scanning
      </div>
    );
  }

  return (
    <div className="qr-scanner">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-qrcode me-2"></i>
            Training Check-in Scanner
          </h5>
          {isScanning ? (
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleStopScan}
            >
              <i className="fas fa-stop me-1"></i>
              Stop Scanner
            </button>
          ) : (
            <button 
              className="btn btn-primary btn-sm"
              onClick={handleStartScan}
            >
              <i className="fas fa-camera me-1"></i>
              Start Scanner
            </button>
          )}
        </div>
        
        <div className="card-body">
          {!isScanning && !scanResult && !error && (
            <div className="text-center py-4">
              <i className="fas fa-qrcode fa-3x text-muted mb-3"></i>
              <p className="text-muted">
                Tap "Start Scanner" to scan training QR code
              </p>
            </div>
          )}

          {isScanning && (
            <div>
              <div 
                style={{ 
                  width: '100%', 
                  maxWidth: '400px',
                  margin: '0 auto',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <QrReader
                  onResult={handleResult}
                  style={{ width: '100%' }}
                  constraints={{ facingMode: 'environment' }}
                  scanDelay={300}
                />
              </div>
              <div className="mt-3 text-center">
                <small className="text-muted">
                  Position the QR code within the scanning area
                </small>
              </div>
            </div>
          )}

          {scanResult && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle me-2"></i>
              {scanResult}
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
              <div className="mt-2">
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleStartScan}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .qr-scanner {
          max-width: 400px;
          margin: 0 auto;
        }
        
        @media (max-width: 768px) {
          .qr-scanner {
            margin: 0 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;