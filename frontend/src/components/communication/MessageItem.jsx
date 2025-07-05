import React, { useState } from 'react';
import { Button, Badge } from '../ui';
import { formatDistanceToNow } from 'date-fns';
import './Communication.css';

const MessageItem = ({ message, isOwn }) => {
    const [showDetails, setShowDetails] = useState(false);

    const formatTime = (timestamp) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    const getMessageStatusIcon = (status) => {
        switch (status) {
            case 'sent':
                return '✓';
            case 'delivered':
                return '✓✓';
            case 'read':
                return '✓✓';
            default:
                return '⏳';
        }
    };

    const getMessageStatusColor = (status) => {
        switch (status) {
            case 'read':
                return 'var(--lion-primary)';
            case 'delivered':
                return 'var(--gray-600)';
            case 'sent':
                return 'var(--gray-400)';
            default:
                return 'var(--gray-300)';
        }
    };

    const getMessageTypeIcon = (type) => {
        switch (type) {
            case 'announcement':
                return '📢';
            case 'emergency':
                return '🚨';
            case 'reminder':
                return '⏰';
            case 'achievement':
                return '🏆';
            default:
                return '💬';
        }
    };

    const getPriorityBadge = (priority) => {
        if (priority === 'high') {
            return <Badge variant="error" size="sm">High Priority</Badge>;
        }
        if (priority === 'urgent') {
            return <Badge variant="error" size="sm">🚨 URGENT</Badge>;
        }
        return null;
    };

    return (
        <div className={`message-item ${isOwn ? 'message-item--own' : 'message-item--other'}`}>
            {/* Message Avatar */}
            {!isOwn && (
                <div className="message-item__avatar">
                    {message.sender?.profile_picture ? (
                        <img 
                            src={message.sender.profile_picture} 
                            alt={message.sender.name}
                        />
                    ) : (
                        <div className="message-item__avatar-initials">
                            {message.sender?.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                    )}
                </div>
            )}

            {/* Message Content */}
            <div className="message-item__content">
                {/* Message Header */}
                <div className="message-item__header">
                    {!isOwn && (
                        <span className="message-item__sender">
                            {message.sender?.name}
                        </span>
                    )}
                    <span className="message-item__type">
                        {getMessageTypeIcon(message.type)}
                    </span>
                    {getPriorityBadge(message.priority)}
                    <span className="message-item__time">
                        {formatTime(message.created_at)}
                    </span>
                </div>

                {/* Message Body */}
                <div className="message-item__body">
                    {message.subject && (
                        <div className="message-item__subject">
                            {message.subject}
                        </div>
                    )}
                    
                    <div className="message-item__text">
                        {message.content}
                    </div>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="message-item__attachments">
                            {message.attachments.map((attachment, index) => (
                                <div key={index} className="message-item__attachment">
                                    <div className="message-item__attachment-icon">
                                        {attachment.type?.startsWith('image/') ? '🖼️' : '📎'}
                                    </div>
                                    <a 
                                        href={attachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="message-item__attachment-link"
                                    >
                                        {attachment.name || 'Attachment'}
                                    </a>
                                    <span className="message-item__attachment-size">
                                        ({(attachment.size / 1024).toFixed(1)}KB)
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {message.action_required && (
                        <div className="message-item__actions">
                            {message.action_type === 'payment' && (
                                <Button size="sm" variant="primary">
                                    💳 Pay Now
                                </Button>
                            )}
                            {message.action_type === 'confirmation' && (
                                <div className="message-item__action-buttons">
                                    <Button size="sm" variant="success">
                                        ✅ Confirm
                                    </Button>
                                    <Button size="sm" variant="ghost">
                                        ❌ Decline
                                    </Button>
                                </div>
                            )}
                            {message.action_type === 'rsvp' && (
                                <div className="message-item__action-buttons">
                                    <Button size="sm" variant="success">
                                        ✅ Attending
                                    </Button>
                                    <Button size="sm" variant="warning">
                                        ❓ Maybe
                                    </Button>
                                    <Button size="sm" variant="ghost">
                                        ❌ Can't Attend
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Message Footer */}
                <div className="message-item__footer">
                    {isOwn && (
                        <div className="message-item__status">
                            <span 
                                className="message-item__status-icon"
                                style={{ color: getMessageStatusColor(message.status) }}
                            >
                                {getMessageStatusIcon(message.status)}
                            </span>
                            <span className="message-item__status-text">
                                {message.status === 'read' && message.read_at && 
                                    `Read ${formatTime(message.read_at)}`
                                }
                                {message.status === 'delivered' && 'Delivered'}
                                {message.status === 'sent' && 'Sent'}
                                {message.status === 'pending' && 'Sending...'}
                            </span>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="message-item__quick-actions">
                        <Button 
                            variant="ghost" 
                            size="xs"
                            onClick={() => setShowDetails(!showDetails)}
                        >
                            {showDetails ? '▼' : '▶'} Details
                        </Button>
                        {!isOwn && (
                            <Button variant="ghost" size="xs">
                                ↩️ Reply
                            </Button>
                        )}
                    </div>
                </div>

                {/* Detailed Information */}
                {showDetails && (
                    <div className="message-item__details">
                        <div className="message-item__metadata">
                            <div className="message-item__metadata-item">
                                <strong>Message ID:</strong> {message.id}
                            </div>
                            <div className="message-item__metadata-item">
                                <strong>Sent:</strong> {new Date(message.created_at).toLocaleString()}
                            </div>
                            {message.read_at && (
                                <div className="message-item__metadata-item">
                                    <strong>Read:</strong> {new Date(message.read_at).toLocaleString()}
                                </div>
                            )}
                            <div className="message-item__metadata-item">
                                <strong>Type:</strong> {message.type || 'message'}
                            </div>
                            {message.team_id && (
                                <div className="message-item__metadata-item">
                                    <strong>Team:</strong> {message.team_name}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageItem;