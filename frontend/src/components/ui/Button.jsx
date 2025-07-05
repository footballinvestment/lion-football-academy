import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'base',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  type = 'button',
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'btn';
  const variantClasses = `btn--${variant}`;
  const sizeClasses = `btn--${size}`;
  const stateClasses = [
    disabled && 'btn--disabled',
    loading && 'btn--loading',
    fullWidth && 'btn--full-width'
  ].filter(Boolean).join(' ');

  const buttonClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    stateClasses,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="btn__spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="btn__spinner-icon">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="31.416"
              strokeDashoffset="31.416"
            />
          </svg>
        </span>
      )}
      
      {leftIcon && !loading && (
        <span className="btn__icon btn__icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      <span className={`btn__content ${loading ? 'btn__content--loading' : ''}`}>
        {children}
      </span>
      
      {rightIcon && !loading && (
        <span className="btn__icon btn__icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'ghost',
    'outline'
  ]),
  size: PropTypes.oneOf(['sm', 'base', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default Button;