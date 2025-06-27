const Queue = require('bull');
const emailService = require('./emailService');

// Create email queue (uses Redis if available, otherwise in-memory)
const emailQueue = new Queue('email processing', {
    redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || '127.0.0.1',
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3
    },
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

// Fallback to in-memory processing if Redis is not available
emailQueue.on('error', (error) => {
    console.warn('📧 Redis connection failed, falling back to immediate email processing');
    console.warn('   To enable queue features, install and configure Redis');
});

class EmailQueue {
    constructor() {
        this.setupProcessors();
        this.setupEventListeners();
    }

    setupProcessors() {
        // Process training reminder emails
        emailQueue.process('training-reminder', async (job) => {
            const { training, players } = job.data;
            return await emailService.sendTrainingReminder(training, players);
        });

        // Process weekly attendance reports
        emailQueue.process('weekly-attendance-report', async (job) => {
            const { parent, children, attendanceData } = job.data;
            return await emailService.sendWeeklyAttendanceReport(parent, children, attendanceData);
        });

        // Process welcome emails
        emailQueue.process('welcome-email', async (job) => {
            const { user, temporaryPassword } = job.data;
            return await emailService.sendWelcomeEmail(user, temporaryPassword);
        });

        // Process low attendance alerts
        emailQueue.process('low-attendance-alert', async (job) => {
            const { coach, team, attendanceData } = job.data;
            return await emailService.sendLowAttendanceAlert(coach, team, attendanceData);
        });

        // Process admin weekly reports
        emailQueue.process('admin-weekly-report', async (job) => {
            const { adminEmail, reportData } = job.data;
            return await emailService.sendAdminWeeklyReport(adminEmail, reportData);
        });

        // Process custom emails
        emailQueue.process('custom-email', async (job) => {
            const { to, subject, htmlContent, textContent } = job.data;
            return await emailService.sendEmail(to, subject, htmlContent, textContent);
        });

        console.log('📧 Email queue processors initialized');
    }

    setupEventListeners() {
        emailQueue.on('completed', (job, result) => {
            console.log(`✅ Email job ${job.id} completed: ${job.opts.jobId || job.data.type || 'unknown'}`);
        });

        emailQueue.on('failed', (job, err) => {
            console.error(`❌ Email job ${job.id} failed:`, err.message);
        });

        emailQueue.on('stalled', (job) => {
            console.warn(`⏰ Email job ${job.id} stalled`);
        });
    }

    // Queue methods with fallback to immediate processing
    async addTrainingReminder(training, players, options = {}) {
        try {
            return await emailQueue.add('training-reminder', 
                { training, players, type: 'training-reminder' }, 
                { ...options, delay: options.delay || 0 }
            );
        } catch (error) {
            console.warn('📧 Queue unavailable, processing immediately');
            return await emailService.sendTrainingReminder(training, players);
        }
    }

    async addWeeklyAttendanceReport(parent, children, attendanceData, options = {}) {
        try {
            return await emailQueue.add('weekly-attendance-report', 
                { parent, children, attendanceData, type: 'weekly-attendance-report' }, 
                options
            );
        } catch (error) {
            console.warn('📧 Queue unavailable, processing immediately');
            return await emailService.sendWeeklyAttendanceReport(parent, children, attendanceData);
        }
    }

    async addWelcomeEmail(user, temporaryPassword = null, options = {}) {
        try {
            return await emailQueue.add('welcome-email', 
                { user, temporaryPassword, type: 'welcome-email' }, 
                options
            );
        } catch (error) {
            console.warn('📧 Queue unavailable, processing immediately');
            return await emailService.sendWelcomeEmail(user, temporaryPassword);
        }
    }

    async addLowAttendanceAlert(coach, team, attendanceData, options = {}) {
        try {
            return await emailQueue.add('low-attendance-alert', 
                { coach, team, attendanceData, type: 'low-attendance-alert' }, 
                options
            );
        } catch (error) {
            console.warn('📧 Queue unavailable, processing immediately');
            return await emailService.sendLowAttendanceAlert(coach, team, attendanceData);
        }
    }

    async addAdminWeeklyReport(adminEmail, reportData, options = {}) {
        try {
            return await emailQueue.add('admin-weekly-report', 
                { adminEmail, reportData, type: 'admin-weekly-report' }, 
                options
            );
        } catch (error) {
            console.warn('📧 Queue unavailable, processing immediately');
            return await emailService.sendAdminWeeklyReport(adminEmail, reportData);
        }
    }

    async addCustomEmail(to, subject, htmlContent, textContent = null, options = {}) {
        try {
            return await emailQueue.add('custom-email', 
                { to, subject, htmlContent, textContent, type: 'custom-email' }, 
                options
            );
        } catch (error) {
            console.warn('📧 Queue unavailable, processing immediately');
            return await emailService.sendEmail(to, subject, htmlContent, textContent);
        }
    }

    // Bulk email methods
    async addBulkTrainingReminders(reminders, options = {}) {
        const jobs = reminders.map(({ training, players }) => ({
            name: 'training-reminder',
            data: { training, players, type: 'bulk-training-reminder' },
            opts: options
        }));

        try {
            return await emailQueue.addBulk(jobs);
        } catch (error) {
            console.warn('📧 Queue unavailable, processing bulk emails immediately');
            const results = [];
            for (const reminder of reminders) {
                try {
                    const result = await emailService.sendTrainingReminder(reminder.training, reminder.players);
                    results.push(result);
                } catch (emailError) {
                    results.push({ success: false, error: emailError.message });
                }
            }
            return results;
        }
    }

    async addBulkWeeklyReports(reports, options = {}) {
        const jobs = reports.map(({ parent, children, attendanceData }) => ({
            name: 'weekly-attendance-report',
            data: { parent, children, attendanceData, type: 'bulk-weekly-report' },
            opts: options
        }));

        try {
            return await emailQueue.addBulk(jobs);
        } catch (error) {
            console.warn('📧 Queue unavailable, processing bulk reports immediately');
            const results = [];
            for (const report of reports) {
                try {
                    const result = await emailService.sendWeeklyAttendanceReport(
                        report.parent, report.children, report.attendanceData
                    );
                    results.push(result);
                } catch (emailError) {
                    results.push({ success: false, error: emailError.message });
                }
            }
            return results;
        }
    }

    // Queue management methods
    async getQueueStats() {
        try {
            const waiting = await emailQueue.getWaiting();
            const active = await emailQueue.getActive();
            const completed = await emailQueue.getCompleted();
            const failed = await emailQueue.getFailed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total: waiting.length + active.length + completed.length + failed.length
            };
        } catch (error) {
            return {
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                total: 0,
                error: 'Queue stats unavailable (Redis connection failed)'
            };
        }
    }

    async retryFailedJobs() {
        try {
            const failedJobs = await emailQueue.getFailed();
            console.log(`🔄 Retrying ${failedJobs.length} failed email jobs`);
            
            for (const job of failedJobs) {
                await job.retry();
            }
            
            return { retried: failedJobs.length };
        } catch (error) {
            console.error('❌ Error retrying failed jobs:', error);
            return { error: error.message };
        }
    }

    async cleanQueue() {
        try {
            await emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 1 day
            await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
            console.log('🧹 Email queue cleaned');
        } catch (error) {
            console.error('❌ Error cleaning queue:', error);
        }
    }

    async pauseQueue() {
        try {
            await emailQueue.pause();
            console.log('⏸️ Email queue paused');
        } catch (error) {
            console.error('❌ Error pausing queue:', error);
        }
    }

    async resumeQueue() {
        try {
            await emailQueue.resume();
            console.log('▶️ Email queue resumed');
        } catch (error) {
            console.error('❌ Error resuming queue:', error);
        }
    }

    async closeQueue() {
        try {
            await emailQueue.close();
            console.log('🛑 Email queue closed');
        } catch (error) {
            console.error('❌ Error closing queue:', error);
        }
    }
}

module.exports = new EmailQueue();