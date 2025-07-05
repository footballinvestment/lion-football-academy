import axios from 'axios';

// Base URL configuration - updated to port 5001  
const BASE_URL = 'http://localhost:5001/api';

// Create axios instance with default configuration
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Token refresh function
const refreshAuthToken = async () => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken
        });
        
        const { token, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('token', token);
        if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        return token;
    } catch (error) {
        // Clear tokens if refresh fails
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Redirect to login
        window.location.href = '/login';
        throw error;
    }
};

// Request interceptor for adding auth token and logging
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp for retry logic
        config.metadata = { startTime: new Date() };
        
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
    (response) => {
        const endTime = new Date();
        const duration = endTime - response.config.metadata.startTime;
        console.log(`✅ API Response: ${response.status} ${response.config.url} (${duration}ms)`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        console.error('❌ API Response Error:', error.response?.status, error.response?.data || error.message);
        
        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const newToken = await refreshAuthToken();
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('🔄 Token refresh failed:', refreshError);
                return Promise.reject(error);
            }
        }
        
        // Handle specific error cases
        if (error.response?.status === 404) {
            console.warn('🔍 Resource not found');
        } else if (error.response?.status === 400) {
            console.warn('⚠️ Validation error:', error.response.data);
        } else if (error.response?.status === 403) {
            console.warn('🚫 Access forbidden');
        } else if (error.response?.status >= 500) {
            console.error('🚨 Server error');
        }
        
        // Retry logic for network errors
        if (!error.response && !originalRequest._retry) {
            originalRequest._retry = true;
            console.log('🔄 Retrying request due to network error...');
            
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return api(originalRequest);
        }
        
        return Promise.reject(error);
    }
);

// ============================================================================
// PLAYERS API
// ============================================================================

export const playersAPI = {
    // Get all players
    getAll: () => api.get('/players'),
    
    // Get player by ID
    getById: (id) => api.get(`/players/${id}`),
    
    // Create new player
    create: (playerData) => api.post('/players', playerData),
    
    // Update player
    update: (id, playerData) => api.put(`/players/${id}`, playerData),
    
    // Delete player
    delete: (id) => api.delete(`/players/${id}`),
    
    // Get players by team
    getByTeam: (teamId) => api.get(`/players/team/${teamId}`),
    
    // Get player age
    getAge: (id) => api.get(`/players/${id}/age`),
    
    // Parent assignment
    assignParent: (playerId, parentId) => api.put(`/players/${playerId}/assign-parent`, { parentId }),
    
    // Remove parent connection
    removeParent: (playerId) => api.delete(`/players/${playerId}/parent`),
    
    // Get available children (without parents)
    getAvailableChildren: () => api.get('/players/available-children')
};

// ============================================================================
// TEAMS API
// ============================================================================

export const teamsAPI = {
    // Get all teams
    getAll: () => api.get('/teams'),
    
    // Get team by ID
    getById: (id) => api.get(`/teams/${id}`),
    
    // Create new team
    create: (teamData) => api.post('/teams', teamData),
    
    // Update team
    update: (id, teamData) => api.put(`/teams/${id}`, teamData),
    
    // Delete team
    delete: (id) => api.delete(`/teams/${id}`),
    
    // Get team players
    getPlayers: (id) => api.get(`/teams/${id}/players`),
    
    // Add player to team
    addPlayer: (teamId, playerId) => api.post(`/teams/${teamId}/players/${playerId}`),
    
    // Remove player from team
    removePlayer: (teamId, playerId) => api.delete(`/teams/${teamId}/players/${playerId}`),
    
    // Coach assignment
    assignCoach: (teamId, coachId) => api.put(`/teams/${teamId}/assign-coach`, { coachId }),
    
    // Remove coach
    removeCoach: (teamId) => api.delete(`/teams/${teamId}/coach`),
    
    // Get team coach
    getCoach: (teamId) => api.get(`/teams/${teamId}/coach`),
    
    // Get available coaches
    getAvailableCoaches: () => api.get('/teams/available-coaches')
};

// ============================================================================
// TRAININGS API
// ============================================================================

export const trainingsAPI = {
    // Get all trainings with optional filters
    getAll: (params = {}) => api.get('/trainings', { params }),
    
    // Get upcoming trainings
    getUpcoming: (params = {}) => api.get('/trainings/upcoming', { params }),
    
    // Get training by ID
    getById: (id) => api.get(`/trainings/${id}`),
    
    // Create new training
    create: (trainingData) => api.post('/trainings', trainingData),
    
    // Update training
    update: (id, trainingData) => api.put(`/trainings/${id}`, trainingData),
    
    // Delete training
    delete: (id) => api.delete(`/trainings/${id}`),
    
    // Get trainings by team
    getByTeam: (teamId) => api.get(`/trainings/team/${teamId}`),
    
    // Record attendance
    recordAttendance: (id, attendanceData) => api.post(`/trainings/${id}/attendance`, { attendanceData }),
    
    // Get attendance for training
    getAttendance: (id) => api.get(`/trainings/${id}/attendance`)
};

// ============================================================================
// ANNOUNCEMENTS API
// ============================================================================

export const announcementsAPI = {
    // Get all announcements with optional filters
    getAll: (params = {}) => api.get('/announcements', { params }),
    
    // Get announcement categories
    getCategories: () => api.get('/announcements/categories'),
    
    // Get urgent announcements
    getUrgent: () => api.get('/announcements/urgent'),
    
    // Get announcement by ID
    getById: (id) => api.get(`/announcements/${id}`),
    
    // Create new announcement
    create: (announcementData) => api.post('/announcements', announcementData),
    
    // Update announcement
    update: (id, announcementData) => api.put(`/announcements/${id}`, announcementData),
    
    // Delete announcement
    delete: (id) => api.delete(`/announcements/${id}`),
    
    // Get announcements by team
    getByTeam: (teamId) => api.get(`/announcements/team/${teamId}`)
};

// ============================================================================
// STATISTICS API
// ============================================================================

export const statisticsAPI = {
    // Get dashboard statistics
    getDashboard: () => api.get('/statistics/dashboard'),
    
    // Get player attendance statistics
    getPlayerAttendance: () => api.get('/statistics/player-attendance'),
    
    // Get team performance statistics
    getTeamPerformance: () => api.get('/statistics/team-performance'),
    
    // Get training attendance statistics
    getTrainingAttendance: (trainingId) => api.get(`/statistics/training-attendance/${trainingId}`),
    
    // Get monthly attendance statistics
    getMonthlyAttendance: (params = {}) => api.get('/statistics/monthly-attendance', { params }),
    
    // Get top performers
    getTopPerformers: (params = {}) => api.get('/statistics/top-performers', { params })
};

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authAPI = {
    // Login
    login: (username, password) => {
        console.log('🔧 API Login Debug:', { username, password: password ? '[HIDDEN]' : 'NO PASSWORD' });
        return api.post('/auth/login', { email: username, password });
    },
    
    // Register
    register: (userData) => api.post('/auth/register', userData),
    
    // Logout
    logout: () => api.post('/auth/logout'),
    
    // Get current user profile
    getProfile: () => api.get('/auth/profile'),
    
    // Refresh access token
    refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    
    // Change password
    changePassword: (oldPassword, newPassword) => api.put('/auth/change-password', { oldPassword, newPassword }),
    
    // Verify token
    verify: () => api.get('/auth/verify')
};

// ============================================================================
// ADMIN API
// ============================================================================

export const adminAPI = {
    // Get all users
    getUsers: (params = {}) => api.get('/admin/users', { params }),
    
    // Get specific user
    getUser: (id) => api.get(`/admin/users/${id}`),
    
    // Create new user
    createUser: (userData) => api.post('/admin/users', userData),
    
    // Update user
    updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
    
    // Change user role
    changeUserRole: (id, roleData) => api.put(`/admin/users/${id}/role`, roleData),
    
    // Deactivate user
    deactivateUser: (id) => api.delete(`/admin/users/${id}`),
    
    // Reactivate user
    reactivateUser: (id) => api.put(`/admin/users/${id}/activate`),
    
    // Get admin statistics
    getStats: () => api.get('/admin/stats')
};

// ============================================================================
// PROFILE API
// ============================================================================

export const profileAPI = {
    // Get current user profile
    getProfile: () => api.get('/profile'),
    
    // Update current user profile
    updateProfile: (profileData) => api.put('/profile', profileData),
    
    // Change password
    changePassword: (passwordData) => api.put('/profile/password', passwordData),
    
    // Get role-specific dashboard data
    getDashboard: () => api.get('/profile/dashboard'),
    
    // Get user notifications
    getNotifications: () => api.get('/profile/notifications')
};

// ============================================================================
// COACHES API
// ============================================================================

export const coachesAPI = {
    // Get all coaches
    getAll: () => api.get('/coaches'),
    
    // Get coach teams
    getTeams: (coachId) => api.get(`/coaches/${coachId}/teams`),
    
    // Get coach players
    getPlayers: (coachId) => api.get(`/coaches/${coachId}/players`),
    
    // Get coach statistics
    getStatistics: (coachId) => api.get(`/coaches/${coachId}/statistics`)
};

// ============================================================================
// PARENTS API
// ============================================================================

export const parentsAPI = {
    // Get all parents
    getAll: () => api.get('/parents'),
    
    // Get parent's children
    getChildren: (parentId) => api.get(`/parents/${parentId}/children`),
    
    // Get parent statistics
    getStatistics: (parentId) => api.get(`/parents/${parentId}/statistics`)
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export const notificationsAPI = {
    // Get user notification preferences
    getPreferences: () => api.get('/notifications/preferences'),
    
    // Update user notification preferences
    updatePreferences: (preferences) => api.put('/notifications/preferences', preferences),
    
    // Test email functionality (admin only)
    testEmail: (email, template = 'welcome') => api.post('/notifications/test-email', { email, template }),
    
    // Trigger notifications manually (admin only)
    triggerNotification: (type) => api.post(`/notifications/trigger/${type}`),
    
    // Get notification statistics (admin only)
    getStats: () => api.get('/notifications/stats'),
    
    // Bulk opt-out users (admin only)
    bulkOptOut: (userIds, notificationType) => api.post('/notifications/bulk-opt-out', { 
        user_ids: userIds, 
        notification_type: notificationType 
    })
};

// ============================================================================
// INJURIES API
// ============================================================================

export const injuriesAPI = {
    // Get all injuries
    getAll: () => api.get('/injuries'),
    
    // Get active injuries only
    getActive: () => api.get('/injuries/active'),
    
    // Get injury statistics
    getStats: () => api.get('/injuries/stats'),
    
    // Get injury by ID
    getById: (id) => api.get(`/injuries/${id}`),
    
    // Get injuries by player
    getByPlayer: (playerId) => api.get(`/injuries/player/${playerId}`),
    
    // Create new injury record
    create: (injuryData) => api.post('/injuries', injuryData),
    
    // Update injury record
    update: (id, injuryData) => api.put(`/injuries/${id}`, injuryData),
    
    // Mark injury as recovered
    markRecovered: (id, recoveryData) => api.put(`/injuries/${id}/recover`, recoveryData),
    
    // Delete injury record (admin only)
    delete: (id) => api.delete(`/injuries/${id}`)
};

// ============================================================================
// MATCHES API
// ============================================================================

export const matchesAPI = {
    // Get all matches (role-filtered)
    getAll: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/matches?${queryParams}`);
    },
    
    // Get match by ID
    getById: (id) => api.get(`/matches/${id}`),
    
    // Get matches by team
    getByTeam: (teamId, filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/matches/team/${teamId}?${queryParams}`);
    },
    
    // Get match performance
    getPerformance: (matchId) => api.get(`/matches/${matchId}/performance`),
    
    // Get match events
    getEvents: (matchId) => api.get(`/matches/${matchId}/events`),
    
    // Get match statistics
    getStatistics: (matchId) => api.get(`/matches/${matchId}/statistics`),
    
    // Get top scorers
    getTopScorers: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/matches/statistics/top-scorers?${queryParams}`);
    },
    
    // Get team performance
    getTeamPerformance: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/matches/statistics/team-performance?${queryParams}`);
    },
    
    // Get match results
    getMatchResults: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/matches/statistics/match-results?${queryParams}`);
    },
    
    // Get player season performance
    getPlayerSeasonPerformance: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/matches/statistics/season-performance?${queryParams}`);
    },
    
    // Get player form
    getPlayerForm: (playerId, lastMatches = 5) => api.get(`/matches/player/${playerId}/form?last_matches=${lastMatches}`),
    
    // Get team form
    getTeamForm: (teamId, lastMatches = 5) => api.get(`/matches/team/${teamId}/form?last_matches=${lastMatches}`),
    
    // Create new match
    create: (matchData) => api.post('/matches', matchData),
    
    // Update match
    update: (id, matchData) => api.put(`/matches/${id}`, matchData),
    
    // Update match score
    updateScore: (id, scoreData) => api.put(`/matches/${id}/score`, scoreData),
    
    // Record player performance
    recordPerformance: (id, performanceData) => api.post(`/matches/${id}/performance`, performanceData),
    
    // Add match event
    addEvent: (id, eventData) => api.post(`/matches/${id}/events`, eventData),
    
    // Record team statistics
    recordTeamStats: (id, statsData) => api.post(`/matches/${id}/team-statistics`, statsData),
    
    // Delete match
    delete: (id) => api.delete(`/matches/${id}`)
};

// ============================================================================
// DEVELOPMENT PLANS API
// ============================================================================

export const developmentPlansAPI = {
    // Get all development plans (role-filtered)
    getAll: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/development-plans?${queryParams}`);
    },
    
    // Get development plan by ID
    getById: (id) => api.get(`/development-plans/${id}`),
    
    // Get development plans by player
    getByPlayer: (playerId) => api.get(`/development-plans/player/${playerId}`),
    
    // Get active development plans
    getActive: () => api.get('/development-plans/active'),
    
    // Get development plans for specific season
    getBySeason: (season) => api.get(`/development-plans/season/${season}`),
    
    // Get development plan statistics
    getStats: () => api.get('/development-plans/stats'),
    
    // Get team overview
    getTeamOverview: (teamId) => api.get(`/development-plans/team/${teamId}/overview`),
    
    // Create new development plan
    create: (planData) => api.post('/development-plans', planData),
    
    // Update development plan
    update: (id, planData) => api.put(`/development-plans/${id}`, planData),
    
    // Update progress
    updateProgress: (id, progressData) => api.put(`/development-plans/${id}/progress`, progressData),
    
    // Review development plan
    review: (id, reviewData) => api.put(`/development-plans/${id}/review`, reviewData),
    
    // Delete development plan
    delete: (id) => api.delete(`/development-plans/${id}`)
};

// ============================================================================
// BILLING API
// ============================================================================

export const billingAPI = {
    // Subscription Plans
    getPlans: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/billing/plans?${queryParams}`);
    },
    getPlan: (id) => api.get(`/billing/plans/${id}`),
    createPlan: (planData) => api.post('/billing/plans', planData),
    updatePlan: (id, planData) => api.put(`/billing/plans/${id}`, planData),
    
    // Student Subscriptions
    getSubscriptions: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/billing/subscriptions?${queryParams}`);
    },
    getSubscription: (id) => api.get(`/billing/subscriptions/${id}`),
    createSubscription: (subscriptionData) => api.post('/billing/subscriptions', subscriptionData),
    updateSubscription: (id, subscriptionData) => api.put(`/billing/subscriptions/${id}`, subscriptionData),
    
    // Invoices
    getInvoices: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/billing/invoices?${queryParams}`);
    },
    getInvoice: (id) => api.get(`/billing/invoices/${id}`),
    createInvoice: (invoiceData) => api.post('/billing/invoices', invoiceData),
    updateInvoiceStatus: (id, status) => api.put(`/billing/invoices/${id}/status`, { status }),
    
    // Payments
    getPayments: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/billing/payments?${queryParams}`);
    },
    recordPayment: (paymentData) => api.post('/billing/payments', paymentData),
    
    // Scholarships
    getScholarships: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/billing/scholarships?${queryParams}`);
    },
    createScholarship: (scholarshipData) => api.post('/billing/scholarships', scholarshipData),
    
    // Financial Reports
    getOutstandingInvoices: () => api.get('/billing/reports/outstanding'),
    getMonthlyRevenue: (year = null) => {
        const params = year ? `?year=${year}` : '';
        return api.get(`/billing/reports/revenue${params}`);
    },
    getStudentPaymentHistory: (playerId = null) => {
        const params = playerId ? `?player_id=${playerId}` : '';
        return api.get(`/billing/reports/students${params}`);
    },
    getFinancialSummary: () => api.get('/billing/reports/summary'),
    
    // Payment Reminders
    getOverdueInvoices: () => api.get('/billing/reminders/overdue'),
    createReminder: (reminderData) => api.post('/billing/reminders', reminderData)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Set auth token
const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token);
    }
};

// Clear auth token
const clearAuthToken = () => {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};

// Health check
export const healthCheck = () => api.get('/health');

// Test connection
export const testConnection = async () => {
    try {
        const response = await api.get('/test');
        console.log('🟢 API Connection successful:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('🔴 API Connection failed:', error.message);
        return { success: false, error: error.message };
    }
};

// ============================================================================
// EXPORT ALL APIS AS DEFAULT SERVICE
// ============================================================================

const apiService = {
    // Core API instance
    api,
    
    // Authentication
    auth: authAPI,
    
    // Admin functions
    admin: adminAPI,
    
    // Profile functions
    profile: profileAPI,
    
    // Resource APIs
    players: playersAPI,
    teams: teamsAPI,
    trainings: trainingsAPI,
    announcements: announcementsAPI,
    statistics: statisticsAPI,
    coaches: coachesAPI,
    parents: parentsAPI,
    notifications: notificationsAPI,
    injuries: injuriesAPI,
    matches: matchesAPI,
    developmentPlans: developmentPlansAPI,
    billing: billingAPI,
    
    // Utility functions
    healthCheck,
    testConnection,
    setAuthToken,
    clearAuthToken
};

export default apiService;