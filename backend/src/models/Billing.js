const Database = require('../database/connection');

class Billing {
    // Subscription Plans Methods
    static async findAllPlans(filters = {}) {
        const db = await Database.getConnection();
        let query = `
            SELECT * FROM subscription_plans
            WHERE is_active = 1
        `;
        
        const params = [];
        
        if (filters.age_group) {
            query += ' AND age_group = ?';
            params.push(filters.age_group);
        }
        
        if (filters.training_level) {
            query += ' AND training_level = ?';
            params.push(filters.training_level);
        }
        
        if (filters.plan_type) {
            query += ' AND plan_type = ?';
            params.push(filters.plan_type);
        }
        
        query += ' ORDER BY price_amount ASC';
        
        return db.all(query, params);
    }

    static async findPlanById(id) {
        const db = await Database.getConnection();
        return db.get('SELECT * FROM subscription_plans WHERE id = ?', [id]);
    }

    static async createPlan(planData) {
        const db = await Database.getConnection();
        const query = `
            INSERT INTO subscription_plans (
                plan_name, plan_type, age_group, training_level, price_amount,
                currency, training_sessions_per_week, includes_equipment,
                includes_tournaments, includes_camps, description, discount_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            planData.plan_name,
            planData.plan_type,
            planData.age_group,
            planData.training_level,
            planData.price_amount,
            planData.currency || 'HUF',
            planData.training_sessions_per_week || 2,
            planData.includes_equipment || 0,
            planData.includes_tournaments || 0,
            planData.includes_camps || 0,
            planData.description,
            planData.discount_percentage || 0
        ]);
        
        return result.lastID;
    }

    static async updatePlan(id, planData) {
        const db = await Database.getConnection();
        const query = `
            UPDATE subscription_plans SET
                plan_name = ?, plan_type = ?, age_group = ?, training_level = ?,
                price_amount = ?, training_sessions_per_week = ?, includes_equipment = ?,
                includes_tournaments = ?, includes_camps = ?, description = ?,
                discount_percentage = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return db.run(query, [
            planData.plan_name,
            planData.plan_type,
            planData.age_group,
            planData.training_level,
            planData.price_amount,
            planData.training_sessions_per_week,
            planData.includes_equipment,
            planData.includes_tournaments,
            planData.includes_camps,
            planData.description,
            planData.discount_percentage,
            id
        ]);
    }

    // Student Subscriptions Methods
    static async findAllSubscriptions(filters = {}) {
        const db = await Database.getConnection();
        let query = `
            SELECT ss.*, p.name as player_name, t.name as team_name, sp.plan_name
            FROM student_subscriptions ss
            JOIN players p ON ss.player_id = p.id
            LEFT JOIN teams t ON p.team_id = t.id
            JOIN subscription_plans sp ON ss.plan_id = sp.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.status) {
            query += ' AND ss.status = ?';
            params.push(filters.status);
        }
        
        if (filters.team_id) {
            query += ' AND p.team_id = ?';
            params.push(filters.team_id);
        }
        
        if (filters.player_id) {
            query += ' AND ss.player_id = ?';
            params.push(filters.player_id);
        }
        
        query += ' ORDER BY ss.created_at DESC';
        
        return db.all(query, params);
    }

    static async findSubscriptionById(id) {
        const db = await Database.getConnection();
        const query = `
            SELECT ss.*, p.name as player_name, sp.plan_name
            FROM student_subscriptions ss
            JOIN players p ON ss.player_id = p.id
            JOIN subscription_plans sp ON ss.plan_id = sp.id
            WHERE ss.id = ?
        `;
        return db.get(query, [id]);
    }

    static async createSubscription(subscriptionData) {
        const db = await Database.getConnection();
        const query = `
            INSERT INTO student_subscriptions (
                player_id, plan_id, start_date, end_date, monthly_price,
                discount_applied, discount_reason, payment_method,
                billing_contact_name, billing_contact_email, billing_contact_phone,
                billing_address, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            subscriptionData.player_id,
            subscriptionData.plan_id,
            subscriptionData.start_date,
            subscriptionData.end_date,
            subscriptionData.monthly_price,
            subscriptionData.discount_applied || 0,
            subscriptionData.discount_reason,
            subscriptionData.payment_method || 'bank_transfer',
            subscriptionData.billing_contact_name,
            subscriptionData.billing_contact_email,
            subscriptionData.billing_contact_phone,
            subscriptionData.billing_address,
            subscriptionData.notes,
            subscriptionData.created_by
        ]);
        
        return result.lastID;
    }

    static async updateSubscription(id, subscriptionData) {
        const db = await Database.getConnection();
        const query = `
            UPDATE student_subscriptions SET
                status = ?, end_date = ?, monthly_price = ?, discount_applied = ?,
                discount_reason = ?, payment_method = ?, billing_contact_name = ?,
                billing_contact_email = ?, billing_contact_phone = ?, billing_address = ?,
                notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return db.run(query, [
            subscriptionData.status,
            subscriptionData.end_date,
            subscriptionData.monthly_price,
            subscriptionData.discount_applied,
            subscriptionData.discount_reason,
            subscriptionData.payment_method,
            subscriptionData.billing_contact_name,
            subscriptionData.billing_contact_email,
            subscriptionData.billing_contact_phone,
            subscriptionData.billing_address,
            subscriptionData.notes,
            id
        ]);
    }

    // Invoices Methods
    static async findAllInvoices(filters = {}) {
        const db = await Database.getConnection();
        let query = `
            SELECT i.*, p.name as player_name, t.name as team_name,
                   ss.plan_id, sp.plan_name
            FROM invoices i
            JOIN players p ON i.player_id = p.id
            LEFT JOIN teams t ON p.team_id = t.id
            JOIN student_subscriptions ss ON i.subscription_id = ss.id
            JOIN subscription_plans sp ON ss.plan_id = sp.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.status) {
            query += ' AND i.status = ?';
            params.push(filters.status);
        }
        
        if (filters.team_id) {
            query += ' AND p.team_id = ?';
            params.push(filters.team_id);
        }
        
        if (filters.player_id) {
            query += ' AND i.player_id = ?';
            params.push(filters.player_id);
        }
        
        if (filters.date_from) {
            query += ' AND i.issue_date >= ?';
            params.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND i.issue_date <= ?';
            params.push(filters.date_to);
        }
        
        query += ' ORDER BY i.issue_date DESC';
        
        return db.all(query, params);
    }

    static async findInvoiceById(id) {
        const db = await Database.getConnection();
        const query = `
            SELECT i.*, p.name as player_name, sp.plan_name
            FROM invoices i
            JOIN players p ON i.player_id = p.id
            JOIN student_subscriptions ss ON i.subscription_id = ss.id
            JOIN subscription_plans sp ON ss.plan_id = sp.id
            WHERE i.id = ?
        `;
        return db.get(query, [id]);
    }

    static async createInvoice(invoiceData) {
        const db = await Database.getConnection();
        const query = `
            INSERT INTO invoices (
                subscription_id, player_id, billing_period_start, billing_period_end,
                issue_date, due_date, subtotal_amount, discount_amount, tax_amount,
                total_amount, currency, payment_terms, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            invoiceData.subscription_id,
            invoiceData.player_id,
            invoiceData.billing_period_start,
            invoiceData.billing_period_end,
            invoiceData.issue_date,
            invoiceData.due_date,
            invoiceData.subtotal_amount,
            invoiceData.discount_amount || 0,
            invoiceData.tax_amount || 0,
            invoiceData.total_amount,
            invoiceData.currency || 'HUF',
            invoiceData.payment_terms,
            invoiceData.notes,
            invoiceData.created_by
        ]);
        
        return result.lastID;
    }

    static async updateInvoiceStatus(id, status) {
        const db = await Database.getConnection();
        const query = `
            UPDATE invoices SET
                status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return db.run(query, [status, id]);
    }

    // Payments Methods
    static async findAllPayments(filters = {}) {
        const db = await Database.getConnection();
        let query = `
            SELECT pay.*, i.invoice_number, p.name as player_name
            FROM payments pay
            JOIN invoices i ON pay.invoice_id = i.id
            JOIN players p ON i.player_id = p.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.payment_status) {
            query += ' AND pay.payment_status = ?';
            params.push(filters.payment_status);
        }
        
        if (filters.payment_method) {
            query += ' AND pay.payment_method = ?';
            params.push(filters.payment_method);
        }
        
        if (filters.date_from) {
            query += ' AND pay.payment_date >= ?';
            params.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND pay.payment_date <= ?';
            params.push(filters.date_to);
        }
        
        query += ' ORDER BY pay.payment_date DESC';
        
        return db.all(query, params);
    }

    static async findPaymentById(id) {
        const db = await Database.getConnection();
        const query = `
            SELECT pay.*, i.invoice_number, p.name as player_name
            FROM payments pay
            JOIN invoices i ON pay.invoice_id = i.id
            JOIN players p ON i.player_id = p.id
            WHERE pay.id = ?
        `;
        return db.get(query, [id]);
    }

    static async createPayment(paymentData) {
        const db = await Database.getConnection();
        const query = `
            INSERT INTO payments (
                invoice_id, payment_date, amount_paid, currency, payment_method,
                transaction_id, bank_reference, payment_status, processing_fee,
                net_amount, notes, recorded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            paymentData.invoice_id,
            paymentData.payment_date,
            paymentData.amount_paid,
            paymentData.currency || 'HUF',
            paymentData.payment_method,
            paymentData.transaction_id,
            paymentData.bank_reference,
            paymentData.payment_status || 'completed',
            paymentData.processing_fee || 0,
            paymentData.net_amount || paymentData.amount_paid,
            paymentData.notes,
            paymentData.recorded_by
        ]);
        
        return result.lastID;
    }

    // Scholarships Methods
    static async findAllScholarships(filters = {}) {
        const db = await Database.getConnection();
        let query = `
            SELECT s.*, p.name as player_name, t.name as team_name,
                   u.full_name as awarded_by_name
            FROM scholarships s
            JOIN players p ON s.player_id = p.id
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN users u ON s.awarded_by = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.status) {
            query += ' AND s.status = ?';
            params.push(filters.status);
        }
        
        if (filters.scholarship_type) {
            query += ' AND s.scholarship_type = ?';
            params.push(filters.scholarship_type);
        }
        
        if (filters.player_id) {
            query += ' AND s.player_id = ?';
            params.push(filters.player_id);
        }
        
        query += ' ORDER BY s.created_at DESC';
        
        return db.all(query, params);
    }

    static async createScholarship(scholarshipData) {
        const db = await Database.getConnection();
        const query = `
            INSERT INTO scholarships (
                scholarship_name, scholarship_type, player_id, discount_type,
                discount_value, max_discount_amount, valid_from, valid_until,
                criteria_description, performance_requirements, review_frequency,
                next_review_date, awarded_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            scholarshipData.scholarship_name,
            scholarshipData.scholarship_type,
            scholarshipData.player_id,
            scholarshipData.discount_type,
            scholarshipData.discount_value,
            scholarshipData.max_discount_amount,
            scholarshipData.valid_from,
            scholarshipData.valid_until,
            scholarshipData.criteria_description,
            scholarshipData.performance_requirements,
            scholarshipData.review_frequency,
            scholarshipData.next_review_date,
            scholarshipData.awarded_by,
            scholarshipData.notes
        ]);
        
        return result.lastID;
    }

    // Financial Reports Methods
    static async getOutstandingInvoices() {
        const db = await Database.getConnection();
        return db.all('SELECT * FROM outstanding_invoices ORDER BY days_overdue DESC');
    }

    static async getMonthlyRevenue(year = null) {
        const db = await Database.getConnection();
        let query = 'SELECT * FROM monthly_revenue';
        const params = [];
        
        if (year) {
            query += ' WHERE month LIKE ?';
            params.push(`${year}-%`);
        }
        
        query += ' ORDER BY month DESC';
        
        return db.all(query, params);
    }

    static async getStudentPaymentHistory(playerId = null) {
        const db = await Database.getConnection();
        let query = 'SELECT * FROM student_payment_history WHERE 1=1';
        const params = [];
        
        if (playerId) {
            query += ' AND player_id = ?';
            params.push(playerId);
        }
        
        query += ' ORDER BY balance_outstanding DESC';
        
        return db.all(query, params);
    }

    static async getFinancialSummary() {
        const db = await Database.getConnection();
        const query = `
            SELECT 
                COUNT(DISTINCT ss.id) as total_subscriptions,
                COUNT(DISTINCT CASE WHEN ss.status = 'active' THEN ss.id END) as active_subscriptions,
                COUNT(DISTINCT i.id) as total_invoices,
                COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_invoices,
                COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) as overdue_invoices,
                SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount_paid ELSE 0 END) as total_revenue,
                AVG(ss.monthly_price) as avg_monthly_price,
                COUNT(DISTINCT sch.id) as active_scholarships
            FROM student_subscriptions ss
            LEFT JOIN invoices i ON ss.id = i.subscription_id
            LEFT JOIN payments pay ON i.id = pay.invoice_id
            LEFT JOIN scholarships sch ON ss.player_id = sch.player_id AND sch.status = 'active'
        `;
        
        return db.get(query);
    }

    // Payment Reminders Methods
    static async createPaymentReminder(reminderData) {
        const db = await Database.getConnection();
        const query = `
            INSERT INTO payment_reminders (
                invoice_id, reminder_type, reminder_date, days_overdue,
                message_template, sent_via, next_action_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return db.run(query, [
            reminderData.invoice_id,
            reminderData.reminder_type,
            reminderData.reminder_date,
            reminderData.days_overdue,
            reminderData.message_template,
            reminderData.sent_via,
            reminderData.next_action_date,
            reminderData.created_by
        ]);
    }

    static async findOverdueInvoicesForReminders() {
        const db = await Database.getConnection();
        const query = `
            SELECT i.*, p.name as player_name, ss.billing_contact_email
            FROM invoices i
            JOIN players p ON i.player_id = p.id
            JOIN student_subscriptions ss ON i.subscription_id = ss.id
            WHERE i.status IN ('pending', 'overdue') 
            AND i.due_date < DATE('now')
            AND NOT EXISTS (
                SELECT 1 FROM payment_reminders pr 
                WHERE pr.invoice_id = i.id 
                AND pr.reminder_date = DATE('now')
            )
            ORDER BY (julianday('now') - julianday(i.due_date)) DESC
        `;
        
        return db.all(query);
    }
}

module.exports = Billing;