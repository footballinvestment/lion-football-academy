import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';
import UserMenu from './UserMenu';
import './Navbar.css';

const Navbar = ({ onSidebarToggle, sidebarOpen }) => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getRoleDisplayName = (role) => {
        const roleNames = {
            admin: 'Administrator',
            coach: 'Coach',
            player: 'Player',
            parent: 'Parent'
        };
        return roleNames[role] || role;
    };

    const getLogo = () => (
        <div className="navbar__logo">
            <img 
                src="/images/lion-logo.png" 
                alt="Lion Football Academy" 
                className="navbar__logo-image"
                onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                }}
            />
            <div className="navbar__logo-fallback" style={{ display: 'none' }}>
                🦁
            </div>
            <span className="navbar__logo-text">
                Lion Football Academy
            </span>
        </div>
    );

    if (!isAuthenticated) {
        return (
            <nav className={`navbar navbar--public ${isScrolled ? 'navbar--scrolled' : ''}`}>
                <div className="navbar__container">
                    <Link to="/login" className="navbar__brand">
                        {getLogo()}
                    </Link>
                    
                    <div className="navbar__actions">
                        <Link to="/login">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className={`navbar navbar--authenticated ${isScrolled ? 'navbar--scrolled' : ''}`}>
            <div className="navbar__container">
                {/* Mobile Menu Toggle */}
                <button 
                    className="navbar__menu-toggle"
                    onClick={onSidebarToggle}
                    aria-label="Toggle navigation menu"
                    aria-expanded={sidebarOpen}
                >
                    <span className={`navbar__hamburger ${sidebarOpen ? 'navbar__hamburger--open' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </button>

                {/* Logo */}
                <Link to="/" className="navbar__brand">
                    {getLogo()}
                </Link>

                {/* Center Info (Desktop) */}
                <div className="navbar__center">
                    {user && (
                        <div className="navbar__user-info">
                            <span className="navbar__user-role">
                                {getRoleDisplayName(user.role)}
                            </span>
                            <span className="navbar__user-name">
                                {user.first_name} {user.last_name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right Actions */}
                <div className="navbar__actions">
                    {/* Notifications (if applicable) */}
                    <button 
                        className="navbar__notification-btn"
                        aria-label="Notifications"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span className="navbar__notification-badge">3</span>
                    </button>

                    {/* User Menu */}
                    <UserMenu user={user} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;