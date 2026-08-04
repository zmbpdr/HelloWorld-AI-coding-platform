/**
 * Login.tsx - 管理员登录页面
 *
 * 提供管理员身份认证入口，包含用户名/密码表单、背景动画装饰、
 * 错误提示和安全提醒等功能。登录成功后跳转至仪表盘。
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, App, Typography, Divider } from 'antd'
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, CodeOutlined } from '@ant-design/icons'
import { useAdminStore } from '../stores/adminStore'

const { Title, Text } = Typography

/** 管理员登录页面组件 */
export default function Login() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()
  const login = useAdminStore((s) => s.login)

  /** 表单提交处理 - 调用登录接口，成功后跳转至首页 */
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    setErrorMsg('')
    try {
      await login(values.username, values.password)
      message.success('登录成功')
      navigate('/')
    } catch {
      setErrorMsg('用户名或密码错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="page-enter"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 20% 10%, #1e1045 0%, #0f0c24 40%, #0a0e17 80%, #060913 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰 — 大型光晕 */}
      <div
        style={{
          position: 'absolute',
          top: -150,
          left: -100,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08), rgba(99,102,241,0.02) 40%, transparent 65%)',
          pointerEvents: 'none',
          animation: 'floating-blob 10s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          right: -140,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.07), rgba(139,92,246,0.02) 40%, transparent 65%)',
          pointerEvents: 'none',
          animation: 'floating-blob 15s ease-in-out infinite alternate',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '55%',
          right: '10%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 65%)',
          pointerEvents: 'none',
          animation: 'floating-blob 12s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* 背景装饰 — 网格点阵 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.10) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          opacity: 0.25,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />

      {/* 登录卡片容器 */}
      <div
        className="login-card"
        style={{
          position: 'relative',
          zIndex: 1,
          width: 440,
          maxWidth: '100%',
          background: 'rgba(15,21,38,0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(99,102,241,0.12)',
          borderRadius: 24,
          padding: '52px 44px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 100px rgba(99,102,241,0.06), 0 1px 0 rgba(255,255,255,0.04) inset',
          transition: 'border-color 0.4s ease',
        }}
        // 鼠标悬停时卡片边框高亮
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.25)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.12)'
        }}
      >
        {/* Logo 及标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 22px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 16px 48px rgba(99,102,241,0.4), 0 0 60px rgba(139,92,246,0.2)',
              position: 'relative',
            }}
          >
            {/* 光晕环动画 */}
            <div
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: 24,
                border: '2px solid rgba(139,92,246,0.2)',
                animation: 'logo-ring-pulse 2.5s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            <CodeOutlined style={{ color: '#fff', fontSize: 36 }} />
          </div>
          <Title level={2} style={{ color: '#f1f5f9', margin: '0 0 6px', fontWeight: 800, letterSpacing: -1.5, fontSize: 28 }}>
            Hello World
          </Title>
          <Text style={{ color: '#a5b4fc', fontSize: 14, fontWeight: 500, letterSpacing: 1 }}>管理后台</Text>
        </div>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0 0 32px' }} />

        {/* 错误提示消息 */}
        {errorMsg && (
          <div
            className="shake-in"
            style={{
              marginBottom: 20,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            {errorMsg}
          </div>
        )}

        {/* 登录表单 - 用户名 & 密码 */}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#6366f1' }} />}
              placeholder="用户名" autoComplete="username"
              onChange={() => errorMsg && setErrorMsg('')}
              style={{
                borderRadius: 12,
                height: 50,
                background: 'rgba(15,20,35,0.6)',
                borderColor: 'rgba(99,102,241,0.12)',
                transition: 'all 0.3s ease',
              }}
              className="login-input-glow"
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#6366f1' }} />}
              placeholder="密码" autoComplete="current-password"
              onChange={() => errorMsg && setErrorMsg('')}
              style={{
                borderRadius: 12,
                height: 50,
                background: 'rgba(15,20,35,0.6)',
                borderColor: 'rgba(99,102,241,0.12)',
                transition: 'all 0.3s ease',
              }}
              className="login-input-glow"
            />
          </Form.Item>

          {/* 登录按钮 */}
          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-btn-lift"
              style={{
                height: 50,
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                border: 'none',
                boxShadow: '0 6px 28px rgba(99,102,241,0.45), 0 0 2px rgba(139,92,246,0.4)',
                letterSpacing: 2,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        {/* 安全提醒区域 */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            fontSize: 12,
            color: '#94a3b8',
            lineHeight: 1.8,
            marginTop: 4,
            backdropFilter: 'blur(4px)',
          }}
        >
          <SafetyCertificateOutlined style={{ fontSize: 18, color: '#818cf8', marginTop: 1, flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#cbd5e1' }}>安全提醒：</strong>
            请勿在公共设备上保存密码。如发现异常登录，请立即联系超级管理员。
          </span>
        </div>

        {/* 底部功能特性标签 */}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            gap: 20,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {['📊 数据仪表', '📝 课程管理', '👥 用户管理', '🔍 提交审计'].map((label) => (
            <Text key={label} style={{ fontSize: 12, color: '#475569', transition: 'color 0.3s ease' }}>
              {label}
            </Text>
          ))}
        </div>
      </div>
    </div>
  )
}
