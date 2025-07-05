import React, { useState, useRef, useEffect } from 'react';
import { Button, Badge } from '../ui';
import { useNotification } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import './Communication.css';

const NotificationBell = () => {
    const { 
        notifications, 
        totalUnread, 
        markAsRead, 
        markAllAsRead, 
        clearNotification 
    } = useNotification();
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'message':
                return '💬';
            case 'announcement':
                return '📢';
            case 'emergency':
                return '🚨';
            case 'reminder':
                return '⏰';
            case 'achievement':
                return '🏆';
            case 'payment':
                return '💳';
            case 'match':
                return '⚽';
            case 'training':
                return '🏃';
            case 'injury':
                return '🏥';
            default:
                return '🔔';
        }
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'notification-item--urgent';
            case 'high':
                return 'notification-item--high';
            default:
                return '';
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        
        // Handle notification actions
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }
        
        setIsOpen(false);
    };

    const recentNotifications = notifications.slice(0, 10);

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="sm"
                className="notification-bell__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="notification-bell__icon">
                    🔔
                </span>
                {totalUnread > 0 && (
                    <Badge 
                        variant="error" 
                        size="sm" 
                        className="notification-bell__badge"
                    >
                        {totalUnread > 99 ? '99+' : totalUnread}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <div className="notification-bell__dropdown">
                    <div className="notification-bell__header">
                        <h3>Notifications</h3>
                        {totalUnread > 0 && (
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={markAllAsRead}
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>

                    <div className="notification-bell__list">
                        {recentNotifications.length === 0 ? (
                            <div className="notification-bell__empty">
                                <div className="notification-bell__empty-icon">🔔</div>
                                <p>No notifications</p>
                                <span>You're all caught up!</span>
                            </div>
                        ) : (
                            recentNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-bell__item ${
                                        !notification.read ? 'notification-bell__item--unread' : ''
                                    } ${getPriorityClass(notification.priority)}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-bell__item-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    
                                    <div className="notification-bell__item-content">
                                        <div className="notification-bell__item-header">
                                            <h4 className="notification-bell__item-title">
                                                {notification.title}
                                            </h4>
                                            <span className="notification-bell__item-time">
                                                {formatDistanceToNow(
                                                    new Date(notification.created_at),
                                                    { addSuffix: true }
                                                )}
                                            </span>
                                        </div>
                                        
                                        <p className="notification-bell__item-message">
                                            {notification.message}
                                        </p>
                                        
                                        {notification.priority === 'urgent' && (
                                            <div className="notification-bell__urgent-badge">
                                                🚨 URGENT
                                            </div>
                                        )}
                                    </div>

                                    <div className="notification-bell__item-actions">
                                        {!notification.read && (
                                            <div className="notification-bell__unread-dot"></div>
                                        )}
                                        
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearNotification(notification.id);
                                            }}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 10 && (
                        <div className="notification-bell__footer">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsOpen(false);
                                    // Navigate to full notifications page
                                    window.location.href = '/notifications';
                                }}
                            >
                                View all notifications ({notifications.length})
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;