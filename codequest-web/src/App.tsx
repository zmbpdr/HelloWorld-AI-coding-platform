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
import Settings from './pages/Settings'
import RequireAuth from './components/auth/RequireAuth'

// 学习提醒（浏览器通知 API）
function StudyReminder() {
  useEffect(() => {
    let reminder = true
    try {
      const stored = localStorage.getItem('codequest_reminder')
      if (stored !== null) { const v = JSON.parse(stored); reminder = typeof v === 'boolean' ? v : true }
    } catch { /* default on */ }
    if (!reminder) return

    const lastRemind = localStorage.getItem('codequest_last_remind')
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
        new Notification('CodeQuest', {
          body: '今天还没有开始编程闯关哦，快来挑战吧！🚀',
          icon: '/favicon.ico',
          tag: 'codequest-reminder',
        })
        localStorage.setItem('codequest_last_remind', today)
      }
    }, 30000)

    return () => clearTimeout(timer)
  }, [])
  return null
}

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
        <Route path="/leaderboard" element={
          <RequireAuth><Leaderboard /></RequireAuth>
        } />
        <Route path="/settings" element={
          <RequireAuth><Settings /></RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
