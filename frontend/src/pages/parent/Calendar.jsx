import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './Calendar.css';

const Calendar = () => {
    const { user } = useAuth();
    const [calendarData, setCalendarData] = useState({
        events: [],
        children: [],
        familySchedule: [],
        upcomingPayments: [],
        holidayBreaks: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedChild, setSelectedChild] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month');
    const [activeTab, setActiveTab] = useState('calendar');
    const [showEventDetails, setShowEventDetails] = useState(null);

    useEffect(() => {
        fetchCalendarData();
    }, [selectedChild]);

    const fetchCalendarData = async () => {
        try {
            setLoading(true);
            setError('');

            const params = selectedChild !== 'all' ? `?child_id=${selectedChild}` : '';
            const [eventsRes, childrenRes, scheduleRes, paymentsRes, holidaysRes] = await Promise.all([
                api.get(`/parent/calendar/events${params}`),
                api.get('/parent/children'),
                api.get(`/parent/family-schedule${params}`),
                api.get('/parent/upcoming-payments'),
                api.get('/parent/holiday-breaks')
            ]);

            setCalendarData({
                events: eventsRes.data,
                children: childrenRes.data,
                familySchedule: scheduleRes.data,
                upcomingPayments: paymentsRes.data,
                holidayBreaks: holidaysRes.data
            });
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            setError('Failed to load family calendar. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() - firstDay.getDay());

        const days = [];
        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const getEventsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return calendarData.events.filter(event => {
            const eventDate = new Date(event.date).toISOString().split('T')[0];
            return eventDate === dateStr;
        });
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSameMonth = (date, month) => {
        return date.getMonth() === month;
    };

    const formatTime = (timeString) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getEventTypeIcon = (type) => {
        const icons = {
            training: '🏃',
            match: '⚽',
            meeting: '💬',
            payment: '💰',
            holiday: '🏖️',
            event: '🎉',
            birthday: '🎂'
        };
        return icons[type] || '📅';
    };

    const getEventPriority = (type) => {
        const priorities = {
            match: 'high',
            payment: 'high',
            meeting: 'medium',
            training: 'low',
            holiday: 'low',
            event: 'medium',
            birthday: 'medium'
        };
        return priorities[type] || 'low';
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(selectedDate.getMonth() + direction);
        setSelectedDate(newDate);
    };

    const navigateToToday = () => {
        setSelectedDate(new Date());
    };

    const filterEventsByChild = (events) => {
        if (selectedChild === 'all') return events;
        return events.filter(event => event.child_id === selectedChild || !event.child_id);
    };

    if (loading) {
        return (
            <div className="family-calendar">
                <div className="family-calendar__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading family calendar...</p>
                </div>
            </div>
        );
    }

    const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const calendarDays = getDaysInMonth(selectedDate);
    const filteredEvents = filterEventsByChild(calendarData.events);

    return (
        <div className="family-calendar">
            {/* Header */}
            <div className="family-calendar__header">
                <div className="family-calendar__header-content">
                    <div className="family-calendar__title">
                        <h1>📅 Family Sports Calendar</h1>
                        <p>Stay organized with your family's football schedule</p>
                    </div>
                    <div className="family-calendar__header-actions">
                        <select 
                            className="family-calendar__child-filter"
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                        >
                            <option value="all">All Children</option>
                            {calendarData.children.map(child => (
                                <option key={child.id} value={child.id}>
                                    {child.first_name} {child.last_name}
                                </option>
                            ))}
                        </select>
                        <Button 
                            onClick={navigateToToday}
                            variant="secondary"
                        >
                            📍 Today
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="calendar">Calendar View</Tabs.Trigger>
                        <Tabs.Trigger value="schedule">Weekly Schedule</Tabs.Trigger>
                        <Tabs.Trigger value="upcoming">Upcoming Events</Tabs.Trigger>
                        <Tabs.Trigger value="payments">Payment Calendar</Tabs.Trigger>
                    </Tabs.List>

                    {/* Calendar View Tab */}
                    <Tabs.Content value="calendar">
                        <div className="family-calendar__calendar-section">
                            {/* Calendar Navigation */}
                            <div className="family-calendar__nav">
                                <Button 
                                    onClick={() => navigateMonth(-1)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    ← Previous
                                </Button>
                                <h2 className="family-calendar__month-title">{monthName}</h2>
                                <Button 
                                    onClick={() => navigateMonth(1)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Next →
                                </Button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="family-calendar__grid">
                                {/* Day Headers */}
                                <div className="family-calendar__day-headers">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="family-calendar__day-header">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="family-calendar__days">
                                    {calendarDays.map((day, index) => {
                                        const dayEvents = getEventsForDate(day);
                                        const isCurrentMonth = isSameMonth(day, selectedDate.getMonth());
                                        
                                        return (
                                            <div 
                                                key={index}
                                                className={`family-calendar__day ${
                                                    !isCurrentMonth ? 'family-calendar__day--other-month' : ''
                                                } ${
                                                    isToday(day) ? 'family-calendar__day--today' : ''
                                                } ${
                                                    dayEvents.length > 0 ? 'family-calendar__day--has-events' : ''
                                                }`}
                                            >
                                                <div className="family-calendar__day-number">
                                                    {day.getDate()}
                                                </div>
                                                
                                                {dayEvents.length > 0 && (
                                                    <div className="family-calendar__day-events">
                                                        {dayEvents.slice(0, 3).map((event, eventIndex) => (
                                                            <div 
                                                                key={eventIndex}
                                                                className={`family-calendar__day-event family-calendar__day-event--${getEventPriority(event.type)}`}
                                                                onClick={() => setShowEventDetails(event)}
                                                                title={event.title}
                                                            >
                                                                <span className="family-calendar__event-icon">
                                                                    {getEventTypeIcon(event.type)}
                                                                </span>
                                                                <span className="family-calendar__event-title">
                                                                    {event.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {dayEvents.length > 3 && (
                                                            <div className="family-calendar__more-events">
                                                                +{dayEvents.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Calendar Legend */}
                            <div className="family-calendar__legend">
                                <h4>📋 Event Types</h4>
                                <div className="family-calendar__legend-items">
                                    <div className="family-calendar__legend-item">
                                        <span className="family-calendar__legend-icon">🏃</span>
                                        <span>Training Sessions</span>
                                    </div>
                                    <div className="family-calendar__legend-item">
                                        <span className="family-calendar__legend-icon">⚽</span>
                                        <span>Matches</span>
                                    </div>
                                    <div className="family-calendar__legend-item">
                                        <span className="family-calendar__legend-icon">💬</span>
                                        <span>Parent Meetings</span>
                                    </div>
                                    <div className="family-calendar__legend-item">
                                        <span className="family-calendar__legend-icon">💰</span>
                                        <span>Payment Due</span>
                                    </div>
                                    <div className="family-calendar__legend-item">
                                        <span className="family-calendar__legend-icon">🏖️</span>
                                        <span>Holiday Breaks</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Weekly Schedule Tab */}
                    <Tabs.Content value="schedule">
                        <div className="family-calendar__schedule-section">
                            <h3>📋 Weekly Training Schedule</h3>
                            <p className="family-calendar__schedule-intro">
                                Regular training sessions and activities for your family
                            </p>

                            {calendarData.familySchedule.length > 0 ? (
                                <div className="family-calendar__schedule-grid">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                        const daySchedule = calendarData.familySchedule.filter(item => item.day_of_week === day.toLowerCase());
                                        
                                        return (
                                            <div key={day} className="family-calendar__schedule-day">
                                                <h4 className="family-calendar__schedule-day-name">{day}</h4>
                                                <div className="family-calendar__schedule-items">
                                                    {daySchedule.length > 0 ? (
                                                        daySchedule.map((item, index) => (
                                                            <div key={index} className="family-calendar__schedule-item">
                                                                <div className="family-calendar__schedule-time">
                                                                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                                                </div>
                                                                <div className="family-calendar__schedule-details">
                                                                    <h5>{item.activity_name}</h5>
                                                                    <p>{item.child_name} • {item.age_group}</p>
                                                                    <span className="family-calendar__schedule-location">
                                                                        📍 {item.location}
                                                                    </span>
                                                                </div>
                                                                <div className="family-calendar__schedule-icon">
                                                                    {getEventTypeIcon(item.type)}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="family-calendar__schedule-empty">
                                                            <p>No activities scheduled</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="family-calendar__empty-state">
                                    <div className="family-calendar__empty-icon">📅</div>
                                    <h4>No Weekly Schedule</h4>
                                    <p>Your family's weekly training schedule will appear here once set up by your coach.</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Upcoming Events Tab */}
                    <Tabs.Content value="upcoming">
                        <div className="family-calendar__events-section">
                            <h3>🔜 Upcoming Events</h3>
                            <p className="family-calendar__events-intro">
                                Important dates and events for your family to remember
                            </p>

                            {filteredEvents.length > 0 ? (
                                <div className="family-calendar__events-list">
                                    {filteredEvents
                                        .filter(event => new Date(event.date) >= new Date())
                                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                                        .slice(0, 10)
                                        .map((event, index) => (
                                            <div key={index} className={`family-calendar__event-item family-calendar__event-item--${getEventPriority(event.type)}`}>
                                                <div className="family-calendar__event-date">
                                                    <div className="family-calendar__event-day">
                                                        {new Date(event.date).getDate()}
                                                    </div>
                                                    <div className="family-calendar__event-month">
                                                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </div>
                                                </div>
                                                <div className="family-calendar__event-content">
                                                    <h4>{event.title}</h4>
                                                    <p className="family-calendar__event-type">
                                                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                                        {event.child_name && ` • ${event.child_name}`}
                                                    </p>
                                                    {event.time && (
                                                        <p className="family-calendar__event-time">
                                                            🕐 {formatTime(event.time)}
                                                        </p>
                                                    )}
                                                    {event.location && (
                                                        <p className="family-calendar__event-location">
                                                            📍 {event.location}
                                                        </p>
                                                    )}
                                                    {event.description && (
                                                        <p className="family-calendar__event-description">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="family-calendar__event-icon">
                                                    {getEventTypeIcon(event.type)}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="family-calendar__empty-state">
                                    <div className="family-calendar__empty-icon">🎉</div>
                                    <h4>No Upcoming Events</h4>
                                    <p>Check back later for new events and activities!</p>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>

                    {/* Payment Calendar Tab */}
                    <Tabs.Content value="payments">
                        <div className="family-calendar__payments-section">
                            <h3>💰 Payment Schedule</h3>
                            <p className="family-calendar__payments-intro">
                                Keep track of upcoming payments and due dates
                            </p>

                            {calendarData.upcomingPayments.length > 0 ? (
                                <div className="family-calendar__payments-list">
                                    {calendarData.upcomingPayments.map((payment, index) => (
                                        <div key={index} className={`family-calendar__payment-item family-calendar__payment-item--${payment.status}`}>
                                            <div className="family-calendar__payment-date">
                                                <div className="family-calendar__payment-day">
                                                    {new Date(payment.due_date).getDate()}
                                                </div>
                                                <div className="family-calendar__payment-month">
                                                    {new Date(payment.due_date).toLocaleDateString('en-US', { month: 'short' })}
                                                </div>
                                            </div>
                                            <div className="family-calendar__payment-content">
                                                <h4>{payment.description}</h4>
                                                <p className="family-calendar__payment-amount">
                                                    Amount: ${payment.amount}
                                                </p>
                                                <p className="family-calendar__payment-due">
                                                    Due: {formatDate(payment.due_date)}
                                                </p>
                                                {payment.child_name && (
                                                    <p className="family-calendar__payment-child">
                                                        For: {payment.child_name}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="family-calendar__payment-status">
                                                <span className={`family-calendar__payment-badge family-calendar__payment-badge--${payment.status}`}>
                                                    {payment.status === 'upcoming' && '📅 Upcoming'}
                                                    {payment.status === 'due' && '⏰ Due Soon'}
                                                    {payment.status === 'overdue' && '❌ Overdue'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="family-calendar__empty-state">
                                    <div className="family-calendar__empty-icon">💳</div>
                                    <h4>No Upcoming Payments</h4>
                                    <p>All payments are up to date!</p>
                                </div>
                            )}

                            {/* Holiday Breaks */}
                            {calendarData.holidayBreaks.length > 0 && (
                                <div className="family-calendar__holidays-section">
                                    <h4>🏖️ Upcoming Holiday Breaks</h4>
                                    <div className="family-calendar__holidays-list">
                                        {calendarData.holidayBreaks.map((holiday, index) => (
                                            <div key={index} className="family-calendar__holiday-item">
                                                <div className="family-calendar__holiday-icon">🏖️</div>
                                                <div className="family-calendar__holiday-content">
                                                    <h5>{holiday.name}</h5>
                                                    <p>
                                                        {formatDate(holiday.start_date)} - {formatDate(holiday.end_date)}
                                                    </p>
                                                    {holiday.description && (
                                                        <p className="family-calendar__holiday-description">
                                                            {holiday.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>

            {/* Event Details Modal */}
            {showEventDetails && (
                <div className="family-calendar__modal-overlay" onClick={() => setShowEventDetails(null)}>
                    <div className="family-calendar__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="family-calendar__modal-header">
                            <h3>{showEventDetails.title}</h3>
                            <Button 
                                onClick={() => setShowEventDetails(null)}
                                variant="ghost"
                                size="sm"
                            >
                                ✕
                            </Button>
                        </div>
                        <div className="family-calendar__modal-content">
                            <div className="family-calendar__modal-detail">
                                <strong>📅 Date:</strong> {formatDate(showEventDetails.date)}
                            </div>
                            {showEventDetails.time && (
                                <div className="family-calendar__modal-detail">
                                    <strong>🕐 Time:</strong> {formatTime(showEventDetails.time)}
                                </div>
                            )}
                            {showEventDetails.location && (
                                <div className="family-calendar__modal-detail">
                                    <strong>📍 Location:</strong> {showEventDetails.location}
                                </div>
                            )}
                            {showEventDetails.child_name && (
                                <div className="family-calendar__modal-detail">
                                    <strong>👶 Child:</strong> {showEventDetails.child_name}
                                </div>
                            )}
                            {showEventDetails.description && (
                                <div className="family-calendar__modal-detail">
                                    <strong>📝 Description:</strong> {showEventDetails.description}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;