/**
 * LessonManager.tsx - 课程管理页面
 *
 * 提供课程的列表展示、新增/编辑（通过抽屉表单）、删除、发布状态切换等功能。
 * 支持按语言、难度、发布状态进行客户端筛选。
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Drawer, Form, Input, Select, InputNumber, Switch, App, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons'
import { getLessons, createLesson, updateLesson, deleteLesson, togglePublishLesson } from '../api/admin'

/** 课程列表项数据结构 */
interface LessonItem {
  id: number
  title: string
  slug: string
  language_id: number
  language_name?: string
  difficulty: string
  is_active: boolean
  order: number
  knowledge_tags?: string[]
  estimated_minutes?: number | null
  prerequisites?: string[]
  created_at: string
}

/** 编程语言名称映射 */
const LANGUAGE_NAMES: Record<number, string> = {
  1: 'Python', 2: 'JavaScript', 3: 'Java', 4: 'C', 5: 'C++', 6: 'TypeScript',
}

/** 课程管理页面组件 */
export default function LessonManager() {
  const { message } = App.useApp()
  const [lessons, setLessons] = useState<LessonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  // 筛选条件状态
  const [filterLang, setFilterLang] = useState<number | undefined>(undefined)
  const [filterDifficulty, setFilterDifficulty] = useState<string | undefined>(undefined)
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined)

  /** 获取课程列表数据 */
  const fetchLessons = async () => {
    try {
      setLoading(true)
      const res = await getLessons()
      setLessons(res.items ?? [])
    } catch {
      message.error('获取课程列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 页面初始化时加载课程列表
  useEffect(() => {
    fetchLessons()
  }, [])

  /** 客户端筛选 - 根据语言、难度、发布状态过滤课程列表 */
  const filteredLessons = useMemo(() => {
    return lessons.filter((item) => {
      if (filterLang !== undefined && item.language_id !== filterLang) return false
      if (filterDifficulty && item.difficulty !== filterDifficulty) return false
      if (filterActive !== undefined && item.is_active !== filterActive) return false
      return true
    })
  }, [lessons, filterLang, filterDifficulty, filterActive])

  /** 打开新增课程抽屉 */
  const handleAdd = () => {
    setEditingLesson(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  /** 提交新增/编辑表单 */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingLesson) {
        await updateLesson(editingLesson.id, values)
        message.success('更新成功')
      } else {
        await createLesson(values)
        message.success('创建成功')
      }
      setDrawerOpen(false)
      fetchLessons()
    } catch (err: any) {
      if (err?.errorFields) return  // Ant Design 表单验证错误，内联提示已显示
      message.error('操作失败')
    }
  }

  /** 删除课程 */
  const handleDelete = async (id: number) => {
    try {
      await deleteLesson(id)
      message.success('删除成功')
      fetchLessons()
    } catch {
      message.error('删除失败')
    }
  }

  /** 切换课程发布/下架状态 */
  const handleTogglePublish = async (id: number) => {
    try {
      await togglePublishLesson(id)
      message.success('操作成功')
      fetchLessons()
    } catch {
      message.error('操作失败')
    }
  }

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '语言',
      dataIndex: 'language_id',
      key: 'language',
      width: 100,
      render: (id: number) => <Tag>{LANGUAGE_NAMES[id] ?? id}</Tag>,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (d: string) => {
        const colorMap: Record<string, string> = { beginner: 'green', intermediate: 'orange', advanced: 'red' }
        const labelMap: Record<string, string> = { beginner: '入门', intermediate: '进阶', advanced: '高级' }
        return <Tag color={colorMap[d] ?? 'default'}>{labelMap[d] ?? d}</Tag>
      },
    },
    {
      title: '发布状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean, record: LessonItem) => (
        <Switch
          checked={active}
          onChange={() => handleTogglePublish(record.id)}
          checkedChildren="已发布"
          unCheckedChildren="未发布"
        />
      ),
    },
    { title: '排序', dataIndex: 'order', key: 'order', width: 60 },
    {
      title: '标签', dataIndex: 'knowledge_tags', key: 'knowledge_tags',
      render: (tags: string[] = []) => <Space size={[0, 4]} wrap>{tags.map(tag => <Tag color="blue" key={tag}>{tag}</Tag>)}</Space>,
    },
    { title: '预估', dataIndex: 'estimated_minutes', key: 'estimated_minutes', width: 80, render: (minutes?: number) => minutes ? `${minutes} 分钟` : '—' },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: LessonItem) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/lessons/${record.id}/edit`)}>
            编辑详情
          </Button>
          <Popconfirm title="确定删除该课程？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>课程管理</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增课程</Button>
        </Space>
      </div>

      {/* 筛选条件栏 - 语言、难度、发布状态 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#64748b' }} />
        <Select
          placeholder="全部语言"
          allowClear
          style={{ width: 130 }}
          value={filterLang}
          onChange={setFilterLang}
        >
          {Object.entries(LANGUAGE_NAMES).map(([id, name]) => (
            <Select.Option key={id} value={Number(id)}>{name}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="全部难度"
          allowClear
          style={{ width: 120 }}
          value={filterDifficulty}
          onChange={setFilterDifficulty}
        >
          <Select.Option value="beginner">入门</Select.Option>
          <Select.Option value="intermediate">进阶</Select.Option>
          <Select.Option value="advanced">高级</Select.Option>
        </Select>
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 120 }}
          value={filterActive}
          onChange={setFilterActive}
        >
          <Select.Option value={true}>已发布</Select.Option>
          <Select.Option value={false}>未发布</Select.Option>
        </Select>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
          共 {filteredLessons.length} 条
        </span>
      </div>

      {/* 课程列表表格 */}
      <Table
        columns={columns}
        dataSource={filteredLessons}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />

      {/* 新增/编辑抽屉表单 */}
      <Drawer
        title={editingLesson ? '编辑课程' : '新增课程'}
        size="default"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Button type="primary" onClick={handleSubmit}>保存</Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="课程标题" />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
            <Input placeholder="course-slug" />
          </Form.Item>
          <Form.Item name="language_id" label="语言" rules={[{ required: true, message: '请选择语言' }]}>
            <Select placeholder="选择编程语言">
              {Object.entries(LANGUAGE_NAMES).map(([id, name]) => (
                <Select.Option key={id} value={Number(id)}>{name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
            <Select placeholder="选择难度">
              <Select.Option value="beginner">入门</Select.Option>
              <Select.Option value="intermediate">进阶</Select.Option>
              <Select.Option value="advanced">高级</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="order" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="knowledge_tags" label="知识点标签" rules={[{ required: true, message: '请至少填写一个标签' }]}>
            <Select mode="tags" tokenSeparators={[',', '，']} placeholder="例如：循环、函数" />
          </Form.Item>
          <Form.Item name="estimated_minutes" label="预估学习时间（分钟）" rules={[{ required: true, message: '请输入正整数分钟数' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="prerequisites" label="前置关卡 slug">
            <Select mode="tags" tokenSeparators={[',', '，']} placeholder="仅允许当前语言内的 slug" />
          </Form.Item>
          <Form.Item name="is_active" label="发布" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
