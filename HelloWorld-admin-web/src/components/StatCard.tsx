/**
 * StatCard.tsx - 统计卡片组件
 *
 * 通用的统计指标展示卡片，支持标题、数值、前缀图标、后缀单位、
 * 环比趋势（上升/下降百分比）以及加载状态。
 */

import { Card, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

/** 统计卡片属性接口 */
interface StatCardProps {
  title: string       // 指标名称
  value: number | string  // 指标数值
  prefix?: ReactNode  // 数值前缀（如图标）
  suffix?: string     // 数值后缀（如单位）
  trend?: number      // 环比趋势，正数表示上升，负数表示下降
  loading?: boolean   // 是否显示加载中状态
}

/** 统计卡片组件 - 显示指标名称、数值、趋势图标及百分比 */
export default function StatCard({ title, value, prefix, suffix, trend, loading }: StatCardProps) {
  return (
    <Card loading={loading} variant="borderless">
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        // 根据趋势正负设置数值颜色
        styles={{
          content: trend !== undefined
            ? { color: trend >= 0 ? '#3f8600' : '#cf1322' }
            : undefined,
        }}
      />
      {/* 趋势指标 - 上升/下降箭头 + 百分比 + 对比周期标签 */}
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
