import React from 'react';
import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { getChartColors, formatTooltipValue, formatAxisLabel } from '../../utils/chartConfig';
import './Chart.css';

const AreaChart = ({
    data = [],
    areas = [],
    xAxisKey = 'name',
    width = '100%',
    height = 400,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    stackId = null,
    fillOpacity = 0.6,
    strokeWidth = 2,
    smooth = true,
    className = '',
    title = '',
    subtitle = '',
    loading = false,
    error = null,
    customTooltip = null,
    customLegend = null,
    margin = { top: 20, right: 30, left: 20, bottom: 60 },
    gradientId = 'colorGradient'
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
                    <span className="chart-empty-icon">📈</span>
                    <p>No data available for this chart</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = customTooltip || (({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <p className="chart-tooltip-label">{formatAxisLabel(label)}</p>
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

    // Create gradient definitions for areas
    const gradients = areas.map((area, index) => {
        const color = area.color || colors.primary[index % colors.primary.length];
        const id = `${gradientId}-${index}`;
        
        return (
            <defs key={id}>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
            </defs>
        );
    });

    return (
        <div className={`chart-container ${className}`}>
            {(title || subtitle) && (
                <div className="chart-header">
                    {title && <h3 className="chart-title">{title}</h3>}
                    {subtitle && <p className="chart-subtitle">{subtitle}</p>}
                </div>
            )}
            
            <div className="chart-wrapper">
                <ResponsiveContainer width={width} height={height}>
                    <RechartsAreaChart
                        data={data}
                        margin={margin}
                    >
                        {gradients}
                        
                        {showGrid && (
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={colors.grid}
                                opacity={0.3}
                            />
                        )}
                        
                        <XAxis
                            dataKey={xAxisKey}
                            stroke={colors.axis}
                            fontSize={12}
                            tickFormatter={formatAxisLabel}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        
                        <YAxis
                            stroke={colors.axis}
                            fontSize={12}
                            tickFormatter={(value) => formatTooltipValue(value)}
                        />
                        
                        {showTooltip && (
                            <Tooltip content={<CustomTooltip />} />
                        )}
                        
                        {showLegend && (
                            <Legend content={<CustomLegend />} />
                        )}
                        
                        {areas.map((area, index) => {
                            const color = area.color || colors.primary[index % colors.primary.length];
                            const gradientUrl = `url(#${gradientId}-${index})`;
                            
                            return (
                                <Area
                                    key={area.dataKey || index}
                                    type={smooth ? "monotone" : "linear"}
                                    dataKey={area.dataKey}
                                    stackId={area.stackId || stackId}
                                    stroke={color}
                                    strokeWidth={area.strokeWidth || strokeWidth}
                                    fill={area.useGradient !== false ? gradientUrl : color}
                                    fillOpacity={area.fillOpacity || fillOpacity}
                                    name={area.name || area.dataKey}
                                    connectNulls={false}
                                    dot={area.dot || false}
                                    activeDot={area.activeDot || { 
                                        r: 6, 
                                        fill: color,
                                        stroke: '#fff',
                                        strokeWidth: 2
                                    }}
                                />
                            );
                        })}
                    </RechartsAreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="chart-footer">
                <span className="chart-data-points">
                    {data.length} data points
                </span>
            </div>
        </div>
    );
};

export default AreaChart;