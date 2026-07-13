interface AchievementCardProps {
  achievement: {
    slug: string
    name: string
    description: string | null
    rarity: string
    unlocked: boolean
    unlocked_at: string | null
  }
}

const rarityStyles: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  common: { border: 'rgba(255,255,255,0.08)', bg: 'rgba(255,255,255,0.02)', text: '#cbd5e1', glow: '' },
  rare: { border: 'rgba(99,102,241,0.3)', bg: 'rgba(99,102,241,0.06)', text: '#818cf8', glow: '0 0 20px rgba(99,102,241,0.1)' },
  epic: { border: 'rgba(139,92,246,0.3)', bg: 'rgba(139,92,246,0.06)', text: '#a78bfa', glow: '0 0 20px rgba(139,92,246,0.1)' },
  legendary: { border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.06)', text: '#fbbf24', glow: '0 0 24px rgba(245,158,11,0.15)' },
}

const rarityNames: Record<string, string> = {
  common: '普通', rare: '稀有', epic: '史诗', legendary: '传说',
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const style = rarityStyles[achievement.rarity] || rarityStyles.common
  const rarityName = rarityNames[achievement.rarity] || achievement.rarity

  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-300"
      style={{
        border: `1px solid ${style.border}`,
        background: achievement.unlocked ? style.bg : 'rgba(15,19,34,0.5)',
        boxShadow: achievement.unlocked ? style.glow : '',
        opacity: achievement.unlocked ? 1 : 0.5,
        filter: achievement.unlocked ? 'none' : 'grayscale(1)',
      }}
    >
      <span
        className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full"
        style={{ background: achievement.unlocked ? 'rgba(255,255,255,0.04)' : 'transparent', color: achievement.unlocked ? style.text : '#475569' }}
      >
        {rarityName}
      </span>

      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-2"
        style={{ background: achievement.unlocked ? style.bg : 'rgba(255,255,255,0.02)' }}
      >
        {achievement.unlocked ? getAchievementIcon(achievement.slug) : '🔒'}
      </div>

      <h4 className="font-semibold" style={{ color: achievement.unlocked ? style.text : '#475569' }}>
        {achievement.name}
      </h4>
      <p className="text-xs mt-1" style={{ color: '#475569' }}>
        {achievement.unlocked ? achievement.description : '???'}
      </p>

      {achievement.unlocked && achievement.unlocked_at && (
        <p className="text-xs mt-2" style={{ color: '#334155' }}>
          {new Date(achievement.unlocked_at).toLocaleDateString('zh-CN')}
        </p>
      )}
    </div>
  )
}

function getAchievementIcon(slug: string): string {
  const icons: Record<string, string> = {
    'first-blood': '🗡️',
    'getting-started': '📋',
    'halfway': '🏓',
    'master': '👩',
    'polyglot': '🌍',
    'streak-3': '🔥',
    'streak-7': '⚡',
    'streak-30': '💮',
    'xp-100': '⭐',
    'xp-500': '🟈',
    'xp-1000': '💎',
  }
  return icons[slug] || '🏆'
}
