import React, { useState, useEffect } from 'react';
import { Card, Button, LoadingSpinner, Alert } from '../components/ui';
import { 
    ConversationSidebar, 
    MessageList, 
    ComposeMessage 
} from '../components/communication';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import './Messages.css';

const Messages = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [showNewMessage, setShowNewMessage] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const response = await api.get('/messages/contacts');
            setContacts(response.data);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const handleSelectConversation = (conversationId, recipient) => {
        setSelectedConversationId(conversationId);
        setSelectedRecipient(recipient);
        setShowNewMessage(false);
    };

    const handleNewConversation = (type = 'message') => {
        if (type === 'announcement' && (user.role === 'coach' || user.role === 'admin')) {
            setShowNewMessage('announcement');
        } else {
            setShowNewMessage('message');
        }
        setSelectedConversationId(null);
        setSelectedRecipient(null);
    };

    const handleSendNewMessage = async (content, attachments, options = {}) => {
        try {
            setLoading(true);
            setError('');

            if (showNewMessage === 'announcement') {
                // Send as team announcement
                const response = await api.post('/notifications/team-announcement', {
                    team_id: options.team_id,
                    title: options.subject || 'Team Announcement',
                    message: content,
                    priority: options.priority || 'normal',
                    include_parents: options.include_parents || false
                });

                addNotification({
                    title: 'Announcement Sent',
                    message: `Your announcement was sent to ${response.data.recipients} recipients`,
                    type: 'success'
                });
            } else {
                // Send as direct message
                const formData = new FormData();
                formData.append('content', content);
                if (options.subject) formData.append('subject', options.subject);
                if (options.priority) formData.append('priority', options.priority);
                if (selectedRecipient) formData.append('recipient_id', selectedRecipient.id);

                if (attachments && attachments.length > 0) {
                    attachments.forEach(file => {
                        formData.append('attachments', file);
                    });
                }

                await api.post('/messages', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                addNotification({
                    title: 'Message Sent',
                    message: 'Your message was sent successfully',
                    type: 'success'
                });
            }

            setShowNewMessage(false);
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderMobileView = () => {
        if (selectedConversationId) {
            return (
                <div className="messages-mobile">
                    <div className="messages-mobile__header">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedConversationId(null)}
                        >
                            ← Back
                        </Button>
                        <h2>Messages</h2>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleNewConversation()}
                        >
                            ✏️
                        </Button>
                    </div>
                    <MessageList
                        conversationId={selectedConversationId}
                        recipient={selectedRecipient}
                    />
                </div>
            );
        }

        return (
            <div className="messages-mobile">
                <div className="messages-mobile__header">
                    <h2>Messages</h2>
                    <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleNewConversation()}
                    >
                        ✏️ New
                    </Button>
                </div>
                <ConversationSidebar
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                />
            </div>
        );
    };

    if (isMobile) {
        return renderMobileView();
    }

    return (
        <div className="messages-page">
            <div className="messages-page__header">
                <h1>💬 Messages</h1>
                <p>Stay connected with your team, coaches, and academy community</p>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <div className="messages-page__container">
                <div className="messages-page__sidebar">
                    <ConversationSidebar
                        selectedConversationId={selectedConversationId}
                        onSelectConversation={handleSelectConversation}
                        onNewConversation={handleNewConversation}
                    />
                </div>

                <div className="messages-page__main">
                    {showNewMessage ? (
                        <Card className="messages-page__compose">
                            <div className="messages-page__compose-header">
                                <h3>
                                    {showNewMessage === 'announcement' ? '📢 New Announcement' : '✏️ New Message'}
                                </h3>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setShowNewMessage(false)}
                                >
                                    ✕
                                </Button>
                            </div>

                            {showNewMessage === 'announcement' ? (
                                <AnnouncementComposer
                                    onSend={handleSendNewMessage}
                                    onCancel={() => setShowNewMessage(false)}
                                    sending={loading}
                                    user={user}
                                />
                            ) : (
                                <NewMessageComposer
                                    onSend={handleSendNewMessage}
                                    onCancel={() => setShowNewMessage(false)}
                                    sending={loading}
                                    contacts={contacts}
                                    selectedRecipient={selectedRecipient}
                                    onSelectRecipient={setSelectedRecipient}
                                />
                            )}
                        </Card>
                    ) : (
                        <MessageList
                            conversationId={selectedConversationId}
                            recipient={selectedRecipient}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Component for composing announcements
const AnnouncementComposer = ({ onSend, onCancel, sending, user }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('normal');
    const [teamId, setTeamId] = useState('');
    const [includeParents, setIncludeParents] = useState(false);
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const response = await api.get('/coach/teams');
            setTeams(response.data);
            if (response.data.length > 0) {
                setTeamId(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim() || !teamId) {
            return;
        }

        onSend(content, [], {
            subject: title,
            priority,
            team_id: teamId,
            include_parents: includeParents
        });
    };

    return (
        <form onSubmit={handleSubmit} className="announcement-composer">
            <div className="announcement-composer__field">
                <label>Team</label>
                <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    required
                >
                    <option value="">Select team...</option>
                    {teams.map(team => (
                        <option key={team.id} value={team.id}>
                            {team.name} ({team.age_group})
                        </option>
                    ))}
                </select>
            </div>

            <div className="announcement-composer__field">
                <label>Announcement Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter announcement title..."
                    required
                />
            </div>

            <div className="announcement-composer__field">
                <label>Priority</label>
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    {user.role === 'admin' && (
                        <option value="urgent">🚨 Urgent</option>
                    )}
                </select>
            </div>

            <div className="announcement-composer__field">
                <label>Message</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your announcement..."
                    rows={6}
                    required
                />
            </div>

            <div className="announcement-composer__checkbox">
                <label>
                    <input
                        type="checkbox"
                        checked={includeParents}
                        onChange={(e) => setIncludeParents(e.target.checked)}
                    />
                    Include parents in this announcement
                </label>
            </div>

            <div className="announcement-composer__actions">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    variant="primary"
                    disabled={sending || !title.trim() || !content.trim() || !teamId}
                >
                    {sending ? '📡 Sending...' : '📢 Send Announcement'}
                </Button>
            </div>
        </form>
    );
};

// Component for composing new messages
const NewMessageComposer = ({ 
    onSend, 
    onCancel, 
    sending, 
    contacts, 
    selectedRecipient, 
    onSelectRecipient 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredContacts, setFilteredContacts] = useState(contacts);

    useEffect(() => {
        if (searchTerm) {
            const filtered = contacts.filter(contact =>
                contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.display_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredContacts(filtered);
        } else {
            setFilteredContacts(contacts);
        }
    }, [searchTerm, contacts]);

    if (!selectedRecipient) {
        return (
            <div className="new-message-composer">
                <div className="new-message-composer__search">
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="new-message-composer__search-input"
                    />
                </div>

                <div className="new-message-composer__contacts">
                    <h4>Select a contact to message:</h4>
                    <div className="new-message-composer__contact-list">
                        {filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                className="new-message-composer__contact"
                                onClick={() => onSelectRecipient(contact)}
                            >
                                <div className="new-message-composer__contact-avatar">
                                    {contact.profile_picture ? (
                                        <img src={contact.profile_picture} alt={contact.name} />
                                    ) : (
                                        <div className="new-message-composer__contact-initials">
                                            {contact.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                    )}
                                    {contact.is_online && (
                                        <div className="new-message-composer__online-indicator"></div>
                                    )}
                                </div>
                                <div className="new-message-composer__contact-info">
                                    <h5>{contact.name}</h5>
                                    <p>{contact.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="new-message-composer__actions">
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="new-message-composer">
            <div className="new-message-composer__recipient">
                <span>To: {selectedRecipient.name}</span>
                <Button 
                    variant="ghost" 
                    size="xs"
                    onClick={() => onSelectRecipient(null)}
                >
                    Change
                </Button>
            </div>

            <ComposeMessage
                onSend={onSend}
                onCancel={onCancel}
                sending={sending}
                recipient={selectedRecipient}
            />
        </div>
    );
};

export default Messages;