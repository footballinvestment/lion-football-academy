import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling device orientation
 * Provides orientation data, lock capabilities, and responsive layout helpers
 */
export const useOrientation = ({
  onOrientationChange,
  lockOrientation = null, // 'portrait' | 'landscape' | null
  enableMotion = false
} = {}) => {
  const [orientation, setOrientation] = useState({
    angle: 0,
    type: 'portrait-primary',
    isPortrait: true,
    isLandscape: false
  });
  
  const [motion, setMotion] = useState({
    alpha: 0, // Z-axis rotation (compass)
    beta: 0,  // X-axis rotation (front-to-back tilt)
    gamma: 0  // Y-axis rotation (left-to-right tilt)
  });
  
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState({
    orientation: false,
    motion: false,
    lock: false
  });

  // Check support for various orientation APIs
  useEffect(() => {
    setIsSupported({
      orientation: 'orientation' in window || 'screen' in window,
      motion: 'DeviceOrientationEvent' in window,
      lock: 'screen' in window && 'orientation' in window.screen && 'lock' in window.screen.orientation
    });
  }, []);

  // Get current orientation
  const getOrientationData = useCallback(() => {
    let angle = 0;
    let type = 'portrait-primary';

    if ('screen' in window && 'orientation' in window.screen) {
      angle = window.screen.orientation.angle;
      type = window.screen.orientation.type;
    } else if ('orientation' in window) {
      angle = window.orientation;
      // Map angle to type
      switch (angle) {
        case 0:
          type = 'portrait-primary';
          break;
        case 90:
          type = 'landscape-primary';
          break;
        case 180:
          type = 'portrait-secondary';
          break;
        case -90:
        case 270:
          type = 'landscape-secondary';
          break;
        default:
          type = 'portrait-primary';
      }
    }

    const isPortrait = type.includes('portrait');
    const isLandscape = type.includes('landscape');

    return { angle, type, isPortrait, isLandscape };
  }, []);

  // Handle orientation change
  const handleOrientationChange = useCallback(() => {
    const newOrientation = getOrientationData();
    setOrientation(newOrientation);
    
    if (onOrientationChange) {
      onOrientationChange(newOrientation);
    }

    // Trigger resize event for responsive components
    window.dispatchEvent(new Event('resize'));
  }, [getOrientationData, onOrientationChange]);

  // Handle device motion
  const handleDeviceMotion = useCallback((event) => {
    if (!enableMotion) return;

    const { alpha, beta, gamma } = event.rotationRate || {};
    const newMotion = {
      alpha: alpha || 0,
      beta: beta || 0,
      gamma: gamma || 0
    };
    
    setMotion(newMotion);
  }, [enableMotion]);

  // Set up event listeners
  useEffect(() => {
    // Initial orientation
    setOrientation(getOrientationData());

    // Orientation change listeners
    const orientationChangeHandler = () => {
      // Use setTimeout to ensure the orientation change has completed
      setTimeout(handleOrientationChange, 100);
    };

    if ('screen' in window && 'orientation' in window.screen) {
      window.screen.orientation.addEventListener('change', orientationChangeHandler);
    } else {
      window.addEventListener('orientationchange', orientationChangeHandler);
    }

    // Device motion listener
    if (enableMotion && isSupported.motion) {
      window.addEventListener('deviceorientation', handleDeviceMotion);
    }

    // Cleanup
    return () => {
      if ('screen' in window && 'orientation' in window.screen) {
        window.screen.orientation.removeEventListener('change', orientationChangeHandler);
      } else {
        window.removeEventListener('orientationchange', orientationChangeHandler);
      }
      
      if (enableMotion && isSupported.motion) {
        window.removeEventListener('deviceorientation', handleDeviceMotion);
      }
    };
  }, [handleOrientationChange, handleDeviceMotion, enableMotion, isSupported, getOrientationData]);

  // Lock orientation
  const lockOrientationTo = useCallback(async (orientationType) => {
    if (!isSupported.lock) {
      console.warn('Screen orientation lock not supported');
      return false;
    }

    try {
      await window.screen.orientation.lock(orientationType);
      setIsLocked(true);
      return true;
    } catch (error) {
      console.error('Failed to lock orientation:', error);
      return false;
    }
  }, [isSupported.lock]);

  // Unlock orientation
  const unlockOrientation = useCallback(() => {
    if (!isSupported.lock) {
      console.warn('Screen orientation lock not supported');
      return false;
    }

    try {
      window.screen.orientation.unlock();
      setIsLocked(false);
      return true;
    } catch (error) {
      console.error('Failed to unlock orientation:', error);
      return false;
    }
  }, [isSupported.lock]);

  // Auto-lock orientation if specified
  useEffect(() => {
    if (lockOrientation && isSupported.lock) {
      lockOrientationTo(lockOrientation);
    }
    
    return () => {
      if (lockOrientation && isSupported.lock) {
        unlockOrientation();
      }
    };
  }, [lockOrientation, isSupported.lock, lockOrientationTo, unlockOrientation]);

  // Request motion permission (iOS 13+)
  const requestMotionPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Motion permission request failed:', error);
        return false;
      }
    }
    return true; // Permission not required
  }, []);

  return {
    orientation,
    motion,
    isLocked,
    isSupported,
    lockOrientation: lockOrientationTo,
    unlockOrientation,
    requestMotionPermission
  };
};

/**
 * Hook for responsive layout based on orientation
 */
export const useResponsiveOrientation = () => {
  const { orientation } = useOrientation();
  const [layoutClasses, setLayoutClasses] = useState('');
  const [containerStyles, setContainerStyles] = useState({});

  useEffect(() => {
    const classes = [
      'responsive-container',
      orientation.isPortrait ? 'orientation-portrait' : 'orientation-landscape',
      `orientation-${orientation.type}`
    ].join(' ');

    setLayoutClasses(classes);

    // Update CSS custom properties for responsive design
    document.documentElement.style.setProperty(
      '--orientation-angle', 
      `${orientation.angle}deg`
    );
    document.documentElement.style.setProperty(
      '--is-portrait', 
      orientation.isPortrait ? '1' : '0'
    );
    document.documentElement.style.setProperty(
      '--is-landscape', 
      orientation.isLandscape ? '1' : '0'
    );

    // Dynamic container styles
    setContainerStyles({
      minHeight: orientation.isLandscape ? '100vh' : 'auto',
      flexDirection: orientation.isPortrait ? 'column' : 'row'
    });
  }, [orientation]);

  return {
    orientation,
    layoutClasses,
    containerStyles
  };
};

/**
 * Hook for orientation-aware QR scanner
 */
export const useQRScannerOrientation = () => {
  const { orientation, lockOrientation, unlockOrientation, isSupported } = useOrientation();
  const [scannerConfig, setScannerConfig] = useState({});

  useEffect(() => {
    // Configure scanner based on orientation
    const config = {
      width: orientation.isPortrait ? '100%' : '50%',
      height: orientation.isPortrait ? '400px' : '80vh',
      preferredCamera: 'environment',
      constraints: {
        width: orientation.isPortrait ? { ideal: 720 } : { ideal: 1280 },
        height: orientation.isPortrait ? { ideal: 1280 } : { ideal: 720 }
      }
    };

    setScannerConfig(config);
  }, [orientation]);

  const enablePortraitLock = useCallback(() => {
    if (isSupported.lock) {
      return lockOrientation('portrait-primary');
    }
    return false;
  }, [lockOrientation, isSupported.lock]);

  const disableOrientationLock = useCallback(() => {
    if (isSupported.lock) {
      return unlockOrientation();
    }
    return false;
  }, [unlockOrientation, isSupported.lock]);

  return {
    orientation,
    scannerConfig,
    enablePortraitLock,
    disableOrientationLock,
    isLockSupported: isSupported.lock
  };
};

/**
 * Hook for match/training timer with orientation awareness
 */
export const useTimerOrientation = () => {
  const { orientation } = useOrientation();
  const [timerLayout, setTimerLayout] = useState('compact');

  useEffect(() => {
    // Switch timer layout based on orientation
    if (orientation.isLandscape) {
      setTimerLayout('expanded'); // Show more controls and stats
    } else {
      setTimerLayout('compact'); // Minimal interface for portrait
    }
  }, [orientation]);

  return {
    orientation,
    timerLayout,
    showExpandedControls: orientation.isLandscape,
    showMinimalInterface: orientation.isPortrait
  };
};

/**
 * Utility functions for orientation handling
 */
export const orientationUtils = {
  // Check if device is in portrait mode
  isPortrait: () => {
    return window.innerHeight > window.innerWidth;
  },

  // Check if device is in landscape mode
  isLandscape: () => {
    return window.innerWidth > window.innerHeight;
  },

  // Get viewport dimensions adjusted for orientation
  getViewportDimensions: () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: window.innerWidth / window.innerHeight,
      isPortrait: window.innerHeight > window.innerWidth,
      isLandscape: window.innerWidth > window.innerHeight
    };
  },

  // Apply orientation-specific styles
  applyOrientationStyles: (element, portraitStyles = {}, landscapeStyles = {}) => {
    if (!element) return;

    const isPortrait = window.innerHeight > window.innerWidth;
    const styles = isPortrait ? portraitStyles : landscapeStyles;

    Object.assign(element.style, styles);
  },

  // Create orientation media query
  createOrientationMediaQuery: (orientation) => {
    return window.matchMedia(`(orientation: ${orientation})`);
  }
};

export default useOrientation;