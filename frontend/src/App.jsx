import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute, { AdminRoute, CoachRoute, PlayerRoute, ParentRoute, PublicRoute } from './components/ProtectedRoute.jsx';
import ResponsiveNavbar from './components/ResponsiveNavbar';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Import styles
import './styles/mobile.css';
import './styles/navbar.css';
import './App.css';

// Lazy load authentication pages
const Login = lazy(() => import('./pages/auth/Login'));

// Lazy load dashboard pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CoachDashboard = lazy(() => import('./pages/coach/CoachDashboard'));
const PlayerDashboard = lazy(() => import('./pages/player/PlayerDashboard'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));

// Lazy load existing pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const MyTeams = lazy(() => import('./components/MyTeams'));
const Players = lazy(() => import('./pages/Players'));
const Teams = lazy(() => import('./pages/Teams'));
const Trainings = lazy(() => import('./pages/Trainings'));
const TrainingAttendance = lazy(() => import('./pages/TrainingAttendance'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Statistics = lazy(() => import('./pages/Statistics'));
const QRCheckIn = lazy(() => import('./pages/QRCheckIn'));
const AIAnalytics = lazy(() => import('./pages/AIAnalytics'));
const Injuries = lazy(() => import('./pages/Injuries'));
const Matches = lazy(() => import('./pages/Matches'));
const DevelopmentPlans = lazy(() => import('./pages/DevelopmentPlans'));
const Billing = lazy(() => import('./pages/Billing'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));

// Loading fallback component for lazy loading
const PageLoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner 
            size="lg" 
            variant="primary" 
            message="Loading page..." 
        />
    </div>
);

// 404 Component
const NotFound = () => (
    <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-8">Page not found</p>
        <Navigate to="/" />
    </div>
);

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App min-h-screen bg-gray-50">
                    <ResponsiveNavbar />
                    <main className="main-content">
                        <Suspense fallback={<PageLoadingFallback />}>
                            <Routes>
                            {/* Public routes */}
                            <Route 
                                path="/login" 
                                element={
                                    <PublicRoute>
                                        <Login />
                                    </PublicRoute>
                                } 
                            />
                            
                            {/* Root redirect based on role */}
                            <Route 
                                path="/" 
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                } 
                            />

                            {/* Role-specific dashboard routes */}
                            <Route 
                                path="/admin/*" 
                                element={
                                    <AdminRoute>
                                        <Routes>
                                            <Route index element={<AdminDashboard />} />
                                            <Route path="dashboard" element={<AdminDashboard />} />
                                            <Route path="users" element={<Admin />} />
                                            <Route path="teams" element={<Teams />} />
                                            <Route path="players" element={<Players />} />
                                            <Route path="statistics" element={<Statistics />} />
                                            <Route path="billing" element={<Billing />} />
                                            <Route path="injuries" element={<Injuries />} />
                                            <Route path="ai-analytics" element={<AIAnalytics />} />
                                            <Route path="development-plans" element={<DevelopmentPlans />} />
                                            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                                        </Routes>
                                    </AdminRoute>
                                } 
                            />

                            <Route 
                                path="/coach/*" 
                                element={
                                    <CoachRoute>
                                        <Routes>
                                            <Route index element={<CoachDashboard />} />
                                            <Route path="dashboard" element={<CoachDashboard />} />
                                            <Route path="teams" element={<MyTeams />} />
                                            <Route path="players" element={<Players />} />
                                            <Route path="trainings" element={<Trainings />} />
                                            <Route path="trainings/:trainingId/attendance" element={<TrainingAttendance />} />
                                            <Route path="matches" element={<Matches />} />
                                            <Route path="statistics" element={<Statistics />} />
                                            <Route path="injuries" element={<Injuries />} />
                                            <Route path="ai-analytics" element={<AIAnalytics />} />
                                            <Route path="development-plans" element={<DevelopmentPlans />} />
                                            <Route path="qr-checkin" element={<QRCheckIn />} />
                                            <Route path="*" element={<Navigate to="/coach/dashboard" replace />} />
                                        </Routes>
                                    </CoachRoute>
                                } 
                            />

                            <Route 
                                path="/player/*" 
                                element={
                                    <PlayerRoute>
                                        <Routes>
                                            <Route index element={<PlayerDashboard />} />
                                            <Route path="dashboard" element={<PlayerDashboard />} />
                                            <Route path="trainings" element={<Trainings />} />
                                            <Route path="matches" element={<Matches />} />
                                            <Route path="development-plans" element={<DevelopmentPlans />} />
                                            <Route path="qr-checkin" element={<QRCheckIn />} />
                                            <Route path="*" element={<Navigate to="/player/dashboard" replace />} />
                                        </Routes>
                                    </PlayerRoute>
                                } 
                            />

                            <Route 
                                path="/parent/*" 
                                element={
                                    <ParentRoute>
                                        <Routes>
                                            <Route index element={<ParentDashboard />} />
                                            <Route path="dashboard" element={<ParentDashboard />} />
                                            <Route path="matches" element={<Matches />} />
                                            <Route path="billing" element={<Billing />} />
                                            <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
                                        </Routes>
                                    </ParentRoute>
                                } 
                            />

                            {/* Shared protected routes */}
                            <Route 
                                path="/profile" 
                                element={
                                    <ProtectedRoute>
                                        <Profile />
                                    </ProtectedRoute>
                                } 
                            />

                            <Route 
                                path="/announcements" 
                                element={
                                    <ProtectedRoute>
                                        <Announcements />
                                    </ProtectedRoute>
                                } 
                            />

                            <Route 
                                path="/notifications" 
                                element={
                                    <ProtectedRoute>
                                        <NotificationSettings />
                                    </ProtectedRoute>
                                } 
                            />

                            {/* Legacy routes for backward compatibility */}
                            <Route 
                                path="/admin" 
                                element={<Navigate to="/admin/dashboard" replace />} 
                            />
                            <Route 
                                path="/my-teams" 
                                element={<Navigate to="/coach/teams" replace />} 
                            />
                            <Route 
                                path="/players" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <Players />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/teams" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <Teams />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/trainings" 
                                element={
                                    <ProtectedRoute>
                                        <Trainings />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/trainings/:trainingId/attendance" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <TrainingAttendance />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/statistics" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <Statistics />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/qr-checkin" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <QRCheckIn />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/ai-analytics" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <AIAnalytics />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/injuries" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach']}>
                                        <Injuries />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/matches" 
                                element={
                                    <ProtectedRoute>
                                        <Matches />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/development-plans" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'coach', 'player']}>
                                        <DevelopmentPlans />
                                    </ProtectedRoute>
                                } 
                            />
                            <Route 
                                path="/billing" 
                                element={
                                    <ProtectedRoute requireRoles={['admin', 'parent']}>
                                        <Billing />
                                    </ProtectedRoute>
                                } 
                            />

                            {/* 404 route */}
                            <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                    </main>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;