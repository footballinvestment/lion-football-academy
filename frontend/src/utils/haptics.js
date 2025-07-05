/**
 * Haptic Feedback Utility for Lion Football Academy
 * Provides haptic feedback for mobile devices to enhance user experience
 */

// Haptic feedback types
export const HAPTIC_TYPES = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SELECTION: 'selection',
  IMPACT: 'impact'
};

// Check if haptic feedback is supported
export const isHapticsSupported = () => {
  return (
    'navigator' in window &&
    ('vibrate' in navigator || 
     'hapticEngine' in navigator ||
     (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function'))
  );
};

// Check if iOS haptic feedback is available
export const isIOSHapticsSupported = () => {
  return (
    'navigator' in window &&
    'hapticEngine' in navigator
  );
};

// Check if Android vibration is available
export const isVibrationSupported = () => {
  return (
    'navigator' in window &&
    'vibrate' in navigator
  );
};

/**
 * Trigger haptic feedback
 * @param {string} type - Type of haptic feedback
 * @param {object} options - Additional options
 */
export const triggerHaptics = (type = HAPTIC_TYPES.LIGHT, options = {}) => {
  if (!isHapticsSupported()) {
    console.log('Haptic feedback not supported on this device');
    return false;
  }

  try {
    // iOS Haptic Engine (iOS 13+)
    if (isIOSHapticsSupported()) {
      return triggerIOSHaptics(type, options);
    }
    
    // Android Vibration API
    if (isVibrationSupported()) {
      return triggerVibration(type, options);
    }
    
    return false;
  } catch (error) {
    console.error('Haptic feedback error:', error);
    return false;
  }
};

/**
 * Trigger iOS haptic feedback
 * @param {string} type - Type of haptic feedback
 * @param {object} options - Additional options
 */
const triggerIOSHaptics = (type, options = {}) => {
  const { intensity = 1.0, sharpness = 1.0 } = options;
  
  // Map our types to iOS haptic feedback
  const hapticMap = {
    [HAPTIC_TYPES.LIGHT]: { type: 'impact', style: 'light' },
    [HAPTIC_TYPES.MEDIUM]: { type: 'impact', style: 'medium' },
    [HAPTIC_TYPES.HEAVY]: { type: 'impact', style: 'heavy' },
    [HAPTIC_TYPES.SUCCESS]: { type: 'notification', style: 'success' },
    [HAPTIC_TYPES.WARNING]: { type: 'notification', style: 'warning' },
    [HAPTIC_TYPES.ERROR]: { type: 'notification', style: 'error' },
    [HAPTIC_TYPES.SELECTION]: { type: 'selection' },
    [HAPTIC_TYPES.IMPACT]: { type: 'impact', style: 'medium' }
  };
  
  const hapticConfig = hapticMap[type] || hapticMap[HAPTIC_TYPES.LIGHT];
  
  if (hapticConfig.type === 'impact') {
    // iOS Impact Feedback Generator
    if (navigator.hapticEngine && navigator.hapticEngine.impact) {
      navigator.hapticEngine.impact(hapticConfig.style, { intensity, sharpness });
      return true;
    }
  } else if (hapticConfig.type === 'notification') {
    // iOS Notification Feedback Generator
    if (navigator.hapticEngine && navigator.hapticEngine.notification) {
      navigator.hapticEngine.notification(hapticConfig.style);
      return true;
    }
  } else if (hapticConfig.type === 'selection') {
    // iOS Selection Feedback Generator
    if (navigator.hapticEngine && navigator.hapticEngine.selection) {
      navigator.hapticEngine.selection();
      return true;
    }
  }
  
  return false;
};

/**
 * Trigger vibration feedback for Android and other devices
 * @param {string} type - Type of haptic feedback
 * @param {object} options - Additional options
 */
const triggerVibration = (type, options = {}) => {
  if (!navigator.vibrate) return false;
  
  // Map our types to vibration patterns (in milliseconds)
  const vibrationMap = {
    [HAPTIC_TYPES.LIGHT]: [10],
    [HAPTIC_TYPES.MEDIUM]: [25],
    [HAPTIC_TYPES.HEAVY]: [50],
    [HAPTIC_TYPES.SUCCESS]: [10, 10, 10],
    [HAPTIC_TYPES.WARNING]: [25, 25],
    [HAPTIC_TYPES.ERROR]: [50, 50, 50],
    [HAPTIC_TYPES.SELECTION]: [5],
    [HAPTIC_TYPES.IMPACT]: [30]
  };
  
  const pattern = vibrationMap[type] || vibrationMap[HAPTIC_TYPES.LIGHT];
  
  try {
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.error('Vibration error:', error);
    return false;
  }
};

/**
 * Haptic feedback for specific UI interactions
 */
export const hapticsForAction = {
  // Button interactions
  buttonPress: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  buttonLongPress: () => triggerHaptics(HAPTIC_TYPES.MEDIUM),
  
  // Navigation
  swipeNavigation: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  pageChange: () => triggerHaptics(HAPTIC_TYPES.SELECTION),
  
  // Form interactions
  formSuccess: () => triggerHaptics(HAPTIC_TYPES.SUCCESS),
  formError: () => triggerHaptics(HAPTIC_TYPES.ERROR),
  formWarning: () => triggerHaptics(HAPTIC_TYPES.WARNING),
  inputFocus: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  
  // QR Code scanning
  qrScanSuccess: () => triggerHaptics(HAPTIC_TYPES.SUCCESS),
  qrScanError: () => triggerHaptics(HAPTIC_TYPES.ERROR),
  qrScanFocus: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  
  // Attendance tracking
  attendanceCheck: () => triggerHaptics(HAPTIC_TYPES.SUCCESS),
  attendanceUncheck: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  
  // Notifications
  notificationReceived: () => triggerHaptics(HAPTIC_TYPES.MEDIUM),
  importantNotification: () => triggerHaptics(HAPTIC_TYPES.HEAVY),
  
  // Data refresh
  pullToRefresh: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  refreshComplete: () => triggerHaptics(HAPTIC_TYPES.SUCCESS),
  
  // Gestures
  pinchZoom: () => triggerHaptics(HAPTIC_TYPES.LIGHT),
  longPress: () => triggerHaptics(HAPTIC_TYPES.MEDIUM),
  
  // Game/match events
  goalScored: () => triggerHaptics(HAPTIC_TYPES.HEAVY),
  whistle: () => triggerHaptics(HAPTIC_TYPES.MEDIUM),
  
  // Training events
  timerStart: () => triggerHaptics(HAPTIC_TYPES.MEDIUM),
  timerEnd: () => triggerHaptics(HAPTIC_TYPES.SUCCESS),
  exerciseComplete: () => triggerHaptics(HAPTIC_TYPES.SUCCESS)
};

/**
 * Custom haptic patterns for complex interactions
 */
export const customHapticPatterns = {
  // Goal celebration pattern
  goalCelebration: () => {
    if (isVibrationSupported()) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    } else {
      triggerHaptics(HAPTIC_TYPES.HEAVY);
      setTimeout(() => triggerHaptics(HAPTIC_TYPES.HEAVY), 150);
      setTimeout(() => triggerHaptics(HAPTIC_TYPES.HEAVY), 300);
    }
  },
  
  // Training session start
  trainingStart: () => {
    if (isVibrationSupported()) {
      navigator.vibrate([50, 50, 50]);
    } else {
      triggerHaptics(HAPTIC_TYPES.MEDIUM);
      setTimeout(() => triggerHaptics(HAPTIC_TYPES.MEDIUM), 100);
    }
  },
  
  // Emergency alert
  emergencyAlert: () => {
    if (isVibrationSupported()) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } else {
      triggerHaptics(HAPTIC_TYPES.ERROR);
      setTimeout(() => triggerHaptics(HAPTIC_TYPES.ERROR), 300);
    }
  },
  
  // Achievement unlocked
  achievement: () => {
    if (isVibrationSupported()) {
      navigator.vibrate([25, 25, 25, 25, 100]);
    } else {
      triggerHaptics(HAPTIC_TYPES.SUCCESS);
      setTimeout(() => triggerHaptics(HAPTIC_TYPES.LIGHT), 50);
      setTimeout(() => triggerHaptics(HAPTIC_TYPES.LIGHT), 100);
    }
  }
};

/**
 * React hook for haptic feedback
 */
export const useHaptics = () => {
  const triggerFeedback = (type, options) => triggerHaptics(type, options);
  
  return {
    isSupported: isHapticsSupported(),
    trigger: triggerFeedback,
    actions: hapticsForAction,
    patterns: customHapticPatterns
  };
};

/**
 * Settings for haptic preferences
 */
export const hapticSettings = {
  // Check if user has enabled haptics in preferences
  isEnabled: () => {
    return localStorage.getItem('haptics-enabled') !== 'false';
  },
  
  // Enable/disable haptics
  setEnabled: (enabled) => {
    localStorage.setItem('haptics-enabled', enabled.toString());
  },
  
  // Get haptic intensity preference
  getIntensity: () => {
    return parseFloat(localStorage.getItem('haptics-intensity') || '1.0');
  },
  
  // Set haptic intensity preference
  setIntensity: (intensity) => {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    localStorage.setItem('haptics-intensity', clampedIntensity.toString());
  }
};

/**
 * Wrapper function that respects user preferences
 */
export const triggerHapticsWithPreferences = (type, options = {}) => {
  if (!hapticSettings.isEnabled()) {
    return false;
  }
  
  const intensity = hapticSettings.getIntensity();
  return triggerHaptics(type, { ...options, intensity });
};

export default {
  HAPTIC_TYPES,
  isHapticsSupported,
  triggerHaptics,
  hapticsForAction,
  customHapticPatterns,
  useHaptics,
  hapticSettings,
  triggerHapticsWithPreferences
};