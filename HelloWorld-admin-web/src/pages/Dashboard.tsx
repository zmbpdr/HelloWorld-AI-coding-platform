/**
 * Dashboard.tsx - 仪表盘页面
 *
 * 管理后台首页，展示今日核心指标（新增用户、活跃用户、提交数、通过率）、
 * 近7天趋势图和智能告警（异常提交）信息。
 */

import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, Collapse, Tag, Spin } from 'antd'
import {
  UserOutlined, FileTextOutlined, TrophyOutlined, RiseOutlined,
  WarningOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import TrendChart from '../components/TrendChart'
import { getDashboardStats, getSubmissions } from '../api/admin'

const { Title, Text } = Typography

/** 仪表盘统计数据接口 */
interface DashboardStats {
  today_new_users: number
  today_active_users: number
  today_submissions: number
  today_pass_rate: number
  total_users: number
  total_lessons_completed: number
  total_achievements: number
  total_submissions: number
}

/** 仪表盘页面组件 */
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  // 异常提交告警列表
  const [alerts, setAlerts] = useState<{ id: number; username: string; lesson_title: string; status: string; submitted_at: string }[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  // 获取仪表盘统计数据
  useEffect(() => {
    (async () => {
      try { setLoading(true); setStats(await getDashboardStats()) }
      catch { /* 接口失败时忽略，保持 UI 友好 */ }
      finally { setLoading(false) }
    })()
  }, [])

  // 获取异常提交（错误和超时）作为智能告警
  useEffect(() => {
    (async () => {
      setAlertsLoading(true)
      try {
        const [errRes, timeoutRes] = await Promise.all([
          getSubmissions({ page: 1, page_size: 3, status: 'error' }),
          getSubmissions({ page: 1, page_size: 3, status: 'timeout' }),
        ])
        setAlerts([
          ...(errRes.items ?? []).map((i: any) => ({ ...i, alertType: 'error' })),
          ...(timeoutRes.items ?? []).map((i: any) => ({ ...i, alertType: 'timeout' })),
        ])
      } catch { /* 接口失败时忽略 */ }
      finally { setAlertsLoading(false) }
    })()
  }, [])

  // 今日核心指标卡片配置
  const cards = [
    { title: '今日新增用户', value: stats?.today_new_users ?? 0, icon: <UserOutlined style={{ color: '#6366f1', fontSize: 20 }} />, color: '#6366f1' },
    { title: '今日活跃用户', value: stats?.today_active_users ?? 0, icon: <RiseOutlined style={{ color: '#22c55e', fontSize: 20 }} />, color: '#22c55e' },
    { title: '今日提交数', value: stats?.today_submissions ?? 0, icon: <FileTextOutlined style={{ color: '#f59e0b', fontSize: 20 }} />, color: '#f59e0b' },
    { title: '今日通过率', value: `${stats?.today_pass_rate ?? 0}%`, icon: <TrophyOutlined style={{ color: '#3b82f6', fontSize: 20 }} />, color: '#3b82f6' },
  ]

  /** 渲染提交状态标签 */
  const statusTag = (s: string) => {
    const map: Record<string, { color: string; text: string }> = {
      error: { color: 'red', text: '错误' },
      timeout: { color: 'gold', text: '超时' },
    }
    const cfg = map[s] ?? { color: 'default', text: s }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  return (
    <div>
      {/* 今日核心指标区域 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#6366f1' }} />
          <Title level={5} style={{ margin: 0, color: '#e2e8f0' }}>今日概览</Title>
        </div>
        <Row gutter={[16, 16]}>
          {cards.map((c, i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <Card
                loading={loading}
                className="card-lift"
                style={{
                  borderRadius: 14,
                  background: 'rgba(15,19,34,0.85)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${c.color}`,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {/* 左侧彩色装饰条 */}
                <div
                  style={{
                    position: 'absolute',
                    left: -1,
                    top: 16,
                    bottom: 16,
                    width: 3,
                    background: c.color,
                    borderRadius: '0 2px 2px 0',
                    opacity: 0.6,
                    pointerEvents: 'none',
                  }}
                />
                <Statistic
                  title={<Text style={{ color: '#94a3b8', fontSize: 13 }}>{c.title}</Text>}
                  value={c.value}
                  prefix={c.icon}
                  styles={{ content: { color: '#f1f5f9', fontSize: 28, fontWeight: 700 } }}
                />
                {/* 底部微光条 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 16,
                    right: 16,
                    height: 1,
                    background: `linear-gradient(90deg, ${c.color}33, transparent 80%)`,
                    pointerEvents: 'none',
                  }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 近7天趋势图卡片 */}
      <Card
        title={<Text style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>近 7 天趋势</Text>}
        className="card-lift"
        style={{
          marginBottom: 24,
          borderRadius: 14,
          background: 'rgba(15,19,34,0.85)',
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '4px 8px',
        }}
        bodyStyle={{ padding: '16px 20px 20px' }}
      >
        <TrendChart days={7} />
      </Card>

      {/* 智能告警区域 - 仅当有异常时显示 */}
      {alerts.length > 0 && (
        <Collapse
          ghost
          size="small"
          items={[{
            key: 'alerts',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningOutlined style={{ color: '#f59e0b' }} />
                <Text style={{ color: '#e2e8f0', fontWeight: 500 }}>智能告警</Text>
                <Tag color="red" style={{ marginLeft: 4 }}>{alerts.length}</Tag>
              </div>
            ),
            children: alertsLoading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', borderRadius: 8,
                      background: a.status === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                      border: `1px solid ${a.status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)'}`,
                    }}
                  >
                    {statusTag(a.status)}
                    <Text style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}>
                      <strong>{a.username}</strong> 在关卡「{a.lesson_title}」提交异常
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>{a.submitted_at}</Text>
                  </div>
                ))}
              </div>
            ),
            style: {
              background: 'rgba(15,19,34,0.85)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 14,
              marginBottom: 0,
            },
            className: 'card-lift',
          }]}
        />
      )}
    </div>
  )
}
