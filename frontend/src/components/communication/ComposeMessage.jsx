import React, { useState, useRef } from 'react';
import { Button, Card, Alert } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import './Communication.css';

const ComposeMessage = ({ 
    onSend, 
    onCancel, 
    onTyping, 
    sending = false, 
    recipient, 
    placeholder = "Type your message...",
    compact = false 
}) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [subject, setSubject] = useState('');
    const [priority, setPriority] = useState('normal');
    const [messageType, setMessageType] = useState('message');
    const [attachments, setAttachments] = useState([]);
    const [showOptions, setShowOptions] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!content.trim()) {
            setError('Please enter a message');
            return;
        }

        try {
            setError('');
            await onSend(content, attachments, {
                subject: subject.trim() || undefined,
                priority,
                type: messageType
            });
            
            // Reset form
            setContent('');
            setSubject('');
            setPriority('normal');
            setMessageType('message');
            setAttachments([]);
            setShowOptions(false);
        } catch (error) {
            setError('Failed to send message. Please try again.');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && compact) {
            e.preventDefault();
            handleSubmit(e);
        }
        
        if (onTyping) {
            onTyping();
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const validFiles = files.filter(file => {
            if (file.size > maxSize) {
                setError(`File ${file.name} is too large. Maximum size is 10MB.`);
                return false;
            }
            if (!allowedTypes.includes(file.type)) {
                setError(`File type ${file.type} is not supported.`);
                return false;
            }
            return true;
        });

        setAttachments(prev => [...prev, ...validFiles]);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getMessageTypeIcon = (type) => {
        switch (type) {
            case 'announcement': return '📢';
            case 'reminder': return '⏰';
            case 'emergency': return '🚨';
            case 'achievement': return '🏆';
            default: return '💬';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'var(--error)';
            case 'high': return 'var(--warning)';
            default: return 'var(--gray-600)';
        }
    };

    if (compact) {
        return (
            <form onSubmit={handleSubmit} className="compose-message compose-message--compact">
                {error && (
                    <Alert type="error" size="sm" onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                
                <div className="compose-message__input-row">
                    <div className="compose-message__input-container">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={placeholder}
                            className="compose-message__textarea compose-message__textarea--compact"
                            rows={1}
                            disabled={sending}
                        />
                        
                        {attachments.length > 0 && (
                            <div className="compose-message__attachments-preview">
                                {attachments.map((file, index) => (
                                    <div key={index} className="compose-message__attachment-chip">
                                        <span>{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="compose-message__remove-attachment"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="compose-message__actions">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                        >
                            📎
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowOptions(!showOptions)}
                            disabled={sending}
                        >
                            ⚙️
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={sending || !content.trim()}
                        >
                            {sending ? '⏳' : '➤'}
                        </Button>
                    </div>
                </div>

                {showOptions && (
                    <div className="compose-message__options">
                        <select
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value)}
                            className="compose-message__select"
                        >
                            <option value="message">💬 Message</option>
                            <option value="announcement">📢 Announcement</option>
                            <option value="reminder">⏰ Reminder</option>
                            {user.role === 'coach' && (
                                <option value="emergency">🚨 Emergency</option>
                            )}
                        </select>
                        
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="compose-message__select"
                        >
                            <option value="normal">Normal</option>
                            <option value="high">High Priority</option>
                            {user.role === 'coach' && (
                                <option value="urgent">🚨 Urgent</option>
                            )}
                        </select>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx"
                />
            </form>
        );
    }

    return (
        <Card className="compose-message">
            <div className="compose-message__header">
                <h3>Compose Message</h3>
                {recipient && (
                    <div className="compose-message__recipient">
                        <span>To: {recipient.name}</span>
                        <span className="compose-message__recipient-role">
                            ({recipient.role})
                        </span>
                    </div>
                )}
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="compose-message__form">
                {/* Message Type & Priority */}
                <div className="compose-message__options-row">
                    <div className="compose-message__field">
                        <label className="compose-message__label">
                            Type: {getMessageTypeIcon(messageType)}
                        </label>
                        <select
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value)}
                            className="compose-message__select"
                        >
                            <option value="message">💬 Regular Message</option>
                            <option value="announcement">📢 Announcement</option>
                            <option value="reminder">⏰ Reminder</option>
                            {(user.role === 'coach' || user.role === 'admin') && (
                                <option value="emergency">🚨 Emergency Alert</option>
                            )}
                        </select>
                    </div>
                    
                    <div className="compose-message__field">
                        <label 
                            className="compose-message__label"
                            style={{ color: getPriorityColor(priority) }}
                        >
                            Priority
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="compose-message__select"
                        >
                            <option value="normal">Normal</option>
                            <option value="high">High Priority</option>
                            {(user.role === 'coach' || user.role === 'admin') && (
                                <option value="urgent">🚨 URGENT</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* Subject */}
                {(messageType === 'announcement' || messageType === 'emergency') && (
                    <div className="compose-message__field">
                        <label className="compose-message__label">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter subject line..."
                            className="compose-message__input"
                            disabled={sending}
                        />
                    </div>
                )}

                {/* Message Content */}
                <div className="compose-message__field">
                    <label className="compose-message__label">Message</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={placeholder}
                        className="compose-message__textarea"
                        rows={6}
                        disabled={sending}
                        required
                    />
                </div>

                {/* Attachments */}
                <div className="compose-message__field">
                    <label className="compose-message__label">Attachments</label>
                    <div className="compose-message__attachments">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                        >
                            📎 Add Files
                        </Button>
                        
                        {attachments.length > 0 && (
                            <div className="compose-message__attachments-list">
                                {attachments.map((file, index) => (
                                    <div key={index} className="compose-message__attachment">
                                        <span className="compose-message__attachment-name">
                                            {file.name}
                                        </span>
                                        <span className="compose-message__attachment-size">
                                            ({(file.size / 1024).toFixed(1)}KB)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="compose-message__remove-attachment"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="compose-message__actions">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={sending}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={sending || !content.trim()}
                    >
                        {sending ? '⏳ Sending...' : `${getMessageTypeIcon(messageType)} Send Message`}
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx"
                />
            </form>
        </Card>
    );
};

export default ComposeMessage;