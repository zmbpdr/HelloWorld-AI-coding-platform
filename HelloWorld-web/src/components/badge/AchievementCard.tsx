/**
 * 成就卡片组件 - AchievementCard
 * 功能：展示单个成就徽章，根据稀有度（普通/稀有/史诗/传说）
 * 显示不同样式，未解锁时呈灰色锁定状态。
 */
interface AchievementCardProps { achievement: { slug: string; name: string; description: string | null; rarity: string; unlocked: boolean; unlocked_at: string | null } }

const rarityStyles: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  common: { border: '#e6e8e3', bg: '#f8fafc', text: '#64748b', glow: '' },
  rare: { border: '#a7f3d0', bg: '#ecfdf5', text: '#059669', glow: '0 0 12px rgba(16,185,129,0.06)' },
  epic: { border: '#c4b5fd', bg: '#f5f3ff', text: '#7c3aed', glow: '0 0 12px rgba(139,92,246,0.06)' },
  legendary: { border: '#fde68a', bg: '#fffbeb', text: '#d97706', glow: '0 0 16px rgba(245,158,11,0.1)' },
}
const rarityNames: Record<string, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const style = rarityStyles[achievement.rarity] || rarityStyles.common
  return (
    <div className="relative rounded-xl p-4 transition-all duration-300" style={{
      border: `1px solid ${style.border}`, background: achievement.unlocked ? style.bg : '#f8fafc',
      boxShadow: achievement.unlocked ? style.glow : '', opacity: achievement.unlocked ? 1 : 0.6, filter: achievement.unlocked ? 'none' : 'grayscale(1)',
    }}>
      <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: achievement.unlocked ? style.bg : 'transparent', color: achievement.unlocked ? style.text : '#94a3b8' }}>{rarityNames[achievement.rarity] || achievement.rarity}</span>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-2"
        style={{ background: achievement.unlocked ? style.bg : '#f0f2ed' }}>{achievement.unlocked ? getAchievementIcon(achievement.slug) : '🔒'}</div>
      <h4 className="font-semibold" style={{ color: achievement.unlocked ? style.text : '#94a3b8' }}>{achievement.name}</h4>
      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{achievement.unlocked ? achievement.description : '???'}</p>
      {achievement.unlocked && achievement.unlocked_at && <p className="text-xs mt-2" style={{ color: '#cbd5e1' }}>{new Date(achievement.unlocked_at).toLocaleDateString('zh-CN')}</p>}
    </div>
  )
}

function getAchievementIcon(slug: string): string {
  const icons: Record<string, string> = { 'first-blood': '🗡️', 'getting-started': '📋', 'halfway': '🏓', 'master': '👩', 'polyglot': '🌍', 'streak-3': '🔥', 'streak-7': '⚡', 'streak-30': '💮', 'xp-100': '⭐', 'xp-500': '🟈', 'xp-1000': '💎' }
  return icons[slug] || '🏆'
}
