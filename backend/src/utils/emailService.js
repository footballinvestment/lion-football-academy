const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Configure email transporter based on environment
        const emailConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        // For development, use Ethereal Email or log emails
        if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
            console.log('⚠️  Email service running in development mode - emails will be logged');
            this.transporter = {
                sendMail: async (mailOptions) => {
                    console.log('📧 EMAIL WOULD BE SENT:');
                    console.log('To:', mailOptions.to);
                    console.log('Subject:', mailOptions.subject);
                    console.log('Content:', mailOptions.text || 'HTML content');
                    return { messageId: 'dev-' + Date.now() };
                }
            };
            return;
        }

        try {
            this.transporter = nodemailer.createTransport(emailConfig);
            
            // Verify connection
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ Email service configuration error:', error);
                } else {
                    console.log('✅ Email service ready');
                }
            });
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error);
        }
    }

    // Get email template
    getEmailTemplate(templateName) {
        const templates = {
            notification: {
                subject: 'New Notification - Lion Football Academy',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <header style="background: linear-gradient(135deg, #2c5530 0%, #8B5A3C 100%); color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0;">🦁 Lion Football Academy</h1>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">{{priorityBadge}}</p>
                        </header>
                        <main style="padding: 30px 20px;">
                            <h2 style="color: #2c5530; margin-bottom: 20px;">{{title}}</h2>
                            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                <p style="line-height: 1.6; margin: 0;">{{message}}</p>
                            </div>
                            {{actionButton}}
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                    Best regards,<br>
                                    The Lion Football Academy Team
                                </p>
                            </div>
                        </main>
                        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>Lion Football Academy | Building Champions On and Off the Field</p>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </footer>
                    </div>
                `
            },
            welcome: {
                subject: 'Welcome to Lion Football Academy! 🦁⚽',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <header style="background: linear-gradient(135deg, #2c5530 0%, #8B5A3C 100%); color: white; padding: 30px 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">🦁 Welcome to Lion Football Academy!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Building Champions On and Off the Field</p>
                        </header>
                        <main style="padding: 40px 20px;">
                            <h2 style="color: #2c5530; margin-bottom: 20px;">Hello {{recipientName}}! 👋</h2>
                            <p style="line-height: 1.6; margin-bottom: 20px;">
                                We're thrilled to welcome you to the Lion Football Academy family! You're about to embark on an incredible journey of skill development, teamwork, and personal growth.
                            </p>
                            <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0;">
                                <h3 style="color: #2c5530; margin-top: 0;">🌟 What to Expect:</h3>
                                <ul style="line-height: 1.8; padding-left: 20px;">
                                    <li><strong>Expert Coaching:</strong> Learn from qualified, passionate coaches</li>
                                    <li><strong>Skill Development:</strong> Improve your technical and tactical abilities</li>
                                    <li><strong>Team Building:</strong> Make lifelong friends and teammates</li>
                                    <li><strong>Character Building:</strong> Develop discipline, respect, and leadership</li>
                                    <li><strong>Fun Environment:</strong> Enjoy football in a positive, supportive atmosphere</li>
                                </ul>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{loginUrl}}" style="background: #2c5530; color: white; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                                    🚀 Access Your Dashboard
                                </a>
                            </div>
                            <div style="background: #fef7cd; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h4 style="color: #92400e; margin-top: 0;">📱 Getting Started:</h4>
                                <ol style="color: #92400e; line-height: 1.6; margin: 0; padding-left: 20px;">
                                    <li>Log in to your dashboard using the button above</li>
                                    <li>Complete your profile information</li>
                                    <li>Check your training schedule</li>
                                    <li>Connect with your team</li>
                                </ol>
                            </div>
                        </main>
                        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p><strong>Lion Football Academy</strong> | Building Champions On and Off the Field</p>
                            <p>Questions? Contact us at support@lionfootballacademy.com</p>
                        </footer>
                    </div>
                `
            },
            teamAnnouncement: {
                subject: '📢 Team Announcement - Lion Football Academy',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <header style="background: linear-gradient(135deg, #2c5530 0%, #8B5A3C 100%); color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0;">📢 Team Announcement</h1>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Lion Football Academy</p>
                        </header>
                        <main style="padding: 30px 20px;">
                            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 20px;">
                                <h2 style="color: #1e40af; margin: 0 0 10px 0;">{{title}}</h2>
                                <p style="color: #1e40af; margin: 0; font-weight: 500;">Team Update</p>
                            </div>
                            <div style="line-height: 1.6; margin-bottom: 30px;">
                                {{message}}
                            </div>
                            {{actionButton}}
                            <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <p style="color: #15803d; margin: 0; font-size: 14px;">
                                    <strong>💡 Tip:</strong> Stay updated by checking your dashboard regularly for the latest team news and schedules.
                                </p>
                            </div>
                        </main>
                        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>Lion Football Academy | Building Champions On and Off the Field</p>
                        </footer>
                    </div>
                `
            },
            emergencyAlert: {
                subject: '🚨 URGENT: Emergency Alert - Lion Football Academy',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626;">
                        <header style="background: #dc2626; color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
                            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">IMMEDIATE ATTENTION REQUIRED</p>
                        </header>
                        <main style="padding: 30px 20px;">
                            <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                <h2 style="color: #dc2626; margin: 0 0 15px 0;">{{title}}</h2>
                                <div style="color: #991b1b; line-height: 1.6; font-size: 16px;">
                                    {{message}}
                                </div>
                            </div>
                            {{actionButton}}
                            <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 20px;">
                                <p style="color: #92400e; margin: 0; font-weight: bold;">
                                    ⚠️ This is an emergency communication. Please read this message immediately and take any required action.
                                </p>
                            </div>
                        </main>
                        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>Lion Football Academy Emergency System</p>
                            <p>For immediate assistance, call: [Emergency Contact Number]</p>
                        </footer>
                    </div>
                `
            },
            reminder: {
                subject: '⏰ Reminder - {{reminderType}} - Lion Football Academy',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <header style="background: linear-gradient(135deg, #2c5530 0%, #8B5A3C 100%); color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0;">⏰ Friendly Reminder</h1>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Lion Football Academy</p>
                        </header>
                        <main style="padding: 30px 20px;">
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 20px;">
                                <h2 style="color: #92400e; margin: 0 0 10px 0;">{{title}}</h2>
                                <p style="color: #92400e; margin: 0;">{{reminderType}} Reminder</p>
                            </div>
                            <div style="line-height: 1.6; margin-bottom: 20px;">
                                {{message}}
                            </div>
                            {{actionButton}}
                            <div style="background: #ecfdf5; border: 1px solid #22c55e; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <p style="color: #15803d; margin: 0; font-size: 14px;">
                                    <strong>📅 Schedule:</strong> {{scheduledFor}}
                                </p>
                            </div>
                        </main>
                        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>Lion Football Academy | Building Champions On and Off the Field</p>
                        </footer>
                    </div>
                `
            },
            weeklyReport: {
                subject: '📊 Weekly Progress Report - Lion Football Academy',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <header style="background: linear-gradient(135deg, #2c5530 0%, #8B5A3C 100%); color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0;">📊 Weekly Report</h1>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">{{playerName}}'s Progress</p>
                        </header>
                        <main style="padding: 30px 20px;">
                            <h2 style="color: #2c5530; margin-bottom: 20px;">This Week's Highlights</h2>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 24px; font-weight: bold; color: #15803d;">{{trainingAttendance}}</div>
                                    <div style="color: #15803d; font-size: 14px;">Training Sessions</div>
                                </div>
                                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 24px; font-weight: bold; color: #1d4ed8;">{{skillRating}}</div>
                                    <div style="color: #1d4ed8; font-size: 14px;">Skill Rating</div>
                                </div>
                            </div>

                            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                <h3 style="color: #2c5530; margin-top: 0;">🎯 Areas of Improvement</h3>
                                <p style="line-height: 1.6; margin-bottom: 0;">{{improvements}}</p>
                            </div>

                            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px;">
                                <h3 style="color: #15803d; margin-top: 0;">🌟 Achievements</h3>
                                <p style="line-height: 1.6; margin-bottom: 0;">{{achievements}}</p>
                            </div>
                        </main>
                        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>Lion Football Academy | Building Champions On and Off the Field</p>
                        </footer>
                    </div>
                `
            }
        };

        return templates[templateName] || templates.notification;
    }

    // Replace template variables
    processTemplate(template, data) {
        let html = template.html;
        let subject = template.subject;

        // Process subject
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, data[key] || '');
        });

        // Process HTML content
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, data[key] || '');
        });

        // Handle special cases
        if (data.actionUrl) {
            const actionButton = `
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${data.actionUrl}" style="background: #2c5530; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Take Action
                    </a>
                </div>
            `;
            html = html.replace('{{actionButton}}', actionButton);
        } else {
            html = html.replace('{{actionButton}}', '');
        }

        // Handle priority badge
        if (data.priority === 'urgent') {
            html = html.replace('{{priorityBadge}}', '🚨 URGENT');
        } else if (data.priority === 'high') {
            html = html.replace('{{priorityBadge}}', '⚠️ High Priority');
        } else {
            html = html.replace('{{priorityBadge}}', '');
        }

        return { subject, html };
    }

    // Send email
    async sendEmail(to, subject, html, attachments = []) {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        const mailOptions = {
            from: `"Lion Football Academy" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            attachments
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${to}: ${subject}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    // Send notification email
    async sendNotificationEmail({ to, recipientName, title, message, type, priority, actionUrl }) {
        const template = this.getEmailTemplate('notification');
        const processedTemplate = this.processTemplate(template, {
            recipientName,
            title,
            message,
            type,
            priority,
            actionUrl
        });

        return this.sendEmail(to, processedTemplate.subject, processedTemplate.html);
    }

    // Send welcome email
    async sendWelcomeEmail({ to, recipientName, loginUrl }) {
        const template = this.getEmailTemplate('welcome');
        const processedTemplate = this.processTemplate(template, {
            recipientName,
            loginUrl: loginUrl || `${process.env.FRONTEND_URL}/login`
        });

        return this.sendEmail(to, processedTemplate.subject, processedTemplate.html);
    }

    // Send team announcement email
    async sendTeamAnnouncementEmail({ to, recipientName, title, message, priority, teamId, actionUrl }) {
        const template = this.getEmailTemplate('teamAnnouncement');
        const processedTemplate = this.processTemplate(template, {
            recipientName,
            title,
            message,
            priority,
            teamId,
            actionUrl
        });

        return this.sendEmail(to, processedTemplate.subject, processedTemplate.html);
    }

    // Send emergency alert email
    async sendEmergencyAlert({ to, recipientName, title, message, actionUrl }) {
        const template = this.getEmailTemplate('emergencyAlert');
        const processedTemplate = this.processTemplate(template, {
            recipientName,
            title,
            message,
            actionUrl
        });

        return this.sendEmail(to, processedTemplate.subject, processedTemplate.html);
    }

    // Send reminder email
    async sendReminderEmail({ to, recipientName, title, message, reminderType, scheduledFor, actionUrl }) {
        const template = this.getEmailTemplate('reminder');
        const processedTemplate = this.processTemplate(template, {
            recipientName,
            title,
            message,
            reminderType,
            scheduledFor: new Date(scheduledFor).toLocaleString(),
            actionUrl
        });

        return this.sendEmail(to, processedTemplate.subject, processedTemplate.html);
    }

    // Send weekly report email
    async sendWeeklyReport({ 
        to, 
        recipientName, 
        playerName, 
        trainingAttendance, 
        skillRating, 
        improvements, 
        achievements 
    }) {
        const template = this.getEmailTemplate('weeklyReport');
        const processedTemplate = this.processTemplate(template, {
            recipientName,
            playerName,
            trainingAttendance,
            skillRating,
            improvements,
            achievements
        });

        return this.sendEmail(to, processedTemplate.subject, processedTemplate.html);
    }

    // Send training reminder
    async sendTrainingReminder({ to, recipientName, trainingDetails }) {
        const message = `
            <p>You have a training session scheduled:</p>
            <ul>
                <li><strong>Date:</strong> ${trainingDetails.date}</li>
                <li><strong>Time:</strong> ${trainingDetails.time}</li>
                <li><strong>Location:</strong> ${trainingDetails.location}</li>
                <li><strong>Type:</strong> ${trainingDetails.type}</li>
            </ul>
            <p>Please arrive 15 minutes early and bring your training gear!</p>
        `;

        return this.sendReminderEmail({
            to,
            recipientName,
            title: 'Training Session Reminder',
            message,
            reminderType: 'Training',
            scheduledFor: trainingDetails.date
        });
    }

    // Send match notification
    async sendMatchNotification({ to, recipientName, matchDetails, type = 'reminder' }) {
        const message = `
            <p>Match details:</p>
            <ul>
                <li><strong>Opponent:</strong> ${matchDetails.opponent}</li>
                <li><strong>Date:</strong> ${matchDetails.date}</li>
                <li><strong>Time:</strong> ${matchDetails.time}</li>
                <li><strong>Venue:</strong> ${matchDetails.venue}</li>
                <li><strong>Competition:</strong> ${matchDetails.competition}</li>
            </ul>
            <p>Good luck and play your best! 🦁⚽</p>
        `;

        if (type === 'result') {
            return this.sendNotificationEmail({
                to,
                recipientName,
                title: `Match Result: ${matchDetails.result}`,
                message: `
                    <p>Match completed:</p>
                    <ul>
                        <li><strong>Final Score:</strong> ${matchDetails.score}</li>
                        <li><strong>Result:</strong> ${matchDetails.result}</li>
                        <li><strong>Performance:</strong> ${matchDetails.performance}</li>
                    </ul>
                    <p>Well played! Check your dashboard for detailed match statistics.</p>
                `,
                type: 'match',
                priority: 'normal'
            });
        }

        return this.sendReminderEmail({
            to,
            recipientName,
            title: 'Match Reminder',
            message,
            reminderType: 'Match',
            scheduledFor: matchDetails.date
        });
    }

    // Send payment reminder
    async sendPaymentReminder({ to, recipientName, paymentDetails }) {
        const message = `
            <p>You have an outstanding payment:</p>
            <ul>
                <li><strong>Amount:</strong> $${paymentDetails.amount}</li>
                <li><strong>Due Date:</strong> ${paymentDetails.dueDate}</li>
                <li><strong>Description:</strong> ${paymentDetails.description}</li>
            </ul>
            <p>Please make your payment by the due date to avoid any service interruption.</p>
        `;

        return this.sendReminderEmail({
            to,
            recipientName,
            title: 'Payment Due Reminder',
            message,
            reminderType: 'Payment',
            scheduledFor: paymentDetails.dueDate,
            actionUrl: `${process.env.FRONTEND_URL}/billing`
        });
    }

    // Send bulk email (for announcements)
    async sendBulkEmail(recipients, subject, html) {
        const results = [];
        
        // Send emails in batches to avoid overwhelming the server
        const batchSize = 10;
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchPromises = batch.map(recipient => 
                this.sendEmail(recipient.email, subject, html)
                    .then(result => ({ success: true, email: recipient.email, result }))
                    .catch(error => ({ success: false, email: recipient.email, error: error.message }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }
}

module.exports = new EmailService();