/**
 * ScoringRulesEditor.tsx - 入门诊断评分规则编辑器
 *
 * 编辑"分数区间 → 能力等级/推荐起点/提示语"的映射表，保存到系统设置
 * system_settings 表的 diagnostic_scoring_rules 键（JSON 数组）。
 * 区间需从 0 到 100 连续覆盖，不能有重叠或缝隙。
 */

import { useCallback, useEffect, useState } from 'react'
import { Card, Table, Button, Input, InputNumber, Select, Space, App, Typography } from 'antd'
import { PlusOutlined, SaveOutlined, UndoOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getDiagnosticScoringRules, saveDiagnosticScoringRules, DEFAULT_SCORING_RULES,
} from '../api/admin'
import type { ScoringRule } from '../api/admin'

const { Text, Paragraph } = Typography

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'beginner' },
  { value: 'intermediate', label: 'intermediate' },
  { value: 'advanced', label: 'advanced' },
]

/** 校验规则：区间从 0 开始、到 100 结束、连续无缝隙，且每行字段合法。返回错误文案或 null */
function validateRules(rules: ScoringRule[]): string | null {
  if (!rules.length) return '至少需要一条评分规则'
  const sorted = [...rules].sort((a, b) => a.min_score - b.min_score)
  if (sorted[0].min_score !== 0) return '第一条规则的分数下限必须是 0'
  if (sorted[sorted.length - 1].max_score !== 100) return '最后一条规则的分数上限必须是 100'
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    if (!Number.isFinite(r.min_score) || !Number.isFinite(r.max_score)) return `第 ${i + 1} 行：分数必须是数字`
    if (r.min_score < 0 || r.max_score > 100) return `第 ${i + 1} 行：分数需在 0~100 之间`
    if (r.min_score > r.max_score) return `第 ${i + 1} 行：分数下限不能大于上限`
    if (!(r.recommended_start || '').trim()) return `第 ${i + 1} 行：请填写推荐起点`
    if (i > 0 && r.min_score !== sorted[i - 1].max_score + 1) {
      return `分数区间必须连续无缝隙（上一行上限 ${sorted[i - 1].max_score}，本行下限 ${r.min_score}）`
    }
  }
  return null
}

export default function ScoringRulesEditor() {
  const { message } = App.useApp()
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDiagnosticScoringRules()
      setRules(
        data.map((r) => ({
          ...r,
          skill_level: (r.skill_level || 'beginner') as ScoringRule['skill_level'],
        })),
      )
    } catch {
      message.error('获取评分规则失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const updateField = (index: number, patch: Partial<ScoringRule>) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRules((prev) => {
      const last = prev[prev.length - 1]
      const nextMin = last ? last.max_score + 1 : 0
      return [
        ...prev,
        { min_score: nextMin, max_score: nextMin, skill_level: 'beginner', recommended_start: '', message: '' },
      ]
    })
  }

  const removeRow = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    const err = validateRules(rules)
    if (err) {
      message.error(err)
      return
    }
    setSaving(true)
    try {
      await saveDiagnosticScoringRules(rules)
      message.success('评分规则已保存，学生诊断提交即时生效')
      await load()
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRules(DEFAULT_SCORING_RULES.map((r) => ({ ...r })))
    message.info('已恢复到默认规则，点击「保存」后生效')
  }

  const columns: ColumnsType<ScoringRule> = [
    {
      title: '分数区间',
      key: 'range',
      width: 220,
      render: (_, _record, index) => (
        <Space size={4}>
          <InputNumber
            min={0}
            max={100}
            value={rules[index]?.min_score}
            style={{ width: 72 }}
            onChange={(v) => updateField(index, { min_score: v ?? 0 })}
          />
          <span style={{ color: '#94a3b8' }}>~</span>
          <InputNumber
            min={0}
            max={100}
            value={rules[index]?.max_score}
            style={{ width: 72 }}
            onChange={(v) => updateField(index, { max_score: v ?? 0 })}
          />
        </Space>
      ),
    },
    {
      title: '能力等级',
      key: 'skill_level',
      width: 160,
      render: (_, _record, index) => (
        <Select
          value={rules[index]?.skill_level}
          style={{ width: 140 }}
          options={LEVEL_OPTIONS}
          onChange={(val) => updateField(index, { skill_level: val as ScoringRule['skill_level'] })}
        />
      ),
    },
    {
      title: '推荐起点 slug',
      key: 'recommended_start',
      width: 220,
      render: (_, _record, index) => (
        <Input
          value={rules[index]?.recommended_start}
          placeholder="python-01-hello-world"
          onChange={(e) => updateField(index, { recommended_start: e.target.value })}
        />
      ),
    },
    {
      title: '提示语',
      key: 'message',
      render: (_, _record, index) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 3 }}
          value={rules[index]?.message}
          onChange={(e) => updateField(index, { message: e.target.value })}
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 56,
      render: (_v, _record, index) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={rules.length <= 1}
          onClick={() => removeRow(index)}
        />
      ),
    },
  ]

  return (
    <Card
      title={<Text strong style={{ color: '#1e293b' }}>评分规则</Text>}
      extra={
        <Space>
          <Button icon={<UndoOutlined />} onClick={handleReset} disabled={loading}>
            恢复默认
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
      style={{ marginTop: 20, borderRadius: 12 }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        诊断得分按「分数区间」映射到能力等级、推荐起点与提示语。区间需从 0 到 100 连续覆盖，不能有重叠或缝隙。
      </Paragraph>
      <Table
        rowKey="__i"
        columns={columns}
        dataSource={rules.map((r, i) => ({ ...r, __i: i }))}
        loading={loading}
        pagination={false}
        size="middle"
        footer={() => (
          <Button icon={<PlusOutlined />} onClick={addRow} type="dashed" block>
            添加区间
          </Button>
        )}
      />
    </Card>
  )
}