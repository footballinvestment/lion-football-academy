import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const isParentActive = (paths) => {
        return paths.some(path => location.pathname.startsWith(path));
    };

    // Navigation items based on user role
    const getNavigationItems = () => {
        const role = user?.role;
        
        switch (role) {
            case 'admin':
                return [
                    {
                        id: 'dashboard',
                        label: 'Dashboard',
                        icon: 'home',
                        path: '/admin/dashboard'
                    },
                    {
                        id: 'users',
                        label: 'User Management',
                        icon: 'users',
                        path: '/admin/users'
                    },
                    {
                        id: 'teams',
                        label: 'Team Management',
                        icon: 'shield',
                        path: '/admin/teams'
                    },
                    {
                        id: 'players',
                        label: 'Player Management',
                        icon: 'user',
                        path: '/admin/players'
                    },
                    {
                        id: 'statistics',
                        label: 'Statistics & Analytics',
                        icon: 'bar-chart',
                        path: '/admin/statistics'
                    },
                    {
                        id: 'billing',
                        label: 'Billing & Payments',
                        icon: 'credit-card',
                        path: '/admin/billing'
                    },
                    {
                        id: 'injuries',
                        label: 'Injury Management',
                        icon: 'heart',
                        path: '/admin/injuries'
                    },
                    {
                        id: 'ai-analytics',
                        label: 'AI Analytics',
                        icon: 'cpu',
                        path: '/admin/ai-analytics'
                    },
                    {
                        id: 'development-plans',
                        label: 'Development Plans',
                        icon: 'target',
                        path: '/admin/development-plans'
                    }
                ];

            case 'coach':
                return [
                    {
                        id: 'dashboard',
                        label: 'Dashboard',
                        icon: 'home',
                        path: '/coach/dashboard'
                    },
                    {
                        id: 'teams',
                        label: 'Team Management',
                        icon: 'shield',
                        path: '/coach/teams'
                    },
                    {
                        id: 'training',
                        label: 'Training Sessions',
                        icon: 'clock',
                        children: [
                            {
                                id: 'training-schedule',
                                label: 'Training Schedule',
                                path: '/coach/trainings'
                            },
                            {
                                id: 'qr-checkin',
                                label: 'QR Check-in',
                                path: '/coach/qr-checkin'
                            }
                        ]
                    },
                    {
                        id: 'matches',
                        label: 'Match Management',
                        icon: 'calendar',
                        path: '/coach/matches'
                    },
                    {
                        id: 'statistics',
                        label: 'Statistics & Analytics',
                        icon: 'bar-chart',
                        path: '/coach/statistics'
                    },
                    {
                        id: 'development-plans',
                        label: 'Development Plans',
                        icon: 'target',
                        path: '/coach/development-plans'
                    },
                    {
                        id: 'communication',
                        label: 'Communication',
                        icon: 'message-circle',
                        path: '/announcements'
                    },
                    {
                        id: 'reports',
                        label: 'Reports',
                        icon: 'file-text',
                        children: [
                            {
                                id: 'player-reports',
                                label: 'Player Reports',
                                path: '/coach/players'
                            },
                            {
                                id: 'injuries',
                                label: 'Injury Reports',
                                path: '/coach/injuries'
                            },
                            {
                                id: 'ai-analytics',
                                label: 'AI Analytics',
                                path: '/coach/ai-analytics'
                            }
                        ]
                    }
                ];

            case 'player':
                return [
                    {
                        id: 'dashboard',
                        label: 'Dashboard',
                        icon: 'home',
                        path: '/player/dashboard'
                    },
                    {
                        id: 'personal-stats',
                        label: 'Personal Stats',
                        icon: 'trending-up',
                        path: '/player/dashboard'
                    },
                    {
                        id: 'matches',
                        label: 'My Matches',
                        icon: 'calendar',
                        path: '/player/matches'
                    },
                    {
                        id: 'training',
                        label: 'Training Attendance',
                        icon: 'clock',
                        path: '/player/trainings'
                    },
                    {
                        id: 'development',
                        label: 'Development Progress',
                        icon: 'target',
                        path: '/player/development-plans'
                    },
                    {
                        id: 'qr-code',
                        label: 'My QR Code',
                        icon: 'qr-code',
                        path: '/player/qr-checkin'
                    }
                ];

            case 'parent':
                return [
                    {
                        id: 'dashboard',
                        label: 'Family Overview',
                        icon: 'home',
                        path: '/parent/dashboard'
                    },
                    {
                        id: 'child-progress',
                        label: 'Child Progress',
                        icon: 'trending-up',
                        path: '/parent/dashboard'
                    },
                    {
                        id: 'calendar',
                        label: 'Calendar & Events',
                        icon: 'calendar',
                        path: '/parent/matches'
                    },
                    {
                        id: 'communication',
                        label: 'Communication',
                        icon: 'message-circle',
                        path: '/announcements'
                    },
                    {
                        id: 'payments',
                        label: 'Payments',
                        icon: 'credit-card',
                        path: '/parent/billing'
                    }
                ];

            default:
                return [];
        }
    };

    const renderIcon = (iconName) => {
        const icons = {
            'home': (
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            ),
            'users': (
                <>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </>
            ),
            'user': (
                <>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </>
            ),
            'shield': (
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            ),
            'clock': (
                <>
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </>
            ),
            'calendar': (
                <>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </>
            ),
            'bar-chart': (
                <>
                    <line x1="12" y1="20" x2="12" y2="10"></line>
                    <line x1="18" y1="20" x2="18" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="16"></line>
                </>
            ),
            'target': (
                <>
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                </>
            ),
            'message-circle': (
                <>
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </>
            ),
            'file-text': (
                <>
                    <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                    <line x1="9" y1="9" x2="10" y2="9"></line>
                    <line x1="9" y1="13" x2="15" y2="13"></line>
                    <line x1="9" y1="17" x2="15" y2="17"></line>
                </>
            ),
            'trending-up': (
                <>
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                </>
            ),
            'qr-code': (
                <>
                    <rect x="3" y="3" width="5" height="5"></rect>
                    <rect x="16" y="3" width="5" height="5"></rect>
                    <rect x="3" y="16" width="5" height="5"></rect>
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
                    <path d="M21 21v.01"></path>
                    <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
                    <path d="M3 12h.01"></path>
                    <path d="M12 3h.01"></path>
                    <path d="M12 16v.01"></path>
                    <path d="M16 12h1"></path>
                    <path d="M21 12v.01"></path>
                    <path d="M12 21v-1"></path>
                </>
            ),
            'credit-card': (
                <>
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                </>
            ),
            'heart': (
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            ),
            'cpu': (
                <>
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                    <rect x="9" y="9" width="6" height="6"></rect>
                    <line x1="9" y1="1" x2="9" y2="4"></line>
                    <line x1="15" y1="1" x2="15" y2="4"></line>
                    <line x1="9" y1="20" x2="9" y2="23"></line>
                    <line x1="15" y1="20" x2="15" y2="23"></line>
                    <line x1="20" y1="9" x2="23" y2="9"></line>
                    <line x1="20" y1="14" x2="23" y2="14"></line>
                    <line x1="1" y1="9" x2="4" y2="9"></line>
                    <line x1="1" y1="14" x2="4" y2="14"></line>
                </>
            ),
            'chevron-down': (
                <polyline points="6 9 12 15 18 9"></polyline>
            ),
            'chevron-right': (
                <polyline points="9 18 15 12 9 6"></polyline>
            )
        };

        return (
            <svg 
                className="sidebar__nav-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {icons[iconName] || icons['home']}
            </svg>
        );
    };

    const renderNavItem = (item) => {
        if (item.children) {
            const isExpanded = expandedSections[item.id];
            const hasActiveChild = isParentActive(item.children.map(child => child.path));
            
            return (
                <div key={item.id} className="sidebar__nav-group">
                    <button
                        className={`sidebar__nav-item sidebar__nav-item--parent ${hasActiveChild ? 'sidebar__nav-item--active' : ''}`}
                        onClick={() => toggleSection(item.id)}
                        aria-expanded={isExpanded}
                    >
                        <div className="sidebar__nav-item-content">
                            {renderIcon(item.icon)}
                            <span className="sidebar__nav-label">{item.label}</span>
                        </div>
                        <svg 
                            className={`sidebar__nav-chevron ${isExpanded ? 'sidebar__nav-chevron--expanded' : ''}`}
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    
                    {isExpanded && (
                        <div className="sidebar__nav-children">
                            {item.children.map(child => (
                                <Link
                                    key={child.id}
                                    to={child.path}
                                    className={`sidebar__nav-item sidebar__nav-item--child ${isActive(child.path) ? 'sidebar__nav-item--active' : ''}`}
                                    onClick={onClose}
                                >
                                    <div className="sidebar__nav-item-content">
                                        <div className="sidebar__nav-child-indicator"></div>
                                        <span className="sidebar__nav-label">{child.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.id}
                to={item.path}
                className={`sidebar__nav-item ${isActive(item.path) ? 'sidebar__nav-item--active' : ''}`}
                onClick={onClose}
            >
                <div className="sidebar__nav-item-content">
                    {renderIcon(item.icon)}
                    <span className="sidebar__nav-label">{item.label}</span>
                </div>
            </Link>
        );
    };

    const navigationItems = getNavigationItems();

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div 
                    className="sidebar__overlay"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar__header">
                    <div className="sidebar__user-info">
                        <div className="sidebar__user-avatar">
                            {user?.profile_picture ? (
                                <img 
                                    src={user.profile_picture} 
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="sidebar__user-avatar-image"
                                />
                            ) : (
                                <span className="sidebar__user-avatar-initials">
                                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                                </span>
                            )}
                        </div>
                        <div className="sidebar__user-details">
                            <div className="sidebar__user-name">
                                {user?.first_name} {user?.last_name}
                            </div>
                            <div className="sidebar__user-role">
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </div>
                        </div>
                    </div>
                    
                    <button
                        className="sidebar__close-btn"
                        onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="sidebar__divider"></div>

                <nav className="sidebar__nav">
                    {navigationItems.map(item => renderNavItem(item))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;