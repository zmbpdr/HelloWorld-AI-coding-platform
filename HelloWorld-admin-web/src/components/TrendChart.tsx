import { useEffect, useState, useRef } from 'react'
import { Line } from '@ant-design/charts'
import { Spin, Empty, Result } from 'antd'
import { getDashboardChart } from '../api/admin'

interface ChartItem {
  date: string
  value: number
  type: string
}

export default function TrendChart({ days = 7 }: { days?: number }) {
  const [data, setData] = useState<ChartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const res = await getDashboardChart(days)
        if (cancelled) return
        const chartData: ChartItem[] = []
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        for (const item of items) {
          chartData.push({
            date: String(item.date).slice(5),
            value: Number(item.new_users ?? 0),
            type: '新增用户',
          })
          chartData.push({
            date: String(item.date).slice(5),
            value: Number(item.submissions ?? 0),
            type: '提交数',
          })
        }
        setData(chartData)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '获取趋势数据失败')
          setData([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [days])

  if (loading) {
    return (
      <div ref={containerRef} style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>加载趋势数据中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div ref={containerRef} style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result status="warning" title="数据加载失败" subTitle={error} />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div ref={containerRef} style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="暂无趋势数据" />
      </div>
    )
  }

  const config = {
    data,
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    height: 300,
    autoFit: true,
    // 平滑曲线：G2 v5 中 style.shape='smooth'，通过 shape 简写
    shape: 'smooth',
    style: { lineWidth: 2 },
    point: { sizeField: 3, shapeField: 'circle' },
    axis: {
      y: {
        title: false,
        labelFill: '#94a3b8',
        labelFontSize: 11,
        gridStroke: 'rgba(255,255,255,0.06)',
        gridLineWidth: 0.5,
      },
      x: {
        grid: false,
        labelFill: '#94a3b8',
        labelFontSize: 11,
      },
    },
    legend: {
      color: {
        position: 'top',
        itemMarker: 'smooth',
        labelFill: '#cbd5e1',
        labelFontSize: 12,
      },
    },
    tooltip: {
      title: (d: ChartItem) => d.date,
      items: [
        { channel: 'y', valueFormatter: (v: number) => String(Math.round(v)) },
      ],
    },
    theme: {
      category10: ['#6366f1', '#22c55e'],
      // 深色背景兼容：确保 view 透明 + 轴刻度文字可见
      view: {
        viewFill: 'transparent',
        plotFill: 'transparent',
        mainFill: 'transparent',
        contentFill: 'transparent',
      },
    },
  }

  return (
    <div ref={containerRef} style={{ minHeight: 300 }}>
      <Line {...config} />
    </div>
  )
}
