const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticate, isAdminOrCoach } = require('../middleware/auth');
const { validationResult, body, param } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Apply authentication to all message routes
router.use(authenticate);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/messages/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

/**
 * GET /api/messages/conversations - Get user's conversations
 */
router.get('/conversations', async (req, res) => {
    try {
        const { user_id } = req.user;

        const query = `
            SELECT 
                c.id,
                c.name,
                c.type,
                c.created_at,
                c.updated_at,
                COUNT(DISTINCT cp.user_id) as participant_count,
                CASE WHEN EXISTS(
                    SELECT 1 FROM messages m 
                    WHERE m.conversation_id = c.id 
                    AND m.sender_id != ? 
                    AND m.read_at IS NULL
                ) THEN TRUE ELSE FALSE END as has_unread,
                lm.id as last_message_id,
                lm.content as last_message_content,
                lm.type as last_message_type,
                lm.created_at as last_message_created_at,
                lm.sender_id as last_message_sender_id,
                ls.first_name as last_sender_first_name,
                ls.last_name as last_sender_last_name
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            LEFT JOIN messages lm ON c.id = lm.conversation_id 
                AND lm.id = (
                    SELECT MAX(id) FROM messages 
                    WHERE conversation_id = c.id
                )
            LEFT JOIN users ls ON lm.sender_id = ls.id
            WHERE cp.user_id = ?
            GROUP BY c.id, c.name, c.type, c.created_at, c.updated_at, 
                     lm.id, lm.content, lm.type, lm.created_at, lm.sender_id,
                     ls.first_name, ls.last_name
            ORDER BY COALESCE(lm.created_at, c.created_at) DESC
        `;

        const [conversations] = await db.execute(query, [user_id, user_id]);

        // Get participants for each conversation
        for (const conversation of conversations) {
            const participantsQuery = `
                SELECT 
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.profile_picture,
                    u.role,
                    u.last_active,
                    CASE WHEN u.last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
                         THEN TRUE ELSE FALSE END as is_online
                FROM conversation_participants cp
                JOIN users u ON cp.user_id = u.id
                WHERE cp.conversation_id = ? AND u.id != ?
            `;

            const [participants] = await db.execute(participantsQuery, [conversation.id, user_id]);
            conversation.participants = participants.map(p => ({
                ...p,
                name: `${p.first_name} ${p.last_name}`
            }));

            // Format last message
            if (conversation.last_message_id) {
                conversation.last_message = {
                    id: conversation.last_message_id,
                    content: conversation.last_message_content,
                    type: conversation.last_message_type,
                    created_at: conversation.last_message_created_at,
                    sender_id: conversation.last_message_sender_id,
                    sender: conversation.last_message_sender_id ? {
                        name: `${conversation.last_sender_first_name} ${conversation.last_sender_last_name}`
                    } : null
                };
            }

            // Clean up conversation object
            delete conversation.last_message_id;
            delete conversation.last_message_content;
            delete conversation.last_message_type;
            delete conversation.last_message_created_at;
            delete conversation.last_message_sender_id;
            delete conversation.last_sender_first_name;
            delete conversation.last_sender_last_name;
        }

        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/messages/conversation/:id - Get messages in a conversation
 */
router.get('/conversation/:id', [
    param('id').isInt().withMessage('Invalid conversation ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { user_id } = req.user;
        const { page = 1, limit = 50 } = req.query;

        // Verify user is participant in conversation
        const [participation] = await db.execute(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, user_id]
        );

        if (participation.length === 0) {
            return res.status(403).json({ error: 'Access denied to this conversation' });
        }

        const offset = (page - 1) * limit;

        const query = `
            SELECT 
                m.*,
                s.first_name as sender_first_name,
                s.last_name as sender_last_name,
                s.profile_picture as sender_profile_picture
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [messages] = await db.execute(query, [id, parseInt(limit), offset]);

        // Get attachments for each message
        for (const message of messages) {
            const [attachments] = await db.execute(
                'SELECT * FROM message_attachments WHERE message_id = ?',
                [message.id]
            );
            message.attachments = attachments;

            // Format sender info
            message.sender = {
                id: message.sender_id,
                name: `${message.sender_first_name} ${message.sender_last_name}`,
                profile_picture: message.sender_profile_picture
            };

            // Clean up message object
            delete message.sender_first_name;
            delete message.sender_last_name;
            delete message.sender_profile_picture;
        }

        // Reverse to show oldest first
        messages.reverse();

        res.json(messages);
    } catch (error) {
        console.error('Error fetching conversation messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * POST /api/messages - Send a message
 */
router.post('/', upload.array('attachments', 5), [
    body('content').notEmpty().withMessage('Message content is required'),
    body('conversation_id').optional().isInt().withMessage('Invalid conversation ID'),
    body('recipient_id').optional().isInt().withMessage('Invalid recipient ID'),
    body('type').optional().isIn(['text', 'announcement', 'emergency']).withMessage('Invalid message type'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            content,
            conversation_id,
            recipient_id,
            subject,
            type = 'text',
            priority = 'normal'
        } = req.body;
        const { user_id } = req.user;

        let conversationId = conversation_id;

        // If no conversation ID, create new conversation with recipient
        if (!conversationId && recipient_id) {
            // Check if direct conversation already exists
            const [existingConv] = await db.execute(`
                SELECT c.id
                FROM conversations c
                JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                WHERE c.type = 'direct'
                AND cp1.user_id = ? AND cp2.user_id = ?
                AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
            `, [user_id, recipient_id]);

            if (existingConv.length > 0) {
                conversationId = existingConv[0].id;
            } else {
                // Create new conversation
                const [convResult] = await db.execute(
                    'INSERT INTO conversations (type, created_at) VALUES (?, NOW())',
                    ['direct']
                );
                conversationId = convResult.insertId;

                // Add participants
                await db.execute(
                    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)',
                    [conversationId, user_id, conversationId, recipient_id]
                );
            }
        }

        if (!conversationId) {
            return res.status(400).json({ error: 'Conversation ID or recipient ID required' });
        }

        // Verify user is participant in conversation
        const [participation] = await db.execute(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [conversationId, user_id]
        );

        if (participation.length === 0) {
            return res.status(403).json({ error: 'Access denied to this conversation' });
        }

        // Insert message
        const insertQuery = `
            INSERT INTO messages (
                conversation_id, sender_id, content, subject, type, priority, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        const [messageResult] = await db.execute(insertQuery, [
            conversationId,
            user_id,
            content,
            subject || null,
            type,
            priority
        ]);

        const messageId = messageResult.insertId;

        // Handle file attachments
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await db.execute(
                    'INSERT INTO message_attachments (message_id, filename, original_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?)',
                    [messageId, file.filename, file.originalname, file.size, file.mimetype]
                );
            }
        }

        // Update conversation timestamp
        await db.execute(
            'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
            [conversationId]
        );

        // Get the complete message with sender info
        const [newMessage] = await db.execute(`
            SELECT 
                m.*,
                s.first_name as sender_first_name,
                s.last_name as sender_last_name,
                s.profile_picture as sender_profile_picture
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            WHERE m.id = ?
        `, [messageId]);

        // Get attachments
        const [attachments] = await db.execute(
            'SELECT * FROM message_attachments WHERE message_id = ?',
            [messageId]
        );

        const message = newMessage[0];
        message.attachments = attachments;
        message.sender = {
            id: message.sender_id,
            name: `${message.sender_first_name} ${message.sender_last_name}`,
            profile_picture: message.sender_profile_picture
        };

        // Clean up message object
        delete message.sender_first_name;
        delete message.sender_last_name;
        delete message.sender_profile_picture;

        // Broadcast to real-time clients
        if (global.messageBroadcast) {
            // Get all participants except sender
            const [participants] = await db.execute(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?',
                [conversationId, user_id]
            );

            participants.forEach(participant => {
                global.messageBroadcast(participant.user_id, {
                    type: 'new_message',
                    message,
                    conversationId
                });
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Message sent successfully',
            data: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * PUT /api/messages/conversation/:id/read - Mark conversation messages as read
 */
router.put('/conversation/:id/read', [
    param('id').isInt().withMessage('Invalid conversation ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { user_id } = req.user;

        // Verify user is participant in conversation
        const [participation] = await db.execute(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, user_id]
        );

        if (participation.length === 0) {
            return res.status(403).json({ error: 'Access denied to this conversation' });
        }

        // Mark messages as read
        const [result] = await db.execute(`
            UPDATE messages 
            SET read_at = NOW() 
            WHERE conversation_id = ? 
            AND sender_id != ? 
            AND read_at IS NULL
        `, [id, user_id]);

        res.json({ 
            success: true, 
            message: 'Messages marked as read',
            updated: result.affectedRows
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

/**
 * POST /api/messages/broadcast - Send broadcast message (admin/coach only)
 */
router.post('/broadcast', isAdminOrCoach, [
    body('content').notEmpty().withMessage('Message content is required'),
    body('title').notEmpty().withMessage('Message title is required'),
    body('scope').isIn(['academy', 'team']).withMessage('Scope must be academy or team'),
    body('team_id').optional().isInt().withMessage('Invalid team ID'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            content,
            title,
            scope,
            team_id,
            priority = 'normal',
            include_parents = false
        } = req.body;
        const { user_id } = req.user;

        // Get recipients based on scope
        let recipientQuery;
        let queryParams = [];

        if (scope === 'academy') {
            recipientQuery = `
                SELECT id, email, first_name, last_name
                FROM users
                WHERE active = TRUE AND id != ?
            `;
            queryParams = [user_id];
        } else if (scope === 'team' && team_id) {
            recipientQuery = `
                SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
                FROM users u
                WHERE u.id IN (
                    SELECT DISTINCT p.user_id
                    FROM players p
                    WHERE p.team_id = ?
                    ${include_parents ? `
                    UNION
                    SELECT DISTINCT pcr.parent_id
                    FROM parent_child_relationships pcr
                    JOIN players p ON pcr.child_id = p.id
                    WHERE p.team_id = ?
                    ` : ''}
                ) AND u.id != ?
            `;
            queryParams = include_parents ? [team_id, team_id, user_id] : [team_id, user_id];
        } else {
            return res.status(400).json({ error: 'Team ID required for team scope' });
        }

        const [recipients] = await db.execute(recipientQuery, queryParams);

        if (recipients.length === 0) {
            return res.status(404).json({ error: 'No recipients found' });
        }

        // Create broadcast conversation
        const [convResult] = await db.execute(
            'INSERT INTO conversations (name, type, created_at) VALUES (?, ?, NOW())',
            [title, 'announcement']
        );
        const conversationId = convResult.insertId;

        // Add sender and recipients as participants
        const participantValues = [[conversationId, user_id]];
        recipients.forEach(recipient => {
            participantValues.push([conversationId, recipient.id]);
        });

        const participantQuery = `
            INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?
        `;
        await db.query(participantQuery, [participantValues]);

        // Send broadcast message
        const [messageResult] = await db.execute(`
            INSERT INTO messages (
                conversation_id, sender_id, content, subject, type, priority, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [conversationId, user_id, content, title, 'announcement', priority]);

        // Broadcast to real-time clients
        if (global.messageBroadcast) {
            recipients.forEach(recipient => {
                global.messageBroadcast(recipient.id, {
                    type: 'broadcast_message',
                    message: {
                        id: messageResult.insertId,
                        conversation_id: conversationId,
                        sender_id: user_id,
                        content,
                        subject: title,
                        type: 'announcement',
                        priority,
                        created_at: new Date().toISOString()
                    },
                    conversationId
                });
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Broadcast message sent successfully',
            recipients: recipients.length,
            conversationId
        });
    } catch (error) {
        console.error('Error sending broadcast message:', error);
        res.status(500).json({ error: 'Failed to send broadcast message' });
    }
});

/**
 * GET /api/messages/contacts - Get available contacts for messaging
 */
router.get('/contacts', async (req, res) => {
    try {
        const { user_id, role } = req.user;
        const { search } = req.query;

        let contactQuery;
        let queryParams = [user_id];

        // Different contact lists based on user role
        if (role === 'admin') {
            // Admins can message anyone
            contactQuery = `
                SELECT 
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.profile_picture,
                    u.role,
                    u.last_active,
                    CASE WHEN u.last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
                         THEN TRUE ELSE FALSE END as is_online,
                    CASE 
                        WHEN u.role = 'player' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Player)')
                        WHEN u.role = 'coach' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Coach)')
                        WHEN u.role = 'parent' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Parent)')
                        ELSE CONCAT(u.first_name, ' ', u.last_name)
                    END as display_name
                FROM users u
                WHERE u.id != ? AND u.active = TRUE
            `;
        } else if (role === 'coach') {
            // Coaches can message their team players, parents, and other coaches
            contactQuery = `
                SELECT DISTINCT
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.profile_picture,
                    u.role,
                    u.last_active,
                    CASE WHEN u.last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
                         THEN TRUE ELSE FALSE END as is_online,
                    CASE 
                        WHEN u.role = 'player' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Player - ', t.name, ')')
                        WHEN u.role = 'coach' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Coach)')
                        WHEN u.role = 'parent' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Parent)')
                        ELSE CONCAT(u.first_name, ' ', u.last_name)
                    END as display_name
                FROM users u
                LEFT JOIN players p ON u.id = p.user_id
                LEFT JOIN teams t ON p.team_id = t.id
                LEFT JOIN coaches c ON u.id = c.user_id
                WHERE u.id != ? AND u.active = TRUE
                AND (
                    u.role = 'admin' OR
                    u.role = 'coach' OR
                    (u.role = 'player' AND t.coach_id = (SELECT id FROM coaches WHERE user_id = ?)) OR
                    (u.role = 'parent' AND u.id IN (
                        SELECT pcr.parent_id 
                        FROM parent_child_relationships pcr
                        JOIN players tp ON pcr.child_id = tp.id
                        JOIN teams tt ON tp.team_id = tt.id
                        WHERE tt.coach_id = (SELECT id FROM coaches WHERE user_id = ?)
                    ))
                )
            `;
            queryParams = [user_id, user_id, user_id];
        } else if (role === 'parent') {
            // Parents can message their children's coaches and other parents
            contactQuery = `
                SELECT DISTINCT
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.profile_picture,
                    u.role,
                    u.last_active,
                    CASE WHEN u.last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
                         THEN TRUE ELSE FALSE END as is_online,
                    CASE 
                        WHEN u.role = 'coach' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Coach)')
                        WHEN u.role = 'parent' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Parent)')
                        ELSE CONCAT(u.first_name, ' ', u.last_name)
                    END as display_name
                FROM users u
                WHERE u.id != ? AND u.active = TRUE
                AND (
                    u.role = 'admin' OR
                    (u.role = 'coach' AND u.id IN (
                        SELECT cu.user_id
                        FROM coaches c
                        JOIN teams t ON c.id = t.coach_id
                        JOIN players p ON t.id = p.team_id
                        JOIN parent_child_relationships pcr ON p.id = pcr.child_id
                        JOIN users cu ON c.user_id = cu.id
                        WHERE pcr.parent_id = (SELECT id FROM users WHERE id = ?)
                    )) OR
                    (u.role = 'parent')
                )
            `;
            queryParams = [user_id, user_id];
        } else {
            // Players can message coaches and other players in their team
            contactQuery = `
                SELECT DISTINCT
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.profile_picture,
                    u.role,
                    u.last_active,
                    CASE WHEN u.last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
                         THEN TRUE ELSE FALSE END as is_online,
                    CASE 
                        WHEN u.role = 'coach' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Coach)')
                        WHEN u.role = 'player' THEN CONCAT(u.first_name, ' ', u.last_name, ' (Teammate)')
                        ELSE CONCAT(u.first_name, ' ', u.last_name)
                    END as display_name
                FROM users u
                LEFT JOIN players p ON u.id = p.user_id
                LEFT JOIN coaches c ON u.id = c.user_id
                WHERE u.id != ? AND u.active = TRUE
                AND (
                    u.role = 'admin' OR
                    (u.role = 'coach' AND c.id = (
                        SELECT t.coach_id 
                        FROM teams t 
                        JOIN players mp ON t.id = mp.team_id 
                        WHERE mp.user_id = ?
                    )) OR
                    (u.role = 'player' AND p.team_id = (
                        SELECT team_id 
                        FROM players 
                        WHERE user_id = ?
                    ))
                )
            `;
            queryParams = [user_id, user_id, user_id];
        }

        // Add search filter if provided
        if (search) {
            contactQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        contactQuery += ` ORDER BY u.last_active DESC, u.first_name ASC`;

        const [contacts] = await db.execute(contactQuery, queryParams);

        // Format contacts
        const formattedContacts = contacts.map(contact => ({
            id: contact.id,
            name: `${contact.first_name} ${contact.last_name}`,
            display_name: contact.display_name,
            profile_picture: contact.profile_picture,
            role: contact.role,
            is_online: contact.is_online,
            last_active: contact.last_active
        }));

        res.json(formattedContacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

module.exports = router;