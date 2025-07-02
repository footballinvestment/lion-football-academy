import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import api from '../services/api';

const QRGenerator = ({ trainingId, onGenerated, onError }) => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trainingInfo, setTrainingInfo] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  const generateQRCode = async () => {
    if (!trainingId) {
      setError('Training ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/qr/trainings/${trainingId}/qr-code`);
      
      // Extract the QR code data from the response
      // The old implementation returned a base64 image, but we need the raw data
      const qrData = response.data.qr_data || response.data.qr_code || `training://${trainingId}`;
      setQrCodeData(qrData);
      setTrainingInfo(response.data.training);
      setExpiresAt(new Date(response.data.expires_at));

      if (onGenerated) {
        onGenerated({
          ...response.data,
          qr_data: qrData
        });
      }

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate QR code';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trainingId) {
      generateQRCode();
    }
  }, [trainingId]);

  const handleRefresh = () => {
    generateQRCode();
  };

  const handleDownload = () => {
    if (!qrCodeData) return;

    const svg = document.getElementById("training-qr-code-svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `training-${trainingId}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (!trainingId) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Please select a training to generate QR code
      </div>
    );
  }

  return (
    <div className="qr-generator">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-qrcode me-2"></i>
            Training Check-in QR Code
          </h5>
          <div>
            <button 
              className="btn btn-outline-primary btn-sm me-2"
              onClick={handleRefresh}
              disabled={loading}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-1`}></i>
              Refresh
            </button>
            {qrCodeData && (
              <button 
                className="btn btn-success btn-sm"
                onClick={handleDownload}
              >
                <i className="fas fa-download me-1"></i>
                Download
              </button>
            )}
          </div>
        </div>

        <div className="card-body text-center">
          {loading && (
            <div className="py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Generating QR code...</span>
              </div>
              <p className="mt-2 text-muted">Generating QR code...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
              <div className="mt-2">
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleRefresh}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {qrCodeData && !loading && (
            <div>
              <div className="qr-code-container mb-3">
                <div style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '8px',
                  display: 'inline-block',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <QRCode
                    id="training-qr-code-svg"
                    size={250}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={qrCodeData}
                    viewBox={`0 0 256 256`}
                  />
                </div>
              </div>

              {trainingInfo && (
                <div className="training-info">
                  <h6 className="text-primary">{trainingInfo.team_name}</h6>
                  <p className="mb-2">
                    <i className="fas fa-calendar me-2"></i>
                    {trainingInfo.date} at {trainingInfo.time}
                  </p>
                  {trainingInfo.location && (
                    <p className="mb-2">
                      <i className="fas fa-map-marker-alt me-2"></i>
                      {trainingInfo.location}
                    </p>
                  )}
                </div>
              )}

              {expiresAt && (
                <div className="expiry-info mt-3">
                  <small className="text-muted">
                    <i className="fas fa-clock me-1"></i>
                    Expires: {expiresAt.toLocaleString()}
                  </small>
                </div>
              )}

              <div className="instructions mt-3">
                <div className="alert alert-info">
                  <h6>
                    <i className="fas fa-info-circle me-2"></i>
                    Instructions
                  </h6>
                  <ul className="mb-0 text-start">
                    <li>Players can scan this QR code 30 minutes before training</li>
                    <li>Check-in window closes 15 minutes after training starts</li>
                    <li>Each player can only check in once per training</li>
                    <li>QR code is valid for 24 hours</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .qr-generator {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .training-info {
          border-top: 1px solid #dee2e6;
          padding-top: 15px;
        }
        
        .instructions ul {
          font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
          .qr-generator {
            margin: 0 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default QRGenerator;