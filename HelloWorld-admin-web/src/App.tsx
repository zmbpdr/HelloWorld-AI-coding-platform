/**
 * App.tsx - 路由配置与主题配置
 *
 * 应用根组件，配置 Ant Design 浅色清新主题（与学习端"清新自然风"统一）、
 * 中文语言包、React Router 路由规则（含登录页和私有路由保护）。
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LessonManager from './pages/LessonManager'
import LessonEditor from './pages/LessonEditor'
import UserManager from './pages/UserManager'
import AchievementManager from './pages/AchievementManager'
import SubmissionAudit from './pages/SubmissionAudit'
import SystemSettings from './pages/SystemSettings'
import QuestionManager from './pages/QuestionManager'
import QuestionImport from './pages/QuestionImport'
import DiagnosticManager from './pages/DiagnosticManager'
import RagManager from './pages/RagManager'
import { useAdminStore } from './stores/adminStore'

/**
 * 私有路由组件 - 需要登录才能访问
 * 未认证时自动重定向到 /login
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** 浅色清新主题配置 — 与学习端"清新自然风"统一（主色草绿 #10b981） */
const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#10b981',
    colorInfo: '#0ea5e9',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: '#fafbf8',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#fafbf8',
    colorBorder: '#e6e8e3',
    colorBorderSecondary: '#f0f2ed',
    colorText: '#1e293b',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#94a3b8',
    borderRadius: 10,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Layout: {
      siderBg: '#ffffff',
      triggerBg: '#f4f6f1',
      headerBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#475569',
      itemSelectedBg: 'rgba(16,185,129,0.1)',
      itemSelectedColor: '#059669',
      itemHoverBg: 'rgba(16,185,129,0.06)',
      itemHoverColor: '#1e293b',
      subMenuItemBg: 'transparent',
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
    Table: {
      headerBg: '#f4f6f1',
      rowHoverBg: 'rgba(16,185,129,0.04)',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#e6e8e3',
      activeBorderColor: '#10b981',
    },
    Select: {
      colorBgContainer: '#ffffff',
      colorBorder: '#e6e8e3',
    },
    Modal: {
      colorBgElevated: '#ffffff',
    },
    Drawer: {
      colorBgElevated: '#ffffff',
    },
  },
}

/** 应用根组件 */
export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={lightTheme}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            {/* 登录页 - 公开访问 */}
            <Route path="/login" element={<Login />} />
            {/* 私有路由 - 需要登录 */}
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="lessons" element={<LessonManager />} />
              <Route path="lessons/new" element={<LessonEditor />} />
              <Route path="lessons/:id/edit" element={<LessonEditor />} />
              <Route path="users" element={<UserManager />} />
              <Route path="achievements" element={<AchievementManager />} />
              <Route path="submissions" element={<SubmissionAudit />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="questions" element={<QuestionManager />} />
              <Route path="questions/import" element={<QuestionImport />} />
              <Route path="diagnostics" element={<DiagnosticManager />} />
              <Route path="rag" element={<RagManager />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}