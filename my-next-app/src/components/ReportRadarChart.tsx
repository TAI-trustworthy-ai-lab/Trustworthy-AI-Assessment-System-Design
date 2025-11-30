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

// 註冊 Chart.js 所需的組件
ChartJS.register(
    RadialLinearScale, 
    PointElement, 
    LineElement, 
    Filler, 
    Tooltip, 
    Legend
);

import { TAI_INDICATOR_MAP_EN_ZH } from '@/config/constants';
interface ReportRadarChartProps {
    radarData: Record<string, number | string>;
}

export const ReportRadarChart: React.FC<ReportRadarChartProps> = ({ radarData }) => {
    const { t, i18n } = useTranslation();
    const allKeys = Object.keys(TAI_INDICATOR_MAP_EN_ZH);

    const labels = allKeys.map(key => {
        let baseLabel: string; 
        
        if (i18n.language !== "en") {
            baseLabel = TAI_INDICATOR_MAP_EN_ZH[key]; 
        } else {
            baseLabel = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        }

        const score = radarData[key];
        if (typeof score === 'string') {
            const naText = t('reportPage.common.notAvailable'); 
            return `${baseLabel} (${naText})`;
        }
        
        return baseLabel;
    });

    const dataValues = allKeys.map(key => {
        const score = radarData[key];
        return typeof score === 'number' ? score : null; 
    });

    const data = {
        labels: labels,
        datasets: [
            {
                data: dataValues,
                backgroundColor: 'rgba(109, 40, 217, 0.2)', // 紫色透明
                borderColor: 'rgba(109, 40, 217, 1)', // 紫色
                pointBackgroundColor: 'rgba(109, 40, 217, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(109, 40, 217, 1)',
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            r: {
                angleLines: {
                    display: true,
                    color: 'rgba(156, 163, 175, 0.3)', // 淺灰色線
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.3)',
                },
                pointLabels: {
                    font: {
                        size: 14,
                        weight: 'bold',
                    },
                    color: '#374151', // 深灰色字體
                },
                suggestedMin: 0,
                suggestedMax: 100, // 滿分 100
                ticks: {
                    stepSize: 20,
                    backdropColor: 'transparent',
                    color: '#6B7280', // 中灰色字體
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'point',
                intersect: true,

                callbacks: {
                    title: function(context: any) {
                        return t('reportPage.common.indicatorScore');
                    },
                    label: function(context: any) {
                        const axisLabel = context.label ?? context.chart.data.labels[context.dataIndex];

                        let value: number | null = null;
                        if (context.parsed && typeof context.parsed.r === 'number') {
                            value = context.parsed.r;
                        } else if (typeof context.raw === 'number') {
                            value = context.raw;
                        } else {
                            value = dataValues[context.dataIndex] as number | null;
                        }

                        if (value === null || value === undefined) {
                        return axisLabel + ': ' + t('common.notAvailable');
                        }
                        return axisLabel + ': ' + value.toFixed(2) + ' ';
                    }
                }
            }
        }
    };

    return (
    <div className="flex justify-center sm:h-96">
        <div className="max-w-sm w-full max-w-lg">
            <Radar data={data} options={options} />
        </div>
    </div>
    );

};
