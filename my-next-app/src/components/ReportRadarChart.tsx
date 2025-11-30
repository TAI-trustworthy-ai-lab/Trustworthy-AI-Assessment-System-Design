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
    const validKeys = Object.keys(TAI_INDICATOR_MAP_EN_ZH).filter(key => {
        const score = radarData[key];
        return typeof score === 'number';
    });

    const labels = validKeys.map(key => TAI_INDICATOR_MAP_EN_ZH[key]);
    
    // 獲取對應的數值，保持與標籤順序一致
    const dataValues = validKeys.map(key => radarData[key] as number);

    const data = {
        labels: labels,
        datasets: [
            {
                label: '指標分數',
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
                display: false, // 隱藏圖例
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.r !== null) {
                            label += context.parsed.r.toFixed(2) + ' 分';
                        }
                        return label;
                    }
                }
            }
        }
    };

    return (
    <div className="flex justify-center h-96">
        <div className="max-w-sm w-full max-w-lg">
            <Radar data={data} options={options} />
        </div>
    </div>
    );

};