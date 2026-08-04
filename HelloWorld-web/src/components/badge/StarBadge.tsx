/**
 * 星级评分徽章组件 - StarBadge
 * 功能：根据分数显示 1-5 星评级，附带等级标签文字
 * （未通过/起步/基础/良好/优秀/完美），支持三种尺寸和动画。
 */
interface StarBadgeProps {
  stars: number  // 0-5
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const TIER_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: '未通过', color: '#475569', bg: 'rgba(71,85,105,0.08)' },
  1: { label: '起步', color: '#a8a29e', bg: 'rgba(168,162,158,0.08)' },
  2: { label: '基础', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  3: { label: '良好', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  4: { label: '优秀', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  5: { label: '完美', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
}

const SIZE_MAP = { sm: 12, md: 16, lg: 22 }

export default function StarBadge({ stars, size = 'md', animated = false }: StarBadgeProps) {
  const cfg = TIER_CONFIG[Math.min(5, Math.max(0, stars))] || TIER_CONFIG[0]
  const px = SIZE_MAP[size]

  return (
    <span
      className="inline-flex items-center gap-1 font-mono tracking-tight"
      style={{
        fontSize: size === 'lg' ? 14 : size === 'sm' ? 11 : 12,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}20`,
        borderRadius: 6,
        padding: size === 'lg' ? '4px 10px' : size === 'sm' ? '2px 6px' : '3px 8px',
      }}
    >
      <span
        className={animated ? 'star-reveal' : ''}
        style={{ fontSize: px, lineHeight: 1 }}
      >
        {stars >= 1 ? '★' : '☆'}
        {stars >= 2 ? '★' : '☆'}
        {stars >= 3 ? '★' : '☆'}
        {stars >= 4 ? '★' : '☆'}
        {stars >= 5 ? '★' : '☆'}
      </span>
      <span className="opacity-70">{cfg.label}</span>
    </span>
  )
}
