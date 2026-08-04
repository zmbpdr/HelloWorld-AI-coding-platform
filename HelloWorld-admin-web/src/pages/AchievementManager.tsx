/**
 * AchievementManager.tsx - 成就管理页面
 *
 * 使用 Ant Design Table 展示成就列表，支持新增/编辑成就的 Modal 表单，
 * 包含名称、Slug、描述、图标、稀有度、条件类型/值、经验奖励等字段。
 */

import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Space, App } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { getAchievements, createAchievement, updateAchievement } from '../api/admin'

/** 成就列表项数据结构 - 字段名对齐后端 */
interface AchievementItem {
  id: number
  name: string
  slug: string
  description: string
  icon_url: string
  rarity: string
  condition_type: string
  condition_value: number
  xp_reward: number
}

/** 成就管理页面组件 - 列表展示 + 新增/编辑 Modal */
export default function AchievementManager() {
  const { message } = App.useApp()
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AchievementItem | null>(null)
  const [form] = Form.useForm()

  /** 获取成就列表 */
  const fetchAchievements = async () => {
    try {
      setLoading(true)
      const res = await getAchievements()
      setAchievements(res.items ?? res ?? [])
    } catch {
      message.error('获取成就列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 页面初始化时加载成就列表
  useEffect(() => {
    fetchAchievements()
  }, [])

  /** 打开新增成就弹窗 */
  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  /** 打开编辑成就弹窗 - 回填已有数据 */
  const handleEdit = (record: AchievementItem) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  /** 提交新增/编辑表单 */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingItem) {
        await updateAchievement(editingItem.id, values)
        message.success('更新成功')
      } else {
        await createAchievement(values)
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchAchievements()
    } catch (err: any) {
      if (err?.errorFields) return  // Ant Design 表单验证错误，内联提示已显示
      message.error('操作失败')
    }
  }

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '图标', dataIndex: 'icon_url', key: 'icon_url' },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      render: (r: string) => {
        const rarityConfig: Record<string, { color: string; text: string }> = {
          common: { color: 'default', text: '普通' },
          rare: { color: 'blue', text: '稀有' },
          epic: { color: 'purple', text: '史诗' },
          legendary: { color: 'gold', text: '传说' },
        }
        const cfg = rarityConfig[r] ?? { color: 'default', text: r }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    { title: '条件类型', dataIndex: 'condition_type', key: 'condition_type' },
    { title: '条件值', dataIndex: 'condition_value', key: 'condition_value', width: 80 },
    { title: '经验奖励', dataIndex: 'xp_reward', key: 'xp_reward', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: AchievementItem) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* 顶部栏 - 标题 + 新增按钮 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>成就管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增成就
        </Button>
      </div>

      {/* 成就列表表格 */}
      <Table
        columns={columns}
        dataSource={achievements}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 新增/编辑成就弹窗 */}
      <Modal
        title={editingItem ? '编辑成就' : '新增成就'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="成就名称" />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
            <Input placeholder="achievement-slug" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="成就描述" />
          </Form.Item>
          <Form.Item name="icon_url" label="图标">
            <Input placeholder="图标 URL 或 emoji" />
          </Form.Item>
          <Form.Item name="rarity" label="稀有度" rules={[{ required: true, message: '请选择稀有度' }]}>
            <Select placeholder="选择稀有度">
              <Select.Option value="common">普通</Select.Option>
              <Select.Option value="rare">稀有</Select.Option>
              <Select.Option value="epic">史诗</Select.Option>
              <Select.Option value="legendary">传说</Select.Option>
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="condition_type" label="条件类型" rules={[{ required: true, message: '请选择条件类型' }]}>
              <Select placeholder="选择条件类型" style={{ width: 200 }}>
                <Select.Option value="lessons_completed">完成关卡数</Select.Option>
                <Select.Option value="submissions_count">提交次数</Select.Option>
                <Select.Option value="streak_days">连续天数</Select.Option>
                <Select.Option value="perfect_score">满分次数</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="condition_value" label="条件值" rules={[{ required: true, message: '请输入条件值' }]}>
              <InputNumber min={1} style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Form.Item name="xp_reward" label="经验奖励">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
