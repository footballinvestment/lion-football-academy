import React, { useState, useEffect } from 'react';
import { Card, Button, LoadingSpinner, Alert, Select, Input } from '../ui';
import { QRScanner } from './';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import './AttendanceManager.css';

const AttendanceManager = ({ 
    sessionId = null, 
    sessionType = 'training',
    className = '' 
}) => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('scan');
    const [location, setLocation] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        search: ''
    });

    useEffect(() => {
        loadSessions();
    }, []);

    useEffect(() => {
        if (sessionId) {
            const session = sessions.find(s => s.id === parseInt(sessionId));
            setSelectedSession(session);
            loadAttendance(sessionId, sessionType);
        }
    }, [sessionId, sessionType, sessions]);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/qr/sessions');
            setSessions(response.data.sessions || []);
        } catch (error) {
            console.error('Error loading sessions:', error);
            setError('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const loadAttendance = async (sessionId, type = 'training') => {
        if (!sessionId) return;

        try {
            setLoading(true);
            const response = await api.get(`/qr/attendance/${sessionId}?sessionType=${type}`);
            setAttendance(response.data);
        } catch (error) {
            console.error('Error loading attendance:', error);
            setError('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    const handleSessionChange = async (sessionId) => {
        if (!sessionId) {
            setSelectedSession(null);
            setAttendance([]);
            return;
        }

        const session = sessions.find(s => s.id === parseInt(sessionId));
        setSelectedSession(session);
        await loadAttendance(sessionId, session?.type || 'training');
    };

    const handleScanSuccess = (attendanceRecord, player) => {
        // Update attendance list
        setAttendance(prev => {
            const newAttendance = [...(prev.attendance || [])];
            const existingIndex = newAttendance.findIndex(a => a.player.id === player.id);
            
            if (existingIndex >= 0) {
                newAttendance[existingIndex] = {
                    ...newAttendance[existingIndex],
                    status: 'present',
                    checkInTime: attendanceRecord.checkInTime
                };
            } else {
                newAttendance.unshift({
                    id: attendanceRecord.id,
                    player,
                    status: 'present',
                    checkInTime: attendanceRecord.checkInTime,
                    location: attendanceRecord.location
                });
            }

            // Remove from absent list
            const newAbsent = (prev.absent || []).filter(p => p.id !== player.id);

            return {
                ...prev,
                attendance: newAttendance,
                absent: newAbsent,
                summary: {
                    ...prev.summary,
                    present: newAttendance.length,
                    absent: newAbsent.length,
                    total: newAttendance.length + newAbsent.length,
                    percentage: Math.round((newAttendance.length / (newAttendance.length + newAbsent.length)) * 100)
                }
            };
        });
    };

    const handleManualAttendance = async (playerId, status, notes = '') => {
        if (!selectedSession) return;

        try {
            await api.post('/qr/attendance/manual', {
                playerId,
                sessionId: selectedSession.id,
                sessionType: selectedSession.type,
                status,
                notes
            });

            // Reload attendance
            await loadAttendance(selectedSession.id, selectedSession.type);
        } catch (error) {
            console.error('Error updating manual attendance:', error);
            setError('Failed to update attendance');
        }
    };

    const filteredAttendance = attendance.attendance?.filter(record => {
        const matchesStatus = filters.status === 'all' || record.status === filters.status;
        const matchesSearch = !filters.search || 
            record.player.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            record.player.team.toLowerCase().includes(filters.search.toLowerCase());
        return matchesStatus && matchesSearch;
    }) || [];

    const filteredAbsent = attendance.absent?.filter(player => {
        const matchesSearch = !filters.search || 
            player.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            player.team.toLowerCase().includes(filters.search.toLowerCase());
        return matchesSearch;
    }) || [];

    const exportAttendance = () => {
        if (!selectedSession || !attendance.attendance) return;

        const csvContent = [
            ['Player Name', 'Team', 'Status', 'Check-in Time', 'Location', 'Scanner'].join(','),
            ...attendance.attendance.map(record => [
                record.player.name,
                record.player.team,
                record.status,
                new Date(record.checkInTime).toLocaleString(),
                record.location || '',
                record.scanner?.name || ''
            ].join(',')),
            ...attendance.absent.map(player => [
                player.name,
                player.team,
                'absent',
                '',
                '',
                ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance_${selectedSession.name}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`attendance-manager ${className}`}>
            <Card className="attendance-manager-header">
                <div className="header-content">
                    <h2>📊 Attendance Management</h2>
                    <p>Scan QR codes and manage attendance for training sessions and matches</p>
                </div>

                <div className="session-selector">
                    <label>Select Session:</label>
                    <Select
                        value={selectedSession?.id || ''}
                        onChange={(e) => handleSessionChange(e.target.value)}
                        placeholder="Choose a session..."
                    >
                        <option value="">Select a session</option>
                        {sessions.map(session => (
                            <option key={session.id} value={session.id}>
                                {session.name} - {new Date(session.date).toLocaleDateString()} ({session.type})
                            </option>
                        ))}
                    </Select>
                    <Button onClick={loadSessions} variant="ghost" size="sm">
                        🔄 Refresh
                    </Button>
                </div>

                {selectedSession && (
                    <div className="session-info">
                        <div className="session-details">
                            <h4>{selectedSession.name}</h4>
                            <p>
                                <span>📅 {new Date(selectedSession.date).toLocaleDateString()}</span>
                                <span>🏟️ {selectedSession.location}</span>
                                <span>👥 {selectedSession.team_name}</span>
                            </p>
                        </div>
                        {attendance.summary && (
                            <div className="attendance-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Present:</span>
                                    <span className="summary-value present">{attendance.summary.present}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Absent:</span>
                                    <span className="summary-value absent">{attendance.summary.absent}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Total:</span>
                                    <span className="summary-value total">{attendance.summary.total}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Rate:</span>
                                    <span className="summary-value percentage">{attendance.summary.percentage}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {selectedSession && (
                <>
                    <div className="attendance-tabs">
                        <button 
                            className={`tab ${activeTab === 'scan' ? 'active' : ''}`}
                            onClick={() => setActiveTab('scan')}
                        >
                            📱 QR Scanner
                        </button>
                        <button 
                            className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('attendance')}
                        >
                            📋 Attendance List
                        </button>
                        <button 
                            className={`tab ${activeTab === 'absent' ? 'active' : ''}`}
                            onClick={() => setActiveTab('absent')}
                        >
                            ❌ Absent Players
                        </button>
                    </div>

                    <div className="attendance-content">
                        {activeTab === 'scan' && (
                            <div className="scan-tab">
                                <Card className="location-input">
                                    <label>Scan Location (Optional):</label>
                                    <Input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Training Ground A, Main Hall..."
                                    />
                                </Card>
                                
                                <QRScanner
                                    sessionId={selectedSession.id}
                                    sessionType={selectedSession.type}
                                    location={location}
                                    onScanSuccess={handleScanSuccess}
                                    onScanError={(error) => setError(error.message)}
                                />
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="attendance-tab">
                                <Card className="attendance-controls">
                                    <div className="controls-row">
                                        <div className="filters">
                                            <Select
                                                value={filters.status}
                                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                            >
                                                <option value="all">All Status</option>
                                                <option value="present">Present</option>
                                                <option value="late">Late</option>
                                                <option value="excused">Excused</option>
                                            </Select>
                                            <Input
                                                type="search"
                                                placeholder="Search players..."
                                                value={filters.search}
                                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                            />
                                        </div>
                                        <Button onClick={exportAttendance} variant="outline" size="sm">
                                            📥 Export CSV
                                        </Button>
                                    </div>
                                </Card>

                                <Card className="attendance-list">
                                    {loading ? (
                                        <div className="loading-state">
                                            <LoadingSpinner />
                                            <p>Loading attendance...</p>
                                        </div>
                                    ) : filteredAttendance.length > 0 ? (
                                        <div className="attendance-records">
                                            {filteredAttendance.map(record => (
                                                <div key={record.id} className="attendance-record">
                                                    <div className="record-info">
                                                        <div className="player-details">
                                                            <h5>{record.player.name}</h5>
                                                            <p>{record.player.team}</p>
                                                        </div>
                                                        <div className="attendance-details">
                                                            <span className={`status ${record.status}`}>
                                                                {record.status}
                                                            </span>
                                                            <span className="check-in-time">
                                                                {new Date(record.checkInTime).toLocaleTimeString()}
                                                            </span>
                                                            {record.location && (
                                                                <span className="location">📍 {record.location}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="record-actions">
                                                        <Button
                                                            onClick={() => handleManualAttendance(record.player.id, 'late')}
                                                            variant="outline"
                                                            size="xs"
                                                        >
                                                            Mark Late
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleManualAttendance(record.player.id, 'excused')}
                                                            variant="outline"
                                                            size="xs"
                                                        >
                                                            Excuse
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <p>No attendance records found</p>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {activeTab === 'absent' && (
                            <div className="absent-tab">
                                <Card className="absent-list">
                                    {loading ? (
                                        <div className="loading-state">
                                            <LoadingSpinner />
                                            <p>Loading absent players...</p>
                                        </div>
                                    ) : filteredAbsent.length > 0 ? (
                                        <div className="absent-records">
                                            {filteredAbsent.map(player => (
                                                <div key={player.id} className="absent-record">
                                                    <div className="player-info">
                                                        <h5>{player.name}</h5>
                                                        <p>{player.team}</p>
                                                    </div>
                                                    <div className="absent-actions">
                                                        <Button
                                                            onClick={() => handleManualAttendance(player.id, 'present')}
                                                            variant="primary"
                                                            size="sm"
                                                        >
                                                            Mark Present
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleManualAttendance(player.id, 'excused')}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Mark Excused
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <p>🎉 All players are present!</p>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!selectedSession && !loading && (
                <Card className="no-session-state">
                    <div className="no-session-content">
                        <h3>📅 Select a Session</h3>
                        <p>Choose a training session or match from the dropdown above to start managing attendance.</p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AttendanceManager;