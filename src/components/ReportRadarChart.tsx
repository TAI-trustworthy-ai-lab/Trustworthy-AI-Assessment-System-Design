import React from 'react';
import { Radar } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    RadialLinearScale, 
    PointElement, 
    LineElement, 
    Filler, 
    Tooltip, 
    Legend,
    Chart as ChartType
} from 'chart.js';
import { useTranslation } from 'react-i18next';

// Register necessary Chart.js components
ChartJS.register(
    RadialLinearScale, 
    PointElement, 
    LineElement, 
    Filler, 
    Tooltip, 
    Legend
);

import { TAI_INDICATOR_MAP_EN_ZH } from '@/config/constants';

// Component props interface
interface ReportRadarChartProps {
    radarData: Record<string, number | string>; // Scores for each TAI indicator
}

// Radar Chart Component
export const ReportRadarChart: React.FC<ReportRadarChartProps> = ({ radarData }) => {
    const { t, i18n } = useTranslation();
    const allKeys = Object.keys(TAI_INDICATOR_MAP_EN_ZH); // All TAI keys (English)

    // Prepare chart labels (Indicator Name + N/A status)
    const labels = allKeys.map(key => {
        let baseLabel: string; 
        
        // Translate or capitalize label
        if (i18n.language !== "en") {
            baseLabel = TAI_INDICATOR_MAP_EN_ZH[key]; 
        } else {
            baseLabel = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        }

        // Append 'N/A' if score is a string (not available)
        const score = radarData[key];
        if (typeof score === 'string') {
            const naText = t('reportPage.common.notAvailable'); 
            return `${baseLabel} (${naText})`;
        }
        
        return baseLabel;
    });

    // Prepare chart data values (Scores 0-100, null if N/A)
    const dataValues = allKeys.map(key => {
        const score = radarData[key];
        return typeof score === 'number' ? score : null; 
    });

    // ChartJS Data structure
    const data = {
        labels: labels,
        datasets: [
            {
                data: dataValues,
                backgroundColor: 'rgba(109, 40, 217, 0.2)', // Fill color (purple transparent)
                borderColor: 'rgba(109, 40, 217, 1)',      // Line color (purple)
                pointBackgroundColor: 'rgba(109, 40, 217, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(109, 40, 217, 1)',
                borderWidth: 2,
            },
        ],
    };

    // ChartJS Options structure
    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            r: { // Radial scale configuration
                angleLines: {
                    display: true,
                    color: 'rgba(156, 163, 175, 0.3)', // Grid lines
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.3)', // Grid lines
                },
                pointLabels: {
                    font: {
                        size: 14,
                        weight: 'bold',
                    },
                    color: '#374151', // Label font color
                },
                suggestedMin: 0,
                suggestedMax: 100, // Max score of 100
                ticks: {
                    stepSize: 20, // Ticks every 20 points
                    backdropColor: 'transparent',
                    color: '#6B7280',
                },
            },
        },
        plugins: {
            legend: {
                display: false, // Hide dataset legend
            },
            tooltip: {
                mode: 'point',
                intersect: true,

                // Custom tooltip content
                callbacks: {
                    title: function(context: any) {
                        return t('reportPage.common.indicatorScore'); // Tooltip title
                    },
                    label: function(context: any) {
                        const axisLabel = context.label ?? context.chart.data.labels[context.dataIndex];

                        let value: number | null = null;
                        // Extract numeric value safely
                        if (context.parsed && typeof context.parsed.r === 'number') {
                            value = context.parsed.r;
                        } else if (typeof context.raw === 'number') {
                            value = context.raw;
                        } else {
                            value = dataValues[context.dataIndex] as number | null;
                        }

                        if (value === null || value === undefined) {
                            return axisLabel + ': ' + t('common.notAvailable'); // Handle N/A in tooltip
                        }
                        return axisLabel + ': ' + value.toFixed(2) + ' '; // Display score
                    }
                }
            }
        }
    };

    // Render the Radar Chart
    return (
        <div className="flex justify-center sm:h-96">
            <div className="max-w-sm w-full max-w-lg">
                <Radar data={data} options={options} />
            </div>
        </div>
    );
};