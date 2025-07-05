import React from 'react';
import {
    RadarChart as RechartsRadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import { getChartColors, formatTooltipValue } from '../../utils/chartConfig';
import './Chart.css';

const RadarChart = ({
    data = [],
    radars = [],
    width = '100%',
    height = 400,
    showGrid = true,
    showAngleAxis = true,
    showRadiusAxis = false,
    showTooltip = true,
    showLegend = true,
    fillOpacity = 0.3,
    strokeWidth = 2,
    dot = false,
    className = '',
    title = '',
    subtitle = '',
    loading = false,
    error = null,
    customTooltip = null,
    customLegend = null,
    margin = { top: 20, right: 30, left: 20, bottom: 20 },
    outerRadius = '80%',
    domain = [0, 100], // Default scale for skills (0-100)
    angleAxisDataKey = 'skill'
}) => {
    const colors = getChartColors();

    if (loading) {
        return (
            <div className={`chart-container chart-container--loading ${className}`}>
                <div className="chart-loading">
                    <div className="chart-loading-spinner"></div>
                    <p>Loading chart data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`chart-container chart-container--error ${className}`}>
                <div className="chart-error">
                    <span className="chart-error-icon">⚠️</span>
                    <p>Failed to load chart: {error}</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`chart-container chart-container--empty ${className}`}>
                <div className="chart-empty">
                    <span className="chart-empty-icon">🕷️</span>
                    <p>No data available for this chart</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = customTooltip || (({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <p className="chart-tooltip-label">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="chart-tooltip-value" style={{ color: entry.color }}>
                            {`${entry.name}: ${formatTooltipValue(entry.value, entry.dataKey)}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    });

    const CustomLegend = customLegend || (({ payload }) => (
        <div className="chart-legend">
            {payload.map((entry, index) => (
                <div key={index} className="chart-legend-item">
                    <span 
                        className="chart-legend-color" 
                        style={{ backgroundColor: entry.color }}
                    ></span>
                    <span className="chart-legend-text">{entry.value}</span>
                </div>
            ))}
        </div>
    ));

    // Format angle axis labels
    const formatAngleAxisLabel = (value) => {
        // Truncate long skill names for better display
        if (typeof value === 'string' && value.length > 12) {
            return value.substring(0, 12) + '...';
        }
        return value;
    };

    return (
        <div className={`chart-container chart-container--radar ${className}`}>
            {(title || subtitle) && (
                <div className="chart-header">
                    {title && <h3 className="chart-title">{title}</h3>}
                    {subtitle && <p className="chart-subtitle">{subtitle}</p>}
                </div>
            )}
            
            <div className="chart-wrapper">
                <ResponsiveContainer width={width} height={height}>
                    <RechartsRadarChart
                        data={data}
                        margin={margin}
                        outerRadius={outerRadius}
                    >
                        {showGrid && (
                            <PolarGrid
                                stroke={colors.grid}
                                opacity={0.3}
                            />
                        )}
                        
                        {showAngleAxis && (
                            <PolarAngleAxis
                                dataKey={angleAxisDataKey}
                                tick={{ fontSize: 12, fill: colors.axis }}
                                tickFormatter={formatAngleAxisLabel}
                            />
                        )}
                        
                        {showRadiusAxis && (
                            <PolarRadiusAxis
                                domain={domain}
                                tick={{ fontSize: 10, fill: colors.axis }}
                                tickFormatter={(value) => formatTooltipValue(value)}
                            />
                        )}
                        
                        {showTooltip && (
                            <Tooltip content={<CustomTooltip />} />
                        )}
                        
                        {showLegend && (
                            <Legend content={<CustomLegend />} />
                        )}
                        
                        {radars.map((radar, index) => (
                            <Radar
                                key={radar.dataKey || index}
                                name={radar.name || radar.dataKey}
                                dataKey={radar.dataKey}
                                stroke={radar.color || colors.primary[index % colors.primary.length]}
                                fill={radar.fillColor || radar.color || colors.primary[index % colors.primary.length]}
                                strokeWidth={radar.strokeWidth || strokeWidth}
                                fillOpacity={radar.fillOpacity || fillOpacity}
                                dot={radar.dot !== undefined ? radar.dot : dot}
                                connectNulls={false}
                            />
                        ))}
                    </RechartsRadarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="chart-footer">
                <span className="chart-data-points">
                    {data.length} skills assessed
                </span>
                <span className="chart-scale-info">
                    Scale: {domain[0]} - {domain[1]}
                </span>
            </div>
        </div>
    );
};

export default RadarChart;