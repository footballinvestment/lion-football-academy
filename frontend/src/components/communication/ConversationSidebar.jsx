import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner, Alert } from '../ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import './Communication.css';

const ConversationSidebar = ({ selectedConversationId, onSelectConversation, onNewConversation }) => {
    const { user } = useAuth();
    const { unreadCounts } = useNotification();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/messages/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conversation => {
        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesParticipant = conversation.participants?.some(p => 
                p.name.toLowerCase().includes(searchLower)
            );
            const matchesLastMessage = conversation.last_message?.content
                ?.toLowerCase().includes(searchLower);
            
            if (!matchesParticipant && !matchesLastMessage) {
                return false;
            }
        }

        // Type filter
        if (filter !== 'all') {
            if (filter === 'unread' && !conversation.has_unread) {
                return false;
            }
            if (filter === 'groups' && conversation.type !== 'group') {
                return false;
            }
            if (filter === 'direct' && conversation.type !== 'direct') {
                return false;
            }
            if (filter === 'announcements' && conversation.type !== 'announcement') {
                return false;
            }
        }

        return true;
    });

    const getConversationIcon = (conversation) => {
        switch (conversation.type) {
            case 'group':
                return '👥';
            case 'announcement':
                return '📢';
            case 'emergency':
                return '🚨';
            default:
                return '💬';
        }
    };

    const getLastMessagePreview = (message) => {
        if (!message) return 'No messages yet';
        
        if (message.type === 'image') return '📷 Image';
        if (message.type === 'file') return '📎 File';
        
        return message.content?.length > 50 
            ? message.content.substring(0, 50) + '...'
            : message.content;
    };

    const getUnreadCount = (conversationId) => {
        return unreadCounts[conversationId] || 0;
    };

    if (loading) {
        return (
            <div className="conversation-sidebar__loading">
                <LoadingSpinner size="large" />
                <p>Loading conversations...</p>
            </div>
        );
    }

    return (
        <div className="conversation-sidebar">
            {/* Sidebar Header */}
            <div className="conversation-sidebar__header">
                <h2>Messages</h2>
                <Button 
                    variant="primary" 
                    size="sm"
                    onClick={onNewConversation}
                >
                    ✏️ New
                </Button>
            </div>

            {/* Search and Filter */}
            <div className="conversation-sidebar__controls">
                <div className="conversation-sidebar__search">
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="conversation-sidebar__search-input"
                    />
                </div>
                
                <div className="conversation-sidebar__filter">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="conversation-sidebar__filter-select"
                    >
                        <option value="all">All Messages</option>
                        <option value="unread">Unread</option>
                        <option value="direct">Direct Messages</option>
                        <option value="groups">Group Chats</option>
                        <option value="announcements">Announcements</option>
                    </select>
                </div>
            </div>

            {error && (
                <Alert type="error" size="sm" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Conversations List */}
            <div className="conversation-sidebar__list">
                {filteredConversations.length === 0 ? (
                    <div className="conversation-sidebar__empty">
                        {searchTerm ? (
                            <p>No conversations found for "{searchTerm}"</p>
                        ) : (
                            <div>
                                <div className="conversation-sidebar__empty-icon">💬</div>
                                <p>No conversations yet</p>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={onNewConversation}
                                >
                                    Start a conversation
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    filteredConversations.map((conversation) => {
                        const unreadCount = getUnreadCount(conversation.id);
                        const isSelected = selectedConversationId === conversation.id;
                        const otherParticipant = conversation.participants?.find(p => p.id !== user.id);
                        
                        return (
                            <div
                                key={conversation.id}
                                className={`conversation-sidebar__item ${
                                    isSelected ? 'conversation-sidebar__item--selected' : ''
                                } ${unreadCount > 0 ? 'conversation-sidebar__item--unread' : ''}`}
                                onClick={() => onSelectConversation(conversation.id, otherParticipant)}
                            >
                                {/* Conversation Avatar */}
                                <div className="conversation-sidebar__avatar">
                                    {conversation.type === 'group' || conversation.type === 'announcement' ? (
                                        <div className="conversation-sidebar__group-avatar">
                                            {getConversationIcon(conversation)}
                                        </div>
                                    ) : otherParticipant?.profile_picture ? (
                                        <img 
                                            src={otherParticipant.profile_picture}
                                            alt={otherParticipant.name}
                                        />
                                    ) : (
                                        <div className="conversation-sidebar__avatar-initials">
                                            {otherParticipant?.name?.split(' ').map(n => n[0]).join('') || '?'}
                                        </div>
                                    )}
                                    
                                    {/* Online Status */}
                                    {conversation.type === 'direct' && otherParticipant?.is_online && (
                                        <div className="conversation-sidebar__online-indicator"></div>
                                    )}
                                </div>

                                {/* Conversation Content */}
                                <div className="conversation-sidebar__content">
                                    <div className="conversation-sidebar__header-row">
                                        <h4 className="conversation-sidebar__name">
                                            {conversation.type === 'group' || conversation.type === 'announcement' 
                                                ? conversation.name 
                                                : otherParticipant?.name || 'Unknown User'
                                            }
                                        </h4>
                                        <div className="conversation-sidebar__meta">
                                            {conversation.last_message?.created_at && (
                                                <span className="conversation-sidebar__time">
                                                    {formatDistanceToNow(
                                                        new Date(conversation.last_message.created_at),
                                                        { addSuffix: false }
                                                    )}
                                                </span>
                                            )}
                                            {unreadCount > 0 && (
                                                <Badge variant="primary" size="sm">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="conversation-sidebar__preview">
                                        <span className="conversation-sidebar__last-message">
                                            {conversation.last_message?.sender_id === user.id && 'You: '}
                                            {getLastMessagePreview(conversation.last_message)}
                                        </span>
                                        
                                        {conversation.type && (
                                            <span className="conversation-sidebar__type">
                                                {getConversationIcon(conversation)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Additional Info */}
                                    {conversation.type === 'group' && (
                                        <div className="conversation-sidebar__group-info">
                                            <span className="conversation-sidebar__participant-count">
                                                {conversation.participant_count || 0} members
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick Actions */}
            <div className="conversation-sidebar__footer">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={fetchConversations}
                    disabled={loading}
                >
                    🔄 Refresh
                </Button>
                
                {user.role === 'coach' || user.role === 'admin' ? (
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onNewConversation('announcement')}
                    >
                        📢 Announce
                    </Button>
                ) : null}
            </div>
        </div>
    );
};

export default ConversationSidebar;