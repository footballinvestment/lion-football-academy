import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for handling touch gestures
 * Supports swipe, pinch, tap, long press, and pan gestures
 */
export const useGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onTap,
  onDoubleTap,
  onLongPress,
  onPan,
  onPanStart,
  onPanEnd,
  threshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300,
  preventDefault = true
} = {}) => {
  const elementRef = useRef(null);
  const gestureState = useRef({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    startTime: 0,
    endTime: 0,
    initialDistance: 0,
    currentDistance: 0,
    lastTap: 0,
    longPressTimer: null,
    isPanning: false,
    touches: []
  });

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback((touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches);
    const touch = touches[0];
    const state = gestureState.current;

    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.startTime = Date.now();
    state.touches = touches;
    state.isPanning = false;

    // Handle pinch gesture initialization
    if (touches.length === 2) {
      state.initialDistance = getDistance(touches[0], touches[1]);
    }

    // Handle long press
    if (onLongPress) {
      state.longPressTimer = setTimeout(() => {
        onLongPress({
          x: touch.clientX,
          y: touch.clientY,
          target: event.target
        });
      }, longPressDelay);
    }

    // Handle pan start
    if (onPanStart) {
      onPanStart({
        x: touch.clientX,
        y: touch.clientY,
        target: event.target
      });
    }
  }, [preventDefault, getDistance, onLongPress, onPanStart, longPressDelay]);

  // Handle touch move
  const handleTouchMove = useCallback((event) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches);
    const touch = touches[0];
    const state = gestureState.current;

    state.endX = touch.clientX;
    state.endY = touch.clientY;
    state.touches = touches;

    // Clear long press timer on movement
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Handle pinch gesture
    if (touches.length === 2 && onPinch) {
      state.currentDistance = getDistance(touches[0], touches[1]);
      const scale = state.currentDistance / state.initialDistance;
      const center = getCenter(touches[0], touches[1]);
      
      onPinch({
        scale,
        center,
        distance: state.currentDistance,
        initialDistance: state.initialDistance
      });
    }

    // Handle pan gesture
    if (touches.length === 1 && onPan) {
      const deltaX = state.endX - state.startX;
      const deltaY = state.endY - state.startY;
      
      if (!state.isPanning && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        state.isPanning = true;
      }
      
      if (state.isPanning) {
        onPan({
          deltaX,
          deltaY,
          x: touch.clientX,
          y: touch.clientY,
          target: event.target
        });
      }
    }
  }, [preventDefault, getDistance, getCenter, onPinch, onPan]);

  // Handle touch end
  const handleTouchEnd = useCallback((event) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const state = gestureState.current;
    state.endTime = Date.now();

    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Handle pan end
    if (state.isPanning && onPanEnd) {
      onPanEnd({
        deltaX: state.endX - state.startX,
        deltaY: state.endY - state.startY,
        target: event.target
      });
    }

    // Only process swipe/tap if it was a single touch
    if (state.touches.length <= 1) {
      const deltaX = state.endX - state.startX;
      const deltaY = state.endY - state.startY;
      const deltaTime = state.endTime - state.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Handle tap gestures
      if (distance < threshold && deltaTime < 300) {
        const now = Date.now();
        const timeSinceLastTap = now - state.lastTap;

        if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
          onDoubleTap({
            x: state.endX,
            y: state.endY,
            target: event.target
          });
          state.lastTap = 0; // Reset to prevent triple tap
        } else {
          state.lastTap = now;
          if (onTap) {
            // Delay single tap to allow for double tap detection
            setTimeout(() => {
              if (now === state.lastTap) {
                onTap({
                  x: state.endX,
                  y: state.endY,
                  target: event.target
                });
              }
            }, doubleTapDelay);
          }
        }
      }
      // Handle swipe gestures
      else if (distance >= threshold && deltaTime < 1000) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight({
              distance: absX,
              velocity: absX / deltaTime,
              target: event.target
            });
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft({
              distance: absX,
              velocity: absX / deltaTime,
              target: event.target
            });
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown({
              distance: absY,
              velocity: absY / deltaTime,
              target: event.target
            });
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp({
              distance: absY,
              velocity: absY / deltaTime,
              target: event.target
            });
          }
        }
      }
    }

    // Reset state
    state.isPanning = false;
    state.touches = [];
  }, [
    preventDefault,
    threshold,
    doubleTapDelay,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onPanEnd
  ]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      // Clear any pending timers
      if (gestureState.current.longPressTimer) {
        clearTimeout(gestureState.current.longPressTimer);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return elementRef;
};

/**
 * Hook for simple swipe navigation
 */
export const useSwipeNavigation = ({ onSwipeLeft, onSwipeRight, threshold = 50 }) => {
  return useGestures({
    onSwipeLeft,
    onSwipeRight,
    threshold
  });
};

/**
 * Hook for pinch-to-zoom functionality
 */
export const usePinchZoom = ({ onPinch, minScale = 0.5, maxScale = 3 }) => {
  return useGestures({
    onPinch: (gesture) => {
      const clampedScale = Math.max(minScale, Math.min(maxScale, gesture.scale));
      onPinch({ ...gesture, scale: clampedScale });
    }
  });
};

/**
 * Hook for draggable elements
 */
export const useDraggable = ({ onDrag, onDragStart, onDragEnd }) => {
  return useGestures({
    onPan: onDrag,
    onPanStart: onDragStart,
    onPanEnd: onDragEnd
  });
};

export default useGestures;