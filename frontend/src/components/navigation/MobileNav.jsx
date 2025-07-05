import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './MobileNav.css';

const MobileNav = () => {
    const { user } = useAuth();
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
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
                        label: 'Users',
                        icon: 'users',
                        path: '/admin/users'
                    },
                    {
                        id: 'teams',
                        label: 'Teams',
                        icon: 'shield',
                        path: '/admin/teams'
                    },
                    {
                        id: 'statistics',
                        label: 'Stats',
                        icon: 'bar-chart',
                        path: '/admin/statistics'
                    },
                    {
                        id: 'billing',
                        label: 'Billing',
                        icon: 'credit-card',
                        path: '/admin/billing'
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
                        label: 'Teams',
                        icon: 'shield',
                        path: '/coach/teams'
                    },
                    {
                        id: 'trainings',
                        label: 'Training',
                        icon: 'clock',
                        path: '/coach/trainings'
                    },
                    {
                        id: 'matches',
                        label: 'Matches',
                        icon: 'calendar',
                        path: '/coach/matches'
                    },
                    {
                        id: 'statistics',
                        label: 'Stats',
                        icon: 'bar-chart',
                        path: '/coach/statistics'
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
                        id: 'matches',
                        label: 'Matches',
                        icon: 'calendar',
                        path: '/player/matches'
                    },
                    {
                        id: 'trainings',
                        label: 'Training',
                        icon: 'clock',
                        path: '/player/trainings'
                    },
                    {
                        id: 'development',
                        label: 'Progress',
                        icon: 'trending-up',
                        path: '/player/development-plans'
                    },
                    {
                        id: 'qr-code',
                        label: 'QR Code',
                        icon: 'qr-code',
                        path: '/player/qr-checkin'
                    }
                ];

            case 'parent':
                return [
                    {
                        id: 'dashboard',
                        label: 'Overview',
                        icon: 'home',
                        path: '/parent/dashboard'
                    },
                    {
                        id: 'progress',
                        label: 'Progress',
                        icon: 'trending-up',
                        path: '/parent/dashboard'
                    },
                    {
                        id: 'calendar',
                        label: 'Calendar',
                        icon: 'calendar',
                        path: '/parent/matches'
                    },
                    {
                        id: 'communication',
                        label: 'Messages',
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
            'message-circle': (
                <>
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </>
            ),
            'credit-card': (
                <>
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                </>
            )
        };

        return (
            <svg 
                className="mobile-nav__icon" 
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

    const navigationItems = getNavigationItems();

    if (navigationItems.length === 0) {
        return null;
    }

    return (
        <nav className="mobile-nav">
            <div className="mobile-nav__container">
                {navigationItems.map(item => (
                    <Link
                        key={item.id}
                        to={item.path}
                        className={`mobile-nav__item ${isActive(item.path) ? 'mobile-nav__item--active' : ''}`}
                    >
                        <div className="mobile-nav__icon-container">
                            {renderIcon(item.icon)}
                            {isActive(item.path) && (
                                <div className="mobile-nav__active-indicator" />
                            )}
                        </div>
                        <span className="mobile-nav__label">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;