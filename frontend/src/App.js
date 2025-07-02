import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/mobile.css';
import './styles/navbar.css';
import { AuthProvider } from './context/AuthContext';
import ResponsiveNavbar from './components/ResponsiveNavbar';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import MyTeams from './components/MyTeams';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Trainings from './pages/Trainings';
import TrainingAttendance from './pages/TrainingAttendance';
import Announcements from './pages/Announcements';
import Statistics from './pages/Statistics';
import QRCheckIn from './pages/QRCheckIn';
import AIAnalytics from './pages/AIAnalytics';
import Injuries from './pages/Injuries';
import Matches from './pages/Matches';
import DevelopmentPlans from './pages/DevelopmentPlans';
import Billing from './pages/Billing';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ResponsiveNavbar />
          <div className="container mt-4">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute requireRoles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/my-teams" element={
                <ProtectedRoute requireRoles={['coach']}>
                  <MyTeams />
                </ProtectedRoute>
              } />
              
              <Route path="/players" element={
                <ProtectedRoute>
                  <Players />
                </ProtectedRoute>
              } />
              
              <Route path="/teams" element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              } />
              
              <Route path="/trainings" element={
                <ProtectedRoute>
                  <Trainings />
                </ProtectedRoute>
              } />
              
              <Route path="/trainings/:trainingId/attendance" element={
                <ProtectedRoute>
                  <TrainingAttendance />
                </ProtectedRoute>
              } />
              
              <Route path="/announcements" element={
                <ProtectedRoute>
                  <Announcements />
                </ProtectedRoute>
              } />
              
              <Route path="/statistics" element={
                <ProtectedRoute requireRoles={['admin', 'coach']}>
                  <Statistics />
                </ProtectedRoute>
              } />
              
              <Route path="/trainings/:trainingId/qr" element={
                <ProtectedRoute>
                  <QRCheckIn />
                </ProtectedRoute>
              } />
              
              <Route path="/qr-checkin" element={
                <ProtectedRoute requireRoles={['admin', 'coach']}>
                  <QRCheckIn />
                </ProtectedRoute>
              } />
              
              <Route path="/ai-analytics" element={
                <ProtectedRoute requireRoles={['admin', 'coach']}>
                  <AIAnalytics />
                </ProtectedRoute>
              } />
              
              <Route path="/injuries" element={
                <ProtectedRoute requireRoles={['admin', 'coach']}>
                  <Injuries />
                </ProtectedRoute>
              } />
              
              <Route path="/matches" element={
                <ProtectedRoute requireRoles={['admin', 'coach', 'parent', 'player']}>
                  <Matches />
                </ProtectedRoute>
              } />
              
              <Route path="/development-plans" element={
                <ProtectedRoute requireRoles={['admin', 'coach']}>
                  <DevelopmentPlans />
                </ProtectedRoute>
              } />
              
              <Route path="/billing" element={
                <ProtectedRoute requireRoles={['admin', 'coach', 'parent', 'player']}>
                  <Billing />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;