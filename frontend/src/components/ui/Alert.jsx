import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Alert.css';

const Alert = ({
  children,
  variant = 'info',
  size = 'base',
  dismissible = false,
  autoHide = false,
  autoHideDelay = 5000,
  onClose,
  onShow,
  onHide,
  icon: customIcon,
  title,
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (onShow) {
      onShow();
    }
  }, [onShow]);

  useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay]);

  const handleClose = () => {
    setIsVisible(false);
    if (onHide) {
      onHide();
    }
    if (onClose) {
      onClose();
    }
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <path d="M12 9v4"></path>
            <path d="m12 17 .01 0"></path>
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m15 9-6 6"></path>
            <path d="m9 9 6 6"></path>
          </svg>
        );
      case 'info':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m12 16 0-4"></path>
            <path d="m12 8 .01 0"></path>
          </svg>
        );
    }
  };

  if (!isVisible) {
    return null;
  }

  const baseClasses = 'alert';
  const variantClasses = `alert--${variant}`;
  const sizeClasses = `alert--${size}`;
  const stateClasses = [
    dismissible && 'alert--dismissible'
  ].filter(Boolean).join(' ');

  const alertClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    stateClasses,
    className
  ].filter(Boolean).join(' ');

  const icon = customIcon || getDefaultIcon();

  return (
    <div 
      className={alertClasses} 
      role="alert" 
      aria-live="polite"
      {...props}
    >
      <div className="alert__content">
        {icon && (
          <div className="alert__icon" aria-hidden="true">
            {icon}
          </div>
        )}
        
        <div className="alert__body">
          {title && (
            <div className="alert__title">
              {title}
            </div>
          )}
          <div className="alert__message">
            {children}
          </div>
        </div>
        
        {dismissible && (
          <button
            type="button"
            className="alert__close"
            onClick={handleClose}
            aria-label="Close alert"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      
      {autoHide && (
        <div 
          className="alert__progress" 
          style={{ 
            animationDuration: `${autoHideDelay}ms` 
          }}
        />
      )}
    </div>
  );
};

const AlertManager = ({
  alerts = [],
  position = 'top-right',
  maxAlerts = 5,
  className = '',
  ...props
}) => {
  const positionClasses = `alert-manager--${position}`;
  const managerClasses = [
    'alert-manager',
    positionClasses,
    className
  ].filter(Boolean).join(' ');

  const visibleAlerts = alerts.slice(0, maxAlerts);

  return (
    <div className={managerClasses} {...props}>
      {visibleAlerts.map((alert, index) => (
        <Alert
          key={alert.id || index}
          variant={alert.variant}
          size={alert.size}
          dismissible={alert.dismissible}
          autoHide={alert.autoHide}
          autoHideDelay={alert.autoHideDelay}
          onClose={alert.onClose}
          icon={alert.icon}
          title={alert.title}
          className="alert-manager__alert"
        >
          {alert.message || alert.children}
        </Alert>
      ))}
    </div>
  );
};

Alert.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'error', 'primary', 'secondary']),
  size: PropTypes.oneOf(['sm', 'base', 'lg']),
  dismissible: PropTypes.bool,
  autoHide: PropTypes.bool,
  autoHideDelay: PropTypes.number,
  onClose: PropTypes.func,
  onShow: PropTypes.func,
  onHide: PropTypes.func,
  icon: PropTypes.node,
  title: PropTypes.string,
  className: PropTypes.string
};

AlertManager.propTypes = {
  alerts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    variant: PropTypes.oneOf(['info', 'success', 'warning', 'error', 'primary', 'secondary']),
    size: PropTypes.oneOf(['sm', 'base', 'lg']),
    dismissible: PropTypes.bool,
    autoHide: PropTypes.bool,
    autoHideDelay: PropTypes.number,
    onClose: PropTypes.func,
    icon: PropTypes.node,
    title: PropTypes.string,
    message: PropTypes.node,
    children: PropTypes.node
  })),
  position: PropTypes.oneOf([
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ]),
  maxAlerts: PropTypes.number,
  className: PropTypes.string
};

Alert.Manager = AlertManager;

export default Alert;