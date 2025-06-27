-- =============================================================================
-- BILLING SYSTEM TEST DATA
-- Comprehensive test data for the financial management system
-- =============================================================================

-- Test subscription plans
INSERT INTO subscription_plans (plan_name, plan_type, age_group, training_level, price_amount, training_sessions_per_week, description) 
VALUES 
('U10 Kezdő Csomag', 'monthly', 'U10', 'beginner', 25000.00, 2, 'Alapszintű edzések héten 2 alkalommal'),
('U12 Haladó Csomag', 'monthly', 'U12', 'intermediate', 30000.00, 3, 'Haladó szintű edzések héten 3 alkalommal'),
('U14 Haladó Csomag', 'monthly', 'U14', 'intermediate', 35000.00, 3, 'Középhaladó szintű edzések héten 3 alkalommal'),
('U16 Elit Csomag', 'monthly', 'U16', 'advanced', 45000.00, 4, 'Elit szintű edzések héten 4 alkalommal'),
('U18 Elit Csomag', 'monthly', 'U18', 'elite', 50000.00, 4, 'Profi szintű edzések héten 4 alkalommal'),
('Nyári Tábor', 'one_time', 'Mixed', 'intermediate', 120000.00, 0, 'Egyhetes nyári futball tábor'),
('Éves Elit Csomag', 'annual', 'U16', 'elite', 480000.00, 4, 'Éves elit csomag 20% kedvezménnyel');

-- Test student subscriptions  
INSERT INTO student_subscriptions (player_id, plan_id, start_date, monthly_price, billing_contact_email, billing_contact_name, billing_contact_phone) 
VALUES 
(1, 1, '2024-09-01', 25000.00, 'szulo1@email.com', 'Nagy Anna', '+36301234567'),
(2, 2, '2024-09-01', 30000.00, 'szulo2@email.com', 'Kovács Péter', '+36301234568'),
(3, 3, '2024-10-01', 35000.00, 'szulo3@email.com', 'Szabó Mária', '+36301234569'),
(4, 4, '2024-10-01', 45000.00, 'szulo4@email.com', 'Tóth János', '+36301234570'),
(5, 5, '2024-11-01', 50000.00, 'szulo5@email.com', 'Varga Éva', '+36301234571');

-- Test invoices
INSERT INTO invoices (subscription_id, player_id, billing_period_start, billing_period_end, issue_date, due_date, subtotal_amount, total_amount, invoice_number) 
VALUES 
(1, 1, '2024-11-01', '2024-11-30', '2024-11-01', '2024-11-15', 25000.00, 25000.00, 'INV-2024-000001'),
(2, 2, '2024-11-01', '2024-11-30', '2024-11-01', '2024-11-15', 30000.00, 30000.00, 'INV-2024-000002'),
(3, 3, '2024-11-01', '2024-11-30', '2024-11-01', '2024-11-15', 35000.00, 35000.00, 'INV-2024-000003'),
(4, 4, '2024-11-01', '2024-11-30', '2024-11-01', '2024-11-15', 45000.00, 45000.00, 'INV-2024-000004'),
(5, 5, '2024-11-01', '2024-11-30', '2024-11-01', '2024-11-15', 50000.00, 50000.00, 'INV-2024-000005'),
-- Overdue invoice for testing
(1, 1, '2024-10-01', '2024-10-31', '2024-10-01', '2024-10-15', 25000.00, 25000.00, 'INV-2024-000006');

-- Test invoice line items
INSERT INTO invoice_line_items (invoice_id, item_type, description, quantity, unit_price, total_price)
VALUES
(1, 'subscription', 'U10 Kezdő Csomag - November 2024', 1, 25000.00, 25000.00),
(2, 'subscription', 'U12 Haladó Csomag - November 2024', 1, 30000.00, 30000.00),
(3, 'subscription', 'U14 Haladó Csomag - November 2024', 1, 35000.00, 35000.00),
(4, 'subscription', 'U16 Elit Csomag - November 2024', 1, 45000.00, 45000.00),
(5, 'subscription', 'U18 Elit Csomag - November 2024', 1, 50000.00, 50000.00),
(6, 'subscription', 'U10 Kezdő Csomag - October 2024', 1, 25000.00, 25000.00);

-- Test payments (some invoices paid, some not)
INSERT INTO payments (invoice_id, payment_date, amount_paid, payment_method, bank_reference, payment_number)
VALUES
(1, '2024-11-10', 25000.00, 'bank_transfer', 'REF-001-2024', 'PAY-2024-000001'),
(2, '2024-11-12', 30000.00, 'cash', NULL, 'PAY-2024-000002'),
(4, '2024-11-08', 45000.00, 'card', 'CARD-001-2024', 'PAY-2024-000003');
-- Note: invoices 3, 5, and 6 remain unpaid

-- Test scholarships
INSERT INTO scholarships (scholarship_name, scholarship_type, player_id, discount_type, discount_value, valid_from, valid_until, awarded_by, criteria_description)
VALUES
('Családi Kedvezmény', 'family_discount', 2, 'percentage', 10.00, '2024-09-01', '2025-08-31', 1, 'Második gyermek 10% kedvezmény'),
('Tehetséggondozó Ösztöndíj', 'talent_based', 4, 'percentage', 25.00, '2024-10-01', '2025-06-30', 1, 'Kiemelkedő teljesítmény alapján'),
('Szociális Ösztöndíj', 'need_based', 5, 'fixed_amount', 15000.00, '2024-11-01', '2025-05-31', 1, 'Családi szociális helyzet alapján');

-- Test payment reminders
INSERT INTO payment_reminders (invoice_id, reminder_type, reminder_date, days_overdue, message_template, sent_via)
VALUES
(3, 'gentle', '2024-11-20', 5, 'Kedves Szülő! Emlékeztetjük, hogy a(z) {invoice_number} számú számla esedékes.', 'email'),
(5, 'firm', '2024-11-25', 10, 'Második emlékeztető: A(z) {invoice_number} számú számla fizetése lejárt.', 'email'),
(6, 'overdue', '2024-11-15', 31, 'Sürgős: A(z) {invoice_number} számú számla már 1 hónapja lejárt!', 'phone');

-- Test financial reports cache
INSERT INTO financial_reports_cache (report_type, report_period, filter_criteria, report_data, generated_by)
VALUES
('monthly_revenue', '2024-11', '{"team_id": null}', '{"total_revenue": 100000, "invoices_paid": 3}', 1),
('outstanding_invoices', '2024-11', '{}', '{"total_outstanding": 110000, "overdue_count": 1}', 1);