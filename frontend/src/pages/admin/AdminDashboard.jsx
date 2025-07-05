import React from 'react';
import { usePermissions } from '../../hooks/useAuth';
import { Card, StatCard, Button, Tabs } from '../../components/ui';

const AdminDashboard = () => {
    const { user } = usePermissions();

    return (
        <div className="admin-dashboard">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Welcome back, {user?.first_name}! Manage your football academy.
                    </p>
                </div>

                {/* Quick Stats */}
                <StatCard.Group columns={4} className="mb-8">
                    <StatCard
                        title="Total Players"
                        value={145}
                        trend="up"
                        trendValue="+12%"
                        trendLabel="vs last month"
                        variant="admin"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Active Teams"
                        value={8}
                        trend="neutral"
                        variant="primary"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Total Revenue"
                        value="$24,500"
                        trend="up"
                        trendValue="+8%"
                        trendLabel="this month"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        }
                    />
                    <StatCard
                        title="System Health"
                        value="99.8%"
                        trend="up"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                            </svg>
                        }
                    />
                </StatCard.Group>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <Card className="lg:col-span-1">
                        <Card.Header>
                            <Card.Title>Quick Actions</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <div className="space-y-3">
                                <Button variant="admin" fullWidth>
                                    Add New Player
                                </Button>
                                <Button variant="outline" fullWidth>
                                    Create Team
                                </Button>
                                <Button variant="ghost" fullWidth>
                                    View Reports
                                </Button>
                                <Button variant="ghost" fullWidth>
                                    System Settings
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="lg:col-span-2">
                        <Card.Header>
                            <Card.Title>System Overview</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <Tabs defaultTab={0}>
                                <Tabs.TabPanel title="Recent Activity">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="9" cy="7" r="4"></circle>
                                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">New player registered</p>
                                                <p className="text-xs text-gray-500">John Smith joined U15 team</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Training completed</p>
                                                <p className="text-xs text-gray-500">U18 team finished morning session</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                                    <polyline points="14,2 14,8 20,8"></polyline>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Payment received</p>
                                                <p className="text-xs text-gray-500">Monthly fee from parent account</p>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="System Status">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Database Connection</span>
                                            <span className="text-sm text-green-600 font-medium">Healthy</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">API Response Time</span>
                                            <span className="text-sm text-green-600 font-medium">&lt; 100ms</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Storage Usage</span>
                                            <span className="text-sm text-yellow-600 font-medium">68%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Active Sessions</span>
                                            <span className="text-sm text-blue-600 font-medium">24</span>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                            </Tabs>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;