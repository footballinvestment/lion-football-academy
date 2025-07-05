import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import CoachAnalytics from './CoachAnalytics';
import ParentAnalytics from './ParentAnalytics';
import PlayerAnalytics from './PlayerAnalytics';
import { Card } from '../../components/ui';

const Statistics = () => {
    const { user } = useAuth();

    // Redirect to appropriate analytics dashboard based on user role
    const renderAnalyticsDashboard = () => {
        if (!user) {
            return (
                <div className="statistics-loading">
                    <Card>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <h2>Loading Analytics...</h2>
                            <p>Please wait while we load your dashboard.</p>
                        </div>
                    </Card>
                </div>
            );
        }

        switch (user.role) {
            case 'coach':
                return <CoachAnalytics />;
            case 'parent':
                return <ParentAnalytics />;
            case 'player':
                return <PlayerAnalytics />;
            default:
                return (
                    <div className="statistics-error">
                        <Card>
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <h2>🚫 Access Not Available</h2>
                                <p>Analytics dashboard is not available for your user role.</p>
                                <p>Please contact your administrator if you believe this is an error.</p>
                            </div>
                        </Card>
                    </div>
                );
        }
    };

    return (
        <div className="statistics-container">
            {renderAnalyticsDashboard()}
        </div>
    );
};

export default Statistics;