import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './Tabs.css';

const Tabs = ({
  children,
  defaultTab = 0,
  activeTab: controlledActiveTab,
  onTabChange,
  variant = 'default',
  size = 'base',
  fullWidth = false,
  vertical = false,
  className = '',
  ...props
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabRefs = useRef([]);
  const isControlled = controlledActiveTab !== undefined;
  const currentTab = isControlled ? controlledActiveTab : activeTab;

  const tabs = React.Children.toArray(children).filter(
    child => child.type === TabPanel
  );

  const handleTabChange = useCallback((index) => {
    if (!isControlled) {
      setActiveTab(index);
    }
    if (onTabChange) {
      onTabChange(index);
    }
  }, [isControlled, onTabChange]);

  const handleKeyDown = useCallback((event, index) => {
    const { key } = event;
    let newIndex = index;

    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = index > 0 ? index - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = index < tabs.length - 1 ? index + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    handleTabChange(newIndex);
    if (tabRefs.current[newIndex]) {
      tabRefs.current[newIndex].focus();
    }
  }, [tabs.length, handleTabChange]);

  const tabsClasses = [
    'tabs',
    `tabs--${variant}`,
    `tabs--${size}`,
    vertical && 'tabs--vertical',
    fullWidth && 'tabs--full-width',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={tabsClasses} {...props}>
      <div 
        className="tabs__list" 
        role="tablist"
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
      >
        {tabs.map((tab, index) => {
          const isActive = index === currentTab;
          const isDisabled = tab.props.disabled;
          
          return (
            <button
              key={index}
              ref={(el) => (tabRefs.current[index] = el)}
              className={`tabs__tab ${isActive ? 'tabs__tab--active' : ''} ${isDisabled ? 'tabs__tab--disabled' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${index}`}
              id={`tab-${index}`}
              tabIndex={isActive ? 0 : -1}
              disabled={isDisabled}
              onClick={() => !isDisabled && handleTabChange(index)}
              onKeyDown={(e) => !isDisabled && handleKeyDown(e, index)}
            >
              {tab.props.icon && (
                <span className="tabs__tab-icon" aria-hidden="true">
                  {tab.props.icon}
                </span>
              )}
              <span className="tabs__tab-text">
                {tab.props.title}
              </span>
              {tab.props.badge && (
                <span className="tabs__tab-badge" aria-label={`${tab.props.badge} notifications`}>
                  {tab.props.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="tabs__panels">
        {tabs.map((tab, index) => {
          const isActive = index === currentTab;
          
          return (
            <div
              key={index}
              className={`tabs__panel ${isActive ? 'tabs__panel--active' : ''}`}
              role="tabpanel"
              id={`tabpanel-${index}`}
              aria-labelledby={`tab-${index}`}
              hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
            >
              {isActive && tab.props.children}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TabPanel = ({
  title,
  children,
  icon = null,
  badge = null,
  disabled = false,
  ...props
}) => {
  return children;
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  defaultTab: PropTypes.number,
  activeTab: PropTypes.number,
  onTabChange: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'underline', 'pills', 'cards']),
  size: PropTypes.oneOf(['sm', 'base', 'lg']),
  fullWidth: PropTypes.bool,
  vertical: PropTypes.bool,
  className: PropTypes.string
};

TabPanel.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disabled: PropTypes.bool
};

Tabs.TabPanel = TabPanel;

export default Tabs;