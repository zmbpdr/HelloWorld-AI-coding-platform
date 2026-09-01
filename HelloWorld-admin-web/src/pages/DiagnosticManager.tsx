/**
 * DiagnosticManager.tsx - 诊断题管理页面
 *
 * 入门能力诊断题目管理：题目列表（分页 + 标签筛选）、
 * 新增/编辑（Modal 表单，含选项 JSON 与正确答案）、
 * 删除（软删除）、启用/停用切换。
 * 后端已就绪（app/routers/admin/diagnostic.py），此处为管理界面接入。
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Table, Button, Space, Input, Modal, Form, Tag, Switch,
  InputNumber, App, Popconfirm, Card, Typography, Tooltip,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getDiagnosticQuestions, getDiagnosticQuestion, createDiagnosticQuestion,
  updateDiagnosticQuestion, deleteDiagnosticQuestion, toggleDiagnosticQuestion,
} from '../api/admin'
import type { DiagnosticQuestionItem } from '../api/admin'

const { Title } = Typography
const { Search } = Input

/** 空表单初始值 */
const EMPTY_FORM = {
  question: '',
  options: '',
  answer: '',
  tag: '',
  order: 0,
  is_active: true,
}

/** 将 JSON 字符串安全解析为字符串数组 */
function parseOptions(value: string): string[] | null {
  if (!value || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export default function DiagnosticManager() {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [data, setData] = useState<DiagnosticQuestionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 筛选条件
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined)

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  /** 加载诊断题列表 */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDiagnosticQuestions({
        page,
        page_size: pageSize,
        tag: tagFilter,
      })
      setData(res.items || [])
      setTotal(res.total || 0)
    } catch {
      message.error('获取诊断题列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, tagFilter, message])

  useEffect(() => {
    loadData()
  }, [loadData])

  /** 打开新增弹窗 */
  const openCreate = () => {
    setEditingId(null)
    form.setFieldsValue(EMPTY_FORM)
    setModalOpen(true)
  }

  /** 打开编辑弹窗 */
  const openEdit = async (id: number) => {
    setEditingId(id)
    setDetailLoading(true)
    setModalOpen(true)
    try {
      const detail = await getDiagnosticQuestion(id)
      form.setFieldsValue({
        question: detail.question,
        options: JSON.stringify(detail.options || [], null, 2),
        answer: detail.answer,
        tag: detail.tag,
        order: detail.order,
        is_active: detail.is_active,
      })
    } catch {
      message.error('获取诊断题详情失败')
      setModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  /** 提交表单（新增/编辑） */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const optionsArr = parseOptions(values.options as string)
      if (optionsArr === null) {
        message.error('选项列表必须是合法的 JSON 数组，例如 ["A. 变量", "B. 循环"]')
        return
      }

      const payload: Record<string, unknown> = {
        question: values.question,
        options: optionsArr,
        answer: values.answer,
        tag: values.tag || '',
        order: values.order || 0,
        is_active: values.is_active ?? true,
      }

      setSaving(true)
      if (editingId) {
        await updateDiagnosticQuestion(editingId, payload)
        message.success('更新成功')
      } else {
        await createDiagnosticQuestion(payload)
        message.success('创建成功')
      }
      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { detail?: string } } }
      if (e?.errorFields) return // Ant Design 表单校验错误，内联提示已显示
      message.error(e?.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  /** 删除诊断题（软删除） */
  const handleDelete = async (id: number) => {
    try {
      await deleteDiagnosticQuestion(id)
      message.success('已删除（停用）')
      if (data.length === 1 && page > 1) setPage(page - 1)
      else loadData()
    } catch {
      message.error('删除失败')
    }
  }

  /** 启用/停用 */
  const handleToggle = async (id: number) => {
    try {
      await toggleDiagnosticQuestion(id)
      message.success('操作成功')
      loadData()
    } catch {
      message.error('操作失败')
    }
  }

  /** 表格列配置 */
  const columns: ColumnsType<DiagnosticQuestionItem> = [
    { title: 'ID', dataIndex: 'id', width: 60, sorter: (a, b) => a.id - b.id },
    {
      title: '题目',
      dataIndex: 'question',
      ellipsis: true,
      render: (q: string) => (
        <Tooltip title={q}>
          <span>{q}</span>
        </Tooltip>
      ),
    },
    {
      title: '知识点标签',
      dataIndex: 'tag',
      width: 140,
      render: (tag: string) => (tag ? <Tag color="blue">{tag}</Tag> : '-'),
    },
    { title: '排序', dataIndex: 'order', width: 80 },
    {
      title: '答案',
      dataIndex: 'answer',
      width: 80,
      render: (answer: string) => (answer ? <Tag color="green">{answer}</Tag> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 90,
      render: (active: boolean, record) => (
        <Switch
          size="small"
          checked={active}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={() => handleToggle(record.id)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record.id)}>
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除该诊断题？"
            description="删除后题目将停用，学生端不再显示。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>诊断题管理</Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增诊断题
          </Button>
        </Space>
      </div>

      {/* 筛选栏 */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Search
          allowClear
          placeholder="按知识点标签筛选"
          style={{ width: 240 }}
          onSearch={(v) => { setPage(1); setTagFilter(v || undefined) }}
        />
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          学生端仅展示启用状态题目（按排序序号），停用题不参与诊断。
        </span>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 题`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑诊断题' : '新增诊断题'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        loading={detailLoading}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item name="question" label="题目文本" rules={[{ required: true, message: '请输入题目文本' }]}>
            <Input.TextArea rows={2} placeholder="例如：以下哪一项属于 Python 的基本数据类型？" />
          </Form.Item>

          <Form.Item
            name="options"
            label="选项列表（JSON 数组）"
            rules={[{ required: true, message: '请输入选项列表' }]}
            tooltip='例如 ["A. 字符串", "B. 循环", "C. 函数", "D. 变量"]'
          >
            <Input.TextArea rows={4} placeholder='["A. ...", "B. ...", "C. ...", "D. ..."]' />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="answer" label="正确答案" rules={[{ required: true, message: '请输入正确答案' }]}>
              <Input maxLength={10} placeholder="如 A / B / C / D" />
            </Form.Item>
            <Form.Item name="tag" label="知识点标签">
              <Input maxLength={50} placeholder="如：数据类型" />
            </Form.Item>
            <Form.Item name="order" label="排序">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="数值越小越靠前" />
            </Form.Item>
            <Form.Item name="is_active" label="启用" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  )
}
