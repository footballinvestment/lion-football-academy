import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Notification types
export const NOTIFICATION_TYPES = {
    MESSAGE: 'message',
    ANNOUNCEMENT: 'announcement',
    EMERGENCY: 'emergency',
    REMINDER: 'reminder',
    ACHIEVEMENT: 'achievement',
    PAYMENT: 'payment',
    MATCH: 'match',
    TRAINING: 'training',
    INJURY: 'injury',
    SYSTEM: 'system'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
};

// Action types
const NOTIFICATION_ACTIONS = {
    SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
    ADD_NOTIFICATION: 'ADD_NOTIFICATION',
    UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
    REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
    MARK_AS_READ: 'MARK_AS_READ',
    MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
    SET_UNREAD_COUNTS: 'SET_UNREAD_COUNTS',
    UPDATE_UNREAD_COUNT: 'UPDATE_UNREAD_COUNT',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
    notifications: [],
    unreadCounts: {},
    totalUnread: 0,
    loading: false,
    error: null,
    connected: false
};

// Reducer
const notificationReducer = (state, action) => {
    switch (action.type) {
        case NOTIFICATION_ACTIONS.SET_NOTIFICATIONS:
            return {
                ...state,
                notifications: action.payload,
                totalUnread: action.payload.filter(n => !n.read).length
            };

        case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
            const newNotification = action.payload;
            const updatedNotifications = [newNotification, ...state.notifications];
            return {
                ...state,
                notifications: updatedNotifications,
                totalUnread: updatedNotifications.filter(n => !n.read).length
            };

        case NOTIFICATION_ACTIONS.UPDATE_NOTIFICATION:
            return {
                ...state,
                notifications: state.notifications.map(notification =>
                    notification.id === action.payload.id
                        ? { ...notification, ...action.payload.updates }
                        : notification
                ),
                totalUnread: state.notifications.filter(n => !n.read).length
            };

        case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
            const filteredNotifications = state.notifications.filter(
                notification => notification.id !== action.payload
            );
            return {
                ...state,
                notifications: filteredNotifications,
                totalUnread: filteredNotifications.filter(n => !n.read).length
            };

        case NOTIFICATION_ACTIONS.MARK_AS_READ:
            return {
                ...state,
                notifications: state.notifications.map(notification =>
                    notification.id === action.payload
                        ? { ...notification, read: true, read_at: new Date().toISOString() }
                        : notification
                ),
                totalUnread: Math.max(0, state.totalUnread - 1)
            };

        case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
            return {
                ...state,
                notifications: state.notifications.map(notification => ({
                    ...notification,
                    read: true,
                    read_at: new Date().toISOString()
                })),
                totalUnread: 0,
                unreadCounts: {}
            };

        case NOTIFICATION_ACTIONS.SET_UNREAD_COUNTS:
            return {
                ...state,
                unreadCounts: action.payload
            };

        case NOTIFICATION_ACTIONS.UPDATE_UNREAD_COUNT:
            return {
                ...state,
                unreadCounts: {
                    ...state.unreadCounts,
                    [action.payload.key]: action.payload.count
                }
            };

        case NOTIFICATION_ACTIONS.SET_LOADING:
            return {
                ...state,
                loading: action.payload
            };

        case NOTIFICATION_ACTIONS.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                loading: false
            };

        case NOTIFICATION_ACTIONS.CLEAR_ERROR:
            return {
                ...state,
                error: null
            };

        default:
            return state;
    }
};

// Context
const NotificationContext = createContext();

// Provider component
export const NotificationProvider = ({ children }) => {
    const [state, dispatch] = useReducer(notificationReducer, initialState);
    const { user, isAuthenticated } = useAuth();

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            dispatch({ type: NOTIFICATION_ACTIONS.SET_LOADING, payload: true });
            dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ERROR });

            const response = await api.get('/notifications');
            dispatch({ 
                type: NOTIFICATION_ACTIONS.SET_NOTIFICATIONS, 
                payload: response.data 
            });

            // Fetch unread counts
            const countsResponse = await api.get('/notifications/unread-counts');
            dispatch({ 
                type: NOTIFICATION_ACTIONS.SET_UNREAD_COUNTS, 
                payload: countsResponse.data 
            });

        } catch (error) {
            console.error('Error fetching notifications:', error);
            dispatch({ 
                type: NOTIFICATION_ACTIONS.SET_ERROR, 
                payload: 'Failed to load notifications' 
            });
        } finally {
            dispatch({ type: NOTIFICATION_ACTIONS.SET_LOADING, payload: false });
        }
    }, [isAuthenticated]);

    // Add notification
    const addNotification = useCallback((notification) => {
        dispatch({ 
            type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION, 
            payload: {
                id: Date.now() + Math.random(),
                created_at: new Date().toISOString(),
                read: false,
                ...notification
            }
        });

        // Show browser notification if permission granted
        if (Notification.permission === 'granted' && notification.priority !== 'low') {
            new Notification(notification.title || 'Lion Football Academy', {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.type || 'notification'
            });
        }
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            dispatch({ 
                type: NOTIFICATION_ACTIONS.MARK_AS_READ, 
                payload: notificationId 
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            await api.put('/notifications/mark-all-read');
            dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, []);

    // Clear notification
    const clearNotification = useCallback(async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            dispatch({ 
                type: NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION, 
                payload: notificationId 
            });
        } catch (error) {
            console.error('Error clearing notification:', error);
        }
    }, []);

    // Send notification to specific user(s)
    const sendNotification = useCallback(async (notificationData) => {
        try {
            const response = await api.post('/notifications/send', notificationData);
            return response.data;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }, []);

    // Send team announcement
    const sendTeamAnnouncement = useCallback(async (teamId, announcement) => {
        try {
            const response = await api.post('/notifications/team-announcement', {
                team_id: teamId,
                ...announcement
            });
            return response.data;
        } catch (error) {
            console.error('Error sending team announcement:', error);
            throw error;
        }
    }, []);

    // Send emergency alert
    const sendEmergencyAlert = useCallback(async (alertData) => {
        try {
            const response = await api.post('/notifications/emergency-alert', alertData);
            return response.data;
        } catch (error) {
            console.error('Error sending emergency alert:', error);
            throw error;
        }
    }, []);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }, []);

    // Setup WebSocket for real-time notifications
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        let socket;
        let reconnectTimeout;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        const connectWebSocket = () => {
            try {
                const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
                socket = new WebSocket(`${wsUrl}/notifications?userId=${user.id}`);

                socket.onopen = () => {
                    console.log('Notification WebSocket connected');
                    reconnectAttempts = 0;
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        switch (data.type) {
                            case 'notification':
                                addNotification(data.notification);
                                break;
                            case 'notification_read':
                                dispatch({ 
                                    type: NOTIFICATION_ACTIONS.MARK_AS_READ, 
                                    payload: data.notificationId 
                                });
                                break;
                            case 'unread_count_update':
                                dispatch({
                                    type: NOTIFICATION_ACTIONS.UPDATE_UNREAD_COUNT,
                                    payload: data
                                });
                                break;
                            default:
                                console.log('Unknown WebSocket message type:', data.type);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                socket.onclose = () => {
                    console.log('Notification WebSocket disconnected');
                    
                    // Attempt to reconnect
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                        
                        reconnectTimeout = setTimeout(() => {
                            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                            connectWebSocket();
                        }, delay);
                    }
                };

                socket.onerror = (error) => {
                    console.error('Notification WebSocket error:', error);
                };

                // Store socket reference globally for other components to use
                window.notificationSocket = socket;

            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
            }
        };

        // Initial connection
        connectWebSocket();

        // Cleanup
        return () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (socket) {
                socket.close();
                window.notificationSocket = null;
            }
        };
    }, [isAuthenticated, user, addNotification]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, [requestNotificationPermission]);

    const value = {
        // State
        notifications: state.notifications,
        unreadCounts: state.unreadCounts,
        totalUnread: state.totalUnread,
        loading: state.loading,
        error: state.error,
        connected: state.connected,

        // Actions
        fetchNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        sendNotification,
        sendTeamAnnouncement,
        sendEmergencyAlert,
        requestNotificationPermission,

        // Constants
        NOTIFICATION_TYPES,
        NOTIFICATION_PRIORITIES
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

// Hook to use notification context
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;