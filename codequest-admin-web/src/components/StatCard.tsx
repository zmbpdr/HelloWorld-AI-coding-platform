import { Card, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

// 统计卡片属性
interface StatCardProps {
  title: string
  value: number | string
  prefix?: ReactNode
  suffix?: string
  trend?: number // 正数表示上升，负数表示下降
  loading?: boolean
}

// 统计卡片组件 - 显示指标名称、数值、趋势图标
export default function StatCard({ title, value, prefix, suffix, trend, loading }: StatCardProps) {
  return (
    <Card loading={loading} variant="borderless">
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        styles={{
          content: trend !== undefined
            ? { color: trend >= 0 ? '#3f8600' : '#cf1322' }
            : undefined,
        }}
      />
      {trend !== undefined && (
        <div style={{ marginTop: 8, fontSize: 12, color: trend >= 0 ? '#3f8600' : '#cf1322' }}>
          {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          <span style={{ marginLeft: 4 }}>{Math.abs(trend)}%</span>
          <span style={{ marginLeft: 4, color: '#999' }}>较上周</span>
        </div>
      )}
    </Card>
  )
}
