import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for accessibility features
 * Provides screen reader support, keyboard navigation, and other a11y features
 */
export const useAccessibility = ({
  announcePageChanges = true,
  enableKeyboardNavigation = true,
  enableFocusManagement = true,
  enableMotionReduction = true
} = {}) => {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    forcedColors: false
  });
  
  const [focusVisible, setFocusVisible] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const announcementRef = useRef(null);
  const lastAnnouncementRef = useRef('');

  // Detect user preferences
  useEffect(() => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      largeText: window.matchMedia('(min-resolution: 120dpi)'),
      forcedColors: window.matchMedia('(forced-colors: active)')
    };

    const updatePreferences = () => {
      setPreferences({
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        largeText: mediaQueries.largeText.matches,
        screenReader: detectScreenReader(),
        forcedColors: mediaQueries.forcedColors.matches
      });
    };

    // Initial check
    updatePreferences();

    // Listen for changes
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updatePreferences);
    });

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updatePreferences);
      });
    };
  }, []);

  // Detect screen reader
  const detectScreenReader = useCallback(() => {
    // Check for common screen reader indicators
    return (
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      navigator.userAgent.includes('TalkBack') ||
      window.speechSynthesis ||
      document.querySelector('[role="application"]') !== null
    );
  }, []);

  // Announce to screen readers
  const announce = useCallback((message, priority = 'polite') => {
    if (!message || message === lastAnnouncementRef.current) return;

    lastAnnouncementRef.current = message;
    
    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Create aria-live region if it doesn't exist
    let liveRegion = document.getElementById(`aria-live-${priority}`);
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = `aria-live-${priority}`;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    // Clear and set new message
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 100);

    // Remove announcement after delay
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  }, []);

  // Focus management
  const manageFocus = useCallback((element, options = {}) => {
    if (!enableFocusManagement || !element) return;

    const {
      preventScroll = false,
      restoreFocus = null,
      announceLabel = true
    } = options;

    // Store current focus for restoration
    const currentFocus = document.activeElement;
    
    // Focus the element
    element.focus({ preventScroll });

    // Announce the focused element to screen readers
    if (announceLabel && preferences.screenReader) {
      const label = element.getAttribute('aria-label') || 
                   element.getAttribute('title') || 
                   element.textContent?.trim() ||
                   'Interactive element';
      
      setTimeout(() => announce(`Focused on ${label}`, 'assertive'), 100);
    }

    return () => {
      if (restoreFocus && currentFocus) {
        currentFocus.focus({ preventScroll });
      }
    };
  }, [enableFocusManagement, preferences.screenReader, announce]);

  // Keyboard navigation helper
  const createKeyboardHandler = useCallback((keyMap) => {
    return (event) => {
      if (!enableKeyboardNavigation) return;

      const { key, ctrlKey, altKey, shiftKey, metaKey } = event;
      const combo = [
        ctrlKey && 'ctrl',
        altKey && 'alt', 
        shiftKey && 'shift',
        metaKey && 'meta',
        key.toLowerCase()
      ].filter(Boolean).join('+');

      const handler = keyMap[combo] || keyMap[key.toLowerCase()];
      
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };
  }, [enableKeyboardNavigation]);

  // Skip link functionality
  const createSkipLink = useCallback((targetId, label = 'Skip to main content') => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 10000;
      transition: top 0.3s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
    
    return skipLink;
  }, []);

  // Color contrast checker
  const checkColorContrast = useCallback((foreground, background) => {
    const getRelativeLuminance = (color) => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(c => {
        c = parseInt(c) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getRelativeLuminance(foreground);
    const l2 = getRelativeLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio,
      aa: ratio >= 4.5,
      aaa: ratio >= 7,
      aaLarge: ratio >= 3,
      aaaLarge: ratio >= 4.5
    };
  }, []);

  // Focus trap for modals
  const createFocusTrap = useCallback((container) => {
    if (!container) return null;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapFocus = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', trapFocus);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', trapFocus);
    };
  }, []);

  // ARIA live region updates
  const updateLiveRegion = useCallback((regionId, content, priority = 'polite') => {
    const region = document.getElementById(regionId);
    if (region) {
      region.setAttribute('aria-live', priority);
      region.textContent = content;
    }
  }, []);

  return {
    preferences,
    focusVisible,
    announcements,
    announce,
    manageFocus,
    createKeyboardHandler,
    createSkipLink,
    checkColorContrast,
    createFocusTrap,
    updateLiveRegion
  };
};

/**
 * Hook for form accessibility
 */
export const useFormAccessibility = () => {
  const { announce, preferences } = useAccessibility();
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState(new Set());

  const validateField = useCallback((name, value, validator) => {
    const error = validator ? validator(value) : null;
    
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    if (error && touchedFields.has(name)) {
      announce(`${name} field has error: ${error}`, 'assertive');
    }

    return !error;
  }, [announce, touchedFields]);

  const markFieldTouched = useCallback((name) => {
    setTouchedFields(prev => new Set([...prev, name]));
  }, []);

  const getFieldProps = useCallback((name, label) => {
    const hasError = !!errors[name];
    const errorId = hasError ? `${name}-error` : undefined;
    const describedBy = errorId;

    return {
      'aria-label': label,
      'aria-invalid': hasError,
      'aria-describedby': describedBy,
      'aria-required': true
    };
  }, [errors]);

  const getErrorProps = useCallback((name) => {
    const error = errors[name];
    
    return error ? {
      id: `${name}-error`,
      role: 'alert',
      'aria-live': 'polite'
    } : {};
  }, [errors]);

  return {
    errors,
    validateField,
    markFieldTouched,
    getFieldProps,
    getErrorProps,
    hasErrors: Object.keys(errors).some(key => errors[key])
  };
};

/**
 * Hook for navigation accessibility
 */
export const useNavigationAccessibility = () => {
  const { announce, createKeyboardHandler } = useAccessibility();
  
  const announceNavigation = useCallback((pageName, routePath) => {
    announce(`Navigated to ${pageName}`, 'polite');
    
    // Update page title for screen readers
    if (pageName && !document.title.includes(pageName)) {
      document.title = `${pageName} - Lion Football Academy`;
    }

    // Update main landmark
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('aria-label', `${pageName} page content`);
    }
  }, [announce]);

  const createNavigationKeyHandler = useCallback((navigationItems) => {
    return createKeyboardHandler({
      'arrowdown': (e) => {
        const currentIndex = navigationItems.findIndex(item => 
          item.element === document.activeElement
        );
        const nextIndex = (currentIndex + 1) % navigationItems.length;
        navigationItems[nextIndex].element.focus();
      },
      'arrowup': (e) => {
        const currentIndex = navigationItems.findIndex(item => 
          item.element === document.activeElement
        );
        const prevIndex = currentIndex <= 0 ? navigationItems.length - 1 : currentIndex - 1;
        navigationItems[prevIndex].element.focus();
      },
      'home': (e) => {
        navigationItems[0].element.focus();
      },
      'end': (e) => {
        navigationItems[navigationItems.length - 1].element.focus();
      }
    });
  }, [createKeyboardHandler]);

  return {
    announceNavigation,
    createNavigationKeyHandler
  };
};

/**
 * Accessibility utilities
 */
export const a11yUtils = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix = 'a11y') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Check if element is visible to screen readers
  isVisibleToScreenReader: (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.getAttribute('aria-hidden') !== 'true';
  },

  // Add aria-expanded handling
  toggleAriaExpanded: (element) => {
    const isExpanded = element.getAttribute('aria-expanded') === 'true';
    element.setAttribute('aria-expanded', (!isExpanded).toString());
    return !isExpanded;
  },

  // Create landmark regions
  createLandmarks: () => {
    const landmarks = [
      { role: 'banner', selector: 'header' },
      { role: 'navigation', selector: 'nav' },
      { role: 'main', selector: 'main' },
      { role: 'contentinfo', selector: 'footer' }
    ];

    landmarks.forEach(({ role, selector }) => {
      const element = document.querySelector(selector);
      if (element && !element.getAttribute('role')) {
        element.setAttribute('role', role);
      }
    });
  },

  // Set focus indicator styles
  setFocusIndicatorStyles: () => {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible:focus {
        outline: 2px solid #f8b500;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(248, 181, 0, 0.2);
      }
      
      .focus-visible:focus:not(:focus-visible) {
        outline: none;
        box-shadow: none;
      }
    `;
    document.head.appendChild(style);
  }
};

export default useAccessibility;