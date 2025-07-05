import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './Communication.css';

const Communication = () => {
    const { user } = useAuth();
    const [communicationData, setCommunicationData] = useState({
        messages: [],
        announcements: [],
        conversations: [],
        coaches: [],
        notifications: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('messages');
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [messageRecipient, setMessageRecipient] = useState('');
    const [messageSubject, setMessageSubject] = useState('');
    const [showNewMessage, setShowNewMessage] = useState(false);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchCommunicationData();
    }, []);

    const fetchCommunicationData = async () => {
        try {
            setLoading(true);
            setError('');

            const [messagesRes, announcementsRes, conversationsRes, coachesRes, notificationsRes] = await Promise.all([
                api.get('/parent/messages'),
                api.get('/parent/announcements'),
                api.get('/parent/conversations'),
                api.get('/parent/coaches'),
                api.get('/parent/notifications')
            ]);

            setCommunicationData({
                messages: messagesRes.data,
                announcements: announcementsRes.data,
                conversations: conversationsRes.data,
                coaches: coachesRes.data,
                notifications: notificationsRes.data
            });
        } catch (error) {
            console.error('Error fetching communication data:', error);
            setError('Failed to load communication data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!messageRecipient || !messageSubject || !newMessage.trim()) return;

        try {
            setError('');
            await api.post('/parent/send-message', {
                recipient_id: messageRecipient,
                subject: messageSubject,
                message: newMessage
            });

            setSuccess('Message sent successfully!');
            setNewMessage('');
            setMessageSubject('');
            setMessageRecipient('');
            setShowNewMessage(false);
            fetchCommunicationData();
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
        }
    };

    const markAsRead = async (messageId) => {
        try {
            await api.patch(`/parent/messages/${messageId}/read`);
            fetchCommunicationData();
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    const markAnnouncementAsRead = async (announcementId) => {
        try {
            await api.patch(`/parent/announcements/${announcementId}/read`);
            fetchCommunicationData();
        } catch (error) {
            console.error('Error marking announcement as read:', error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateLong = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getMessageIcon = (type) => {
        const icons = {
            message: '💬',
            announcement: '📢',
            alert: '🚨',
            reminder: '⏰',
            invitation: '📩',
            report: '📊'
        };
        return icons[type] || '💬';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            high: 'error',
            medium: 'warning',
            low: 'info'
        };
        return colors[priority] || 'gray';
    };

    const filteredMessages = communicationData.messages.filter(message => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !message.read_at;
        if (filter === 'important') return message.priority === 'high';
        return true;
    });

    const filteredAnnouncements = communicationData.announcements.filter(announcement => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !announcement.read_at;
        if (filter === 'important') return announcement.priority === 'high';
        return true;
    });

    if (loading) {
        return (
            <div className="family-communication">
                <div className="family-communication__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading communication center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="family-communication">
            {/* Header */}
            <div className="family-communication__header">
                <div className="family-communication__header-content">
                    <div className="family-communication__title">
                        <h1>💬 Family Communication</h1>
                        <p>Stay connected with coaches and academy updates</p>
                    </div>
                    <div className="family-communication__header-actions">
                        <Button 
                            onClick={() => setShowNewMessage(true)}
                            variant="primary"
                        >
                            ✉️ New Message
                        </Button>
                        <select 
                            className="family-communication__filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">All Messages</option>
                            <option value="unread">Unread Only</option>
                            <option value="important">Important</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert type="success" onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="messages">
                            Private Messages
                            {communicationData.messages.filter(m => !m.read_at).length > 0 && (
                                <span className="family-communication__badge">
                                    {communicationData.messages.filter(m => !m.read_at).length}
                                </span>
                            )}
                        </Tabs.Trigger>
                        <Tabs.Trigger value="announcements">
                            Academy News
                            {communicationData.announcements.filter(a => !a.read_at).length > 0 && (
                                <span className="family-communication__badge">
                                    {communicationData.announcements.filter(a => !a.read_at).length}
                                </span>
                            )}
                        </Tabs.Trigger>
                        <Tabs.Trigger value="conversations">Conversations</Tabs.Trigger>
                        <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
                    </Tabs.List>

                    {/* Private Messages Tab */}
                    <Tabs.Content value="messages">
                        <div className="family-communication__section">
                            <div className="family-communication__section-header">
                                <h3>📨 Private Messages</h3>
                                <p>Direct communication with coaches and academy staff</p>
                            </div>

                            {filteredMessages.length > 0 ? (
                                <div className="family-communication__messages-list">
                                    {filteredMessages.map((message, index) => (
                                        <div 
                                            key={index} 
                                            className={`family-communication__message-item ${
                                                !message.read_at ? 'family-communication__message-item--unread' : ''
                                            } family-communication__message-item--${getPriorityColor(message.priority)}`}
                                            onClick={() => markAsRead(message.id)}
                                        >
                                            <div className="family-communication__message-header">
                                                <div className="family-communication__sender-info">
                                                    <div className="family-communication__sender-avatar">
                                                        {message.sender_photo ? (
                                                            <img src={message.sender_photo} alt={message.sender_name} />
                                                        ) : (
                                                            <div className="family-communication__sender-initials">
                                                                {message.sender_name?.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="family-communication__sender-details">
                                                        <h4>{message.sender_name}</h4>
                                                        <p>{message.sender_role}</p>
                                                    </div>
                                                </div>
                                                <div className="family-communication__message-meta">
                                                    <span className="family-communication__message-date">
                                                        {formatDate(message.sent_at)}
                                                    </span>
                                                    {message.priority === 'high' && (
                                                        <span className="family-communication__priority-badge">
                                                            🚨 High Priority
                                                        </span>
                                                    )}
                                                    {!message.read_at && (
                                                        <span className="family-communication__unread-indicator">
                                                            ●
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="family-communication__message-content">
                                                <h5>{message.subject}</h5>
                                                <p>{message.message}</p>
                                                {message.child_name && (
                                                    <span className="family-communication__child-tag">
                                                        Re: {message.child_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="family-communication__message-actions">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMessageRecipient(message.sender_id);
                                                        setMessageSubject(`Re: ${message.subject}`);
                                                        setShowNewMessage(true);
                                                    }}
                                                >
                                                    ↩️ Reply
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-communication__empty-state">
                                    <div className="family-communication__empty-icon">📬</div>
                                    <h4>No Messages</h4>
                                    <p>You have no private messages at this time.</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Academy Announcements Tab */}
                    <Tabs.Content value="announcements">
                        <div className="family-communication__section">
                            <div className="family-communication__section-header">
                                <h3>📢 Academy News & Announcements</h3>
                                <p>Important updates and news from Lion Football Academy</p>
                            </div>

                            {filteredAnnouncements.length > 0 ? (
                                <div className="family-communication__announcements-list">
                                    {filteredAnnouncements.map((announcement, index) => (
                                        <div 
                                            key={index}
                                            className={`family-communication__announcement-item ${
                                                !announcement.read_at ? 'family-communication__announcement-item--unread' : ''
                                            } family-communication__announcement-item--${getPriorityColor(announcement.priority)}`}
                                            onClick={() => markAnnouncementAsRead(announcement.id)}
                                        >
                                            <div className="family-communication__announcement-header">
                                                <div className="family-communication__announcement-icon">
                                                    {getMessageIcon(announcement.type)}
                                                </div>
                                                <div className="family-communication__announcement-meta">
                                                    <h4>{announcement.title}</h4>
                                                    <div className="family-communication__announcement-info">
                                                        <span>By {announcement.author_name}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(announcement.published_at)}</span>
                                                        {announcement.priority === 'high' && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="family-communication__priority-badge">
                                                                    🚨 Important
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {!announcement.read_at && (
                                                    <span className="family-communication__unread-indicator">
                                                        ●
                                                    </span>
                                                )}
                                            </div>
                                            <div className="family-communication__announcement-content">
                                                <p>{announcement.content}</p>
                                                {announcement.tags && announcement.tags.length > 0 && (
                                                    <div className="family-communication__announcement-tags">
                                                        {announcement.tags.map((tag, tagIndex) => (
                                                            <span key={tagIndex} className="family-communication__tag">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {announcement.attachments && announcement.attachments.length > 0 && (
                                                <div className="family-communication__announcement-attachments">
                                                    <h6>📎 Attachments:</h6>
                                                    {announcement.attachments.map((attachment, attachIndex) => (
                                                        <a 
                                                            key={attachIndex}
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="family-communication__attachment-link"
                                                        >
                                                            📄 {attachment.name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-communication__empty-state">
                                    <div className="family-communication__empty-icon">📢</div>
                                    <h4>No Announcements</h4>
                                    <p>No academy announcements available at this time.</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Conversations Tab */}
                    <Tabs.Content value="conversations">
                        <div className="family-communication__section">
                            <div className="family-communication__section-header">
                                <h3>👥 Conversation History</h3>
                                <p>Your ongoing conversations with academy staff</p>
                            </div>

                            {communicationData.conversations.length > 0 ? (
                                <div className="family-communication__conversations-list">
                                    {communicationData.conversations.map((conversation, index) => (
                                        <div 
                                            key={index}
                                            className="family-communication__conversation-item"
                                            onClick={() => setSelectedConversation(conversation)}
                                        >
                                            <div className="family-communication__conversation-header">
                                                <div className="family-communication__participants">
                                                    <div className="family-communication__participant-avatars">
                                                        {conversation.participants.map((participant, pIndex) => (
                                                            <div key={pIndex} className="family-communication__participant-avatar">
                                                                {participant.photo ? (
                                                                    <img src={participant.photo} alt={participant.name} />
                                                                ) : (
                                                                    <div className="family-communication__participant-initials">
                                                                        {participant.name?.split(' ').map(n => n[0]).join('')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="family-communication__conversation-info">
                                                        <h4>{conversation.subject}</h4>
                                                        <p>
                                                            {conversation.participants.map(p => p.name).join(', ')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="family-communication__conversation-meta">
                                                    <span className="family-communication__last-message-date">
                                                        {formatDate(conversation.last_message_at)}
                                                    </span>
                                                    {conversation.unread_count > 0 && (
                                                        <span className="family-communication__unread-count">
                                                            {conversation.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="family-communication__last-message">
                                                <p>{conversation.last_message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-communication__empty-state">
                                    <div className="family-communication__empty-icon">👥</div>
                                    <h4>No Conversations</h4>
                                    <p>Start a conversation by sending a message to your coach!</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Notifications Tab */}
                    <Tabs.Content value="notifications">
                        <div className="family-communication__section">
                            <div className="family-communication__section-header">
                                <h3>🔔 Notifications</h3>
                                <p>System notifications and alerts for your family</p>
                            </div>

                            {communicationData.notifications.length > 0 ? (
                                <div className="family-communication__notifications-list">
                                    {communicationData.notifications.map((notification, index) => (
                                        <div 
                                            key={index}
                                            className={`family-communication__notification-item family-communication__notification-item--${notification.type}`}
                                        >
                                            <div className="family-communication__notification-icon">
                                                {notification.type === 'payment' && '💰'}
                                                {notification.type === 'schedule' && '📅'}
                                                {notification.type === 'achievement' && '🏆'}
                                                {notification.type === 'reminder' && '⏰'}
                                                {notification.type === 'alert' && '🚨'}
                                            </div>
                                            <div className="family-communication__notification-content">
                                                <h4>{notification.title}</h4>
                                                <p>{notification.message}</p>
                                                <span className="family-communication__notification-time">
                                                    {formatDate(notification.created_at)}
                                                </span>
                                            </div>
                                            {notification.action_url && (
                                                <div className="family-communication__notification-action">
                                                    <Button 
                                                        as="a"
                                                        href={notification.action_url}
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        {notification.action_text || 'View'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-communication__empty-state">
                                    <div className="family-communication__empty-icon">🔔</div>
                                    <h4>No Notifications</h4>
                                    <p>You're all caught up! No new notifications.</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>

            {/* New Message Modal */}
            {showNewMessage && (
                <div className="family-communication__modal-overlay" onClick={() => setShowNewMessage(false)}>
                    <div className="family-communication__modal" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={sendMessage}>
                            <div className="family-communication__modal-header">
                                <h3>✉️ Send New Message</h3>
                                <Button 
                                    type="button"
                                    onClick={() => setShowNewMessage(false)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    ✕
                                </Button>
                            </div>
                            <div className="family-communication__modal-content">
                                <div className="family-communication__form-group">
                                    <label htmlFor="recipient">To:</label>
                                    <select 
                                        id="recipient"
                                        value={messageRecipient}
                                        onChange={(e) => setMessageRecipient(e.target.value)}
                                        required
                                    >
                                        <option value="">Select recipient...</option>
                                        {communicationData.coaches.map(coach => (
                                            <option key={coach.id} value={coach.id}>
                                                {coach.name} - {coach.role}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="family-communication__form-group">
                                    <label htmlFor="subject">Subject:</label>
                                    <input 
                                        type="text"
                                        id="subject"
                                        value={messageSubject}
                                        onChange={(e) => setMessageSubject(e.target.value)}
                                        placeholder="Enter message subject..."
                                        required
                                    />
                                </div>
                                <div className="family-communication__form-group">
                                    <label htmlFor="message">Message:</label>
                                    <textarea 
                                        id="message"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message here..."
                                        rows="6"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="family-communication__modal-footer">
                                <Button 
                                    type="button"
                                    onClick={() => setShowNewMessage(false)}
                                    variant="secondary"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    variant="primary"
                                    disabled={!messageRecipient || !messageSubject || !newMessage.trim()}
                                >
                                    📤 Send Message
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Communication;