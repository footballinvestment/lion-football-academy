import React from 'react';
import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import { getChartColors, formatTooltipValue } from '../../utils/chartConfig';
import './Chart.css';

const PieChart = ({
    data = [],
    dataKey = 'value',
    nameKey = 'name',
    width = '100%',
    height = 400,
    innerRadius = 0,
    outerRadius = '80%',
    showTooltip = true,
    showLegend = true,
    showLabels = true,
    showPercentage = true,
    showValue = false,
    startAngle = 90,
    endAngle = -270,
    className = '',
    title = '',
    subtitle = '',
    loading = false,
    error = null,
    customTooltip = null,
    customLegend = null,
    customLabel = null,
    colors = null,
    strokeWidth = 1,
    animationBegin = 0,
    animationDuration = 800
}) => {
    const defaultColors = getChartColors();
    const pieColors = colors || defaultColors.primary;

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
                    <span className="chart-empty-icon">🥧</span>
                    <p>No data available for this chart</p>
                </div>
            </div>
        );
    }

    // Calculate total for percentage calculations
    const total = data.reduce((sum, entry) => sum + (entry[dataKey] || 0), 0);

    const CustomTooltip = customTooltip || (({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = total > 0 ? ((data[dataKey] / total) * 100).toFixed(1) : 0;
            
            return (
                <div className="chart-tooltip">
                    <p className="chart-tooltip-label">{data[nameKey]}</p>
                    <p className="chart-tooltip-value" style={{ color: payload[0].color }}>
                        {formatTooltipValue(data[dataKey], dataKey)} ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    });

    const CustomLegend = customLegend || (({ payload }) => (
        <div className="chart-legend chart-legend--pie">
            {payload.map((entry, index) => {
                const percentage = total > 0 ? ((entry.payload[dataKey] / total) * 100).toFixed(1) : 0;
                return (
                    <div key={index} className="chart-legend-item chart-legend-item--pie">
                        <span 
                            className="chart-legend-color" 
                            style={{ backgroundColor: entry.color }}
                        ></span>
                        <span className="chart-legend-text">
                            {entry.value}
                            {showPercentage && (
                                <span className="chart-legend-percentage"> ({percentage}%)</span>
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    ));

    const renderLabel = customLabel || ((entry) => {
        if (!showLabels) return null;
        
        const percentage = total > 0 ? ((entry[dataKey] / total) * 100).toFixed(1) : 0;
        
        if (showPercentage && showValue) {
            return `${percentage}% (${formatTooltipValue(entry[dataKey])})`;
        } else if (showPercentage) {
            return `${percentage}%`;
        } else if (showValue) {
            return formatTooltipValue(entry[dataKey]);
        } else {
            return entry[nameKey];
        }
    });

    return (
        <div className={`chart-container ${className}`}>
            {(title || subtitle) && (
                <div className="chart-header">
                    {title && <h3 className="chart-title">{title}</h3>}
                    {subtitle && <p className="chart-subtitle">{subtitle}</p>}
                </div>
            )}
            
            <div className="chart-wrapper chart-wrapper--pie">
                <ResponsiveContainer width={width} height={height}>
                    <RechartsPieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={showLabels ? renderLabel : false}
                            outerRadius={outerRadius}
                            innerRadius={innerRadius}
                            fill="#8884d8"
                            dataKey={dataKey}
                            nameKey={nameKey}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            stroke="#fff"
                            strokeWidth={strokeWidth}
                            animationBegin={animationBegin}
                            animationDuration={animationDuration}
                        >
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color || pieColors[index % pieColors.length]}
                                />
                            ))}
                        </Pie>
                        
                        {showTooltip && (
                            <Tooltip content={<CustomTooltip />} />
                        )}
                        
                        {showLegend && (
                            <Legend 
                                content={<CustomLegend />}
                                verticalAlign="bottom"
                                height={36}
                            />
                        )}
                    </RechartsPieChart>
                </ResponsiveContainer>
                
                {/* Center value for donut charts */}
                {innerRadius > 0 && (
                    <div className="chart-center-value">
                        <div className="chart-center-total">
                            <span className="chart-center-number">{formatTooltipValue(total)}</span>
                            <span className="chart-center-label">Total</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="chart-footer">
                <span className="chart-data-points">
                    {data.length} segments
                </span>
            </div>
        </div>
    );
};

export default PieChart;