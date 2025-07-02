const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Player = require('../models/Player');
const { authenticate, isAdmin, isAdminOrCoach, canAccessTeam } = require('../middleware/auth');

const validateTeam = (teamData) => {
    const errors = [];
    if (!teamData.name || teamData.name.trim() === '') {
        errors.push('Csapat név kötelező');
    }
    if (!teamData.age_group || teamData.age_group.trim() === '') {
        errors.push('Korosztály kötelező');
    }
    return errors;
};

// GET /api/teams/available-coaches - Nem hozzárendelt edzők listája (csak admin)
router.get('/available-coaches', authenticate, isAdmin, async (req, res) => {
    try {
        const User = require('../models/User');
        
        // Get all coaches
        const allCoaches = await User.findByRole('coach');
        
        // Filter available coaches (not assigned to any team)
        const availableCoaches = allCoaches.filter(coach => !coach.team_id);

        res.json({
            success: true,
            coaches: availableCoaches,
            count: availableCoaches.length
        });
    } catch (error) {
        console.error('Available coaches fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/teams - User context alapú csapat listázás
router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Admin összes csapatot látja
            const teams = await Team.findAll();
            
            // Játékosok számának hozzáadása minden csapathoz
            const teamsWithPlayerCount = await Promise.all(
                teams.map(async (team) => {
                    const playerCount = await Team.getPlayersCount(team.id);
                    return { ...team, player_count: playerCount };
                })
            );
            
            return res.json(teamsWithPlayerCount);
        }
        
        if (req.user.team_id) {
            // Coach/Parent csak saját csapatot
            const team = await Team.findById(req.user.team_id);
            if (team) {
                const playerCount = await Team.getPlayersCount(team.id);
                return res.json([{ ...team, player_count: playerCount }]);
            }
        }
        
        // Ha nincs team_id, üres lista
        res.json([]);
    } catch (error) {
        console.error('Teams fetch error:', error);
        res.status(500).json({ error: 'Server error fetching teams' });
    }
});

// GET /api/teams/:id - Egy csapat adatai
router.get('/:id', authenticate, canAccessTeam, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }
        
        const playerCount = await Team.getPlayersCount(team.id);
        res.json({ ...team, player_count: playerCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/teams - Új csapat létrehozása
router.post('/', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const errors = validateTeam(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const result = await Team.create(req.body);
        const newTeam = await Team.findById(result.id);
        res.status(201).json(newTeam);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/teams/:id - Csapat módosítása
router.put('/:id', authenticate, isAdminOrCoach, canAccessTeam, async (req, res) => {
    try {
        const errors = validateTeam(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const existingTeam = await Team.findById(req.params.id);
        if (!existingTeam) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        await Team.update(req.params.id, req.body);
        const updatedTeam = await Team.findById(req.params.id);
        res.json(updatedTeam);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/teams/:id - Csapat törlése (csak admin)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const existingTeam = await Team.findById(req.params.id);
        if (!existingTeam) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        // Ellenőrizzük, hogy vannak-e játékosok a csapatban
        const playerCount = await Team.getPlayersCount(req.params.id);
        if (playerCount > 0) {
            return res.status(400).json({ 
                error: 'Nem törölhető olyan csapat, amelyben vannak játékosok' 
            });
        }

        await Team.delete(req.params.id);
        res.json({ message: 'Csapat sikeresen törölve' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/teams/:id/players - Csapat játékosai
router.get('/:id/players', authenticate, canAccessTeam, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        const players = await Player.findByTeam(req.params.id);
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/teams/:id/players/:playerId - Játékos hozzáadása csapathoz
router.post('/:id/players/:playerId', authenticate, isAdminOrCoach, canAccessTeam, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        const player = await Player.findById(req.params.playerId);
        if (!player) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }

        // Játékos csapathoz rendelése
        await Player.update(req.params.playerId, { ...player, team_id: req.params.id });
        
        const updatedPlayer = await Player.findById(req.params.playerId);
        res.json({ 
            message: 'Játékos sikeresen hozzáadva a csapathoz',
            player: updatedPlayer 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/teams/:id/players/:playerId - Játékos eltávolítása csapatból
router.delete('/:id/players/:playerId', authenticate, isAdminOrCoach, canAccessTeam, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        const player = await Player.findById(req.params.playerId);
        if (!player) {
            return res.status(404).json({ error: 'Játékos nem található' });
        }

        if (player.team_id != req.params.id) {
            return res.status(400).json({ error: 'A játékos nem tagja ennek a csapatnak' });
        }

        // Játékos eltávolítása a csapatból
        await Player.update(req.params.playerId, { ...player, team_id: null });
        
        const updatedPlayer = await Player.findById(req.params.playerId);
        res.json({ 
            message: 'Játékos sikeresen eltávolítva a csapatból',
            player: updatedPlayer 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/teams/:id/assign-coach - Edző hozzárendelése csapathoz
router.put('/:id/assign-coach', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const { coachId } = req.body;
        const teamId = req.params.id;

        if (!coachId) {
            return res.status(400).json({ error: 'Coach ID is required' });
        }

        // Check if team exists
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        // Check if coach exists and has coach role
        const User = require('../models/User');
        const coach = await User.findById(coachId);
        if (!coach) {
            return res.status(404).json({ error: 'Edző nem található' });
        }

        if (coach.role !== 'coach') {
            return res.status(400).json({ error: 'A felhasználó nem edző' });
        }

        // Check if coach is already assigned to another team
        if (coach.team_id && coach.team_id !== parseInt(teamId)) {
            return res.status(400).json({ 
                error: 'Az edző már egy másik csapathoz van hozzárendelve',
                currentTeam: coach.team_name 
            });
        }

        // Assign coach to team
        await User.update(coachId, {
            username: coach.username,
            email: coach.email,
            full_name: coach.full_name,
            role: coach.role,
            team_id: teamId,
            player_id: coach.player_id,
            active: coach.active
        });

        // Update team with coach name
        await Team.update(teamId, {
            ...team,
            coach_name: coach.full_name
        });

        const updatedTeam = await Team.findById(teamId);
        const updatedCoach = await User.findById(coachId);

        res.json({
            success: true,
            message: 'Edző sikeresen hozzárendelve a csapathoz',
            team: updatedTeam,
            coach: updatedCoach
        });
    } catch (error) {
        console.error('Coach assignment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/teams/:id/coach - Edző eltávolítása csapatból
router.delete('/:id/coach', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const teamId = req.params.id;

        // Check if team exists
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        // Find coach assigned to this team
        const User = require('../models/User');
        const coaches = await User.getUsersByTeam(teamId);
        const teamCoach = coaches.find(user => user.role === 'coach');

        if (!teamCoach) {
            return res.status(404).json({ error: 'Nincs edző hozzárendelve ehhez a csapathoz' });
        }

        // Remove coach from team
        await User.update(teamCoach.id, {
            username: teamCoach.username,
            email: teamCoach.email,
            full_name: teamCoach.full_name,
            role: teamCoach.role,
            team_id: null,
            player_id: teamCoach.player_id,
            active: teamCoach.active
        });

        // Update team to remove coach name
        await Team.update(teamId, {
            ...team,
            coach_name: null
        });

        const updatedTeam = await Team.findById(teamId);

        res.json({
            success: true,
            message: 'Edző sikeresen eltávolítva a csapatból',
            team: updatedTeam,
            removedCoach: teamCoach.full_name
        });
    } catch (error) {
        console.error('Coach removal error:', error);
        res.status(500).json({ error: error.message });
    }
});


// GET /api/teams/:id/coach - Csapat edzőjének lekérése
router.get('/:id/coach', authenticate, canAccessTeam, async (req, res) => {
    try {
        const teamId = req.params.id;

        // Check if team exists
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Csapat nem található' });
        }

        // Find coach assigned to this team
        const User = require('../models/User');
        const coaches = await User.getUsersByTeam(teamId);
        const teamCoach = coaches.find(user => user.role === 'coach');

        if (!teamCoach) {
            return res.json({
                success: true,
                coach: null,
                message: 'Nincs edző hozzárendelve ehhez a csapathoz'
            });
        }

        res.json({
            success: true,
            coach: teamCoach
        });
    } catch (error) {
        console.error('Team coach fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;