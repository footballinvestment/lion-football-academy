import React from 'react';
import PropTypes from 'prop-types';
import './StatCard.css';

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  trendLabel,
  variant = 'default',
  size = 'base',
  loading = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'stat-card';
  const variantClasses = `stat-card--${variant}`;
  const sizeClasses = `stat-card--${size}`;
  const stateClasses = [
    loading && 'stat-card--loading',
    clickable && 'stat-card--clickable'
  ].filter(Boolean).join(' ');

  const cardClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    stateClasses,
    className
  ].filter(Boolean).join(' ');

  const Component = clickable ? 'button' : 'div';

  const getTrendIcon = () => {
    if (!trend) return null;
    
    const trendClasses = `stat-card__trend-icon stat-card__trend-icon--${trend}`;
    
    if (trend === 'up') {
      return (
        <svg className={trendClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      );
    } else if (trend === 'down') {
      return (
        <svg className={trendClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
          <polyline points="17 18 23 18 23 12"></polyline>
        </svg>
      );
    } else {
      return (
        <svg className={trendClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      );
    }
  };

  const formatValue = (val) => {
    if (loading) return '---';
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Component
      className={cardClasses}
      onClick={clickable ? onClick : undefined}
      disabled={loading}
      {...props}
    >
      {loading && (
        <div className="stat-card__loading-overlay">
          <div className="stat-card__loading-spinner">
            <svg viewBox="0 0 24 24" className="stat-card__loading-icon">
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
          </div>
        </div>
      )}
      
      <div className="stat-card__header">
        <div className="stat-card__title-section">
          <h3 className="stat-card__title">{title}</h3>
          {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
        </div>
        {icon && (
          <div className="stat-card__icon" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      
      <div className="stat-card__body">
        <div className="stat-card__value">
          {formatValue(value)}
        </div>
        
        {(trend || trendValue || trendLabel) && (
          <div className="stat-card__trend">
            {getTrendIcon()}
            {trendValue && (
              <span className={`stat-card__trend-value stat-card__trend-value--${trend}`}>
                {trendValue}
              </span>
            )}
            {trendLabel && (
              <span className="stat-card__trend-label">
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </Component>
  );
};

const StatGroup = ({
  children,
  columns = 4,
  gap = 'base',
  className = '',
  ...props
}) => {
  const groupClasses = [
    'stat-group',
    `stat-group--columns-${columns}`,
    `stat-group--gap-${gap}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={groupClasses} {...props}>
      {children}
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  trend: PropTypes.oneOf(['up', 'down', 'neutral']),
  trendValue: PropTypes.string,
  trendLabel: PropTypes.string,
  variant: PropTypes.oneOf([
    'default',
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'error',
    'admin',
    'coach',
    'player',
    'parent'
  ]),
  size: PropTypes.oneOf(['sm', 'base', 'lg']),
  loading: PropTypes.bool,
  clickable: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};

StatGroup.propTypes = {
  children: PropTypes.node.isRequired,
  columns: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
  gap: PropTypes.oneOf(['sm', 'base', 'lg']),
  className: PropTypes.string
};

StatCard.Group = StatGroup;

export default StatCard;