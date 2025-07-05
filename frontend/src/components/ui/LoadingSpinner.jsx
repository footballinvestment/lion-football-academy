import React from 'react';
import PropTypes from 'prop-types';
import './LoadingSpinner.css';

const LoadingSpinner = ({
  size = 'base',
  variant = 'primary',
  thickness = 'base',
  speed = 'base',
  overlay = false,
  message = '',
  className = '',
  ...props
}) => {
  const baseClasses = 'loading-spinner';
  const sizeClasses = `loading-spinner--${size}`;
  const variantClasses = `loading-spinner--${variant}`;
  const thicknessClasses = `loading-spinner--thickness-${thickness}`;
  const speedClasses = `loading-spinner--speed-${speed}`;
  
  const spinnerClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    thicknessClasses,
    speedClasses,
    className
  ].filter(Boolean).join(' ');

  const SpinnerElement = (
    <div className={spinnerClasses} role="status" aria-live="polite" {...props}>
      <svg viewBox="0 0 50 50" className="loading-spinner__svg">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="31.416"
          className="loading-spinner__circle"
        />
      </svg>
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-spinner__overlay">
        {SpinnerElement}
        {message && (
          <div className="loading-spinner__message">
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="loading-spinner__container">
      {SpinnerElement}
      {message && (
        <div className="loading-spinner__message">
          {message}
        </div>
      )}
    </div>
  );
};

const LoadingDots = ({
  size = 'base',
  variant = 'primary',
  speed = 'base',
  className = '',
  ...props
}) => {
  const baseClasses = 'loading-dots';
  const sizeClasses = `loading-dots--${size}`;
  const variantClasses = `loading-dots--${variant}`;
  const speedClasses = `loading-dots--speed-${speed}`;
  
  const dotsClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    speedClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={dotsClasses} role="status" aria-live="polite" {...props}>
      <div className="loading-dots__dot"></div>
      <div className="loading-dots__dot"></div>
      <div className="loading-dots__dot"></div>
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

const LoadingPulse = ({
  size = 'base',
  variant = 'primary',
  speed = 'base',
  className = '',
  ...props
}) => {
  const baseClasses = 'loading-pulse';
  const sizeClasses = `loading-pulse--${size}`;
  const variantClasses = `loading-pulse--${variant}`;
  const speedClasses = `loading-pulse--speed-${speed}`;
  
  const pulseClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    speedClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={pulseClasses} role="status" aria-live="polite" {...props}>
      <div className="loading-pulse__circle"></div>
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

const LoadingBars = ({
  size = 'base',
  variant = 'primary',
  speed = 'base',
  className = '',
  ...props
}) => {
  const baseClasses = 'loading-bars';
  const sizeClasses = `loading-bars--${size}`;
  const variantClasses = `loading-bars--${variant}`;
  const speedClasses = `loading-bars--speed-${speed}`;
  
  const barsClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    speedClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={barsClasses} role="status" aria-live="polite" {...props}>
      <div className="loading-bars__bar"></div>
      <div className="loading-bars__bar"></div>
      <div className="loading-bars__bar"></div>
      <div className="loading-bars__bar"></div>
      <div className="loading-bars__bar"></div>
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'base', 'lg', 'xl']),
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'gray',
    'white'
  ]),
  thickness: PropTypes.oneOf(['thin', 'base', 'thick']),
  speed: PropTypes.oneOf(['slow', 'base', 'fast']),
  overlay: PropTypes.bool,
  message: PropTypes.string,
  className: PropTypes.string
};

LoadingDots.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'base', 'lg', 'xl']),
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'gray',
    'white'
  ]),
  speed: PropTypes.oneOf(['slow', 'base', 'fast']),
  className: PropTypes.string
};

LoadingPulse.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'base', 'lg', 'xl']),
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'gray',
    'white'
  ]),
  speed: PropTypes.oneOf(['slow', 'base', 'fast']),
  className: PropTypes.string
};

LoadingBars.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'base', 'lg', 'xl']),
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'gray',
    'white'
  ]),
  speed: PropTypes.oneOf(['slow', 'base', 'fast']),
  className: PropTypes.string
};

LoadingSpinner.Dots = LoadingDots;
LoadingSpinner.Pulse = LoadingPulse;
LoadingSpinner.Bars = LoadingBars;

export default LoadingSpinner;