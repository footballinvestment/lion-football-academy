const cron = require('node-cron');
const emailService = require('./emailService');
const emailQueue = require('./emailQueue');
const Player = require('../models/Player');
const Training = require('../models/Training');
const User = require('../models/User');
const Team = require('../models/Team');
const NotificationPreference = require('../models/NotificationPreference');
const db = require('../database/connection');

class NotificationService {
    constructor() {
        this.scheduledJobs = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('📧 Initializing Notification Service...');
        
        // Schedule training reminders - every day at 10:00 AM
        this.scheduleTrainingReminders();
        
        // Schedule weekly reports - every Sunday at 9:00 AM
        this.scheduleWeeklyReports();
        
        // Schedule low attendance alerts - every Monday at 8:00 AM
        this.scheduleLowAttendanceAlerts();
        
        this.isInitialized = true;
        console.log('✅ Notification Service initialized with scheduled jobs');
    }

    scheduleTrainingReminders() {
        const job = cron.schedule('0 10 * * *', async () => {
            console.log('🔔 Running training reminder job...');
            await this.sendTrainingReminders();
        }, {
            scheduled: false,
            timezone: 'Europe/Budapest'
        });

        this.scheduledJobs.set('training-reminders', job);
        job.start();
        console.log('⏰ Training reminders scheduled for 10:00 AM daily');
    }

    scheduleWeeklyReports() {
        const job = cron.schedule('0 9 * * 0', async () => {
            console.log('📊 Running weekly reports job...');
            await this.sendWeeklyReports();
        }, {
            scheduled: false,
            timezone: 'Europe/Budapest'
        });

        this.scheduledJobs.set('weekly-reports', job);
        job.start();
        console.log('⏰ Weekly reports scheduled for Sunday 9:00 AM');
    }

    scheduleLowAttendanceAlerts() {
        const job = cron.schedule('0 8 * * 1', async () => {
            console.log('⚠️ Running low attendance alerts job...');
            await this.sendLowAttendanceAlerts();
        }, {
            scheduled: false,
            timezone: 'Europe/Budapest'
        });

        this.scheduledJobs.set('low-attendance-alerts', job);
        job.start();
        console.log('⏰ Low attendance alerts scheduled for Monday 8:00 AM');
    }

    async sendTrainingReminders() {
        try {
            const reminderHours = parseInt(process.env.TRAINING_REMINDER_HOURS) || 24;
            const reminderTime = new Date();
            reminderTime.setHours(reminderTime.getHours() + reminderHours);
            
            // Get trainings happening in the next 24 hours
            const tomorrow = new Date(reminderTime);
            const dayAfter = new Date(tomorrow);
            dayAfter.setDate(dayAfter.getDate() + 1);

            const sql = `
                SELECT t.*, tm.name as team_name
                FROM trainings t
                LEFT JOIN teams tm ON t.team_id = tm.id
                WHERE DATE(t.date) = DATE(?)
                AND t.date >= datetime('now')
            `;

            const upcomingTrainings = await db.query(sql, [
                tomorrow.toISOString().split('T')[0]
            ]);

            console.log(`Found ${upcomingTrainings.length} upcoming trainings for tomorrow`);

            for (const training of upcomingTrainings) {
                if (training.team_id) {
                    const players = await Player.findByTeam(training.team_id);
                    const playersWithParents = players.filter(p => p.parent_email);
                    
                    if (playersWithParents.length > 0) {
                        // Check notification preferences and filter users
                        const eligibleParents = [];
                        for (const player of playersWithParents) {
                            if (player.parent_email) {
                                // Find parent user by email
                                const parentUser = await User.findByEmail(player.parent_email);
                                if (parentUser) {
                                    const prefs = await NotificationPreference.getOrCreateDefault(parentUser.id);
                                    if (prefs.email_enabled && prefs.training_reminders) {
                                        eligibleParents.push(player);
                                    }
                                }
                            }
                        }
                        
                        if (eligibleParents.length > 0) {
                            await emailQueue.addTrainingReminder(training, eligibleParents);
                            console.log(`✅ Training reminder queued for ${training.team_name} - ${eligibleParents.length} parents will be notified`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error sending training reminders:', error);
        }
    }

    async sendWeeklyReports() {
        try {
            // Get all parents
            const parents = await User.findByRole('parent');
            console.log(`Generating weekly reports for ${parents.length} parents`);

            const weekStart = this.getWeekStart();
            const weekEnd = this.getWeekEnd();

            for (const parent of parents) {
                try {
                    // Get parent's children
                    const children = await Player.findByParent(parent.id);
                    
                    if (children.length === 0) continue;

                    // Calculate attendance data for the week
                    const attendanceData = await this.calculateWeeklyAttendance(children, weekStart, weekEnd);
                    
                    await emailService.sendWeeklyAttendanceReport(parent, children, attendanceData);
                    console.log(`✅ Weekly report sent to ${parent.full_name}`);
                } catch (parentError) {
                    console.error(`❌ Error sending weekly report to ${parent.full_name}:`, parentError);
                }
            }

            // Send admin report
            await this.sendAdminWeeklyReport(weekStart, weekEnd);
        } catch (error) {
            console.error('❌ Error sending weekly reports:', error);
        }
    }

    async sendLowAttendanceAlerts() {
        try {
            const teams = await Team.findAll();
            const weekStart = this.getWeekStart(-7); // Previous week
            const weekEnd = this.getWeekEnd(-7);

            for (const team of teams) {
                try {
                    const attendanceData = await this.calculateTeamAttendance(team.id, weekStart, weekEnd);
                    
                    // Alert if attendance is below 60%
                    if (attendanceData.attendancePercentage < 60) {
                        // Get team coach
                        const coaches = await User.getUsersByTeam(team.id);
                        const coach = coaches.find(user => user.role === 'coach');
                        
                        if (coach && coach.email) {
                            await emailService.sendLowAttendanceAlert(coach, team, attendanceData);
                            console.log(`⚠️ Low attendance alert sent to coach ${coach.full_name} for team ${team.name}`);
                        }
                    }
                } catch (teamError) {
                    console.error(`❌ Error processing team ${team.name}:`, teamError);
                }
            }
        } catch (error) {
            console.error('❌ Error sending low attendance alerts:', error);
        }
    }

    async sendAdminWeeklyReport(weekStart, weekEnd) {
        try {
            const admins = await User.findByRole('admin');
            
            const reportData = {
                weekStart: weekStart.toLocaleDateString('hu-HU'),
                weekEnd: weekEnd.toLocaleDateString('hu-HU'),
                totalUsers: await this.getTotalUsers(),
                totalTrainings: await this.getWeeklyTrainings(weekStart, weekEnd),
                overallAttendance: await this.getOverallAttendance(weekStart, weekEnd),
                newRegistrations: await this.getNewRegistrations(weekStart, weekEnd),
                activeTeams: await this.getActiveTeams(),
                topPerformingTeams: await this.getTopPerformingTeams(weekStart, weekEnd)
            };

            for (const admin of admins) {
                if (admin.email) {
                    await emailService.sendAdminWeeklyReport(admin.email, reportData);
                    console.log(`📈 Admin weekly report sent to ${admin.full_name}`);
                }
            }
        } catch (error) {
            console.error('❌ Error sending admin weekly report:', error);
        }
    }

    // Manual trigger methods for testing
    async triggerTrainingReminders() {
        console.log('🔔 Manually triggering training reminders...');
        await this.sendTrainingReminders();
    }

    async triggerWeeklyReports() {
        console.log('📊 Manually triggering weekly reports...');
        await this.sendWeeklyReports();
    }

    async triggerLowAttendanceAlerts() {
        console.log('⚠️ Manually triggering low attendance alerts...');
        await this.sendLowAttendanceAlerts();
    }

    // Helper methods
    getWeekStart(offsetWeeks = 0) {
        const date = new Date();
        date.setDate(date.getDate() + (offsetWeeks * 7));
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    getWeekEnd(offsetWeeks = 0) {
        const weekStart = this.getWeekStart(offsetWeeks);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd;
    }

    async calculateWeeklyAttendance(children, weekStart, weekEnd) {
        // Simplified calculation - would need proper attendance table
        const totalTrainings = await this.getTrainingsForWeek(weekStart, weekEnd);
        const attendedTrainings = Math.floor(totalTrainings * 0.8); // Mock data
        
        return {
            weekStart: weekStart.toLocaleDateString('hu-HU'),
            weekEnd: weekEnd.toLocaleDateString('hu-HU'),
            totalTrainings,
            attendedTrainings,
            attendancePercentage: totalTrainings > 0 ? Math.round((attendedTrainings / totalTrainings) * 100) : 0
        };
    }

    async calculateTeamAttendance(teamId, weekStart, weekEnd) {
        const players = await Player.findByTeam(teamId);
        const totalTrainings = await this.getTrainingsForWeek(weekStart, weekEnd, teamId);
        
        // Mock attendance calculation
        const attendancePercentage = Math.floor(Math.random() * 40) + 50; // 50-90%
        const absentPlayers = players
            .filter(() => Math.random() < 0.3)
            .map(p => p.name)
            .slice(0, 3);

        return {
            weekStart: weekStart.toLocaleDateString('hu-HU'),
            weekEnd: weekEnd.toLocaleDateString('hu-HU'),
            attendancePercentage,
            totalPlayers: players.length,
            absentPlayers
        };
    }

    async getTrainingsForWeek(weekStart, weekEnd, teamId = null) {
        let sql = `
            SELECT COUNT(*) as count
            FROM trainings
            WHERE date BETWEEN ? AND ?
        `;
        let params = [weekStart.toISOString(), weekEnd.toISOString()];

        if (teamId) {
            sql += ' AND team_id = ?';
            params.push(teamId);
        }

        const result = await db.query(sql, params);
        return result[0]?.count || 0;
    }

    async getTotalUsers() {
        const result = await db.query('SELECT COUNT(*) as count FROM users WHERE active = 1');
        return result[0]?.count || 0;
    }

    async getWeeklyTrainings(weekStart, weekEnd) {
        return await this.getTrainingsForWeek(weekStart, weekEnd);
    }

    async getOverallAttendance(weekStart, weekEnd) {
        // Mock overall attendance calculation
        return Math.floor(Math.random() * 30) + 70; // 70-100%
    }

    async getNewRegistrations(weekStart, weekEnd) {
        const sql = `
            SELECT COUNT(*) as count
            FROM users
            WHERE created_at BETWEEN ? AND ?
        `;
        const result = await db.query(sql, [weekStart.toISOString(), weekEnd.toISOString()]);
        return result[0]?.count || 0;
    }

    async getActiveTeams() {
        const result = await db.query('SELECT COUNT(*) as count FROM teams');
        return result[0]?.count || 0;
    }

    async getTopPerformingTeams(weekStart, weekEnd) {
        const teams = await Team.findAll();
        return teams.slice(0, 3).map(team => ({
            name: team.name,
            attendance: Math.floor(Math.random() * 20) + 80, // 80-100%
            players: Math.floor(Math.random() * 10) + 15 // 15-25 players
        }));
    }

    // Cleanup method
    stopAllJobs() {
        console.log('🛑 Stopping all scheduled notification jobs...');
        this.scheduledJobs.forEach((job, name) => {
            job.stop();
            console.log(`❌ Stopped job: ${name}`);
        });
        this.scheduledJobs.clear();
        this.isInitialized = false;
    }
}

module.exports = new NotificationService();