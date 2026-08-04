/**
 * UserManager.tsx - 用户管理页面
 *
 * 使用 Ant Design Table 展示用户列表，支持搜索、查看详情 Modal、
 * 封禁/解封用户操作，并支持分页。
 */

import { useEffect, useState } from 'react'
import { Table, Button, Input, Modal, Tag, Descriptions, Space, App } from 'antd'
import { SearchOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { getUsers, getUserDetail, banUser } from '../api/admin'

/** 用户列表项数据结构 */
interface UserItem {
  id: number
  username: string
  email: string | null
  is_banned: boolean
  ban_reason: string | null
  created_at: string
  level: number
  xp: number
}

/** 用户详情数据结构（与列表项结构相同） */
interface UserDetail {
  id: number
  username: string
  email: string | null
  is_banned: boolean
  ban_reason: string | null
  created_at: string
  level: number
  xp: number
}

/** 用户管理页面组件 - 列表展示 + 搜索 + 详情 Modal + 封禁操作 */
export default function UserManager() {
  const { message } = App.useApp()
  const [users, setUsers] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserDetail | null>(null)
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [banTarget, setBanTarget] = useState<UserItem | null>(null)
  const [banReason, setBanReason] = useState('')

  /** 获取用户列表 */
  const fetchUsers = async (searchVal?: string, pg?: number, ps?: number) => {
    try {
      setLoading(true)
      const p = pg ?? page
      const s = ps ?? pageSize
      const res = await getUsers({ page: p, page_size: s, search: searchVal })
      setUsers(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 页面初始化时加载用户列表
  useEffect(() => {
    fetchUsers()
  }, [])

  /** 搜索用户 */
  const handleSearch = (value: string) => {
    setSearch(value)
    fetchUsers(value)
  }

  /** 查看用户详情 */
  const handleViewDetail = async (id: number) => {
    try {
      const res = await getUserDetail(id)
      setCurrentUser(res)
      setDetailOpen(true)
    } catch {
      message.error('获取用户详情失败')
    }
  }

  /** 封禁/解封用户 */
  const handleBan = async () => {
    if (!banTarget) return
    try {
      await banUser(banTarget.id, !banTarget.is_banned, banReason)
      message.success(banTarget.is_banned ? '已解封' : '已封禁')
      setBanModalOpen(false)
      setBanReason('')
      fetchUsers(search)
    } catch {
      message.error('操作失败')
    }
  }

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '等级', dataIndex: 'level', key: 'level', width: 80 },
    { title: '经验值', dataIndex: 'xp', key: 'xp', width: 100 },
    {
      title: '状态',
      dataIndex: 'is_banned',
      key: 'is_banned',
      render: (banned: boolean) =>
        banned ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>,
    },
    { title: '注册时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: UserItem) => (
        <Space>
          <Button type="link" onClick={() => handleViewDetail(record.id)}>
            详情
          </Button>
          <Button
            type="link"
            danger={record.is_banned ? false : true}
            icon={record.is_banned ? <CheckCircleOutlined /> : <StopOutlined />}
            onClick={() => {
              setBanTarget(record)
              setBanReason('')
              setBanModalOpen(true)
            }}
          >
            {record.is_banned ? '解封' : '封禁'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 顶部栏 - 标题 + 搜索框 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>用户管理</h2>
        <Input.Search
          placeholder="搜索用户"
          allowClear
          onSearch={handleSearch}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
      </div>

      {/* 用户列表表格 */}
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
            fetchUsers(search, p, ps)
          },
        }}
      />

      {/* 用户详情 Modal */}
      <Modal
        title="用户详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {currentUser && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{currentUser.id}</Descriptions.Item>
            <Descriptions.Item label="用户名">{currentUser.username}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{currentUser.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="等级">{currentUser.level}</Descriptions.Item>
            <Descriptions.Item label="经验值">{currentUser.xp}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {currentUser.is_banned ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间" span={2}>
              {currentUser.created_at}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 封禁/解封确认 Modal */}
      <Modal
        title={banTarget?.is_banned ? '解封用户' : '封禁用户'}
        open={banModalOpen}
        onOk={handleBan}
        onCancel={() => setBanModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        {!banTarget?.is_banned && (
          <div style={{ marginBottom: 16 }}>
            <p>确定要封禁用户 <strong>{banTarget?.username}</strong> 吗？</p>
            <Input.TextArea
              rows={3}
              placeholder="封禁原因（可选）"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
        )}
        {banTarget?.is_banned && (
          <p>确定要解封用户 <strong>{banTarget?.username}</strong> 吗？</p>
        )}
      </Modal>
    </div>
  )
}
