const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { validatePlayer } = require('../middleware/validation');
const { authenticate, isAdmin, isAdminOrCoach, canAccessPlayer, canAccessTeam, optionalAuth } = require('../middleware/auth');

// GET /api/players - Játékosok listázása role-based filtering-gel
router.get('/', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Admin mindent lát
            const players = await Player.findAll();
            return res.json(players);
        }
        
        if (req.user.role === 'coach' && req.user.team_id) {
            // Coach csak saját csapat
            const players = await Player.findByTeam(req.user.team_id);
            return res.json(players);
        }
        
        // Fallback: üres lista
        res.json([]);
    } catch (error) {
        console.error('Players fetch error:', error);
        res.status(500).json({ error: 'Server error fetching players' });
    }
});

// GET /api/players/team/:teamId - Csapat játékosai (specific route first)
router.get('/team/:teamId', authenticate, canAccessTeam, async (req, res) => {
    try {
        const players = await Player.findByTeam(req.params.teamId);
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/players/:id/age - Játékos életkora (specific route)
router.get('/:id/age', authenticate, canAccessPlayer, async (req, res) => {
    try {
        const age = await Player.getAge(req.params.id);
        if (age === null) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }
        res.json({ age });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/players/:id - Egy játékos adatai (general route last)
router.get('/:id', authenticate, canAccessPlayer, async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/players - Új játékos létrehozása
router.post('/', authenticate, isAdminOrCoach, validatePlayer, async (req, res) => {
    try {
        const result = await Player.create(req.body);
        const newPlayer = await Player.findById(result.id);
        res.status(201).json(newPlayer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/players/:id - Játékos adatainak módosítása
router.put('/:id', authenticate, isAdminOrCoach, canAccessPlayer, validatePlayer, async (req, res) => {
    try {
        const existingPlayer = await Player.findById(req.params.id);
        if (!existingPlayer) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }

        await Player.update(req.params.id, req.body);
        const updatedPlayer = await Player.findById(req.params.id);
        res.json(updatedPlayer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/players/:id - Játékos törlése (csak admin)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const existingPlayer = await Player.findById(req.params.id);
        if (!existingPlayer) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }

        await Player.delete(req.params.id);
        res.json({ message: 'Játékos sikeresen törölve' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/players/:id/assign-parent - Szülő hozzárendelése játékoshoz
router.put('/:id/assign-parent', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const { parentId } = req.body;
        const playerId = req.params.id;

        if (!parentId) {
            return res.status(400).json({ error: 'Parent ID is required' });
        }

        // Check if player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }

        // Check if parent exists and has parent role
        const User = require('../models/User');
        const parent = await User.findById(parentId);
        if (!parent) {
            return res.status(404).json({ error: 'Szülő nem található' });
        }

        if (parent.role !== 'parent') {
            return res.status(400).json({ error: 'A felhasználó nem szülő' });
        }

        // Update user's player_id (connect parent to child)
        await User.update(parentId, {
            username: parent.username,
            email: parent.email,
            full_name: parent.full_name,
            role: parent.role,
            team_id: player.team_id, // Set parent's team to child's team
            player_id: playerId,
            active: parent.active
        });

        // Update player with parent information
        await Player.update(playerId, {
            ...player,
            parent_name: parent.full_name,
            parent_email: parent.email
        });

        const updatedPlayer = await Player.findById(playerId);
        const updatedParent = await User.findById(parentId);

        res.json({
            success: true,
            message: 'Szülő sikeresen hozzárendelve a játékoshoz',
            player: updatedPlayer,
            parent: updatedParent
        });
    } catch (error) {
        console.error('Parent assignment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/players/:id/parent - Szülő kapcsolat törlése
router.delete('/:id/parent', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const playerId = req.params.id;

        // Check if player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }

        // Find parent connected to this player
        const User = require('../models/User');
        const parents = await User.getParentsByPlayer(playerId);
        
        if (parents.length === 0) {
            return res.status(404).json({ error: 'Nincs szülő hozzárendelve ehhez a játékoshoz' });
        }

        // Remove parent connection (update all connected parents)
        for (const parent of parents) {
            await User.update(parent.id, {
                username: parent.username,
                email: parent.email,
                full_name: parent.full_name,
                role: parent.role,
                team_id: null,
                player_id: null,
                active: parent.active
            });
        }

        // Update player to remove parent information
        await Player.update(playerId, {
            ...player,
            parent_name: null,
            parent_email: null
        });

        const updatedPlayer = await Player.findById(playerId);

        res.json({
            success: true,
            message: 'Szülő kapcsolat sikeresen törölve',
            player: updatedPlayer,
            removedParents: parents.map(p => p.full_name)
        });
    } catch (error) {
        console.error('Parent removal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/players/available-children - Szülő nélküli játékosok
router.get('/available-children', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        let allPlayers;
        
        if (req.user.role === 'admin') {
            // Admin mindent lát
            allPlayers = await Player.findAll();
        } else if (req.user.role === 'coach' && req.user.team_id) {
            // Coach csak saját csapat
            allPlayers = await Player.findByTeam(req.user.team_id);
        } else {
            allPlayers = [];
        }
        
        // Filter players without parents (no parent_name or empty parent_name)
        const availableChildren = allPlayers.filter(player => 
            !player.parent_name || player.parent_name.trim() === ''
        );

        res.json({
            success: true,
            children: availableChildren,
            count: availableChildren.length
        });
    } catch (error) {
        console.error('Available children fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;