import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './Payments.css';

const Payments = () => {
    const { user } = useAuth();
    const [paymentsData, setPaymentsData] = useState({
        overview: {},
        invoices: [],
        paymentHistory: [],
        paymentMethods: [],
        children: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedChild, setSelectedChild] = useState('all');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPaymentsData();
    }, [selectedChild]);

    const fetchPaymentsData = async () => {
        try {
            setLoading(true);
            setError('');

            const params = selectedChild !== 'all' ? `?child_id=${selectedChild}` : '';
            const [overviewRes, invoicesRes, historyRes, methodsRes, childrenRes] = await Promise.all([
                api.get(`/parent/payments/overview${params}`),
                api.get(`/parent/invoices${params}`),
                api.get(`/parent/payment-history${params}`),
                api.get('/parent/payment-methods'),
                api.get('/parent/children')
            ]);

            setPaymentsData({
                overview: overviewRes.data,
                invoices: invoicesRes.data,
                paymentHistory: historyRes.data,
                paymentMethods: methodsRes.data,
                children: childrenRes.data
            });
        } catch (error) {
            console.error('Error fetching payments data:', error);
            setError('Failed to load payment information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const makePayment = async (e) => {
        e.preventDefault();
        if (!selectedInvoice || !paymentMethod) return;

        try {
            setProcessing(true);
            setError('');

            await api.post('/parent/make-payment', {
                invoice_id: selectedInvoice.id,
                payment_method_id: paymentMethod,
                amount: selectedInvoice.amount_due
            });

            setSuccess('Payment processed successfully!');
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            setPaymentMethod('');
            fetchPaymentsData();
        } catch (error) {
            console.error('Error processing payment:', error);
            setError('Failed to process payment. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const downloadInvoice = async (invoiceId) => {
        try {
            const response = await api.get(`/parent/invoices/${invoiceId}/download`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${invoiceId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            setError('Failed to download invoice. Please try again.');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getInvoiceStatusColor = (status) => {
        const colors = {
            paid: 'success',
            pending: 'warning',
            overdue: 'error',
            cancelled: 'gray'
        };
        return colors[status] || 'gray';
    };

    const getInvoiceStatusIcon = (status) => {
        const icons = {
            paid: '✅',
            pending: '⏳',
            overdue: '❌',
            cancelled: '🚫'
        };
        return icons[status] || '📄';
    };

    const getDaysUntilDue = (dueDate) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const filteredInvoices = paymentsData.invoices.filter(invoice => {
        if (selectedChild === 'all') return true;
        return invoice.child_id === selectedChild;
    });

    const filteredHistory = paymentsData.paymentHistory.filter(payment => {
        if (selectedChild === 'all') return true;
        return payment.child_id === selectedChild;
    });

    if (loading) {
        return (
            <div className="family-payments">
                <div className="family-payments__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading payment information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="family-payments">
            {/* Header */}
            <div className="family-payments__header">
                <div className="family-payments__header-content">
                    <div className="family-payments__title">
                        <h1>💳 Family Payments</h1>
                        <p>Manage your academy fees and payment history</p>
                    </div>
                    <div className="family-payments__header-actions">
                        <select 
                            className="family-payments__child-filter"
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                        >
                            <option value="all">All Children</option>
                            {paymentsData.children.map(child => (
                                <option key={child.id} value={child.id}>
                                    {child.first_name} {child.last_name}
                                </option>
                            ))}
                        </select>
                        <Button 
                            onClick={() => window.open('/parent/payment-portal', '_blank')}
                            variant="primary"
                        >
                            💰 Payment Portal
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert type="success" onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="overview">Payment Overview</Tabs.Trigger>
                        <Tabs.Trigger value="invoices">
                            Outstanding Invoices
                            {paymentsData.invoices.filter(i => i.status !== 'paid').length > 0 && (
                                <span className="family-payments__badge">
                                    {paymentsData.invoices.filter(i => i.status !== 'paid').length}
                                </span>
                            )}
                        </Tabs.Trigger>
                        <Tabs.Trigger value="history">Payment History</Tabs.Trigger>
                        <Tabs.Trigger value="methods">Payment Methods</Tabs.Trigger>
                    </Tabs.List>

                    {/* Payment Overview Tab */}
                    <Tabs.Content value="overview">
                        <div className="family-payments__section">
                            <h3>📊 Financial Summary</h3>
                            <p className="family-payments__section-intro">
                                Overview of your family's payment status and upcoming fees
                            </p>

                            {/* Overview Cards */}
                            <div className="family-payments__overview-grid">
                                <div className="family-payments__overview-card family-payments__overview-card--balance">
                                    <div className="family-payments__overview-icon">💰</div>
                                    <div className="family-payments__overview-content">
                                        <h4>Current Balance</h4>
                                        <div className="family-payments__overview-value">
                                            {formatCurrency(paymentsData.overview.current_balance)}
                                        </div>
                                        <p>
                                            {paymentsData.overview.current_balance > 0 ? 'Amount due' : 'Account in good standing'}
                                        </p>
                                    </div>
                                </div>

                                <div className="family-payments__overview-card family-payments__overview-card--monthly">
                                    <div className="family-payments__overview-icon">📅</div>
                                    <div className="family-payments__overview-content">
                                        <h4>Monthly Fees</h4>
                                        <div className="family-payments__overview-value">
                                            {formatCurrency(paymentsData.overview.monthly_fees)}
                                        </div>
                                        <p>Regular training fees</p>
                                    </div>
                                </div>

                                <div className="family-payments__overview-card family-payments__overview-card--next">
                                    <div className="family-payments__overview-icon">⏰</div>
                                    <div className="family-payments__overview-content">
                                        <h4>Next Payment Due</h4>
                                        <div className="family-payments__overview-value">
                                            {paymentsData.overview.next_due_date ? formatDate(paymentsData.overview.next_due_date) : 'N/A'}
                                        </div>
                                        <p>
                                            {paymentsData.overview.next_due_amount ? formatCurrency(paymentsData.overview.next_due_amount) : 'No pending payments'}
                                        </p>
                                    </div>
                                </div>

                                <div className="family-payments__overview-card family-payments__overview-card--ytd">
                                    <div className="family-payments__overview-icon">📈</div>
                                    <div className="family-payments__overview-content">
                                        <h4>Year to Date</h4>
                                        <div className="family-payments__overview-value">
                                            {formatCurrency(paymentsData.overview.ytd_payments)}
                                        </div>
                                        <p>Total payments this year</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="family-payments__quick-actions">
                                <h4>⚡ Quick Actions</h4>
                                <div className="family-payments__actions-grid">
                                    <Button 
                                        onClick={() => setActiveTab('invoices')}
                                        variant="primary"
                                        className="family-payments__action-btn"
                                    >
                                        <div className="family-payments__action-icon">📄</div>
                                        <div className="family-payments__action-content">
                                            <h5>View Invoices</h5>
                                            <p>Check outstanding bills</p>
                                        </div>
                                    </Button>

                                    <Button 
                                        onClick={() => window.open('/parent/payment-portal', '_blank')}
                                        variant="secondary"
                                        className="family-payments__action-btn"
                                    >
                                        <div className="family-payments__action-icon">💳</div>
                                        <div className="family-payments__action-content">
                                            <h5>Make Payment</h5>
                                            <p>Pay fees online</p>
                                        </div>
                                    </Button>

                                    <Button 
                                        onClick={() => setActiveTab('history')}
                                        variant="secondary"
                                        className="family-payments__action-btn"
                                    >
                                        <div className="family-payments__action-icon">📊</div>
                                        <div className="family-payments__action-content">
                                            <h5>Payment History</h5>
                                            <p>View past payments</p>
                                        </div>
                                    </Button>

                                    <Button 
                                        onClick={() => setActiveTab('methods')}
                                        variant="secondary"
                                        className="family-payments__action-btn"
                                    >
                                        <div className="family-payments__action-icon">⚙️</div>
                                        <div className="family-payments__action-content">
                                            <h5>Payment Methods</h5>
                                            <p>Manage cards & bank accounts</p>
                                        </div>
                                    </Button>
                                </div>
                            </div>

                            {/* Payment Reminders */}
                            {paymentsData.overview.payment_reminders && paymentsData.overview.payment_reminders.length > 0 && (
                                <div className="family-payments__reminders">
                                    <h4>⏰ Payment Reminders</h4>
                                    <div className="family-payments__reminders-list">
                                        {paymentsData.overview.payment_reminders.map((reminder, index) => (
                                            <div key={index} className={`family-payments__reminder family-payments__reminder--${reminder.priority}`}>
                                                <div className="family-payments__reminder-icon">
                                                    {reminder.priority === 'high' && '🚨'}
                                                    {reminder.priority === 'medium' && '⏰'}
                                                    {reminder.priority === 'low' && '📅'}
                                                </div>
                                                <div className="family-payments__reminder-content">
                                                    <h5>{reminder.title}</h5>
                                                    <p>{reminder.message}</p>
                                                    <span className="family-payments__reminder-date">
                                                        Due: {formatDate(reminder.due_date)}
                                                    </span>
                                                </div>
                                                <div className="family-payments__reminder-amount">
                                                    {formatCurrency(reminder.amount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Outstanding Invoices Tab */}
                    <Tabs.Content value="invoices">
                        <div className="family-payments__section">
                            <h3>📄 Outstanding Invoices</h3>
                            <p className="family-payments__section-intro">
                                View and pay your outstanding academy fees and charges
                            </p>

                            {filteredInvoices.length > 0 ? (
                                <div className="family-payments__invoices-list">
                                    {filteredInvoices.map((invoice, index) => (
                                        <div key={index} className={`family-payments__invoice-item family-payments__invoice-item--${getInvoiceStatusColor(invoice.status)}`}>
                                            <div className="family-payments__invoice-header">
                                                <div className="family-payments__invoice-info">
                                                    <div className="family-payments__invoice-status">
                                                        <span className="family-payments__invoice-icon">
                                                            {getInvoiceStatusIcon(invoice.status)}
                                                        </span>
                                                        <span className={`family-payments__status-badge family-payments__status-badge--${getInvoiceStatusColor(invoice.status)}`}>
                                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                        </span>
                                                    </div>
                                                    <div className="family-payments__invoice-details">
                                                        <h4>Invoice #{invoice.invoice_number}</h4>
                                                        <p>{invoice.description}</p>
                                                        {invoice.child_name && (
                                                            <span className="family-payments__child-tag">
                                                                For: {invoice.child_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="family-payments__invoice-amount">
                                                    <div className="family-payments__amount-due">
                                                        {formatCurrency(invoice.amount_due)}
                                                    </div>
                                                    <div className="family-payments__due-date">
                                                        Due: {formatDate(invoice.due_date)}
                                                        {invoice.status === 'pending' && getDaysUntilDue(invoice.due_date) <= 7 && (
                                                            <span className="family-payments__urgent">
                                                                ({getDaysUntilDue(invoice.due_date)} days)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="family-payments__invoice-breakdown">
                                                <h6>📋 Invoice Details:</h6>
                                                <div className="family-payments__breakdown-grid">
                                                    {invoice.line_items?.map((item, itemIndex) => (
                                                        <div key={itemIndex} className="family-payments__breakdown-item">
                                                            <span className="family-payments__item-description">{item.description}</span>
                                                            <span className="family-payments__item-amount">{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="family-payments__invoice-total">
                                                    <strong>Total: {formatCurrency(invoice.total_amount)}</strong>
                                                </div>
                                            </div>

                                            <div className="family-payments__invoice-actions">
                                                <Button 
                                                    onClick={() => downloadInvoice(invoice.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    📥 Download
                                                </Button>
                                                {invoice.status !== 'paid' && (
                                                    <Button 
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowPaymentModal(true);
                                                        }}
                                                        variant="primary"
                                                        size="sm"
                                                    >
                                                        💳 Pay Now
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-payments__empty-state">
                                    <div className="family-payments__empty-icon">📄</div>
                                    <h4>No Outstanding Invoices</h4>
                                    <p>All invoices are paid up! Great job staying on top of your payments.</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Payment History Tab */}
                    <Tabs.Content value="history">
                        <div className="family-payments__section">
                            <h3>📊 Payment History</h3>
                            <p className="family-payments__section-intro">
                                Complete record of all payments made to the academy
                            </p>

                            {filteredHistory.length > 0 ? (
                                <div className="family-payments__history-list">
                                    {filteredHistory.map((payment, index) => (
                                        <div key={index} className="family-payments__history-item">
                                            <div className="family-payments__history-date">
                                                <div className="family-payments__history-day">
                                                    {new Date(payment.payment_date).getDate()}
                                                </div>
                                                <div className="family-payments__history-month">
                                                    {new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short' })}
                                                </div>
                                                <div className="family-payments__history-year">
                                                    {new Date(payment.payment_date).getFullYear()}
                                                </div>
                                            </div>
                                            <div className="family-payments__history-content">
                                                <h4>{payment.description}</h4>
                                                <p>Invoice #{payment.invoice_number}</p>
                                                {payment.child_name && (
                                                    <span className="family-payments__child-tag">
                                                        {payment.child_name}
                                                    </span>
                                                )}
                                                <div className="family-payments__payment-method">
                                                    💳 {payment.payment_method}
                                                </div>
                                            </div>
                                            <div className="family-payments__history-amount">
                                                <div className="family-payments__amount-paid">
                                                    {formatCurrency(payment.amount)}
                                                </div>
                                                <div className="family-payments__payment-status">
                                                    ✅ Paid
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-payments__empty-state">
                                    <div className="family-payments__empty-icon">📊</div>
                                    <h4>No Payment History</h4>
                                    <p>Payment history will appear here once you make your first payment.</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Payment Methods Tab */}
                    <Tabs.Content value="methods">
                        <div className="family-payments__section">
                            <h3>⚙️ Payment Methods</h3>
                            <p className="family-payments__section-intro">
                                Manage your saved payment methods for quick and easy payments
                            </p>

                            {paymentsData.paymentMethods.length > 0 ? (
                                <div className="family-payments__methods-list">
                                    {paymentsData.paymentMethods.map((method, index) => (
                                        <div key={index} className="family-payments__method-item">
                                            <div className="family-payments__method-icon">
                                                {method.type === 'card' && '💳'}
                                                {method.type === 'bank' && '🏦'}
                                                {method.type === 'paypal' && '💰'}
                                            </div>
                                            <div className="family-payments__method-details">
                                                <h4>{method.name}</h4>
                                                <p>{method.description}</p>
                                                {method.is_default && (
                                                    <span className="family-payments__default-badge">
                                                        ⭐ Default
                                                    </span>
                                                )}
                                            </div>
                                            <div className="family-payments__method-actions">
                                                <Button 
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => console.log('Edit method', method.id)}
                                                >
                                                    ✏️ Edit
                                                </Button>
                                                {!method.is_default && (
                                                    <Button 
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => console.log('Delete method', method.id)}
                                                    >
                                                        🗑️ Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-payments__empty-state">
                                    <div className="family-payments__empty-icon">💳</div>
                                    <h4>No Payment Methods</h4>
                                    <p>Add a payment method to make quick and secure payments.</p>
                                </div>
                            )}

                            <div className="family-payments__method-actions">
                                <Button 
                                    onClick={() => window.open('/parent/add-payment-method', '_blank')}
                                    variant="primary"
                                >
                                    ➕ Add Payment Method
                                </Button>
                            </div>
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="family-payments__modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="family-payments__modal" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={makePayment}>
                            <div className="family-payments__modal-header">
                                <h3>💳 Make Payment</h3>
                                <Button 
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    ✕
                                </Button>
                            </div>
                            <div className="family-payments__modal-content">
                                <div className="family-payments__payment-summary">
                                    <h4>Payment Summary</h4>
                                    <div className="family-payments__summary-row">
                                        <span>Invoice:</span>
                                        <span>#{selectedInvoice.invoice_number}</span>
                                    </div>
                                    <div className="family-payments__summary-row">
                                        <span>Description:</span>
                                        <span>{selectedInvoice.description}</span>
                                    </div>
                                    <div className="family-payments__summary-row">
                                        <span>Due Date:</span>
                                        <span>{formatDate(selectedInvoice.due_date)}</span>
                                    </div>
                                    <div className="family-payments__summary-row family-payments__summary-total">
                                        <span>Amount Due:</span>
                                        <span>{formatCurrency(selectedInvoice.amount_due)}</span>
                                    </div>
                                </div>

                                <div className="family-payments__form-group">
                                    <label htmlFor="payment-method">Payment Method:</label>
                                    <select 
                                        id="payment-method"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        required
                                    >
                                        <option value="">Select payment method...</option>
                                        {paymentsData.paymentMethods.map(method => (
                                            <option key={method.id} value={method.id}>
                                                {method.name} - {method.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="family-payments__modal-footer">
                                <Button 
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    variant="secondary"
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    variant="primary"
                                    disabled={!paymentMethod || processing}
                                >
                                    {processing ? '⏳ Processing...' : `💳 Pay ${formatCurrency(selectedInvoice.amount_due)}`}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;