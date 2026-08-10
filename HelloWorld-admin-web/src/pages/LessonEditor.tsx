/**
 * LessonEditor.tsx - 课程编辑页面
 *
 * 用于新建或编辑单个关卡，支持填写标题、Slug、编程语言、难度、
 * 教学内容（Markdown）、初始代码、参考答案、测试用例（JSON）、
 * 知识点标签、前置关卡等字段。
 * 编辑模式下支持关联题库题目（多选，按语言/知识点筛选）。
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form, Input, Select, InputNumber, Switch, Button, Card, Space, App, Divider, Tag,
} from 'antd'
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons'
import {
  getLessonDetail, createLesson, updateLesson,
  getQuestions, getLessonQuestionIds, setLessonQuestions,
} from '../api/admin'
import MarkdownEditor from '../components/MarkdownEditor'

/** 关卡编辑页面组件 - 包含标题、Slug、语言、难度、内容、测试用例等表单 */
export default function LessonEditor() {
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEdit = !!id

  // 教程-题目关联
  const [linkedIds, setLinkedIds] = useState<number[]>([])
  const [questionOptions, setQuestionOptions] = useState<{ value: number; label: string }[]>([])
  const [searchingQuestions, setSearchingQuestions] = useState(false)

  /** 编辑模式时加载关卡详情并填充表单 */
  useEffect(() => {
    if (isEdit) {
      async function fetchLesson() {
        try {
          setLoading(true)
          const res = await getLessonDetail(Number(id))
          form.setFieldsValue(res)
        } catch {
          message.error('获取关卡详情失败')
        } finally {
          setLoading(false)
        }
      }
      fetchLesson()
    }
  }, [id, isEdit, form, message])

  /** 编辑模式时加载已关联题目 */
  useEffect(() => {
    if (!isEdit || !id) return
    async function fetchLinked() {
      try {
        const ids = await getLessonQuestionIds(Number(id))
        setLinkedIds(Array.isArray(ids) ? ids : [])
      } catch {
        // 后端关联接口不可用时静默降级
        setLinkedIds([])
      }
    }
    fetchLinked()
  }, [isEdit, id])

  /** 搜索可关联题目（按关键词 / 语言） */
  const searchQuestions = useCallback(async (keyword?: string, languageId?: number) => {
    setSearchingQuestions(true)
    try {
      const res = await getQuestions({
        page: 1,
        page_size: 50,
        keyword,
        language_id: languageId,
      })
      setQuestionOptions(
        (res.items || []).map((q) => ({
          value: q.id,
          label: `#${q.id} ${q.title}`,
        })),
      )
    } catch {
      setQuestionOptions([])
    } finally {
      setSearchingQuestions(false)
    }
  }, [])

  /** 加载初始可选项 */
  useEffect(() => {
    searchQuestions(undefined, undefined)
  }, [searchQuestions])

  /** 提交表单 — 编辑时调用更新接口，新建时调用创建接口 */
  const handleSubmit = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      if (isEdit) {
        await updateLesson(Number(id), values)
        message.success('更新成功')
      } else {
        await createLesson(values)
        message.success('创建成功')
      }
      // 保存教程-题目关联（仅编辑模式）
      if (isEdit && id) {
        try {
          await setLessonQuestions(Number(id), linkedIds)
        } catch {
          message.warning('关卡已保存，但关联题目保存失败')
        }
      }
      navigate('/lessons')
    } catch (err: any) {
      if (err?.errorFields) return  // Ant Design 表单验证错误，内联提示已显示
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* 顶部导航栏 - 返回按钮 + 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/lessons')}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>{isEdit ? '编辑关卡' : '新建关卡'}</h2>
      </div>

      <Card loading={loading}>
        <Form form={form} layout="vertical" style={{ maxWidth: 800 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="关卡标题" />
          </Form.Item>

          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入 Slug' }]}>
            <Input placeholder="lesson-slug" />
          </Form.Item>

          <Form.Item name="language_id" label="编程语言" rules={[{ required: true, message: '请选择语言' }]}>
            <Select placeholder="选择编程语言">
              <Select.Option value={1}>Python</Select.Option>
              <Select.Option value={2}>JavaScript</Select.Option>
              <Select.Option value={3}>Java</Select.Option>
              <Select.Option value={4}>C</Select.Option>
              <Select.Option value={5}>C++</Select.Option>
              <Select.Option value={6}>TypeScript</Select.Option>
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

          <Form.Item name="is_active" label="发布" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="关卡描述" />
          </Form.Item>

          <Form.Item name="content" label="教学内容">
            <MarkdownEditor height={450} />
          </Form.Item>

          <Form.Item name="starter_code" label="初始代码">
            <Input.TextArea rows={6} placeholder="学员初始代码模板" />
          </Form.Item>

          <Form.Item name="solution_code" label="参考答案">
            <Input.TextArea rows={6} placeholder="参考答案代码" />
          </Form.Item>

          <Form.Item name="test_cases" label="测试用例（JSON）">
            <Input.TextArea rows={6} placeholder='[{"input": "1 2", "expected": "3"}]' />
          </Form.Item>

          <Form.Item name="hint" label="提示">
            <Input.TextArea rows={3} placeholder="解题提示" />
          </Form.Item>

          <Form.Item name="knowledge_tags" label="知识点标签" rules={[{ required: true, message: '请至少填写一个知识点标签' }]}>
            <Select mode="tags" tokenSeparators={[',', '，']} placeholder="例如：循环、函数" />
          </Form.Item>

          <Form.Item name="estimated_minutes" label="预估学习时间（分钟）" rules={[{ required: true, message: '请输入正整数分钟数' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="prerequisites" label="前置关卡 slug">
            <Select mode="tags" tokenSeparators={[',', '，']} placeholder="仅允许当前语言内的 slug" />
          </Form.Item>

          {/* 教程-题目关联（仅编辑模式） */}
          {isEdit && (
            <>
              <Divider style={{ margin: '8px 0 20px' }} titlePlacement="start" plain>
                <Space size={6}>
                  <LinkOutlined /> 教程-题目关联
                </Space>
              </Divider>
              <Form.Item
                label={
                  <Space size={6}>
                    <span>关联题库题目</span>
                    <Tag color="blue">已选 {linkedIds.length} 题</Tag>
                  </Space>
                }
                tooltip="从题库中选择与本教程相关的题目，保存关卡时一并保存关联关系。"
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  filterOption={false}
                  loading={searchingQuestions}
                  value={linkedIds}
                  onChange={setLinkedIds}
                  onSearch={(kw) => {
                    const langId = form.getFieldValue('language_id') as number | undefined
                    searchQuestions(kw, langId)
                  }}
                  placeholder="搜索并选择要关联的题目（按标题/Slug 搜索）"
                  options={questionOptions}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                保存
              </Button>
              <Button onClick={() => navigate('/lessons')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
