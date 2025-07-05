import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '../ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../context/NotificationContext';
import MessageItem from './MessageItem';
import ComposeMessage from './ComposeMessage';
import './Communication.css';

const MessageList = ({ conversationId, recipient }) => {
    const { user } = useAuth();
    const { markAsRead } = useNotification();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (conversationId) {
            fetchMessages();
            markMessagesAsRead();
        }
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/messages/conversation/${conversationId}`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const markMessagesAsRead = async () => {
        try {
            await api.put(`/messages/conversation/${conversationId}/read`);
            markAsRead(conversationId);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleSendMessage = async (content, attachments = []) => {
        try {
            setSending(true);
            
            const messageData = {
                content,
                conversation_id: conversationId,
                recipient_id: recipient?.id,
                attachments
            };

            const response = await api.post('/messages', messageData);
            
            // Add the new message to the list
            setMessages(prev => [...prev, response.data]);
            setShowCompose(false);
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleTyping = () => {
        // Emit typing indicator
        if (window.socket) {
            window.socket.emit('typing', {
                conversationId,
                userId: user.id,
                userName: `${user.first_name} ${user.last_name}`
            });
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (window.socket) {
                window.socket.emit('stop_typing', {
                    conversationId,
                    userId: user.id
                });
            }
        }, 3000);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="message-list__loading">
                <LoadingSpinner size="large" />
                <p>Loading conversation...</p>
            </div>
        );
    }

    if (!conversationId) {
        return (
            <div className="message-list__empty">
                <div className="message-list__empty-content">
                    <div className="message-list__empty-icon">💬</div>
                    <h3>Select a conversation</h3>
                    <p>Choose a conversation from the sidebar to start messaging</p>
                </div>
            </div>
        );
    }

    return (
        <div className="message-list">
            {/* Message Header */}
            <div className="message-list__header">
                <div className="message-list__recipient-info">
                    <div className="message-list__recipient-avatar">
                        {recipient?.profile_picture ? (
                            <img 
                                src={recipient.profile_picture} 
                                alt={recipient.name}
                            />
                        ) : (
                            <div className="message-list__recipient-initials">
                                {recipient?.name?.split(' ').map(n => n[0]).join('') || '?'}
                            </div>
                        )}
                    </div>
                    <div className="message-list__recipient-details">
                        <h3>{recipient?.name || 'Unknown User'}</h3>
                        <p className="message-list__recipient-role">
                            {recipient?.role || 'Member'}
                            {recipient?.team_name && ` • ${recipient.team_name}`}
                        </p>
                    </div>
                </div>
                <div className="message-list__header-actions">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowCompose(true)}
                    >
                        ✏️ New Message
                    </Button>
                </div>
            </div>

            {/* Messages Container */}
            <div className="message-list__container">
                <div className="message-list__messages">
                    {messages.length === 0 ? (
                        <div className="message-list__no-messages">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageItem
                                key={message.id}
                                message={message}
                                isOwn={message.sender_id === user.id}
                            />
                        ))
                    )}
                    
                    {/* Typing Indicators */}
                    {typingUsers.length > 0 && (
                        <div className="message-list__typing">
                            <div className="message-list__typing-indicator">
                                <div className="message-list__typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <p>
                                    {typingUsers.length === 1 
                                        ? `${typingUsers[0]} is typing...`
                                        : `${typingUsers.length} people are typing...`
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply */}
                <div className="message-list__quick-reply">
                    <ComposeMessage
                        onSend={handleSendMessage}
                        onTyping={handleTyping}
                        sending={sending}
                        placeholder={`Message ${recipient?.name || 'recipient'}...`}
                        compact={true}
                    />
                </div>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="message-list__compose-modal">
                    <div className="message-list__compose-content">
                        <div className="message-list__compose-header">
                            <h3>New Message</h3>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowCompose(false)}
                            >
                                ✕
                            </Button>
                        </div>
                        <ComposeMessage
                            onSend={handleSendMessage}
                            onCancel={() => setShowCompose(false)}
                            sending={sending}
                            recipient={recipient}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageList;