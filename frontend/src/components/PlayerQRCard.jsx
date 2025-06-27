import React, { useState } from 'react';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';

const PlayerQRCard = ({ player }) => {
  const [activeTab, setActiveTab] = useState('generate');
  
  const playerQRValue = `academy://player/${player.id}?name=${encodeURIComponent(player.name)}`;
  
  const handleAttendanceCheck = (scannedValue) => {
    console.log('Jelenlét rögzítve:', scannedValue);
    // Itt implementálhatod a jelenlét rögzítését
    alert(`Jelenlét rögzítve: ${player.name}`);
  };

  return (
    <div className="player-qr-card">
      <div className="card">
        <div className="card-header">
          <h5>⚽ {player.name} - QR Kód Kezelés</h5>
          
          {/* Tab gombok */}
          <div className="btn-group w-100 mt-2">
            <button 
              className={`btn ${activeTab === 'generate' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('generate')}
            >
              📱 QR Generálás
            </button>
            <button 
              className={`btn ${activeTab === 'scan' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('scan')}
            >
              📷 QR Szkennelés
            </button>
          </div>
        </div>
        
        <div className="card-body">
          {activeTab === 'generate' && (
            <QRGenerator
              value={playerQRValue}
              title={`${player.name} QR Kódja`}
              description={`Pozíció: ${player.position || 'N/A'} | Csapat: ${player.team || 'N/A'}`}
              size={180}
            />
          )}
          
          {activeTab === 'scan' && (
            <QRScanner
              onResult={handleAttendanceCheck}
              onError={(error) => console.error('Scanner error:', error)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerQRCard;