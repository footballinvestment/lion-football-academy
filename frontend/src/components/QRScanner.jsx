import React, { useState, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';

const QRScanner = ({ 
  onResult, 
  onError,
  showResult = true,
  constraints = { facingMode: 'environment' }
}) => {
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  const handleResult = useCallback((result, error) => {
    if (result) {
      const scannedText = result?.text;
      setResult(scannedText);
      setError('');
      
      // Callback hívása ha van
      if (onResult) {
        onResult(scannedText);
      }
      
      console.log('QR Scanned:', scannedText);
    }

    if (error) {
      const errorMessage = error?.message || 'QR szkennelési hiba';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      console.error('QR Error:', errorMessage);
    }
  }, [onResult, onError]);

  const resetScanner = () => {
    setResult('');
    setError('');
    setIsScanning(true);
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header text-center mb-3">
        <h4>📱 QR Kód Szkenner</h4>
        <div className="btn-group">
          <button 
            className={`btn ${isScanning ? 'btn-danger' : 'btn-success'}`}
            onClick={toggleScanning}
          >
            {isScanning ? '⏸️ Stop' : '▶️ Start'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={resetScanner}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="scanner-wrapper" style={{
          maxWidth: '400px',
          margin: '0 auto',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}>
          <QrReader
            onResult={handleResult}
            style={{ width: '100%' }}
            constraints={constraints}
            scanDelay={300}
          />
        </div>
      )}

      {/* Eredmények megjelenítése */}
      {showResult && (
        <div className="results-section mt-4">
          {result && (
            <div className="alert alert-success">
              <h6>✅ Sikeres szkennelés:</h6>
              <code>{result}</code>
            </div>
          )}
          
          {error && (
            <div className="alert alert-warning">
              <h6>⚠️ Figyelmeztetés:</h6>
              <small>{error}</small>
            </div>
          )}
        </div>
      )}

      {/* Használati útmutató */}
      <div className="instructions mt-3">
        <small className="text-muted">
          💡 <strong>Tipp:</strong> Tartsd a QR kódot a kamera előtt 10-30 cm távolságra
        </small>
      </div>
    </div>
  );
};

export default QRScanner;