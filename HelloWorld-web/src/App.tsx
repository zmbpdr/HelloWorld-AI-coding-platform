/**
 * 应用根组件 - App
 * 功能：配置路由系统，初始化用户认证状态，
 * 包含学习提醒功能（浏览器通知）。
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useUserStore } from './stores/userStore'
import Lobby from './pages/Lobby'
import CourseMap from './pages/CourseMap'
import Lesson from './pages/Lesson'
import NeuralMap from './pages/NeuralMap'
import AgentLesson from './pages/AgentLesson'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import RequireAuth from './components/auth/RequireAuth'
import Diagnostic from './pages/Diagnostic'
import Errors from './pages/Errors'

/** 学习提醒组件：利用浏览器 Notification API 发送每日学习提醒 */
function StudyReminder() {
  useEffect(() => {
    let reminder = true
    try {
      const stored = localStorage.getItem('helloworld_reminder')
      if (stored !== null) { const v = JSON.parse(stored); reminder = typeof v === 'boolean' ? v : true }
    } catch { /* default on */ }
    if (!reminder) return

    const lastRemind = localStorage.getItem('helloworld_last_remind')
    const today = new Date().toDateString()
    if (lastRemind === today) return

    const timer = setTimeout(async () => {
      if (!('Notification' in window)) return
      const perm = Notification.permission
      if (perm === 'denied') return
      if (perm === 'default') {
        await Notification.requestPermission()
      }
      if (Notification.permission === 'granted') {
        new Notification('Hello World', {
          body: '今天还没有开始编程闯关哦，快来挑战吧！🚀',
          icon: '/favicon.ico',
          tag: 'helloworld-reminder',
        })
        localStorage.setItem('helloworld_last_remind', today)
      }
    }, 30000)

    return () => clearTimeout(timer)
  }, [])
  return null
}

/** 应用根组件：初始化认证状态并配置路由 */
function App() {
  const initAuth = useUserStore((s) => s.initAuth)

  useEffect(() => { initAuth() }, [initAuth])

  return (
    <BrowserRouter>
      <StudyReminder />
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/:languageSlug" element={
          <RequireAuth><CourseMap /></RequireAuth>
        } />
        <Route path="/:languageSlug/:lessonId" element={
          <RequireAuth><Lesson /></RequireAuth>
        } />
        <Route path="/workshop" element={
          <RequireAuth><NeuralMap /></RequireAuth>
        } />
        <Route path="/workshop/:nodeId" element={
          <RequireAuth><AgentLesson /></RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth><Profile /></RequireAuth>
        } />
        <Route path="/pricing" element={
          <RequireAuth><Pricing /></RequireAuth>
        } />
        <Route path="/leaderboard" element={
          <RequireAuth><Leaderboard /></RequireAuth>
        } />
        <Route path="/settings" element={
          <RequireAuth><Settings /></RequireAuth>
        } />
        <Route path="/errors" element={
          <RequireAuth><Errors /></RequireAuth>
        } />
        <Route path="/diagnostic" element={<RequireAuth><Diagnostic /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
