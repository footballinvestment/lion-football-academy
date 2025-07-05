import React from 'react';
import { usePermissions } from '../../hooks/useAuth';
import { Card, StatCard, Button, Tabs } from '../../components/ui';

const CoachDashboard = () => {
    const { user } = usePermissions();

    return (
        <div className="coach-dashboard">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Coach Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Welcome back, Coach {user?.first_name}! Manage your team effectively.
                    </p>
                </div>

                {/* Quick Stats */}
                <StatCard.Group columns={4} className="mb-8">
                    <StatCard
                        title="Team Players"
                        value={22}
                        trend="up"
                        trendValue="+2"
                        trendLabel="new this month"
                        variant="coach"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Attendance Rate"
                        value="92%"
                        trend="up"
                        trendValue="+5%"
                        trendLabel="vs last month"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Next Match"
                        value="3 days"
                        variant="primary"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Win Rate"
                        value="75%"
                        trend="up"
                        trendValue="+10%"
                        trendLabel="this season"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                                <path d="M4 22h16"></path>
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                            </svg>
                        }
                    />
                </StatCard.Group>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Schedule */}
                    <Card className="lg:col-span-1">
                        <Card.Header>
                            <Card.Title>Today's Schedule</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                    <div className="text-yellow-600">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12,6 12,12 16,14"></polyline>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Morning Training</p>
                                        <p className="text-xs text-gray-500">9:00 AM - 11:00 AM</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                    <div className="text-blue-600">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Team Meeting</p>
                                        <p className="text-xs text-gray-500">2:00 PM - 3:00 PM</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                    <div className="text-green-600">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Evening Practice</p>
                                        <p className="text-xs text-gray-500">5:00 PM - 7:00 PM</p>
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Team Overview */}
                    <Card className="lg:col-span-2">
                        <Card.Header>
                            <Card.Title>Team Management</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <Tabs defaultTab={0}>
                                <Tabs.TabPanel title="Player Stats">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-blue-600">JS</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">John Smith</p>
                                                    <p className="text-xs text-gray-500">Forward • #10</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">8 Goals</p>
                                                <p className="text-xs text-gray-500">95% Attendance</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-green-600">MJ</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Mike Johnson</p>
                                                    <p className="text-xs text-gray-500">Midfielder • #8</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">5 Assists</p>
                                                <p className="text-xs text-gray-500">92% Attendance</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-purple-600">AB</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Alex Brown</p>
                                                    <p className="text-xs text-gray-500">Defender • #4</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">2 Goals</p>
                                                <p className="text-xs text-gray-500">88% Attendance</p>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="Quick Actions">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button variant="coach" size="sm">
                                            Record Attendance
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            Schedule Training
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                            Player Performance
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                            Match Reports
                                        </Button>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="Upcoming">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">vs Eagles FC</span>
                                            <span className="text-sm text-gray-500">March 15, 2024</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Training Session</span>
                                            <span className="text-sm text-gray-500">March 12, 2024</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Parent Meeting</span>
                                            <span className="text-sm text-gray-500">March 18, 2024</span>
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

export default CoachDashboard;