import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const Billing = () => {
    const { user, isAdminOrCoach, isAdmin } = useContext(AuthContext);
    
    // DEBUG LOG
    console.log('Billing page - User role:', user?.role, 'User:', user, 'Access granted:', true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState(user?.role === 'player' ? 'invoices' : 'subscriptions');
    
    // Data states
    const [subscriptions, setSubscriptions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [plans, setPlans] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [financialSummary, setFinancialSummary] = useState({});
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('subscription');
    const [selectedItem, setSelectedItem] = useState(null);
    
    // Form states
    const [subscriptionForm, setSubscriptionForm] = useState({
        player_id: '',
        plan_id: '',
        start_date: '',
        monthly_price: '',
        billing_contact_name: '',
        billing_contact_email: '',
        billing_contact_phone: '',
        payment_method: 'bank_transfer'
    });
    
    const [invoiceForm, setInvoiceForm] = useState({
        subscription_id: '',
        billing_period_start: '',
        billing_period_end: '',
        issue_date: '',
        due_date: '',
        subtotal_amount: '',
        total_amount: ''
    });
    
    const [paymentForm, setPaymentForm] = useState({
        invoice_id: '',
        payment_date: '',
        amount_paid: '',
        payment_method: 'bank_transfer',
        transaction_id: '',
        notes: ''
    });
    
    const [scholarshipForm, setScholarshipForm] = useState({
        scholarship_name: '',
        scholarship_type: 'merit_based',
        player_id: '',
        discount_type: 'percentage',
        discount_value: '',
        valid_from: '',
        valid_until: '',
        criteria_description: ''
    });

    const [players, setPlayers] = useState([]);

    const paymentMethods = [
        { value: 'bank_transfer', label: '🏦 Banki átutalás', color: 'primary' },
        { value: 'cash', label: '💵 Készpénz', color: 'success' },
        { value: 'card', label: '💳 Bankkártya', color: 'info' },
        { value: 'online', label: '🌐 Online fizetés', color: 'warning' },
        { value: 'mobile_payment', label: '📱 Mobil fizetés', color: 'secondary' }
    ];

    const scholarshipTypes = [
        { value: 'merit_based', label: '🏆 Teljesítmény alapú', color: 'success' },
        { value: 'need_based', label: '🤝 Rászorultság alapú', color: 'info' },
        { value: 'talent_based', label: '⭐ Tehetség alapú', color: 'warning' },
        { value: 'family_discount', label: '👨‍👩‍👧‍👦 Családi kedvezmény', color: 'primary' },
        { value: 'sibling_discount', label: '👫 Testvér kedvezmény', color: 'secondary' },
        { value: 'loyalty_discount', label: '💎 Hűség kedvezmény', color: 'dark' }
    ];

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Admin és coach esetén minden adat kell
            if (user.role === 'admin' || user.role === 'coach') {
                const [
                    subscriptionsData,
                    invoicesData,
                    plansData,
                    playersData
                ] = await Promise.all([
                    apiService.billing.getSubscriptions(),
                    apiService.billing.getInvoices(),
                    apiService.billing.getPlans(),
                    apiService.players.getAll()
                ]);
                
                setSubscriptions(subscriptionsData.data);
                setInvoices(invoicesData.data);
                setPlans(plansData.data);
                setPlayers(playersData.data);
            } else {
                // Player és parent esetén csak saját pénzügyi adatok
                const [
                    invoicesData,
                    plansData
                ] = await Promise.all([
                    apiService.billing.getInvoices(), // Csak saját számlák
                    apiService.billing.getPlans()     // Publikus csomagok
                ]);
                
                setInvoices(invoicesData.data);
                setPlans(plansData.data);
                setSubscriptions([]); // Player nem látja az összes előfizetést
                setPlayers([]);       // Player nem fér hozzá a játékos listához
            }
            
            if (activeTab === 'reports' && isAdminOrCoach()) {
                await fetchReports();
            }
            
            if (activeTab === 'payments' && isAdminOrCoach()) {
                const paymentsData = await apiService.billing.getPayments();
                setPayments(paymentsData.data);
            }
            
            if (activeTab === 'scholarships' && isAdminOrCoach()) {
                const scholarshipsData = await apiService.billing.getScholarships();
                setScholarships(scholarshipsData.data);
            }
            
        } catch (error) {
            setError('Hiba az adatok betöltésekor');
            console.error('Data fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        try {
            const [
                outstandingData,
                summaryData,
                revenueData
            ] = await Promise.all([
                apiService.billing.getOutstandingInvoices(),
                apiService.billing.getFinancialSummary(),
                apiService.billing.getMonthlyRevenue()
            ]);
            
            setOutstandingInvoices(outstandingData.data);
            setFinancialSummary(summaryData.data);
            setMonthlyRevenue(revenueData.data);
        } catch (error) {
            console.error('Reports fetch error:', error);
        }
    };

    const handleCreateSubscription = async (e) => {
        e.preventDefault();
        try {
            await apiService.billing.createSubscription(subscriptionForm);
            setShowModal(false);
            resetSubscriptionForm();
            fetchData();
            setSuccess('Előfizetés sikeresen létrehozva!');
        } catch (error) {
            setError('Hiba az előfizetés létrehozásakor');
        }
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        try {
            await apiService.billing.createInvoice(invoiceForm);
            setShowModal(false);
            resetInvoiceForm();
            fetchData();
            setSuccess('Számla sikeresen létrehozva!');
        } catch (error) {
            setError('Hiba a számla létrehozásakor');
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await apiService.billing.recordPayment(paymentForm);
            setShowModal(false);
            resetPaymentForm();
            fetchData();
            setSuccess('Fizetés sikeresen rögzítve!');
        } catch (error) {
            setError('Hiba a fizetés rögzítésekor');
        }
    };

    const handleCreateScholarship = async (e) => {
        e.preventDefault();
        try {
            await apiService.billing.createScholarship(scholarshipForm);
            setShowModal(false);
            resetScholarshipForm();
            fetchData();
            setSuccess('Ösztöndíj sikeresen létrehozva!');
        } catch (error) {
            setError('Hiba az ösztöndíj létrehozásakor');
        }
    };

    const openModal = (type, item = null) => {
        setModalType(type);
        setSelectedItem(item);
        setShowModal(true);
        
        if (type === 'payment' && item) {
            setPaymentForm({
                ...paymentForm,
                invoice_id: item.id,
                amount_paid: item.total_amount
            });
        }
    };

    const resetSubscriptionForm = () => {
        setSubscriptionForm({
            player_id: '',
            plan_id: '',
            start_date: '',
            monthly_price: '',
            billing_contact_name: '',
            billing_contact_email: '',
            billing_contact_phone: '',
            payment_method: 'bank_transfer'
        });
    };

    const resetInvoiceForm = () => {
        setInvoiceForm({
            subscription_id: '',
            billing_period_start: '',
            billing_period_end: '',
            issue_date: '',
            due_date: '',
            subtotal_amount: '',
            total_amount: ''
        });
    };

    const resetPaymentForm = () => {
        setPaymentForm({
            invoice_id: '',
            payment_date: '',
            amount_paid: '',
            payment_method: 'bank_transfer',
            transaction_id: '',
            notes: ''
        });
    };

    const resetScholarshipForm = () => {
        setScholarshipForm({
            scholarship_name: '',
            scholarship_type: 'merit_based',
            player_id: '',
            discount_type: 'percentage',
            discount_value: '',
            valid_from: '',
            valid_until: '',
            criteria_description: ''
        });
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            active: 'success',
            pending: 'warning',
            paid: 'success',
            overdue: 'danger',
            cancelled: 'secondary',
            completed: 'success'
        };
        return `badge bg-${statusColors[status] || 'secondary'}`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('hu-HU', {
            style: 'currency',
            currency: 'HUF'
        }).format(amount);
    };

    const getPlayerName = (playerId) => {
        const player = players.find(p => p.id === parseInt(playerId));
        return player ? player.name : 'Ismeretlen játékos';
    };

    const getPlanName = (planId) => {
        const plan = plans.find(p => p.id === parseInt(planId));
        return plan ? plan.plan_name : 'Ismeretlen csomag';
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>💰 {user.role === 'player' ? 'Saját Pénzügyek' : 'Pénzügyi Kezelés & Számlázás'}</h2>
                        {isAdminOrCoach() && (
                            <div className="btn-group">
                                <button 
                                    className="btn btn-primary dropdown-toggle"
                                    data-bs-toggle="dropdown"
                                >
                                    ➕ Új elem
                                </button>
                                <ul className="dropdown-menu">
                                    <li><button className="dropdown-item" onClick={() => openModal('subscription')}>📋 Előfizetés</button></li>
                                    <li><button className="dropdown-item" onClick={() => openModal('invoice')}>💰 Számla</button></li>
                                    <li><button className="dropdown-item" onClick={() => openModal('payment')}>💳 Fizetés</button></li>
                                    <li><button className="dropdown-item" onClick={() => openModal('scholarship')}>🎓 Ösztöndíj</button></li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success" role="alert">
                            {success}
                        </div>
                    )}

                    {/* Tabs */}
                    <ul className="nav nav-tabs mb-4">
                        {(user.role === 'admin' || user.role === 'coach') && (
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'subscriptions' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('subscriptions')}
                                >
                                    📋 Előfizetések
                                </button>
                            </li>
                        )}
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
                                onClick={() => setActiveTab('invoices')}
                            >
                                💰 Számlák
                            </button>
                        </li>
                        {isAdminOrCoach() && (
                            <>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('payments')}
                                    >
                                        💳 Fizetések
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'scholarships' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('scholarships')}
                                    >
                                        🎓 Ösztöndíjak
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('reports')}
                                    >
                                        📊 Jelentések
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>

                    {/* Subscriptions Tab */}
                    {activeTab === 'subscriptions' && (
                        <div className="card">
                            <div className="card-header">
                                <h5>📋 Előfizetések</h5>
                            </div>
                            <div className="card-body">
                                {subscriptions.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Nincsenek előfizetések.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Játékos</th>
                                                    <th>Csomag</th>
                                                    <th>Havi díj</th>
                                                    <th>Kezdés</th>
                                                    <th>Állapot</th>
                                                    <th>Kedvezmény</th>
                                                    <th>Műveletek</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subscriptions.map(subscription => (
                                                    <tr key={subscription.id}>
                                                        <td><strong>{subscription.player_name}</strong></td>
                                                        <td>{subscription.plan_name}</td>
                                                        <td>{formatCurrency(subscription.monthly_price)}</td>
                                                        <td>{new Date(subscription.start_date).toLocaleDateString('hu-HU')}</td>
                                                        <td>
                                                            <span className={getStatusBadge(subscription.status)}>
                                                                {subscription.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {subscription.discount_applied > 0 ? (
                                                                <span className="badge bg-success">
                                                                    -{subscription.discount_applied}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button 
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => openModal('invoice', subscription)}
                                                            >
                                                                💰 Számla
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Invoices Tab */}
                    {activeTab === 'invoices' && (
                        <div className="card">
                            <div className="card-header">
                                <h5>💰 Számlák</h5>
                            </div>
                            <div className="card-body">
                                {invoices.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Nincsenek számlák.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Számlaszám</th>
                                                    <th>Játékos</th>
                                                    <th>Összeg</th>
                                                    <th>Kiállítás</th>
                                                    <th>Esedékesség</th>
                                                    <th>Állapot</th>
                                                    <th>Műveletek</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoices.map(invoice => (
                                                    <tr key={invoice.id}>
                                                        <td><strong>{invoice.invoice_number}</strong></td>
                                                        <td>{invoice.player_name}</td>
                                                        <td>{formatCurrency(invoice.total_amount)}</td>
                                                        <td>{new Date(invoice.issue_date).toLocaleDateString('hu-HU')}</td>
                                                        <td>{new Date(invoice.due_date).toLocaleDateString('hu-HU')}</td>
                                                        <td>
                                                            <span className={getStatusBadge(invoice.status)}>
                                                                {invoice.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {invoice.status !== 'paid' && isAdminOrCoach() && (
                                                                <button 
                                                                    className="btn btn-sm btn-outline-success"
                                                                    onClick={() => openModal('payment', invoice)}
                                                                >
                                                                    💳 Fizetés
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payments Tab */}
                    {activeTab === 'payments' && isAdminOrCoach() && (
                        <div className="card">
                            <div className="card-header">
                                <h5>💳 Fizetések</h5>
                            </div>
                            <div className="card-body">
                                {payments.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Nincsenek rögzített fizetések.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Fizetési szám</th>
                                                    <th>Számla</th>
                                                    <th>Játékos</th>
                                                    <th>Összeg</th>
                                                    <th>Dátum</th>
                                                    <th>Módszer</th>
                                                    <th>Állapot</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map(payment => (
                                                    <tr key={payment.id}>
                                                        <td><strong>{payment.payment_number}</strong></td>
                                                        <td>{payment.invoice_number}</td>
                                                        <td>{payment.player_name}</td>
                                                        <td>{formatCurrency(payment.amount_paid)}</td>
                                                        <td>{new Date(payment.payment_date).toLocaleDateString('hu-HU')}</td>
                                                        <td>
                                                            <span className="badge bg-info">
                                                                {paymentMethods.find(pm => pm.value === payment.payment_method)?.label || payment.payment_method}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={getStatusBadge(payment.payment_status)}>
                                                                {payment.payment_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Scholarships Tab */}
                    {activeTab === 'scholarships' && isAdminOrCoach() && (
                        <div className="card">
                            <div className="card-header">
                                <h5>🎓 Ösztöndíjak</h5>
                            </div>
                            <div className="card-body">
                                {scholarships.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Nincsenek ösztöndíjak.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Név</th>
                                                    <th>Típus</th>
                                                    <th>Játékos</th>
                                                    <th>Kedvezmény</th>
                                                    <th>Érvényes</th>
                                                    <th>Állapot</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scholarships.map(scholarship => (
                                                    <tr key={scholarship.id}>
                                                        <td><strong>{scholarship.scholarship_name}</strong></td>
                                                        <td>
                                                            <span className={`badge bg-${scholarshipTypes.find(st => st.value === scholarship.scholarship_type)?.color || 'secondary'}`}>
                                                                {scholarshipTypes.find(st => st.value === scholarship.scholarship_type)?.label || scholarship.scholarship_type}
                                                            </span>
                                                        </td>
                                                        <td>{scholarship.player_name}</td>
                                                        <td>
                                                            {scholarship.discount_type === 'percentage' ? 
                                                                `${scholarship.discount_value}%` : 
                                                                formatCurrency(scholarship.discount_value)
                                                            }
                                                        </td>
                                                        <td>
                                                            {new Date(scholarship.valid_from).toLocaleDateString('hu-HU')} - {' '}
                                                            {scholarship.valid_until ? 
                                                                new Date(scholarship.valid_until).toLocaleDateString('hu-HU') : 
                                                                'Határozatlan'
                                                            }
                                                        </td>
                                                        <td>
                                                            <span className={getStatusBadge(scholarship.status)}>
                                                                {scholarship.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reports Tab */}
                    {activeTab === 'reports' && isAdminOrCoach() && (
                        <>
                            {/* Financial Summary Cards */}
                            <div className="row mb-4">
                                <div className="col-md-3">
                                    <div className="card bg-primary text-white">
                                        <div className="card-body text-center">
                                            <h4>{financialSummary.total_subscriptions || 0}</h4>
                                            <small>Összes előfizetés</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-success text-white">
                                        <div className="card-body text-center">
                                            <h4>{financialSummary.active_subscriptions || 0}</h4>
                                            <small>Aktív előfizetések</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-warning text-white">
                                        <div className="card-body text-center">
                                            <h4>{financialSummary.overdue_invoices || 0}</h4>
                                            <small>Lejárt számlák</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-info text-white">
                                        <div className="card-body text-center">
                                            <h4>{formatCurrency(financialSummary.total_revenue || 0)}</h4>
                                            <small>Összes bevétel</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row">
                                {/* Outstanding Invoices */}
                                <div className="col-lg-8">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>⚠️ Lejárt számlák</h5>
                                        </div>
                                        <div className="card-body">
                                            {outstandingInvoices.length === 0 ? (
                                                <p className="text-muted text-center">Nincsenek lejárt számlák! 🎉</p>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Játékos</th>
                                                                <th>Összeg</th>
                                                                <th>Esedékesség</th>
                                                                <th>Késés</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {outstandingInvoices.slice(0, 10).map(invoice => (
                                                                <tr key={invoice.id}>
                                                                    <td>{invoice.player_name}</td>
                                                                    <td>{formatCurrency(invoice.amount_outstanding)}</td>
                                                                    <td>{new Date(invoice.due_date).toLocaleDateString('hu-HU')}</td>
                                                                    <td>
                                                                        <span className="badge bg-danger">
                                                                            {Math.floor(invoice.days_overdue)} nap
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Monthly Revenue */}
                                <div className="col-lg-4">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>📈 Havi bevételek</h5>
                                        </div>
                                        <div className="card-body">
                                            {monthlyRevenue.length === 0 ? (
                                                <p className="text-muted text-center">Nincsenek adatok.</p>
                                            ) : (
                                                <div>
                                                    {monthlyRevenue.slice(0, 6).map(month => (
                                                        <div key={month.month} className="d-flex justify-content-between mb-2">
                                                            <small>{month.month}</small>
                                                            <strong>{formatCurrency(month.total_revenue)}</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals - (A complex modal system would be implemented here) */}
            {showModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className={`modal-dialog ${modalType === 'subscription' ? 'modal-lg' : ''}`}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modalType === 'subscription' && '📋 Új előfizetés'}
                                    {modalType === 'invoice' && '💰 Új számla'}
                                    {modalType === 'payment' && '💳 Fizetés rögzítése'}
                                    {modalType === 'scholarship' && '🎓 Új ösztöndíj'}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="text-center py-4">
                                    <p className="text-muted">
                                        {modalType} form implementation here...
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Mégse
                                </button>
                                <button type="button" className="btn btn-primary">
                                    Mentés
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;