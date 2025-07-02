const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const { authenticate, isAdminOrCoach, isAdmin } = require('../middleware/auth');

// Minden route védve
router.use(authenticate);

// SUBSCRIPTION PLANS ROUTES

// GET /api/billing/plans - Subscription plans lista
router.get('/plans', async (req, res) => {
    try {
        const plans = await Billing.findAllPlans(req.query);
        res.json(plans);
    } catch (error) {
        console.error('Plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching subscription plans' });
    }
});

// GET /api/billing/plans/:id - Egy subscription plan
router.get('/plans/:id', async (req, res) => {
    try {
        const plan = await Billing.findPlanById(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }
        res.json(plan);
    } catch (error) {
        console.error('Plan fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/billing/plans - Új subscription plan (csak admin)
router.post('/plans', isAdmin, async (req, res) => {
    try {
        const { plan_name, plan_type, price_amount } = req.body;
        
        if (!plan_name || !plan_type || !price_amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const planId = await Billing.createPlan(req.body);
        const newPlan = await Billing.findPlanById(planId);
        
        res.status(201).json({
            success: true,
            message: 'Subscription plan created successfully',
            plan: newPlan
        });
    } catch (error) {
        console.error('Plan creation error:', error);
        res.status(500).json({ error: 'Failed to create subscription plan' });
    }
});

// PUT /api/billing/plans/:id - Subscription plan frissítése (csak admin)
router.put('/plans/:id', isAdmin, async (req, res) => {
    try {
        await Billing.updatePlan(req.params.id, req.body);
        const updatedPlan = await Billing.findPlanById(req.params.id);
        
        res.json({
            success: true,
            message: 'Subscription plan updated successfully',
            plan: updatedPlan
        });
    } catch (error) {
        console.error('Plan update error:', error);
        res.status(500).json({ error: 'Failed to update subscription plan' });
    }
});

// STUDENT SUBSCRIPTIONS ROUTES

// GET /api/billing/subscriptions - Subscriptions lista
router.get('/subscriptions', isAdminOrCoach, async (req, res) => {
    try {
        const filters = req.query;
        
        // Role-based filtering
        if (req.user.role === 'coach' && req.user.team_id) {
            filters.team_id = req.user.team_id;
        }
        
        const subscriptions = await Billing.findAllSubscriptions(filters);
        res.json(subscriptions);
    } catch (error) {
        console.error('Subscriptions fetch error:', error);
        res.status(500).json({ error: 'Server error fetching subscriptions' });
    }
});

// GET /api/billing/subscriptions/:id - Egy subscription
router.get('/subscriptions/:id', isAdminOrCoach, async (req, res) => {
    try {
        const subscription = await Billing.findSubscriptionById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        res.json(subscription);
    } catch (error) {
        console.error('Subscription fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/billing/subscriptions - Új subscription
router.post('/subscriptions', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id, plan_id, start_date, monthly_price } = req.body;
        
        if (!player_id || !plan_id || !start_date || !monthly_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const subscriptionData = {
            ...req.body,
            created_by: req.user.id
        };
        
        const subscriptionId = await Billing.createSubscription(subscriptionData);
        const newSubscription = await Billing.findSubscriptionById(subscriptionId);
        
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            subscription: newSubscription
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// PUT /api/billing/subscriptions/:id - Subscription frissítése
router.put('/subscriptions/:id', isAdminOrCoach, async (req, res) => {
    try {
        await Billing.updateSubscription(req.params.id, req.body);
        const updatedSubscription = await Billing.findSubscriptionById(req.params.id);
        
        res.json({
            success: true,
            message: 'Subscription updated successfully',
            subscription: updatedSubscription
        });
    } catch (error) {
        console.error('Subscription update error:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

// INVOICES ROUTES

// GET /api/billing/invoices - Invoices lista
router.get('/invoices', async (req, res) => {
    try {
        const filters = req.query;
        
        // Role-based filtering
        if (req.user.role === 'coach' && req.user.team_id) {
            filters.team_id = req.user.team_id;
        } else if (req.user.role === 'parent' && req.user.player_id) {
            filters.player_id = req.user.player_id;
        }
        
        const invoices = await Billing.findAllInvoices(filters);
        res.json(invoices);
    } catch (error) {
        console.error('Invoices fetch error:', error);
        res.status(500).json({ error: 'Server error fetching invoices' });
    }
});

// GET /api/billing/invoices/:id - Egy invoice
router.get('/invoices/:id', async (req, res) => {
    try {
        const invoice = await Billing.findInvoiceById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // Access control
        if (req.user.role === 'parent' && req.user.player_id !== invoice.player_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json(invoice);
    } catch (error) {
        console.error('Invoice fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/billing/invoices - Új invoice (admin/coach)
router.post('/invoices', isAdminOrCoach, async (req, res) => {
    try {
        const { subscription_id, billing_period_start, billing_period_end, total_amount } = req.body;
        
        if (!subscription_id || !billing_period_start || !billing_period_end || !total_amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const invoiceData = {
            ...req.body,
            created_by: req.user.id
        };
        
        const invoiceId = await Billing.createInvoice(invoiceData);
        const newInvoice = await Billing.findInvoiceById(invoiceId);
        
        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            invoice: newInvoice
        });
    } catch (error) {
        console.error('Invoice creation error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// PUT /api/billing/invoices/:id/status - Invoice status frissítése
router.put('/invoices/:id/status', isAdminOrCoach, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        await Billing.updateInvoiceStatus(req.params.id, status);
        const updatedInvoice = await Billing.findInvoiceById(req.params.id);
        
        res.json({
            success: true,
            message: 'Invoice status updated successfully',
            invoice: updatedInvoice
        });
    } catch (error) {
        console.error('Invoice status update error:', error);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
});

// PAYMENTS ROUTES

// GET /api/billing/payments - Payments lista
router.get('/payments', isAdminOrCoach, async (req, res) => {
    try {
        const payments = await Billing.findAllPayments(req.query);
        res.json(payments);
    } catch (error) {
        console.error('Payments fetch error:', error);
        res.status(500).json({ error: 'Server error fetching payments' });
    }
});

// POST /api/billing/payments - Új payment rögzítése
router.post('/payments', isAdminOrCoach, async (req, res) => {
    try {
        const { invoice_id, payment_date, amount_paid, payment_method } = req.body;
        
        if (!invoice_id || !payment_date || !amount_paid || !payment_method) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const paymentData = {
            ...req.body,
            recorded_by: req.user.id
        };
        
        const paymentId = await Billing.createPayment(paymentData);
        const newPayment = await Billing.findPaymentById(paymentId);
        
        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            payment: newPayment
        });
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

// SCHOLARSHIPS ROUTES

// GET /api/billing/scholarships - Scholarships lista
router.get('/scholarships', isAdminOrCoach, async (req, res) => {
    try {
        const scholarships = await Billing.findAllScholarships(req.query);
        res.json(scholarships);
    } catch (error) {
        console.error('Scholarships fetch error:', error);
        res.status(500).json({ error: 'Server error fetching scholarships' });
    }
});

// POST /api/billing/scholarships - Új scholarship
router.post('/scholarships', isAdminOrCoach, async (req, res) => {
    try {
        const { scholarship_name, scholarship_type, player_id, discount_type, discount_value } = req.body;
        
        if (!scholarship_name || !scholarship_type || !player_id || !discount_type || !discount_value) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const scholarshipData = {
            ...req.body,
            awarded_by: req.user.id
        };
        
        const scholarshipId = await Billing.createScholarship(scholarshipData);
        
        res.status(201).json({
            success: true,
            message: 'Scholarship created successfully',
            scholarship_id: scholarshipId
        });
    } catch (error) {
        console.error('Scholarship creation error:', error);
        res.status(500).json({ error: 'Failed to create scholarship' });
    }
});

// FINANCIAL REPORTS ROUTES

// GET /api/billing/reports/outstanding - Ki nem fizetett számlák
router.get('/reports/outstanding', isAdminOrCoach, async (req, res) => {
    try {
        const outstandingInvoices = await Billing.getOutstandingInvoices();
        res.json(outstandingInvoices);
    } catch (error) {
        console.error('Outstanding invoices fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/billing/reports/revenue - Havi bevételek
router.get('/reports/revenue', isAdminOrCoach, async (req, res) => {
    try {
        const { year } = req.query;
        const revenue = await Billing.getMonthlyRevenue(year);
        res.json(revenue);
    } catch (error) {
        console.error('Revenue fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/billing/reports/students - Diák fizetési történet
router.get('/reports/students', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id } = req.query;
        const studentHistory = await Billing.getStudentPaymentHistory(player_id);
        res.json(studentHistory);
    } catch (error) {
        console.error('Student payment history fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/billing/reports/summary - Pénzügyi összefoglaló
router.get('/reports/summary', isAdminOrCoach, async (req, res) => {
    try {
        const summary = await Billing.getFinancialSummary();
        res.json(summary);
    } catch (error) {
        console.error('Financial summary fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PAYMENT REMINDERS

// GET /api/billing/reminders/overdue - Lejárt számlák emlékeztetőkhöz
router.get('/reminders/overdue', isAdmin, async (req, res) => {
    try {
        const overdueInvoices = await Billing.findOverdueInvoicesForReminders();
        res.json(overdueInvoices);
    } catch (error) {
        console.error('Overdue invoices fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/billing/reminders - Emlékeztető küldése
router.post('/reminders', isAdminOrCoach, async (req, res) => {
    try {
        const reminderData = {
            ...req.body,
            created_by: req.user.id
        };
        
        await Billing.createPaymentReminder(reminderData);
        
        res.json({
            success: true,
            message: 'Payment reminder created successfully'
        });
    } catch (error) {
        console.error('Payment reminder creation error:', error);
        res.status(500).json({ error: 'Failed to create payment reminder' });
    }
});

module.exports = router;