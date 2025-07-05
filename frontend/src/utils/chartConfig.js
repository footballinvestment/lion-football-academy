// Chart Configuration Utilities for Lion Football Academy Analytics

// Color Schemes
export const getChartColors = () => ({
    // Primary color palette
    primary: [
        '#2c5530', // Lion Green
        '#8B5A3C', // Lion Brown  
        '#F4D03F', // Lion Gold
        '#3498DB', // Blue
        '#E74C3C', // Red
        '#9B59B6', // Purple
        '#1ABC9C', // Teal
        '#F39C12', // Orange
        '#34495E', // Dark Blue
        '#16A085'  // Dark Teal
    ],
    
    // Secondary colors for gradients and highlights
    secondary: [
        '#4A7C59', // Light Lion Green
        '#A67C52', // Light Lion Brown
        '#F7DC6F', // Light Lion Gold
        '#5DADE2', // Light Blue
        '#EC7063', // Light Red
        '#BB8FCE', // Light Purple
        '#48C9B0', // Light Teal
        '#F8C471', // Light Orange
        '#5D6D7E', // Light Dark Blue
        '#45B7D1'  // Light Dark Teal
    ],
    
    // Status colors
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
    
    // UI colors
    grid: '#E5E7EB',
    axis: '#6B7280',
    background: '#FFFFFF',
    text: '#1F2937'
});

// Performance grade colors
export const getPerformanceColors = () => ({
    excellent: '#27AE60',  // Green
    good: '#F39C12',       // Orange
    average: '#3498DB',    // Blue
    poor: '#E74C3C',       // Red
    undefined: '#95A5A6'   // Gray
});

// Position-specific colors
export const getPositionColors = () => ({
    goalkeeper: '#E74C3C',    // Red
    defender: '#3498DB',      // Blue
    midfielder: '#F39C12',    // Orange
    forward: '#27AE60',       // Green
    substitute: '#95A5A6'     // Gray
});

// Age group colors
export const getAgeGroupColors = () => ({
    'U8': '#FF6B6B',
    'U10': '#4ECDC4',
    'U12': '#45B7D1',
    'U14': '#96CEB4',
    'U16': '#FFEAA7',
    'U18': '#DDA0DD',
    'Senior': '#2c5530'
});

// Formatting utilities
export const formatTooltipValue = (value, dataKey = '') => {
    if (value === null || value === undefined) return 'N/A';
    
    // Percentage values
    if (dataKey.toLowerCase().includes('percentage') || 
        dataKey.toLowerCase().includes('rate') ||
        dataKey.toLowerCase().includes('accuracy')) {
        return `${Number(value).toFixed(1)}%`;
    }
    
    // Time values (minutes)
    if (dataKey.toLowerCase().includes('minutes') || 
        dataKey.toLowerCase().includes('time')) {
        return `${Number(value).toFixed(0)}min`;
    }
    
    // Distance values
    if (dataKey.toLowerCase().includes('distance') || 
        dataKey.toLowerCase().includes('km')) {
        return `${Number(value).toFixed(1)}km`;
    }
    
    // Speed values
    if (dataKey.toLowerCase().includes('speed')) {
        return `${Number(value).toFixed(1)}km/h`;
    }
    
    // Rating values
    if (dataKey.toLowerCase().includes('rating') || 
        dataKey.toLowerCase().includes('score')) {
        return Number(value).toFixed(1);
    }
    
    // Count values
    if (dataKey.toLowerCase().includes('goals') || 
        dataKey.toLowerCase().includes('assists') ||
        dataKey.toLowerCase().includes('passes') ||
        dataKey.toLowerCase().includes('shots') ||
        dataKey.toLowerCase().includes('saves') ||
        dataKey.toLowerCase().includes('count')) {
        return Number(value).toFixed(0);
    }
    
    // Default formatting
    if (typeof value === 'number') {
        // Round to appropriate decimal places
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        } else if (value >= 100) {
            return value.toFixed(0);
        } else if (value >= 10) {
            return value.toFixed(1);
        } else {
            return value.toFixed(2);
        }
    }
    
    return String(value);
};

export const formatAxisLabel = (value) => {
    if (!value) return '';
    
    // Date formatting
    if (value instanceof Date) {
        return value.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    // String formatting
    if (typeof value === 'string') {
        // Truncate long labels
        if (value.length > 10) {
            return value.substring(0, 10) + '...';
        }
        return value;
    }
    
    // Number formatting
    if (typeof value === 'number') {
        if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'K';
        }
        return value.toString();
    }
    
    return String(value);
};

// Chart configuration presets
export const getChartConfig = (type) => {
    const baseConfig = {
        margin: { top: 20, right: 30, left: 20, bottom: 60 },
        strokeWidth: 2,
        fillOpacity: 0.6,
        animationDuration: 800
    };
    
    const configs = {
        performance: {
            ...baseConfig,
            height: 400,
            showGrid: true,
            showLegend: true,
            smooth: true
        },
        
        comparison: {
            ...baseConfig,
            height: 350,
            layout: 'vertical',
            showGrid: true,
            maxBarSize: 40
        },
        
        distribution: {
            ...baseConfig,
            height: 300,
            innerRadius: 50,
            showPercentage: true,
            showLabels: false
        },
        
        skills: {
            ...baseConfig,
            height: 400,
            outerRadius: '70%',
            domain: [0, 100],
            fillOpacity: 0.3
        },
        
        trend: {
            ...baseConfig,
            height: 300,
            stackId: 'trend',
            fillOpacity: 0.4,
            smooth: true
        }
    };
    
    return configs[type] || baseConfig;
};

// Data transformation utilities
export const transformPlayerData = (rawData, type) => {
    if (!rawData || !Array.isArray(rawData)) return [];
    
    switch (type) {
        case 'performance':
            return rawData.map(item => ({
                name: item.date || item.match || item.period,
                goals: item.goals || 0,
                assists: item.assists || 0,
                rating: item.rating || 0,
                minutes: item.minutes_played || 0
            }));
            
        case 'skills':
            return rawData.map(skill => ({
                skill: skill.name,
                current: skill.current_level || 0,
                target: skill.target_level || 100,
                previous: skill.previous_level || 0
            }));
            
        case 'attendance':
            return rawData.map(item => ({
                name: item.period || item.month,
                attendance: item.attendance_rate || 0,
                training: item.training_attendance || 0,
                matches: item.match_attendance || 0
            }));
            
        case 'comparison':
            return rawData.map(item => ({
                name: item.player_name || item.name,
                value: item.value || item.score || 0,
                position: item.position,
                age: item.age
            }));
            
        default:
            return rawData;
    }
};

export const transformTeamData = (rawData, type) => {
    if (!rawData || !Array.isArray(rawData)) return [];
    
    switch (type) {
        case 'formation':
            return rawData.map(position => ({
                position: position.position_name,
                players: position.player_count || 0,
                avgRating: position.average_rating || 0
            }));
            
        case 'ageGroups':
            return rawData.map(group => ({
                name: group.age_group,
                value: group.player_count || 0,
                avgAge: group.average_age || 0
            }));
            
        case 'performance':
            return rawData.map(match => ({
                name: match.opponent || match.date,
                goalsFor: match.goals_for || 0,
                goalsAgainst: match.goals_against || 0,
                possession: match.possession_percentage || 0,
                passAccuracy: match.pass_accuracy || 0
            }));
            
        default:
            return rawData;
    }
};

// Statistical calculations
export const calculateStatistics = (data, field) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const values = data.map(item => Number(item[field] || 0)).filter(val => !isNaN(val));
    
    if (values.length === 0) {
        return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues.length % 2 === 0
        ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
        : sortedValues[Math.floor(sortedValues.length / 2)];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        min,
        max,
        stdDev: Number(stdDev.toFixed(2))
    };
};

// Performance grade calculation
export const calculatePerformanceGrade = (rating) => {
    if (rating >= 8.5) return 'excellent';
    if (rating >= 7.5) return 'good';
    if (rating >= 6.5) return 'average';
    return 'poor';
};

// Trend calculation
export const calculateTrend = (data, field, periods = 5) => {
    if (!data || data.length < 2) return 0;
    
    const recentData = data.slice(-periods);
    const values = recentData.map(item => Number(item[field] || 0));
    
    if (values.length < 2) return 0;
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    
    if (firstValue === 0) return lastValue > 0 ? 100 : 0;
    
    return ((lastValue - firstValue) / firstValue) * 100;
};

// Data aggregation utilities
export const aggregateByPeriod = (data, period = 'month') => {
    if (!data || !Array.isArray(data)) return [];
    
    const aggregated = {};
    
    data.forEach(item => {
        const date = new Date(item.date || item.created_at);
        let key;
        
        switch (period) {
            case 'week':
                const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
                key = weekStart.toISOString().split('T')[0];
                break;
            case 'month':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            case 'quarter':
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                key = `${date.getFullYear()}-Q${quarter}`;
                break;
            default:
                key = date.toISOString().split('T')[0];
        }
        
        if (!aggregated[key]) {
            aggregated[key] = { period: key, count: 0, values: [] };
        }
        
        aggregated[key].count++;
        aggregated[key].values.push(item);
    });
    
    return Object.values(aggregated).sort((a, b) => a.period.localeCompare(b.period));
};

// Export all utilities
export default {
    getChartColors,
    getPerformanceColors,
    getPositionColors,
    getAgeGroupColors,
    formatTooltipValue,
    formatAxisLabel,
    getChartConfig,
    transformPlayerData,
    transformTeamData,
    calculateStatistics,
    calculatePerformanceGrade,
    calculateTrend,
    aggregateByPeriod
};