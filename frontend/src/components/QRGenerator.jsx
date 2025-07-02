import React from 'react';
import QRCode from 'react-qr-code';

const QRGenerator = ({ 
  value, 
  size = 200, 
  title = "QR Kód",
  description = "",
  showDownload = true 
}) => {
  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
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
      downloadLink.download = `${title}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="qr-generator-container text-center p-4">
      <h4>{title}</h4>
      {description && <p className="text-muted mb-3">{description}</p>}
      
      <div className="qr-code-wrapper" style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '10px',
        display: 'inline-block',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <QRCode
          id="qr-code-svg"
          size={size}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          value={value}
          viewBox={`0 0 256 256`}
        />
      </div>
      
      <div className="mt-3">
        <small className="text-muted d-block">Érték: {value}</small>
        {showDownload && (
          <button 
            className="btn btn-primary btn-sm mt-2"
            onClick={downloadQR}
          >
            💾 QR Kód Letöltése
          </button>
        )}
      </div>
    </div>
  );
};

export default QRGenerator;