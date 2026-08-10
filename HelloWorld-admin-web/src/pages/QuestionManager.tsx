/**
 * QuestionManager.tsx - 题库管理页面
 *
 * 题目列表（分页 + 语言/难度/题型筛选 + 关键词搜索）、
 * 新增/编辑题目（Modal 表单）、删除（确认弹窗）、发布/下架、批量导出。
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Button, Space, Select, Input, Modal, Form, Tag, Switch,
  InputNumber, App, Popconfirm, Card, Typography, Tooltip,
} from 'antd'
import {
  PlusOutlined, ImportOutlined, DownloadOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getQuestions, getQuestionDetail, createQuestion, updateQuestion,
  deleteQuestion, togglePublishQuestion, getLanguages, exportQuestions,
} from '../api/admin'
import type { QuestionListItem, QuestionDetail, LanguageItem } from '../api/admin'

const { Title } = Typography
const { Search } = Input

/** 题型选项 */
const QUESTION_TYPES = [
  { value: 'single_choice', label: '单选题' },
  { value: 'multiple_choice', label: '多选题' },
  { value: 'true_false', label: '判断题' },
  { value: 'fill_blank', label: '填空题' },
  { value: 'coding', label: '编程题' },
  { value: 'short_answer', label: '简答题' },
]

/** 难度选项 */
const DIFFICULTIES = [
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '进阶' },
  { value: 'advanced', label: '高级' },
]

/** 难度颜色映射 */
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'green',
  intermediate: 'orange',
  advanced: 'red',
}

/** 题型中文映射 */
const QUESTION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.value, t.label]),
)

/** 空表单初始值 */
const EMPTY_FORM = {
  language_id: 1,
  title: '',
  slug: '',
  difficulty: 'beginner',
  question_type: 'coding',
  description: '',
  content: '',
  options: '',
  answer: '',
  explanation: '',
  test_cases: '',
  starter_code: '',
  knowledge_tags: [],
  order: 0,
  is_active: true,
}

/** 将 JSON 字符串安全解析为数组 */
function parseJsonArray(value: string): unknown[] | null {
  if (!value || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** 将题目详情序列化为表单值 */
function detailToForm(detail: QuestionDetail) {
  return {
    ...detail,
    options: detail.options ? JSON.stringify(detail.options, null, 2) : '',
    test_cases: detail.test_cases ? JSON.stringify(detail.test_cases, null, 2) : '',
    knowledge_tags: detail.knowledge_tags || [],
  }
}

export default function QuestionManager() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [data, setData] = useState<QuestionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 筛选条件
  const [filters, setFilters] = useState<{
    language_id?: number
    difficulty?: string
    question_type?: string
    keyword?: string
  }>({})

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [languages, setLanguages] = useState<LanguageItem[]>([])
  const [exporting, setExporting] = useState(false)

  /** 加载语言列表 */
  const loadLanguages = useCallback(async () => {
    try {
      const res = await getLanguages()
      setLanguages(Array.isArray(res) ? res : [])
    } catch {
      setLanguages([])
    }
  }, [])

  /** 加载题目列表 */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getQuestions({
        page,
        page_size: pageSize,
        language_id: filters.language_id,
        difficulty: filters.difficulty,
        question_type: filters.question_type,
        keyword: filters.keyword,
      })
      setData(res.items || [])
      setTotal(res.total || 0)
    } catch {
      message.error('获取题库列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters, message])

  useEffect(() => {
    loadLanguages()
  }, [loadLanguages])

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
      const detail = await getQuestionDetail(id)
      form.setFieldsValue(detailToForm(detail))
    } catch {
      message.error('获取题目详情失败')
      setModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  /** 提交表单（新增/编辑） */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload: Record<string, unknown> = { ...values }

      // JSON 字段解析
      const optionsArr = parseJsonArray(values.options as string)
      const casesArr = parseJsonArray(values.test_cases as string)
      if (optionsArr === null) {
        message.error('选项列表必须是合法的 JSON 数组')
        return
      }
      if (casesArr === null) {
        message.error('测试用例必须是合法的 JSON 数组')
        return
      }
      payload.options = optionsArr
      payload.test_cases = casesArr
      if (values.knowledge_tags && (values.knowledge_tags as string[]).length === 0) {
        message.warning('请至少填写一个知识点标签')
        return
      }

      setSaving(true)
      if (editingId) {
        await updateQuestion(editingId, payload)
        message.success('更新成功')
      } else {
        await createQuestion(payload)
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

  /** 删除题目 */
  const handleDelete = async (id: number) => {
    try {
      await deleteQuestion(id)
      message.success('已删除')
      // 若当前页删空则回退一页
      if (data.length === 1 && page > 1) setPage(page - 1)
      else loadData()
    } catch {
      message.error('删除失败')
    }
  }

  /** 发布/下架 */
  const handleTogglePublish = async (id: number) => {
    try {
      await togglePublishQuestion(id)
      message.success('操作成功')
      loadData()
    } catch {
      message.error('操作失败')
    }
  }

  /** 导出 CSV */
  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportQuestions({
        language_id: filters.language_id,
        difficulty: filters.difficulty,
        question_type: filters.question_type,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `questions_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch {
      message.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  /** 表格列配置 */
  const columns: ColumnsType<QuestionListItem> = [
    { title: 'ID', dataIndex: 'id', width: 70, sorter: (a, b) => a.id - b.id },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: 'Slug', dataIndex: 'slug', ellipsis: true, width: 180 },
    {
      title: '语言',
      dataIndex: 'language_id',
      width: 90,
      render: (langId: number) => {
        const lang = languages.find((l) => l.id === langId)
        return lang ? lang.name : String(langId)
      },
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      width: 80,
      render: (difficulty: string) =>
        difficulty ? (
          <Tag color={DIFFICULTY_COLORS[difficulty] || 'default'}>
            {DIFFICULTIES.find((d) => d.value === difficulty)?.label || difficulty}
          </Tag>
        ) : '-',
    },
    {
      title: '题型',
      dataIndex: 'question_type',
      width: 90,
      render: (qt: string) => QUESTION_TYPE_LABELS[qt] || qt,
    },
    {
      title: '知识点',
      dataIndex: 'knowledge_tags',
      width: 220,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {(tags || []).slice(0, 4).map((tag) => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
          {(tags || []).length > 4 && <Tag>+{(tags || []).length - 4}</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (active: boolean, record) => (
        <Switch
          size="small"
          checked={active}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={() => handleTogglePublish(record.id)}
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
            title="确认删除该题目？"
            description="删除后可在列表中停用，不会物理删除数据。"
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
        <Title level={4} style={{ margin: 0 }}>题库管理</Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
            导出
          </Button>
          <Button icon={<ImportOutlined />} onClick={() => navigate('/questions/import')}>
            批量导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增题目
          </Button>
        </Space>
      </div>

      {/* 筛选栏 */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="按语言筛选"
          style={{ width: 140 }}
          value={filters.language_id}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, language_id: v })) }}
          options={languages.map((l) => ({ value: l.id, label: l.name }))}
        />
        <Select
          allowClear
          placeholder="按难度筛选"
          style={{ width: 120 }}
          value={filters.difficulty}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, difficulty: v })) }}
          options={DIFFICULTIES}
        />
        <Select
          allowClear
          placeholder="按题型筛选"
          style={{ width: 130 }}
          value={filters.question_type}
          onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, question_type: v })) }}
          options={QUESTION_TYPES}
        />
        <Search
          allowClear
          placeholder="搜索标题 / Slug"
          style={{ width: 220 }}
          onSearch={(v) => { setPage(1); setFilters((f) => ({ ...f, keyword: v || undefined })) }}
        />
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
        title={editingId ? '编辑题目' : '新增题目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        loading={detailLoading}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="题目标题" />
            </Form.Item>
            <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
              <Input placeholder="唯一标识，如 python-loop-01" />
            </Form.Item>
            <Form.Item name="language_id" label="编程语言" rules={[{ required: true }]}>
              <Select options={languages.map((l) => ({ value: l.id, label: l.name }))} placeholder="选择语言" />
            </Form.Item>
            <Form.Item name="question_type" label="题型" rules={[{ required: true }]}>
              <Select options={QUESTION_TYPES} />
            </Form.Item>
            <Form.Item name="difficulty" label="难度">
              <Select options={DIFFICULTIES} />
            </Form.Item>
            <Form.Item name="order" label="排序">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="题目描述 / 题干摘要" />
          </Form.Item>
          <Form.Item name="content" label="题目内容（Markdown）">
            <Input.TextArea rows={4} placeholder="完整题目内容，支持 Markdown 语法" />
          </Form.Item>

          <Form.Item name="options" label="选项列表（JSON 数组，选择题适用）" tooltip='例如 [{"key":"A","text":"选项一"},{"key":"B","text":"选项二"}]'>
            <Input.TextArea rows={3} placeholder='[{"key": "A", "text": "..."}]' />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="answer" label="正确答案">
              <Input.TextArea rows={2} placeholder="选择题填 key，编程题可留空" />
            </Form.Item>
            <Form.Item name="explanation" label="答案解析">
              <Input.TextArea rows={2} placeholder="解析说明" />
            </Form.Item>
          </div>

          <Form.Item name="test_cases" label="测试用例（JSON 数组，编程题适用）" tooltip='例如 [{"input": "1 2", "expected": "3"}]'>
            <Input.TextArea rows={4} placeholder='[{"input": "1 2", "expected": "3"}]' />
          </Form.Item>

          <Form.Item name="starter_code" label="初始代码模板">
            <Input.TextArea rows={4} placeholder="学员初始代码模板" />
          </Form.Item>

          <Form.Item name="knowledge_tags" label="知识点标签" rules={[{ required: true, message: '请至少填写一个知识点标签' }]}>
            <Select mode="tags" tokenSeparators={[',', '，']} placeholder="例如：循环、函数" />
          </Form.Item>

          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
