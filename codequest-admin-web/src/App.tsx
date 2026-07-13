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
import { useAdminStore } from './stores/adminStore'

// 私有路由 - 需要登录才能访问
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// 深色主题配置
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6366f1',
    colorInfo: '#6366f1',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: '#0b0f1a',
    colorBgContainer: '#111827',
    colorBgElevated: '#1a1f2e',
    colorBorder: '#1f2937',
    colorBorderSecondary: '#374151',
    colorText: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Layout: {
      siderBg: '#080b14',
      triggerBg: '#0f1322',
      headerBg: '#0f1322',
    },
    Menu: {
      darkItemBg: '#080b14',
      darkItemSelectedBg: 'rgba(99,102,241,0.15)',
      darkItemHoverBg: 'rgba(99,102,241,0.08)',
      darkSubMenuItemBg: '#080b14',
    },
    Card: {
      colorBgContainer: '#111827',
    },
    Table: {
      headerBg: '#0f1322',
      rowHoverBg: 'rgba(99,102,241,0.04)',
    },
    Input: {
      colorBgContainer: '#0f1322',
      colorBorder: '#1f2937',
      activeBorderColor: '#6366f1',
    },
    Select: {
      colorBgContainer: '#0f1322',
      colorBorder: '#1f2937',
    },
    Modal: {
      colorBgElevated: '#111827',
    },
    Drawer: {
      colorBgElevated: '#111827',
    },
  },
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={darkTheme}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="lessons" element={<LessonManager />} />
              <Route path="lessons/new" element={<LessonEditor />} />
              <Route path="lessons/:id/edit" element={<LessonEditor />} />
              <Route path="users" element={<UserManager />} />
              <Route path="achievements" element={<AchievementManager />} />
              <Route path="submissions" element={<SubmissionAudit />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
