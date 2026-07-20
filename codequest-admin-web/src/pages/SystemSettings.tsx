import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Button, Card, App, Spin, Typography, Switch, Space } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { getSettings, updateSetting } from '../api/admin'

const { Title, Text } = Typography

interface SettingItem {
  key: string
  value: string
  description: string
}

const DEFAULT_SETTINGS: { key: string; label: string; description: string; type: 'text' | 'number' | 'switch'; defaultValue: string }[] = [
  { key: 'site_name', label: '平台名称', description: '显示在页面标题和导航栏', type: 'text', defaultValue: 'Hello World' },
  { key: 'site_description', label: '平台描述', description: '在学习平台首页展示', type: 'text', defaultValue: '闯关式 AI 编程学习平台' },
  { key: 'max_submission_per_day', label: '每日提交上限', description: '每个用户每天最多提交次数', type: 'number', defaultValue: '100' },
  { key: 'sandbox_memory_limit', label: '沙箱内存限制 (MB)', description: 'Docker 容器最大内存', type: 'number', defaultValue: '256' },
  { key: 'sandbox_cpu_limit', label: '沙箱 CPU 核数', description: 'Docker 容器 CPU 限制', type: 'number', defaultValue: '1' },
  { key: 'sandbox_pid_limit', label: '沙箱进程数上限', description: 'Docker 容器最大进程数', type: 'number', defaultValue: '64' },
  { key: 'sandbox_timeout', label: '代码执行超时 (秒)', description: '单次执行最大时长', type: 'number', defaultValue: '5' },
  { key: 'scoring_pass_score', label: '通关分数线', description: '达到此分数视为通关', type: 'number', defaultValue: '100' },
  { key: 'scoring_xp_multiplier', label: '经验值倍率', description: '基础经验值乘数 (1.0 = 标准)', type: 'number', defaultValue: '1.0' },
  { key: 'ai_mode', label: 'AI 模式', description: 'auto=自动选择, cloud=仅云端, local=仅本地', type: 'text', defaultValue: 'auto' },
  { key: 'registration_enabled', label: '开放注册', description: '是否允许新用户注册', type: 'switch', defaultValue: 'true' },
]

export default function SystemSettings() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await getSettings()
        const items: SettingItem[] = Array.isArray(res) ? res : res.items ?? []
        const values: Record<string, any> = {}
        for (const def of DEFAULT_SETTINGS) {
          const existing = items.find((i: SettingItem) => i.key === def.key)
          if (def.type === 'switch') {
            values[def.key] = existing ? existing.value === 'true' : def.defaultValue === 'true'
          } else if (def.type === 'number') {
            values[def.key] = existing ? Number(existing.value) : Number(def.defaultValue)
          } else {
            values[def.key] = existing?.value ?? def.defaultValue
          }
        }
        form.setFieldsValue(values)
      } catch { message.error('获取系统设置失败') }
      finally { setLoading(false) }
    })()
  }, [form])

  const handleSave = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      for (const def of DEFAULT_SETTINGS) {
        const val = def.type === 'switch' ? String(values[def.key]) : String(values[def.key] ?? def.defaultValue)
        await updateSetting(def.key, val)
      }
      message.success('保存成功')
    } catch (err: any) {
      if (err?.errorFields) return
      message.error('保存失败')
    } finally { setSaving(false) }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: '#e2e8f0' }}>系统设置</Title>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">保存配置</Button>
      </div>

      <Form form={form} layout="vertical">
        {/* 基本设置 */}
        <Card
          title={<Text strong style={{ color: '#e2e8f0' }}>基本设置</Text>}
          style={{ marginBottom: 20, borderRadius: 12, background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {DEFAULT_SETTINGS.filter(d => ['site_name', 'site_description', 'registration_enabled'].includes(d.key)).map(def => (
              <Form.Item key={def.key} name={def.key} label={<Text style={{ color: '#94a3b8' }}>{def.label}</Text>}
                tooltip={def.description} style={{ marginBottom: 0 }}>
                {def.type === 'switch' ? (
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                ) : (
                  <Input placeholder={def.description} />
                )}
              </Form.Item>
            ))}
          </Space>
        </Card>

        {/* 沙箱资源限制 */}
        <Card
          title={<Text strong style={{ color: '#e2e8f0' }}>沙箱资源限制</Text>}
          style={{ marginBottom: 20, borderRadius: 12, background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {DEFAULT_SETTINGS.filter(d => d.key.startsWith('sandbox_')).map(def => (
              <Form.Item key={def.key} name={def.key} label={<Text style={{ color: '#94a3b8' }}>{def.label}</Text>}
                tooltip={def.description} style={{ marginBottom: 0 }}>
                <InputNumber min={1} style={{ width: 200 }} />
              </Form.Item>
            ))}
          </Space>
        </Card>

        {/* 评分与经验值 */}
        <Card
          title={<Text strong style={{ color: '#e2e8f0' }}>评分与经验值</Text>}
          style={{ marginBottom: 20, borderRadius: 12, background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {DEFAULT_SETTINGS.filter(d => d.key.startsWith('scoring_') || d.key === 'max_submission_per_day').map(def => (
              <Form.Item key={def.key} name={def.key} label={<Text style={{ color: '#94a3b8' }}>{def.label}</Text>}
                tooltip={def.description} style={{ marginBottom: 0 }}>
                <InputNumber min={0} step={def.key === 'scoring_xp_multiplier' ? 0.1 : 1} style={{ width: 200 }} />
              </Form.Item>
            ))}
          </Space>
        </Card>

        {/* AI 配置 */}
        <Card
          title={<Text strong style={{ color: '#e2e8f0' }}>AI 配置</Text>}
          style={{ marginBottom: 20, borderRadius: 12, background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {DEFAULT_SETTINGS.filter(d => d.key === 'ai_mode').map(def => (
              <Form.Item key={def.key} name={def.key} label={<Text style={{ color: '#94a3b8' }}>{def.label}</Text>}
                tooltip={def.description} style={{ marginBottom: 0 }}>
                <Input placeholder="auto / cloud / local" />
              </Form.Item>
            ))}
          </Space>
        </Card>
      </Form>
    </div>
  )
}
