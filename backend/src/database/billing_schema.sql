-- =============================================================================
-- BILLING & PAYMENT SYSTEM DATABASE SCHEMA
-- Comprehensive financial management for Lion Football Academy
-- =============================================================================

-- Subscription Plans tábla (tandíj csomagok)
CREATE TABLE subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual', 'one_time')),
    age_group VARCHAR(50), -- U8, U10, U12, U14, U16, U18, Adult
    training_level VARCHAR(50) CHECK (training_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
    price_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    training_sessions_per_week INTEGER DEFAULT 2,
    includes_equipment BOOLEAN DEFAULT 0,
    includes_tournaments BOOLEAN DEFAULT 0,
    includes_camps BOOLEAN DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Subscriptions tábla (diák előfizetések)
CREATE TABLE student_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    monthly_price DECIMAL(10,2) NOT NULL,
    discount_applied DECIMAL(5,2) DEFAULT 0.00,
    discount_reason TEXT,
    auto_renew BOOLEAN DEFAULT 1,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    billing_contact_name VARCHAR(200),
    billing_contact_email VARCHAR(200),
    billing_contact_phone VARCHAR(50),
    billing_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Invoices tábla (számlák)
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subscription_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
    payment_terms TEXT,
    late_fee_applied DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    pdf_file_path VARCHAR(500),
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (subscription_id) REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Invoice Line Items tábla (számla tételek)
CREATE TABLE invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('subscription', 'equipment', 'tournament', 'camp', 'late_fee', 'discount', 'other')),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Payments tábla (kifizetések)
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'card', 'online', 'mobile_payment', 'other')),
    transaction_id VARCHAR(200),
    bank_reference VARCHAR(200),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway_response TEXT,
    processing_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2),
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_date DATE,
    refund_reason TEXT,
    notes TEXT,
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Scholarships tábla (ösztöndíjak)
CREATE TABLE scholarships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scholarship_name VARCHAR(200) NOT NULL,
    scholarship_type VARCHAR(50) NOT NULL CHECK (scholarship_type IN ('need_based', 'merit_based', 'talent_based', 'family_discount', 'sibling_discount', 'loyalty_discount')),
    player_id INTEGER NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    valid_from DATE NOT NULL,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'revoked')),
    criteria_description TEXT,
    performance_requirements TEXT,
    review_frequency VARCHAR(50) CHECK (review_frequency IN ('monthly', 'quarterly', 'annually', 'none')),
    last_review_date DATE,
    next_review_date DATE,
    awarded_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (awarded_by) REFERENCES users(id)
);

-- Payment Reminders tábla (fizetési emlékeztetők)
CREATE TABLE payment_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('gentle', 'firm', 'final', 'overdue')),
    reminder_date DATE NOT NULL,
    days_overdue INTEGER DEFAULT 0,
    message_template TEXT,
    sent_via VARCHAR(50) CHECK (sent_via IN ('email', 'sms', 'phone', 'letter', 'in_person')),
    sent_at TIMESTAMP,
    response_received BOOLEAN DEFAULT 0,
    response_notes TEXT,
    next_action_date DATE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Financial Reports Cache tábla (pénzügyi jelentések cache)
CREATE TABLE financial_reports_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type VARCHAR(100) NOT NULL,
    report_period VARCHAR(50) NOT NULL, -- 2024-01, 2024-Q1, 2024, etc.
    filter_criteria TEXT, -- JSON
    report_data TEXT, -- JSON
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    generated_by INTEGER,
    FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- =============================================================================
-- VIEWS: Pénzügyi jelentésekhez
-- =============================================================================

-- Outstanding Invoices View (ki nem fizetett számlák)
CREATE VIEW outstanding_invoices AS
SELECT 
    i.id,
    i.invoice_number,
    i.player_id,
    p.name as player_name,
    t.name as team_name,
    i.issue_date,
    i.due_date,
    i.total_amount,
    COALESCE(SUM(pay.amount_paid), 0) as amount_paid,
    (i.total_amount - COALESCE(SUM(pay.amount_paid), 0)) as amount_outstanding,
    CASE 
        WHEN i.due_date < DATE('now') AND i.status != 'paid' THEN 'overdue'
        WHEN i.status = 'paid' THEN 'paid'
        ELSE 'pending'
    END as payment_status,
    (julianday('now') - julianday(i.due_date)) as days_overdue
FROM invoices i
JOIN players p ON i.player_id = p.id
JOIN teams t ON p.team_id = t.id
LEFT JOIN payments pay ON i.id = pay.invoice_id AND pay.payment_status = 'completed'
GROUP BY i.id, i.invoice_number, i.player_id, p.name, t.name, i.issue_date, i.due_date, i.total_amount, i.status
HAVING amount_outstanding > 0
ORDER BY days_overdue DESC, i.due_date ASC;

-- Monthly Revenue View (havi bevételek)
CREATE VIEW monthly_revenue AS
SELECT 
    strftime('%Y-%m', pay.payment_date) as month,
    COUNT(DISTINCT pay.invoice_id) as invoices_paid,
    COUNT(DISTINCT i.player_id) as unique_students,
    SUM(pay.amount_paid) as total_revenue,
    AVG(pay.amount_paid) as avg_payment,
    SUM(CASE WHEN pay.payment_method = 'bank_transfer' THEN pay.amount_paid ELSE 0 END) as bank_transfer_revenue,
    SUM(CASE WHEN pay.payment_method = 'cash' THEN pay.amount_paid ELSE 0 END) as cash_revenue,
    SUM(CASE WHEN pay.payment_method = 'card' THEN pay.amount_paid ELSE 0 END) as card_revenue
FROM payments pay
JOIN invoices i ON pay.invoice_id = i.id
WHERE pay.payment_status = 'completed'
GROUP BY strftime('%Y-%m', pay.payment_date)
ORDER BY month DESC;

-- Student Payment History View (diák fizetési történet)
CREATE VIEW student_payment_history AS
SELECT 
    p.id as player_id,
    p.name as player_name,
    t.name as team_name,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT pay.id) as total_payments,
    SUM(i.total_amount) as total_billed,
    SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount_paid ELSE 0 END) as total_paid,
    (SUM(i.total_amount) - SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount_paid ELSE 0 END)) as balance_outstanding,
    AVG(julianday(pay.payment_date) - julianday(i.due_date)) as avg_payment_delay_days,
    MAX(pay.payment_date) as last_payment_date,
    s.status as subscription_status,
    sp.plan_name as current_plan
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN invoices i ON p.id = i.player_id
LEFT JOIN payments pay ON i.id = pay.invoice_id
LEFT JOIN student_subscriptions s ON p.id = s.player_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
GROUP BY p.id, p.name, t.name, s.status, sp.plan_name
ORDER BY balance_outstanding DESC;

-- =============================================================================
-- INDEXEK a teljesítményhez
-- =============================================================================

CREATE INDEX idx_student_subscriptions_player ON student_subscriptions(player_id);
CREATE INDEX idx_student_subscriptions_plan ON student_subscriptions(plan_id);
CREATE INDEX idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_player ON invoices(player_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_scholarships_player ON scholarships(player_id);
CREATE INDEX idx_scholarships_status ON scholarships(status);
CREATE INDEX idx_scholarships_dates ON scholarships(valid_from, valid_until);
CREATE INDEX idx_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_reminders_date ON payment_reminders(reminder_date);

-- =============================================================================
-- TRIGGEREK automatikus folyamatokhoz
-- =============================================================================

-- Trigger: Automatikus számla szám generálás
CREATE TRIGGER generate_invoice_number
AFTER INSERT ON invoices
FOR EACH ROW
WHEN NEW.invoice_number IS NULL OR NEW.invoice_number = ''
BEGIN
    UPDATE invoices 
    SET invoice_number = printf('INV-%04d-%06d', 
        strftime('%Y', NEW.created_at), 
        NEW.id
    )
    WHERE id = NEW.id;
END;

-- Trigger: Automatikus payment number generálás
CREATE TRIGGER generate_payment_number
AFTER INSERT ON payments
FOR EACH ROW
WHEN NEW.payment_number IS NULL OR NEW.payment_number = ''
BEGIN
    UPDATE payments 
    SET payment_number = printf('PAY-%04d-%06d', 
        strftime('%Y', NEW.created_at), 
        NEW.id
    )
    WHERE id = NEW.id;
END;

-- Trigger: Invoice status automatikus frissítés payment után
CREATE TRIGGER update_invoice_status_on_payment
AFTER INSERT ON payments
FOR EACH ROW
WHEN NEW.payment_status = 'completed'
BEGIN
    UPDATE invoices 
    SET status = CASE 
        WHEN (
            SELECT SUM(amount_paid) 
            FROM payments 
            WHERE invoice_id = NEW.invoice_id AND payment_status = 'completed'
        ) >= total_amount THEN 'paid'
        ELSE 'pending'
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

-- Trigger: Scholarship alkalmazása subscription-re
CREATE TRIGGER apply_scholarship_discount
AFTER INSERT ON scholarships
FOR EACH ROW
WHEN NEW.status = 'active'
BEGIN
    UPDATE student_subscriptions 
    SET discount_applied = CASE 
        WHEN NEW.discount_type = 'percentage' THEN NEW.discount_value
        ELSE (NEW.discount_value / monthly_price) * 100
    END,
    discount_reason = NEW.scholarship_name,
    updated_at = CURRENT_TIMESTAMP
    WHERE player_id = NEW.player_id AND status = 'active';
END;