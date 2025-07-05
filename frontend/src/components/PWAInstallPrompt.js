import React, { useState, useEffect } from 'react';
import { showInstallPrompt, isInstallable, isPWAInstalled, getPWAStatus } from '../utils/pwa';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = ({ 
  showInHeader = false, 
  className = '', 
  variant = 'default' 
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [pwaStatus, setPwaStatus] = useState({
    installed: false,
    installable: false,
    online: true
  });

  useEffect(() => {
    // Check initial PWA status
    updatePWAStatus();

    // Listen for PWA events
    const handleInstallable = () => {
      updatePWAStatus();
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      updatePWAStatus();
      setShowPrompt(false);
    };

    const handleNetworkChange = () => {
      updatePWAStatus();
    };

    window.addEventListener('pwa:installable', handleInstallable);
    window.addEventListener('pwa:installed', handleInstalled);
    window.addEventListener('pwa:online', handleNetworkChange);
    window.addEventListener('pwa:offline', handleNetworkChange);

    return () => {
      window.removeEventListener('pwa:installable', handleInstallable);
      window.removeEventListener('pwa:installed', handleInstalled);
      window.removeEventListener('pwa:online', handleNetworkChange);
      window.removeEventListener('pwa:offline', handleNetworkChange);
    };
  }, []);

  const updatePWAStatus = () => {
    const status = getPWAStatus();
    setPwaStatus(status);
    
    // Show prompt if installable and not installed
    if (status.installable && !status.installed) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  };

  const handleInstall = async () => {
    if (!isInstallable()) {
      console.warn('App is not installable');
      return;
    }

    setIsInstalling(true);

    try {
      const result = await showInstallPrompt();
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Hide for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (pwaStatus.installed || 
      !showPrompt || 
      sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  // Header variant (compact)
  if (showInHeader || variant === 'header') {
    return (
      <div className={`pwa-install-header ${className}`}>
        <div className="pwa-header-content">
          <div className="pwa-header-icon">📱</div>
          <span className="pwa-header-text">Install Lion FA</span>
          <button 
            className="pwa-header-install-btn"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? '⏳' : '⬇️'}
          </button>
          <button 
            className="pwa-header-close-btn"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className={`pwa-install-banner ${className}`}>
        <div className="pwa-banner-content">
          <div className="pwa-banner-info">
            <div className="pwa-banner-icon">🦁</div>
            <div className="pwa-banner-text">
              <h4>Install Lion Football Academy</h4>
              <p>Get quick access and work offline</p>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button 
              className="pwa-banner-install-btn"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
            <button 
              className="pwa-banner-dismiss-btn"
              onClick={handleDismiss}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`pwa-install-card ${className}`}>
      <div className="pwa-card-header">
        <div className="pwa-card-icon">
          <div className="pwa-icon-container">
            <img 
              src="/icons/manifest-icon-192.maskable.png" 
              alt="Lion FA"
              className="pwa-app-icon"
            />
            <div className="pwa-install-badge">📱</div>
          </div>
        </div>
        <div className="pwa-card-title">
          <h3>Install Lion Football Academy</h3>
          <p>Add to your home screen for quick access</p>
        </div>
      </div>

      <div className="pwa-card-features">
        <div className="pwa-feature">
          <span className="pwa-feature-icon">⚡</span>
          <span>Lightning fast access</span>
        </div>
        <div className="pwa-feature">
          <span className="pwa-feature-icon">📴</span>
          <span>Works offline</span>
        </div>
        <div className="pwa-feature">
          <span className="pwa-feature-icon">🔔</span>
          <span>Push notifications</span>
        </div>
        <div className="pwa-feature">
          <span className="pwa-feature-icon">🏠</span>
          <span>Home screen access</span>
        </div>
      </div>

      <div className="pwa-card-actions">
        <button 
          className="pwa-install-btn primary"
          onClick={handleInstall}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <>
              <span className="pwa-loading-spinner"></span>
              Installing...
            </>
          ) : (
            <>
              <span className="pwa-btn-icon">⬇️</span>
              Install App
            </>
          )}
        </button>
        <button 
          className="pwa-dismiss-btn secondary"
          onClick={handleDismiss}
        >
          Maybe later
        </button>
      </div>

      {!pwaStatus.online && (
        <div className="pwa-offline-notice">
          <span className="pwa-offline-icon">📴</span>
          <span>Currently offline - install for better offline experience</span>
        </div>
      )}
    </div>
  );
};

export default PWAInstallPrompt;