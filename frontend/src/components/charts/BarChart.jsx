import React from 'react';
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { getChartColors, formatTooltipValue, formatAxisLabel } from '../../utils/chartConfig';
import './Chart.css';

const BarChart = ({
    data = [],
    bars = [],
    xAxisKey = 'name',
    width = '100%',
    height = 400,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    layout = 'vertical', // 'vertical' or 'horizontal'
    stackId = null,
    className = '',
    title = '',
    subtitle = '',
    loading = false,
    error = null,
    customTooltip = null,
    customLegend = null,
    margin = { top: 20, right: 30, left: 20, bottom: 60 },
    barSize = null,
    maxBarSize = 50
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
                    <span className="chart-empty-icon">📊</span>
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
                    <RechartsBarChart
                        data={data}
                        margin={margin}
                        layout={layout}
                        barSize={barSize}
                        maxBarSize={maxBarSize}
                    >
                        {showGrid && (
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={colors.grid}
                                opacity={0.3}
                            />
                        )}
                        
                        <XAxis
                            dataKey={layout === 'vertical' ? xAxisKey : undefined}
                            type={layout === 'vertical' ? 'category' : 'number'}
                            stroke={colors.axis}
                            fontSize={12}
                            tickFormatter={formatAxisLabel}
                            angle={layout === 'vertical' ? -45 : 0}
                            textAnchor={layout === 'vertical' ? 'end' : 'middle'}
                            height={layout === 'vertical' ? 80 : 30}
                        />
                        
                        <YAxis
                            dataKey={layout === 'horizontal' ? xAxisKey : undefined}
                            type={layout === 'vertical' ? 'number' : 'category'}
                            stroke={colors.axis}
                            fontSize={12}
                            tickFormatter={(value) => 
                                layout === 'vertical' ? formatTooltipValue(value) : formatAxisLabel(value)
                            }
                            width={layout === 'horizontal' ? 80 : 60}
                        />
                        
                        {showTooltip && (
                            <Tooltip content={<CustomTooltip />} />
                        )}
                        
                        {showLegend && (
                            <Legend content={<CustomLegend />} />
                        )}
                        
                        {bars.map((bar, index) => (
                            <Bar
                                key={bar.dataKey || index}
                                dataKey={bar.dataKey}
                                fill={bar.color || colors.primary[index % colors.primary.length]}
                                name={bar.name || bar.dataKey}
                                stackId={bar.stackId || stackId}
                                radius={bar.radius || [2, 2, 0, 0]}
                                opacity={bar.opacity || 0.8}
                            />
                        ))}
                    </RechartsBarChart>
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

export default BarChart;