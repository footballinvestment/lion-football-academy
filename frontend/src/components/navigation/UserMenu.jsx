import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLogout } from '../../hooks/useAuth';
import './UserMenu.css';

const UserMenu = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { logout, isLoggingOut } = useLogout();
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleMenuItemClick = () => {
        setIsOpen(false);
    };

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
    };

    const getUserInitials = () => {
        if (!user?.first_name || !user?.last_name) return 'U';
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    };

    const getRoleColor = () => {
        const colors = {
            admin: 'user-menu__avatar--admin',
            coach: 'user-menu__avatar--coach',
            player: 'user-menu__avatar--player',
            parent: 'user-menu__avatar--parent'
        };
        return colors[user?.role] || 'user-menu__avatar--default';
    };

    return (
        <div className="user-menu">
            <button
                ref={buttonRef}
                className="user-menu__trigger"
                onClick={handleToggle}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="User menu"
            >
                <div className={`user-menu__avatar ${getRoleColor()}`}>
                    {user?.profile_picture ? (
                        <img 
                            src={user.profile_picture} 
                            alt={`${user.first_name} ${user.last_name}`}
                            className="user-menu__avatar-image"
                        />
                    ) : (
                        <span className="user-menu__avatar-initials">
                            {getUserInitials()}
                        </span>
                    )}
                </div>
                
                <div className="user-menu__info">
                    <span className="user-menu__name">
                        {user?.first_name} {user?.last_name}
                    </span>
                    <span className="user-menu__email">
                        {user?.email}
                    </span>
                </div>
                
                <svg 
                    className={`user-menu__chevron ${isOpen ? 'user-menu__chevron--up' : ''}`}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div 
                    ref={menuRef}
                    className="user-menu__dropdown"
                    role="menu"
                    aria-orientation="vertical"
                >
                    {/* User Info Header */}
                    <div className="user-menu__header">
                        <div className={`user-menu__avatar ${getRoleColor()}`}>
                            {user?.profile_picture ? (
                                <img 
                                    src={user.profile_picture} 
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="user-menu__avatar-image"
                                />
                            ) : (
                                <span className="user-menu__avatar-initials">
                                    {getUserInitials()}
                                </span>
                            )}
                        </div>
                        <div className="user-menu__header-info">
                            <div className="user-menu__header-name">
                                {user?.first_name} {user?.last_name}
                            </div>
                            <div className="user-menu__header-role">
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </div>
                            <div className="user-menu__header-email">
                                {user?.email}
                            </div>
                        </div>
                    </div>

                    <div className="user-menu__divider"></div>

                    {/* Menu Items */}
                    <div className="user-menu__items">
                        <Link 
                            to="/profile" 
                            className="user-menu__item"
                            onClick={handleMenuItemClick}
                            role="menuitem"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>Profile Settings</span>
                        </Link>

                        <Link 
                            to="/notifications" 
                            className="user-menu__item"
                            onClick={handleMenuItemClick}
                            role="menuitem"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            <span>Notifications</span>
                        </Link>

                        {user?.role === 'admin' && (
                            <Link 
                                to="/admin/settings" 
                                className="user-menu__item"
                                onClick={handleMenuItemClick}
                                role="menuitem"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                <span>System Settings</span>
                            </Link>
                        )}

                        <Link 
                            to="/help" 
                            className="user-menu__item"
                            onClick={handleMenuItemClick}
                            role="menuitem"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <span>Help & Support</span>
                        </Link>
                    </div>

                    <div className="user-menu__divider"></div>

                    {/* Logout */}
                    <button 
                        className="user-menu__item user-menu__item--logout"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        role="menuitem"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenu;