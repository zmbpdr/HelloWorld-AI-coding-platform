/**
 * SubmissionAudit.tsx - 提交审核页面
 *
 * 提供提交记录的查询审计功能，支持按状态和用户名筛选，
 * 点击查看提交详情（含代码、输出、错误信息等），以 Drawer 形式展示。
 */

import { useState } from 'react'
import {
  Table, Select, Tag, Drawer, Descriptions, Typography, Space, App,
  Input, Button, Row, Col,
} from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { getSubmissions, getSubmissionDetail } from '../api/admin'

const { Text } = Typography

/** 提交记录列表项数据结构 */
interface SubmissionItem {
  id: number; user_id: number; username: string; lesson_id: number
  lesson_title: string; status: string; language: string; score: number; submitted_at: string
}

/** 提交记录详情数据结构（含代码和执行结果） */
interface SubmissionDetail extends SubmissionItem {
  code: string; stdout: string; stderr: string | null
  execution_time: number | null; memory_used: number | null
}

/** 提交状态筛选选项 */
const statusOpts = [
  { value: 'error', label: '错误' },
  { value: 'timeout', label: '超时' },
  { value: 'wrong', label: '未通过' },
  { value: 'accepted', label: '通过' },
]

/** 提交审核页面组件 */
export default function SubmissionAudit() {
  const { message } = App.useApp()
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // 筛选条件状态
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [usernameFilter, setUsernameFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 提交详情 Drawer 状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)

  /** 执行查询 - 至少选择一个筛选条件 */
  const doSearch = async (pg = 1, ps = pageSize) => {
    if (!statusFilter && !usernameFilter) {
      message.warning('请至少选择一个筛选条件')
      return
    }
    try {
      setLoading(true)
      setSearched(true)
      const params: any = { page: pg, page_size: ps }
      if (statusFilter) params.status = statusFilter
      if (usernameFilter) params.search = usernameFilter
      const res = await getSubmissions(params)
      setSubmissions(res.items ?? [])
      setTotal(res.total ?? 0)
      setPage(pg)
      setPageSize(ps)
    } catch {
      message.error('查询失败')
    } finally {
      setLoading(false)
    }
  }

  /** 重置筛选条件 */
  const handleReset = () => {
    setStatusFilter(undefined)
    setUsernameFilter('')
    setSubmissions([])
    setTotal(0)
    setSearched(false)
    setPage(1)
  }

  /** 查看提交详情 */
  const handleViewDetail = async (id: number) => {
    try {
      const res = await getSubmissionDetail(id)
      setDetail(res)
      setDrawerOpen(true)
    } catch { message.error('获取详情失败') }
  }

  /** 渲染提交状态标签 - 根据状态显示不同颜色和图标 */
  const renderStatus = (s: string) => {
    const map: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      accepted: { color: 'green', text: '通过', icon: <CheckCircleOutlined /> },
      wrong: { color: 'orange', text: '未通过', icon: <CloseCircleOutlined /> },
      error: { color: 'red', text: '错误', icon: <ExclamationCircleOutlined /> },
      timeout: { color: 'gold', text: '超时', icon: <ClockCircleOutlined /> },
    }
    const cfg = map[s]
    return cfg ? <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag> : <Tag>{s}</Tag>
  }

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户', dataIndex: 'username', key: 'username', width: 100 },
    { title: '关卡', dataIndex: 'lesson_title', key: 'lesson_title', ellipsis: true },
    { title: '语言', dataIndex: 'language', key: 'language', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 110, render: renderStatus },
    { title: '得分', dataIndex: 'score', key: 'score', width: 60 },
    { title: '提交时间', dataIndex: 'submitted_at', key: 'submitted_at', width: 150 },
    {
      title: '操作', key: 'action', width: 60,
      render: (_: unknown, r: SubmissionItem) => (
        <Button type="link" size="small" onClick={() => handleViewDetail(r.id)}>详情</Button>
      ),
    },
  ]

  return (
    <div>
      {/* 顶部操作栏 - 标题 + 重置/查询按钮 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#e2e8f0' }}>提交审计</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">重置</Button>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => doSearch()} size="small">查询</Button>
        </Space>
      </div>

      {/* 筛选条件区域 */}
      <div
        style={{
          marginBottom: 16, padding: '16px 20px', borderRadius: 12,
          background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginRight: 8 }}>状态:</Text>
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOpts}
            />
          </Col>
          <Col>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginRight: 8 }}>用户:</Text>
            <Input
              placeholder="输入用户名"
              style={{ width: 180 }}
              value={usernameFilter}
              onChange={e => setUsernameFilter(e.target.value)}
              onPressEnter={() => doSearch()}
            />
          </Col>
        </Row>
      </div>

      {/* 结果表格 - 未查询时显示引导提示 */}
      {!searched ? (
        <div
          style={{
            textAlign: 'center', padding: '80px 20px', borderRadius: 12,
            background: 'rgba(15,19,34,0.6)', border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <SearchOutlined style={{ fontSize: 40, color: '#334155', marginBottom: 16 }} />
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>提交审计查询工具</p>
          <p style={{ color: '#475569', fontSize: 13 }}>请选择状态或输入用户名后点击查询</p>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={submissions}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page, pageSize, total, showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, ps) => doSearch(p, ps),
          }}
          locale={{ emptyText: '暂无匹配的提交记录' }}
        />
      )}

      {/* 提交详情 Drawer */}
      <Drawer
        title={<Space><span style={{ color: '#e2e8f0' }}>提交详情</span>{detail && renderStatus(detail.status)}</Space>}
        size="large"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detail && (
          <div>
            {/* 基本信息描述列表 */}
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="用户">{detail.username}</Descriptions.Item>
              <Descriptions.Item label="关卡">{detail.lesson_title}</Descriptions.Item>
              <Descriptions.Item label="语言">{detail.language}</Descriptions.Item>
              <Descriptions.Item label="得分">{detail.score ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="执行时间">{detail.execution_time !== null ? `${detail.execution_time}ms` : '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>{detail.submitted_at}</Descriptions.Item>
            </Descriptions>

            {/* 提交代码内容 */}
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#cbd5e1' }}>提交代码：</Text>
            <pre style={{
              background: '#0f1322', color: '#cbd5e1', padding: 16, borderRadius: 10, overflow: 'auto',
              fontSize: 13, lineHeight: 1.6, maxHeight: 400, margin: '0 0 20px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>{detail.code}</pre>

            {/* 标准输出内容 */}
            {detail.stdout && (
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#22c55e', display: 'block', marginBottom: 8 }}>输出：</Text>
                <pre style={{
                  background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)',
                  color: '#86efac', padding: 12, borderRadius: 8, overflow: 'auto',
                  fontSize: 13, maxHeight: 200, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>{detail.stdout}</pre>
              </div>
            )}

            {/* 错误输出内容 */}
            {detail.stderr && (
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#ef4444', display: 'block', marginBottom: 8 }}>错误输出：</Text>
                <pre style={{
                  background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                  color: '#fca5a5', padding: 12, borderRadius: 8, overflow: 'auto',
                  fontSize: 13, maxHeight: 200, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>{detail.stderr}</pre>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
