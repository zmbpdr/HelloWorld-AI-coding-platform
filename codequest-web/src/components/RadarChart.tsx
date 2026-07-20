import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'

// 注册 Chart.js 组件
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface RadarChartProps {
  scores: {
    correctness: number   // 正确性 0-100
    readability: number   // 可读性 0-100
    performance: number   // 性能 0-100
    robustness: number    // 健壮性 0-100
  }
}

export default function RadarChart({ scores }: RadarChartProps) {
  const data: ChartData<'radar'> = {
    labels: ['正确性', '可读性', '性能', '健壮性'],
    datasets: [
      {
        label: '代码评分',
        data: [
          scores.correctness,
          scores.readability,
          scores.performance,
          scores.robustness,
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  }

  const options = {
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#64748b',
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(0,0,0,0.06)',
        },
        angleLines: {
          color: 'rgba(0,0,0,0.06)',
        },
        pointLabels: {
          color: '#1e293b',
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
    },
    maintainAspectRatio: false,
  }

  return (
    <div style={{ width: '100%', height: '220px' }}>
      <Radar data={data} options={options} />
    </div>
  )
}