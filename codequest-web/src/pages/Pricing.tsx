import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import PageTransition from '../components/ui/PageTransition'
import { getMyMembership, upgradeToPro, type MembershipInfo } from '../api/user'

const FEATURES = [
  ['六语言 60 关学习路线', true, true],
  ['代码运行与闯关记录', true, true],
  ['AI 导师', '每日 5 次', '不限次数'],
  ['代码审查官 Prompt', false, true],
  ['学习路径与进阶功能', false, true],
]

export default function Pricing() {
  const navigate = useNavigate()
  const [membership, setMembership] = useState<MembershipInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { getMyMembership().then(setMembership).catch(() => setMessage('请先登录后查看会员方案。')).finally(() => setIsLoading(false)) }, [])

  const upgrade = async () => {
    try { setIsUpgrading(true); setMembership(await upgradeToPro()); setMessage('升级成功：已切换为 Pro 演示账号。') }
    catch { setMessage('升级失败，请确认已登录后重试。') }
    finally { setIsUpgrading(false) }
  }

  const isPro = membership?.membership_tier === 'pro'
  return <PageTransition>
    <div className="min-h-screen px-6 py-10" style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #fafbf8 45%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-14">
          <button onClick={() => navigate('/')} className="font-bold text-xl" style={{ color: '#1e293b' }}>Hello World</button>
          <Button variant="ghost" onClick={() => navigate('/profile')}>个人中心</Button>
        </div>
        <div className="text-center mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ color: '#059669', background: '#ecfdf5' }}>会员功能为课堂演示 Mock，不接真实支付</span>
          <h1 className="text-4xl font-extrabold mt-5" style={{ color: '#1e293b' }}>选择适合你的学习节奏</h1>
          <p className="mt-3" style={{ color: '#64748b' }}>先用免费版开始闯关；需要更频繁的 AI 陪练时再升级 Pro。</p>
        </div>
        {message && <p className="max-w-xl mx-auto mb-5 text-center text-sm font-medium" style={{ color: message.includes('成功') ? '#16a34a' : '#d97706' }}>{message}</p>}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <PlanCard title="Free" subtitle="适合刚开始学习" color="#64748b" price="¥0" button={isPro ? '已升级 Pro' : '当前方案'} disabled onClick={() => {}} features={FEATURES.map(([name, free]) => [name as string, free])} />
          <PlanCard title="Pro" subtitle="适合需要持续 AI 陪练" color="#10b981" price="演示升级" featured button={isPro ? '已是 Pro' : '模拟升级为 Pro'} disabled={isLoading || isPro || isUpgrading} onClick={upgrade} features={FEATURES.map(([name, , pro]) => [name as string, pro])} />
        </div>
        {membership && !membership.is_unlimited && <p className="text-center mt-7 text-sm" style={{ color: '#64748b' }}>今日 AI 导师已使用 {membership.ai_calls_used} / {membership.ai_calls_limit} 次</p>}
      </div>
    </div>
  </PageTransition>
}

function PlanCard({ title, subtitle, color, price, features, featured, button, disabled, onClick }: { title: string; subtitle: string; color: string; price: string; features: [string, unknown][]; featured?: boolean; button: string; disabled: boolean; onClick: () => void }) {
  return <section className="rounded-3xl p-7 border" style={{ background: featured ? 'linear-gradient(155deg, rgba(16,185,129,0.12), rgba(255,255,255,0.95))' : '#ffffff', borderColor: featured ? '#a7f3d0' : '#e6e8e3', boxShadow: featured ? '0 8px 30px rgba(16,185,129,0.1)' : '0 1px 3px rgba(0,0,0,0.03)' }}>
    {featured && <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: '#059669', background: '#ecfdf5' }}>推荐</span>}
    <h2 className="text-2xl font-bold mt-3" style={{ color: '#1e293b' }}>{title}</h2><p className="text-sm mt-1" style={{ color: '#64748b' }}>{subtitle}</p>
    <p className="text-3xl font-extrabold my-6" style={{ color }}>{price}</p>
    <ul className="space-y-3 min-h-44">{features.map(([name, enabled]) => <li key={name} className="flex gap-3 text-sm" style={{ color: enabled ? '#334155' : '#94a3b8' }}><span>{enabled === false ? '—' : '✓'}</span>{enabled === true ? name : `${name}：${enabled}`}</li>)}</ul>
    <button disabled={disabled} onClick={onClick} className="w-full mt-7 rounded-xl py-3 font-semibold transition-opacity disabled:opacity-50 text-white" style={{ background: featured ? 'linear-gradient(135deg, #10b981, #059669)' : '#94a3b8' }}>{button}</button>
  </section>
}
