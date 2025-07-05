import React, { useState, useEffect } from 'react';
import { Card, Button, LoadingSpinner, Alert, Select, Input } from '../ui';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import './QRCodeHistory.css';

const QRCodeHistory = ({ 
    playerId = null, 
    showPlayerSelector = true,
    className = '' 
}) => {
    const { user } = useAuth();
    const [auditLog, setAuditLog] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState(playerId || user?.id);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        action: 'all',
        dateRange: '7days',
        search: ''
    });
    const [pagination, setPagination] = useState({
        limit: 20,
        offset: 0,
        hasMore: true
    });

    useEffect(() => {
        if (showPlayerSelector && (user?.role === 'admin' || user?.role === 'coach')) {
            loadPlayers();
        }
    }, [showPlayerSelector, user]);

    useEffect(() => {
        if (selectedPlayerId) {
            loadAuditLog();
        }
    }, [selectedPlayerId, filters, pagination.limit]);

    const loadPlayers = async () => {
        try {
            const response = await api.get('/players');
            setPlayers(response.data.players || []);
        } catch (error) {
            console.error('Error loading players:', error);
        }
    };

    const loadAuditLog = async (reset = true) => {
        if (!selectedPlayerId) return;

        try {
            setLoading(true);
            if (reset) {
                setError('');
            }

            const params = new URLSearchParams({
                limit: pagination.limit.toString()
            });

            if (!reset) {
                params.append('offset', pagination.offset.toString());
            }

            const response = await api.get(`/qr/audit/${selectedPlayerId}?${params}`);
            const newLog = response.data.auditLog || [];

            if (reset) {
                setAuditLog(newLog);
                setPagination(prev => ({ ...prev, offset: 0, hasMore: newLog.length === pagination.limit }));
            } else {
                setAuditLog(prev => [...prev, ...newLog]);
                setPagination(prev => ({ 
                    ...prev, 
                    offset: prev.offset + pagination.limit,
                    hasMore: newLog.length === pagination.limit 
                }));
            }
        } catch (error) {
            console.error('Error loading audit log:', error);
            setError('Failed to load QR code history');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && pagination.hasMore) {
            loadAuditLog(false);
        }
    };

    const handlePlayerChange = (playerId) => {
        setSelectedPlayerId(playerId);
        setPagination(prev => ({ ...prev, offset: 0 }));
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, offset: 0 }));
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'generate': return '🎫';
            case 'scan_success': return '✅';
            case 'scan_expired': return '⏰';
            case 'scan_invalid_signature': return '🔒';
            case 'scan_already_used': return '🔄';
            case 'scan_not_found': return '❓';
            case 'manual_attendance': return '✏️';
            default: return '📝';
        }
    };

    const getActionLabel = (action) => {
        switch (action) {
            case 'generate': return 'QR Generated';
            case 'scan_success': return 'Successful Scan';
            case 'scan_expired': return 'Expired QR Scan';
            case 'scan_invalid_signature': return 'Invalid Signature';
            case 'scan_already_used': return 'Already Used';
            case 'scan_not_found': return 'QR Not Found';
            case 'manual_attendance': return 'Manual Entry';
            default: return action;
        }
    };

    const getActionClass = (action) => {
        if (action === 'scan_success' || action === 'generate') return 'success';
        if (action.startsWith('scan_') && action !== 'scan_success') return 'error';
        if (action === 'manual_attendance') return 'manual';
        return 'default';
    };

    const filteredLog = auditLog.filter(entry => {
        const matchesAction = filters.action === 'all' || entry.action === filters.action;
        const matchesSearch = !filters.search || 
            entry.action.toLowerCase().includes(filters.search.toLowerCase()) ||
            JSON.stringify(entry.metadata).toLowerCase().includes(filters.search.toLowerCase());
        
        let matchesDate = true;
        if (filters.dateRange !== 'all') {
            const entryDate = new Date(entry.timestamp);
            const now = new Date();
            const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
            
            switch (filters.dateRange) {
                case '1day':
                    matchesDate = daysDiff <= 1;
                    break;
                case '7days':
                    matchesDate = daysDiff <= 7;
                    break;
                case '30days':
                    matchesDate = daysDiff <= 30;
                    break;
                default:
                    matchesDate = true;
            }
        }
        
        return matchesAction && matchesSearch && matchesDate;
    });

    const selectedPlayer = players.find(p => p.id === parseInt(selectedPlayerId));

    return (
        <div className={`qr-history ${className}`}>
            <Card className="qr-history-header">
                <div className="header-content">
                    <h3>📊 QR Code History</h3>
                    <p>View QR code generation and scanning activity</p>
                </div>

                {showPlayerSelector && players.length > 0 && (
                    <div className="player-selector">
                        <label>Select Player:</label>
                        <Select
                            value={selectedPlayerId || ''}
                            onChange={(e) => handlePlayerChange(e.target.value)}
                            placeholder="Choose a player..."
                        >
                            <option value="">Select a player</option>
                            {players.map(player => (
                                <option key={player.id} value={player.id}>
                                    {player.first_name} {player.last_name} - {player.team_name || 'No Team'}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}

                {selectedPlayer && (
                    <div className="selected-player-info">
                        <h4>{selectedPlayer.first_name} {selectedPlayer.last_name}</h4>
                        <p>{selectedPlayer.team_name || 'No Team Assigned'}</p>
                    </div>
                )}
            </Card>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {selectedPlayerId && (
                <>
                    <Card className="history-filters">
                        <div className="filters-row">
                            <div className="filter-group">
                                <label>Action:</label>
                                <Select
                                    value={filters.action}
                                    onChange={(e) => handleFilterChange('action', e.target.value)}
                                >
                                    <option value="all">All Actions</option>
                                    <option value="generate">QR Generated</option>
                                    <option value="scan_success">Successful Scans</option>
                                    <option value="scan_expired">Expired Scans</option>
                                    <option value="scan_invalid_signature">Invalid Signatures</option>
                                    <option value="manual_attendance">Manual Entries</option>
                                </Select>
                            </div>

                            <div className="filter-group">
                                <label>Date Range:</label>
                                <Select
                                    value={filters.dateRange}
                                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                                >
                                    <option value="1day">Last 24 Hours</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="all">All Time</option>
                                </Select>
                            </div>

                            <div className="filter-group">
                                <label>Search:</label>
                                <Input
                                    type="search"
                                    placeholder="Search activities..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="history-content">
                        {loading && filteredLog.length === 0 ? (
                            <div className="loading-state">
                                <LoadingSpinner size="large" />
                                <p>Loading QR code history...</p>
                            </div>
                        ) : filteredLog.length > 0 ? (
                            <div className="history-timeline">
                                {filteredLog.map(entry => (
                                    <div key={entry.id} className={`timeline-entry ${getActionClass(entry.action)}`}>
                                        <div className="timeline-marker">
                                            <span className="timeline-icon">
                                                {getActionIcon(entry.action)}
                                            </span>
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-header">
                                                <h5>{getActionLabel(entry.action)}</h5>
                                                <span className="timeline-time">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="timeline-details">
                                                {entry.sessionId && (
                                                    <p><strong>Session ID:</strong> {entry.sessionId}</p>
                                                )}
                                                {entry.metadata.session_type && (
                                                    <p><strong>Type:</strong> {entry.metadata.session_type}</p>
                                                )}
                                                {entry.metadata.scanner_id && (
                                                    <p><strong>Scanned by:</strong> User #{entry.metadata.scanner_id}</p>
                                                )}
                                                {entry.metadata.location && (
                                                    <p><strong>Location:</strong> {entry.metadata.location}</p>
                                                )}
                                                {entry.metadata.qr_id && (
                                                    <p><strong>QR ID:</strong> {entry.metadata.qr_id}</p>
                                                )}
                                                {entry.metadata.status && (
                                                    <p><strong>Status:</strong> {entry.metadata.status}</p>
                                                )}
                                                {entry.metadata.notes && (
                                                    <p><strong>Notes:</strong> {entry.metadata.notes}</p>
                                                )}
                                                {entry.ipAddress && (
                                                    <p className="metadata-detail">
                                                        <strong>IP:</strong> {entry.ipAddress}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {pagination.hasMore && (
                                    <div className="load-more-container">
                                        <Button 
                                            onClick={loadMore}
                                            variant="outline"
                                            disabled={loading}
                                        >
                                            {loading ? <LoadingSpinner size="xs" /> : 'Load More'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <h4>📭 No Activity Found</h4>
                                <p>
                                    {filters.action !== 'all' || filters.search || filters.dateRange !== '7days'
                                        ? 'No activities match your current filters.'
                                        : 'No QR code activity recorded for this player.'}
                                </p>
                                {(filters.action !== 'all' || filters.search || filters.dateRange !== '7days') && (
                                    <Button 
                                        onClick={() => {
                                            setFilters({ action: 'all', dateRange: '7days', search: '' });
                                            setPagination(prev => ({ ...prev, offset: 0 }));
                                        }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        )}
                    </Card>
                </>
            )}

            {!selectedPlayerId && (
                <Card className="no-player-state">
                    <div className="no-player-content">
                        <h4>👤 Select a Player</h4>
                        <p>Choose a player from the dropdown above to view their QR code history.</p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default QRCodeHistory;