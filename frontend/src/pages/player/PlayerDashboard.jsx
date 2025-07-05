import React from 'react';
import { usePermissions } from '../../hooks/useAuth';
import { Card, StatCard, Button, Tabs } from '../../components/ui';

const PlayerDashboard = () => {
    const { user } = usePermissions();

    return (
        <div className="player-dashboard">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Player Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Welcome back, {user?.first_name}! Track your progress and stay motivated.
                    </p>
                </div>

                {/* Quick Stats */}
                <StatCard.Group columns={4} className="mb-8">
                    <StatCard
                        title="Goals This Season"
                        value={12}
                        trend="up"
                        trendValue="+3"
                        trendLabel="vs last month"
                        variant="player"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polygon points="10,8 16,12 10,16 10,8"></polygon>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Attendance Rate"
                        value="95%"
                        trend="up"
                        trendValue="+2%"
                        variant="success"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Training Hours"
                        value={48}
                        trend="up"
                        trendValue="+6"
                        trendLabel="this month"
                        variant="primary"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                        }
                    />
                    <StatCard
                        title="Team Ranking"
                        value="#3"
                        trend="up"
                        trendValue="+1"
                        trendLabel="position"
                        variant="secondary"
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
                    {/* Personal Goals */}
                    <Card className="lg:col-span-1">
                        <Card.Header>
                            <Card.Title>Personal Goals</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <div className="space-y-4">
                                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-medium">Score 15 Goals</p>
                                        <span className="text-xs text-green-600 font-medium">80%</span>
                                    </div>
                                    <div className="w-full bg-green-200 rounded-full h-2">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">12 of 15 goals achieved</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-medium">Attend 95% Training</p>
                                        <span className="text-xs text-blue-600 font-medium">95%</span>
                                    </div>
                                    <div className="w-full bg-blue-200 rounded-full h-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">19 of 20 sessions attended</p>
                                </div>
                                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-medium">Improve Speed</p>
                                        <span className="text-xs text-yellow-600 font-medium">60%</span>
                                    </div>
                                    <div className="w-full bg-yellow-200 rounded-full h-2">
                                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">0.5s improvement needed</p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Performance & Schedule */}
                    <Card className="lg:col-span-2">
                        <Card.Header>
                            <Card.Title>Performance Overview</Card.Title>
                        </Card.Header>
                        <Card.Body>
                            <Tabs defaultTab={0}>
                                <Tabs.TabPanel title="Recent Performance">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polygon points="10,8 16,12 10,16 10,8"></polygon>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">vs Thunder FC</p>
                                                    <p className="text-xs text-gray-500">March 10, 2024</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-green-600">2 Goals, 1 Assist</p>
                                                <p className="text-xs text-gray-500">90 min played</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Training Session</p>
                                                    <p className="text-xs text-gray-500">March 8, 2024</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-blue-600">Excellent</p>
                                                <p className="text-xs text-gray-500">120 min session</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polygon points="10,8 16,12 10,16 10,8"></polygon>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">vs Lightning FC</p>
                                                    <p className="text-xs text-gray-500">March 5, 2024</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-purple-600">1 Goal</p>
                                                <p className="text-xs text-gray-500">75 min played</p>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="Upcoming Schedule">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                            <div className="text-yellow-600">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12,6 12,12 16,14"></polyline>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Training Session</p>
                                                <p className="text-xs text-gray-500">Tomorrow - 4:00 PM</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                            <div className="text-green-600">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polygon points="10,8 16,12 10,16 10,8"></polygon>
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">vs Falcon FC</p>
                                                <p className="text-xs text-gray-500">March 15 - 2:00 PM</p>
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
                                                <p className="text-xs text-gray-500">March 18 - 6:00 PM</p>
                                            </div>
                                        </div>
                                    </div>
                                </Tabs.TabPanel>
                                <Tabs.TabPanel title="Development Plan">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Ball Control</span>
                                            <span className="text-sm text-green-600 font-medium">Good</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Shooting Accuracy</span>
                                            <span className="text-sm text-blue-600 font-medium">Excellent</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Speed & Agility</span>
                                            <span className="text-sm text-yellow-600 font-medium">Needs Work</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Team Communication</span>
                                            <span className="text-sm text-green-600 font-medium">Good</span>
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

export default PlayerDashboard;