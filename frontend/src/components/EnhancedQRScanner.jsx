import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserQRCodeReader, NotFoundException } from '@zxing/library';
import { hapticsForAction } from '../utils/haptics';
import { useGestures } from '../hooks/useGestures';
import './EnhancedQRScanner.css';

const EnhancedQRScanner = ({
  onScanSuccess,
  onScanError,
  onCameraError,
  className = '',
  width = '100%',
  height = '400px',
  showOverlay = true,
  showTorch = true,
  autoStart = true,
  scanDelay = 100,
  preferredCamera = 'environment', // 'user' for front camera, 'environment' for back camera
  constraints = {},
  ...props
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanHistory, setScanHistory] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimeoutRef = useRef(null);

  // Initialize QR code reader
  useEffect(() => {
    codeReaderRef.current = new BrowserQRCodeReader();
    return () => {
      stopScanning();
    };
  }, []);

  // Check camera support and permissions
  useEffect(() => {
    checkCameraSupport();
  }, []);

  // Auto-start scanning if enabled
  useEffect(() => {
    if (autoStart && isCameraReady && !isScanning) {
      startScanning();
    }
  }, [autoStart, isCameraReady, isScanning]);

  // Setup gesture handling for zoom
  const gestureRef = useGestures({
    onPinch: ({ scale }) => {
      const newZoom = Math.max(1, Math.min(3, zoomLevel * scale));
      setZoomLevel(newZoom);
      applyZoom(newZoom);
    },
    onDoubleTap: () => {
      // Toggle between 1x and 2x zoom
      const newZoom = zoomLevel === 1 ? 2 : 1;
      setZoomLevel(newZoom);
      applyZoom(newZoom);
      hapticsForAction.inputFocus();
    }
  });

  const checkCameraSupport = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        setError('Camera access not supported in this browser');
        return;
      }

      // Check camera permission
      const permissionResult = await navigator.permissions.query({ name: 'camera' });
      setPermissionStatus(permissionResult.state);

      // Get available camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Select preferred camera
      const preferredDevice = videoDevices.find(device => 
        device.label.toLowerCase().includes(preferredCamera)
      ) || videoDevices[0];

      if (preferredDevice) {
        setSelectedDevice(preferredDevice);
        setIsCameraReady(true);
      } else {
        setError('No camera devices found');
      }
    } catch (err) {
      console.error('Camera support check failed:', err);
      setError('Failed to check camera support');
      setIsSupported(false);
    }
  };

  const startScanning = async () => {
    if (!selectedDevice || isScanning) return;

    try {
      setError(null);
      setIsScanning(true);

      // Setup camera constraints
      const videoConstraints = {
        deviceId: selectedDevice.deviceId,
        facingMode: preferredCamera,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...constraints
      };

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      streamRef.current = stream;

      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Start QR code detection
        startQRDetection();
        
        hapticsForAction.qrScanFocus();
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError(getCameraErrorMessage(err));
      setIsScanning(false);
      
      if (onCameraError) {
        onCameraError(err);
      }
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear scan timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const startQRDetection = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const detect = async () => {
      try {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');

        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Decode QR code
        const result = await codeReaderRef.current.decodeFromImageData(imageData);
        
        if (result) {
          handleScanSuccess(result.getText());
        }
      } catch (err) {
        // Ignore NotFoundException - means no QR code found
        if (!(err instanceof NotFoundException)) {
          console.error('QR detection error:', err);
        }
      }

      // Continue scanning if still active
      if (isScanning) {
        scanTimeoutRef.current = setTimeout(detect, scanDelay);
      }
    };

    // Start detection loop
    detect();
  };

  const handleScanSuccess = (data) => {
    const now = Date.now();
    
    // Prevent duplicate scans within 1 second
    if (now - lastScanTime < 1000) return;
    
    setLastScanTime(now);
    setScanHistory(prev => [{ data, timestamp: now }, ...prev.slice(0, 9)]);
    
    hapticsForAction.qrScanSuccess();
    
    if (onScanSuccess) {
      onScanSuccess(data);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled }]
        });
        setTorchEnabled(!torchEnabled);
        hapticsForAction.buttonPress();
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  const switchCamera = async () => {
    if (devices.length < 2) return;

    const currentIndex = devices.findIndex(device => device.deviceId === selectedDevice?.deviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    setSelectedDevice(nextDevice);
    
    if (isScanning) {
      stopScanning();
      // Restart with new device after a short delay
      setTimeout(() => {
        startScanning();
      }, 100);
    }
    
    hapticsForAction.buttonPress();
  };

  const applyZoom = (zoom) => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.zoom) {
        track.applyConstraints({
          advanced: [{ zoom }]
        });
      }
    } catch (err) {
      console.error('Failed to apply zoom:', err);
    }
  };

  const getCameraErrorMessage = (error) => {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera permission denied. Please allow camera access and try again.';
      case 'NotFoundError':
        return 'No camera found. Please connect a camera and try again.';
      case 'NotReadableError':
        return 'Camera is already in use by another application.';
      case 'OverconstrainedError':
        return 'Camera does not meet the required constraints.';
      case 'SecurityError':
        return 'Camera access blocked due to security restrictions.';
      default:
        return `Camera error: ${error.message || 'Unknown error'}`;
    }
  };

  if (!isSupported) {
    return (
      <div className={`qr-scanner-error ${className}`}>
        <div className="error-content">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3>Camera Not Supported</h3>
          <p>Your browser doesn't support camera access for QR scanning.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={gestureRef}
      className={`enhanced-qr-scanner ${className}`}
      style={{ width, height }}
      {...props}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="qr-video"
        playsInline
        muted
        style={{ transform: `scale(${zoomLevel})` }}
      />

      {/* Hidden canvas for QR detection */}
      <canvas ref={canvasRef} className="qr-canvas" />

      {/* Scanning overlay */}
      {showOverlay && (
        <div className="qr-overlay">
          <div className="qr-viewfinder">
            <div className="qr-corner qr-corner--top-left" />
            <div className="qr-corner qr-corner--top-right" />
            <div className="qr-corner qr-corner--bottom-left" />
            <div className="qr-corner qr-corner--bottom-right" />
            <div className="qr-scanning-line" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="qr-controls">
        {/* Torch button */}
        {showTorch && (
          <button
            className={`qr-control-btn qr-torch-btn ${torchEnabled ? 'active' : ''}`}
            onClick={toggleTorch}
            aria-label={torchEnabled ? 'Turn off flashlight' : 'Turn on flashlight'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        )}

        {/* Camera switch button */}
        {devices.length > 1 && (
          <button
            className="qr-control-btn qr-switch-btn"
            onClick={switchCamera}
            aria-label="Switch camera"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* Zoom indicator */}
        {zoomLevel > 1 && (
          <div className="qr-zoom-indicator">
            {zoomLevel.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Start/Stop button */}
      <div className="qr-action-controls">
        <button
          className={`qr-action-btn ${isScanning ? 'scanning' : ''}`}
          onClick={isScanning ? stopScanning : startScanning}
          disabled={!isCameraReady}
        >
          {isScanning ? (
            <>
              <div className="scanning-pulse" />
              Stop Scanning
            </>
          ) : (
            'Start Scanning'
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="qr-error">
          <div className="error-content">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="qr-instructions">
        <p>Position QR code within the frame to scan</p>
        <p>Double-tap to zoom • Pinch to zoom • Tap torch for light</p>
      </div>

      {/* Permission prompt */}
      {permissionStatus === 'denied' && (
        <div className="qr-permission-prompt">
          <div className="permission-content">
            <h3>Camera Permission Required</h3>
            <p>Please allow camera access to scan QR codes for attendance tracking.</p>
            <button onClick={checkCameraSupport}>Request Permission</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedQRScanner;