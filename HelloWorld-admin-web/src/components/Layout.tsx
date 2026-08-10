/**
 * Layout.tsx - 整体布局框架组件
 *
 * 管理后台的侧边栏 + 顶栏 + 内容区域布局（浅色清新风，与学习端统一）。
 * 侧边栏包含 Logo 和导航菜单，顶栏包含折叠按钮和管理员信息下拉菜单，
 * 内容区域使用 Outlet 渲染子路由页面。
 */

import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Avatar, Dropdown, Typography } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  TrophyOutlined,
  AuditOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CodeOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAdminStore } from '../stores/adminStore'

const { Header, Sider, Content } = AntLayout
const { Text } = Typography

/** 侧边栏导航菜单项配置 */
const menuItems: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/lessons', icon: <BookOutlined />, label: '课程管理' },
  {
    key: 'questions',
    icon: <DatabaseOutlined />,
    label: '题库管理',
    children: [
      { key: '/questions', label: '题目列表' },
      { key: '/questions/import', label: '批量导入' },
    ],
  },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/achievements', icon: <TrophyOutlined />, label: '成就管理' },
  { key: '/submissions', icon: <AuditOutlined />, label: '提交审计' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

/** 整体布局框架组件 */
export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { admin, logout, fetchAdmin } = useAdminStore()

  // 页面加载时获取管理员信息
  useEffect(() => { fetchAdmin() }, [fetchAdmin])

  // 监听未授权事件，触发跳转到登录页
  useEffect(() => {
    const handleUnauthorized = () => navigate('/login')
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [navigate])

  /** 菜单点击跳转 */
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => navigate(key)

  /** 退出登录 */
  const handleLogout = () => { logout(); navigate('/login') }

  /** 用户下拉菜单项 */
  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ]

  // 根据当前路径计算选中的菜单项（优先精确匹配叶子 key，否则回退到首段）
  const leafKeys = new Set<string>()
  const collectLeafKeys = (items: MenuProps['items']) => {
    (items || []).forEach((item) => {
      if (item && 'children' in item && item.children) {
        collectLeafKeys(item.children as MenuProps['items'])
      } else if (item && 'key' in item) {
        leafKeys.add(item.key as string)
      }
    })
  }
  collectLeafKeys(menuItems)
  const pathname = location.pathname
  const first = pathname.split('/').filter(Boolean)[0]
  const selectedKey = leafKeys.has(pathname) ? pathname : first ? '/' + first : '/'

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#fafbf8' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          borderRight: '1px solid rgba(15,23,42,0.06)',
          background: '#ffffff',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            borderBottom: '1px solid rgba(15,23,42,0.06)',
            gap: 10,
            background: 'linear-gradient(180deg, rgba(16,185,129,0.04) 0%, transparent 100%)',
            position: 'relative',
          }}
        >
          {/* 底部微光装饰 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '20%',
              width: '60%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.15), transparent)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(16,185,129,0.25)',
            }}
          >
            <CodeOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {/* 侧边栏展开时显示标题文字 */}
          {!collapsed && (
            <Text strong style={{ color: '#1e293b', fontSize: 17, letterSpacing: -0.5 }}>
              Hello World
            </Text>
          )}
        </div>

        {/* 导航菜单（浅色） */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: 8, background: 'transparent' }}
        />
      </Sider>

      <AntLayout style={{ background: '#fafbf8' }}>
        {/* 顶部栏 */}
        <Header
          className="admin-header"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(15,23,42,0.06)',
            height: 64,
            background: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* 左侧 - 折叠按钮 + 标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {collapsed ? (
              <MenuUnfoldOutlined
                style={{ fontSize: 17, cursor: 'pointer', color: '#64748b', transition: 'color 0.2s ease' }}
                onClick={() => setCollapsed(false)}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#10b981'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#64748b'}
              />
            ) : (
              <MenuFoldOutlined
                style={{ fontSize: 17, cursor: 'pointer', color: '#64748b', transition: 'color 0.2s ease' }}
                onClick={() => setCollapsed(true)}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#10b981'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#64748b'}
              />
            )}
            <Text style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>
              管理后台
            </Text>
          </div>

          {/* 右侧 - 管理员头像下拉菜单 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              className="smooth-transition"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 10,
                background: 'rgba(16,185,129,0.04)',
                border: '1px solid rgba(15,23,42,0.06)',
              }}
              // 鼠标悬停效果
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.1)'
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.2)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.04)'
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(15,23,42,0.06)'
              }}
            >
              <Avatar
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 0 8px rgba(16,185,129,0.3)',
                }}
              />
              <Text style={{ color: '#475569', fontSize: 14 }}>
                {admin?.username || '管理员'}
              </Text>
            </div>
          </Dropdown>
        </Header>

        {/* 内容区域 */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            borderRadius: 12,
            minHeight: 280,
            background: '#ffffff',
            border: '1px solid rgba(15,23,42,0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 内容区顶部淡入效果 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 40,
              background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          {/* 子路由页面内容 */}
          <div className="page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  )
}