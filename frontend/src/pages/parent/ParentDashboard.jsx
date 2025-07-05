import React from 'react';
import { usePermissions } from '../../hooks/useAuth';
import { Card, StatCard, Button, Tabs } from '../../components/ui';

const ParentDashboard = () => {
    const { user } = usePermissions();

    return (
        <div className="parent-dashboard">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Parent Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Welcome back, {user?.first_name}! Stay connected with your child's football journey.
                    </p>
                </div>

                {/* Quick Stats */}
                <StatCard.Group columns={4} className="mb-8">
                    <StatCard
                        title="Child's Attendance"
                        value="94%"
                        trend="up"
                        trendValue="+3%"
                        trendLabel="vs last month"
                        variant="parent"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Goals Scored"
                        value={8}
                        trend="up"
                        trendValue="+2"
                        trendLabel="this month"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polygon points="10,8 16,12 10,16 10,8"></polygon>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Payment Status"
                        value="Paid"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Next Due Date"
                        value="15 days"
                        variant="primary"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
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
                                <Button variant="parent" fullWidth>
                                    View Child's Progress
                                </Button>
                                <Button variant="outline" fullWidth>
                                    Contact Coach
                                </Button>
                                <Button variant="ghost" fullWidth>
                                    Payment History
                                </Button>
                                <Button variant="ghost" fullWidth>
                                    Schedule & Events
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Child Progress & Communications */}
                    <Card className="lg:col-span-2">
                        <Card.Header>
                            <Card.Title>Child's Progress</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <Tabs defaultTab={0}>
                                <Tabs.TabPanel title="Recent Activity">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polygon points="10,8 16,12 10,16 10,8"></polygon>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Great performance in match vs Eagles FC</p>
                                                <p className="text-xs text-gray-500">Scored 2 goals and showed excellent teamwork</p>
                                                <p className="text-xs text-green-600 font-medium">March 10, 2024</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Attended training session</p>
                                                <p className="text-xs text-gray-500">Worked on ball control and passing accuracy</p>
                                                <p className="text-xs text-blue-600 font-medium">March 8, 2024</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                                    <polyline points="14,2 14,8 20,8"></polyline>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Coach feedback available</p>
                                                <p className="text-xs text-gray-500">Monthly progress report ready for review</p>
                                                <p className="text-xs text-yellow-600 font-medium">March 5, 2024</p>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="Upcoming Events">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                                            <div className="text-red-600">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polygon points="10,8 16,12 10,16 10,8"></polygon>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Important Match vs Falcon FC</p>
                                                <p className="text-xs text-gray-500">March 15, 2024 - 2:00 PM</p>
                                                <p className="text-xs text-red-600 font-medium">Parent attendance encouraged</p>
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
                                                <p className="text-sm font-medium">Parent-Coach Meeting</p>
                                                <p className="text-xs text-gray-500">March 18, 2024 - 6:00 PM</p>
                                                <p className="text-xs text-blue-600 font-medium">Discuss progress & goals</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                            <div className="text-green-600">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Extra Training Session</p>
                                                <p className="text-xs text-gray-500">March 20, 2024 - 4:00 PM</p>
                                                <p className="text-xs text-green-600 font-medium">Skills development focus</p>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="Development">
                                    <div className="space-y-4">
                                        <div className="p-3 bg-green-50 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm font-medium">Ball Control</p>
                                                <span className="text-xs text-green-600 font-medium">Good</span>
                                            </div>
                                            <div className="w-full bg-green-200 rounded-full h-2">
                                                <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Consistent improvement noted</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm font-medium">Team Communication</p>
                                                <span className="text-xs text-blue-600 font-medium">Excellent</span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Great leadership on field</p>
                                        </div>
                                        <div className="p-3 bg-yellow-50 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-sm font-medium">Shooting Accuracy</p>
                                                <span className="text-xs text-yellow-600 font-medium">Needs Work</span>
                                            </div>
                                            <div className="w-full bg-yellow-200 rounded-full h-2">
                                                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Focus area for next month</p>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                            </Tabs>
                        </Card.Body>
                    </Card>
                </div>

                {/* Payment Information */}
                <div className="mt-6">
                    <Card>
                        <Card.Header>
                            <Card.Title>Payment Information</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 mb-1">$150</div>
                                    <div className="text-sm text-gray-500">Monthly Fee</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600 mb-1">Paid</div>
                                    <div className="text-sm text-gray-500">Current Status</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600 mb-1">Apr 1</div>
                                    <div className="text-sm text-gray-500">Next Due Date</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;