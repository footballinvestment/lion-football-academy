const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isEnabled = process.env.EMAIL_ENABLED === 'true';
        this.initializeTransporter();
    }

    async initializeTransporter() {
        if (!this.isEnabled) {
            console.log('📧 Email service disabled via EMAIL_ENABLED environment variable');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('❌ Email service initialization failed:', error.message);
            this.isEnabled = false;
        }
    }

    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');
            
            // Replace variables in template
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, variables[key]);
            });
            
            return template;
        } catch (error) {
            console.error(`❌ Failed to load email template ${templateName}:`, error.message);
            return null;
        }
    }

    async sendEmail(to, subject, htmlContent, textContent = null) {
        if (!this.isEnabled || !this.transporter) {
            console.log('📧 Email sending skipped - service not available');
            return { success: false, message: 'Email service not available' };
        }

        try {
            const mailOptions = {
                from: process.env.FROM_EMAIL,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject,
                html: htmlContent,
                text: textContent || this.stripHtml(htmlContent)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
            
            return {
                success: true,
                messageId: info.messageId,
                to: mailOptions.to
            };
        } catch (error) {
            console.error('❌ Failed to send email:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // TRAINING REMINDER EMAIL
    async sendTrainingReminder(training, players) {
        if (!players || players.length === 0) return;

        const parentEmails = [...new Set(
            players
                .map(player => player.parent_email)
                .filter(email => email && email.trim() !== '')
        )];

        if (parentEmails.length === 0) {
            console.log('📧 No parent emails found for training reminder');
            return;
        }

        const variables = {
            training_type: training.type || 'Edzés',
            training_date: new Date(training.date).toLocaleDateString('hu-HU'),
            training_time: training.time || 'Nincs megadva',
            training_location: training.location || 'Nincs megadva',
            team_name: training.team_name || 'Ismeretlen csapat',
            academy_name: process.env.FROM_NAME,
            player_names: players.map(p => p.name).join(', ')
        };

        const htmlContent = await this.loadTemplate('training-reminder', variables);
        if (!htmlContent) return;

        const subject = `⚽ Edzés emlékeztető - ${variables.training_date}`;

        const results = [];
        for (const email of parentEmails) {
            const result = await this.sendEmail(email, subject, htmlContent);
            results.push({ email, ...result });
        }

        return results;
    }

    // WEEKLY ATTENDANCE REPORT
    async sendWeeklyAttendanceReport(parent, children, attendanceData) {
        if (!parent.email) return;

        const variables = {
            parent_name: parent.full_name,
            children_count: children.length,
            children_names: children.map(c => c.name).join(', '),
            week_start: attendanceData.weekStart,
            week_end: attendanceData.weekEnd,
            total_trainings: attendanceData.totalTrainings,
            attended_trainings: attendanceData.attendedTrainings,
            attendance_percentage: attendanceData.attendancePercentage,
            academy_name: process.env.FROM_NAME
        };

        const htmlContent = await this.loadTemplate('weekly-attendance-report', variables);
        if (!htmlContent) return;

        const subject = `📊 Heti jelenlét jelentés - ${variables.week_start} - ${variables.week_end}`;
        
        return await this.sendEmail(parent.email, subject, htmlContent);
    }

    // WELCOME EMAIL
    async sendWelcomeEmail(user, temporaryPassword = null) {
        if (!user.email) return;

        const variables = {
            user_name: user.full_name,
            username: user.username,
            role: user.role === 'admin' ? 'Adminisztrátor' : 
                  user.role === 'coach' ? 'Edző' : 'Szülő',
            academy_name: process.env.FROM_NAME,
            login_url: process.env.FRONTEND_URL || 'http://localhost:3000',
            temporary_password: temporaryPassword || 'Használja a regisztráció során megadott jelszót'
        };

        const htmlContent = await this.loadTemplate('welcome', variables);
        if (!htmlContent) return;

        const subject = `🎉 Üdvözöljük a ${process.env.FROM_NAME} rendszerében!`;
        
        return await this.sendEmail(user.email, subject, htmlContent);
    }

    // COACH NOTIFICATION - LOW ATTENDANCE
    async sendLowAttendanceAlert(coach, team, attendanceData) {
        if (!coach.email) return;

        const variables = {
            coach_name: coach.full_name,
            team_name: team.name,
            week_start: attendanceData.weekStart,
            week_end: attendanceData.weekEnd,
            attendance_percentage: attendanceData.attendancePercentage,
            total_players: attendanceData.totalPlayers,
            absent_players: attendanceData.absentPlayers.join(', '),
            academy_name: process.env.FROM_NAME
        };

        const htmlContent = await this.loadTemplate('low-attendance-alert', variables);
        if (!htmlContent) return;

        const subject = `⚠️ Alacsony részvételi arány - ${team.name}`;
        
        return await this.sendEmail(coach.email, subject, htmlContent);
    }

    // ADMIN WEEKLY REPORT
    async sendAdminWeeklyReport(adminEmail, reportData) {
        if (!adminEmail) return;

        const variables = {
            week_start: reportData.weekStart,
            week_end: reportData.weekEnd,
            total_users: reportData.totalUsers,
            total_trainings: reportData.totalTrainings,
            overall_attendance: reportData.overallAttendance,
            new_registrations: reportData.newRegistrations,
            active_teams: reportData.activeTeams,
            academy_name: process.env.FROM_NAME,
            top_performing_teams: reportData.topPerformingTeams || []
        };

        const htmlContent = await this.loadTemplate('admin-weekly-report', variables);
        if (!htmlContent) return;

        const subject = `📈 Heti rendszer jelentés - ${variables.week_start} - ${variables.week_end}`;
        
        return await this.sendEmail(adminEmail, subject, htmlContent);
    }
}

module.exports = new EmailService();