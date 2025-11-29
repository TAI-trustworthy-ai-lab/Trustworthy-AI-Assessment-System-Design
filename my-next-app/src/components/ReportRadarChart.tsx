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

// 從您的 ReportPage 複製過來的映射表
const CATEGORY_MAP: Record<string, string> = {
    "ACCURACY": "準確性",
    "RELIABILITY": "可靠性",
    "SAFETY": "安全性",
    "RESILIENCE": "韌性",
    "TRANSPARENCY": "透明性",
    "ACCOUNTABILITY": "當責性",
    "EXPLAINABILITY": "可解釋性",
    "AUTONOMY": "自主性",
    "PRIVACY": "隱私",
    "FAIRNESS": "公平性",
    "SECURITY": "資訊安全性",
};

interface ReportRadarChartProps {
    radarData: Record<string, number>;
}

export const ReportRadarChart: React.FC<ReportRadarChartProps> = ({ radarData }) => {
    const labels = Object.keys(CATEGORY_MAP).map(key => CATEGORY_MAP[key].split('（')[0]);
    
    // 獲取對應的數值，保持與標籤順序一致
    const dataValues = Object.keys(CATEGORY_MAP).map(key => radarData[key] || 0);

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