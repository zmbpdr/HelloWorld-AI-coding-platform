/**
 * RagManager.tsx - RAG 检索管理页面
 *
 * 教师内容向量知识库的运维界面：
 * - 索引状态（已索引块数、集合、模型、存储路径）
 * - 全量索引 / 单篇索引 / 删除单篇索引
 * - 检索测试（关键词 + top_k + 标签过滤）
 * 后端 API 已就绪（app/routers/admin/rag.py）。
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Card, Descriptions, Button, Space, Select, Input, InputNumber, Tag, Table,
  App, Typography, Alert, Divider, Empty, Spin,
} from 'antd'
import {
  ReloadOutlined, ThunderboltOutlined, SearchOutlined,
  DeleteOutlined, FileSearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getRagStatus, ragIndexAll, ragIndexLesson, ragDeleteLesson, ragSearch,
  getLessons,
} from '../api/admin'
import type { RagStatus, RagSearchResult } from '../api/admin'

const { Title, Text } = Typography
const { Search } = Input

export default function RagManager() {
  const { message } = App.useApp()

  // 状态
  const [status, setStatus] = useState<RagStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  // 单篇索引
  const [lessons, setLessons] = useState<{ value: number; label: string }[]>([])
  const [selectedLesson, setSelectedLesson] = useState<number | undefined>(undefined)
  const [lessonLoading, setLessonLoading] = useState(false)

  // 检索测试
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined)
  const [results, setResults] = useState<RagSearchResult[]>([])

  /** 加载索引状态 */
  const loadStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const res = await getRagStatus()
      setStatus(res)
    } catch {
      setStatus(null)
      message.error('获取索引状态失败，请确认后端已安装 chromadb 依赖并启动')
    } finally {
      setStatusLoading(false)
    }
  }, [message])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  /** 加载课程列表（供单篇索引选择） */
  useEffect(() => {
    async function loadLessons() {
      setLessonLoading(true)
      try {
        const res = await getLessons({ page: 1, page_size: 100 })
        setLessons(
          (res.items || []).map((l: { id: number; title: string }) => ({
            value: l.id,
            label: `#${l.id} ${l.title}`,
          })),
        )
      } catch {
        setLessons([])
      } finally {
        setLessonLoading(false)
      }
    }
    loadLessons()
  }, [])

  /** 全量索引 */
  const handleIndexAll = async () => {
    try {
      await ragIndexAll()
      message.success('全量索引已在后台开始，请稍候刷新状态查看结果。首次索引需加载本地模型，耗时较长。', 6)
    } catch {
      message.error('全量索引启动失败')
    }
  }

  /** 单篇索引 */
  const handleIndexLesson = async () => {
    if (!selectedLesson) {
      message.warning('请先选择课程')
      return
    }
    try {
      const res = await ragIndexLesson(selectedLesson)
      message.success(res?.message || '索引完成')
      loadStatus()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      message.error(e?.response?.data?.detail || '索引失败')
    }
  }

  /** 删除单篇索引 */
  const handleDeleteLessonIndex = async () => {
    if (!selectedLesson) {
      message.warning('请先选择课程')
      return
    }
    try {
      await ragDeleteLesson(selectedLesson)
      message.success('索引已删除')
      loadStatus()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      message.error(e?.response?.data?.detail || '删除失败')
    }
  }

  /** 检索测试 */
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await ragSearch(keyword.trim(), topK, tagFilter)
      setResults(res.results || [])
      if (!res.results?.length) message.info('未检索到相关内容，可先执行全量索引')
    } catch {
      setResults([])
      message.error('检索失败')
    } finally {
      setSearching(false)
    }
  }

  /** 检索结果列配置 */
  const resultColumns: ColumnsType<RagSearchResult> = [
    {
      title: '得分',
      dataIndex: 'score',
      width: 90,
      render: (score: number) => (
        <Tag color={score >= 0.8 ? 'green' : score >= 0.5 ? 'orange' : 'red'}>{score.toFixed(4)}</Tag>
      ),
    },
    { title: '课程', dataIndex: 'lesson_title', ellipsis: true },
    { title: '语言', dataIndex: 'language', width: 110 },
    {
      title: '知识点',
      dataIndex: 'knowledge_tags',
      width: 180,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {(tags || []).slice(0, 3).map((tag) => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '内容片段',
      dataIndex: 'content',
      ellipsis: true,
      render: (content: string) => (
        <span style={{ color: '#64748b', fontSize: 13 }}>
          {content.length > 120 ? content.slice(0, 120) + '...' : content}
        </span>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      {/* 顶部标题 + 操作 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>RAG 检索管理</Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadStatus}>
            刷新状态
          </Button>
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleIndexAll}>
            全量索引
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message="基于教程内容的本地向量知识库"
        description="Embedding 使用本地模型（sentence-transformers），数据不出校。首次全量索引会下载约 90MB 模型，后台任务执行，完成后刷新状态查看结果。"
      />

      {/* 索引状态 */}
      <Card size="small" title="索引状态">
        <Spin spinning={statusLoading}>
          {status ? (
            <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
              <Descriptions.Item label="已索引块数">
                <Tag color={status.total_indexed > 0 ? 'green' : 'red'}>
                  {status.total_indexed}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="集合名称">{status.collection_name}</Descriptions.Item>
              <Descriptions.Item label="Embedding 模型">{status.embedding_model}</Descriptions.Item>
              <Descriptions.Item label="存储路径">{status.storage_path}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">无法读取索引状态，请确认后端服务与 chromadb 依赖可用。</Text>
          )}
        </Spin>
      </Card>

      {/* 单篇索引管理 */}
      <Card size="small" title="单篇课程索引管理">
        <Space wrap>
          <Select
            showSearch
            allowClear
            loading={lessonLoading}
            placeholder="选择课程"
            style={{ width: 320 }}
            value={selectedLesson}
            onChange={setSelectedLesson}
            optionFilterProp="label"
            options={lessons}
          />
          <Button icon={<FileSearchOutlined />} onClick={handleIndexLesson}>
            索引该篇
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDeleteLessonIndex}>
            删除该篇索引
          </Button>
        </Space>
      </Card>

      {/* 检索测试 */}
      <Card size="small" title="检索测试">
        <Space wrap style={{ marginBottom: 12 }}>
          <Search
            allowClear
            placeholder="输入检索关键词，如：循环嵌套"
            style={{ width: 320 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={handleSearch}
            loading={searching}
          />
          <span style={{ color: '#94a3b8', fontSize: 13 }}>top_k</span>
          <InputNumber min={1} max={20} value={topK} onChange={(v) => setTopK(v || 5)} style={{ width: 80 }} />
          <Input
            allowClear
            placeholder="标签过滤（可选）"
            style={{ width: 160 }}
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value || undefined)}
          />
          <Button icon={<SearchOutlined />} onClick={() => handleSearch(query)} loading={searching}>
            搜索
          </Button>
        </Space>

        <Divider style={{ margin: '12px 0' }} />

        {results.length > 0 ? (
          <Table
            rowKey={(r) => `${r.lesson_id}-${r.content.slice(0, 40)}`}
            columns={resultColumns}
            dataSource={results}
            size="small"
            pagination={false}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无检索结果" />
        )}
      </Card>
    </Space>
  )
}
