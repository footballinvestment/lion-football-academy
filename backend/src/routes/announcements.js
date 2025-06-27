const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authenticate, isAdminOrCoach, canAccessTeam } = require('../middleware/auth');

const validateAnnouncement = (announcementData) => {
    const errors = [];
    if (!announcementData.title || announcementData.title.trim() === '') {
        errors.push('Cím kötelező');
    }
    if (!announcementData.content || announcementData.content.trim() === '') {
        errors.push('Tartalom kötelező');
    }
    if (!announcementData.category || announcementData.category.trim() === '') {
        errors.push('Kategória kötelező');
    }
    return errors;
};

// GET /api/announcements - Hírek listája
router.get('/', authenticate, async (req, res) => {
    try {
        const { team_id, category, urgent, limit } = req.query;
        
        let announcements;
        
        if (urgent === 'true') {
            announcements = await Announcement.findUrgent();
        } else if (category) {
            announcements = await Announcement.findByCategory(category);
        } else if (team_id) {
            announcements = await Announcement.findByTeam(team_id);
        } else if (limit) {
            announcements = await Announcement.findRecent(parseInt(limit));
        } else {
            announcements = await Announcement.findAll();
        }
        
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/announcements/categories - Elérhető kategóriák
router.get('/categories', authenticate, async (req, res) => {
    try {
        const categories = await Announcement.getCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/announcements/urgent - Sürgős hírek
router.get('/urgent', authenticate, async (req, res) => {
    try {
        const urgentAnnouncements = await Announcement.findUrgent();
        res.json(urgentAnnouncements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/announcements/:id - Egy hír részletei
router.get('/:id', authenticate, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Hír nem található' });
        }
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/announcements - Új hír létrehozása
router.post('/', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const errors = validateAnnouncement(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const result = await Announcement.create(req.body);
        const newAnnouncement = await Announcement.findById(result.id);
        res.status(201).json(newAnnouncement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/announcements/:id - Hír módosítása
router.put('/:id', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const errors = validateAnnouncement(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const existingAnnouncement = await Announcement.findById(req.params.id);
        if (!existingAnnouncement) {
            return res.status(404).json({ error: 'Hír nem található' });
        }

        await Announcement.update(req.params.id, req.body);
        const updatedAnnouncement = await Announcement.findById(req.params.id);
        res.json(updatedAnnouncement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/announcements/:id - Hír törlése
router.delete('/:id', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const existingAnnouncement = await Announcement.findById(req.params.id);
        if (!existingAnnouncement) {
            return res.status(404).json({ error: 'Hír nem található' });
        }

        await Announcement.delete(req.params.id);
        res.json({ message: 'Hír sikeresen törölve' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/announcements/team/:teamId - Csapat hírei
router.get('/team/:teamId', authenticate, canAccessTeam, async (req, res) => {
    try {
        const announcements = await Announcement.findByTeam(req.params.teamId);
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;