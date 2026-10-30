/** 管理台线框图标名（禁止侧栏用系统 emoji，见 DESIGN.md）。 */
export type AdminIconName =
  | 'home'
  | 'users'
  | 'content'
  | 'chart'
  | 'brain'
  | 'bot'
  | 'antenna'
  | 'settings'
  | 'rocket'
  | 'data'
  | 'chevronDown'
  | 'chevronRight'

const ICONS: Record<AdminIconName, string[]> = {
  home: [
    'M4 10.5 12 4l8 6.5',
    'M6.5 9.5V20h11V9.5',
    'M10 20v-6h4v6',
  ],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  content: [
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h4',
  ],
  chart: [
    'M4 19h16',
    'M7 16V10',
    'M12 16V6',
    'M17 16v-8',
  ],
  brain: [
    'M9.5 4.5a3 3 0 0 0-3 3v.4A3 3 0 0 0 4 10.5V13a3 3 0 0 0 2.2 2.9',
    'M14.5 4.5a3 3 0 0 1 3 3v.4A3 3 0 0 1 20 10.5V13a3 3 0 0 1-2.2 2.9',
    'M9 17.5v2',
    'M15 17.5v2',
    'M9.5 20.5h5',
    'M12 4.5v4',
    'M8 12h8',
  ],
  bot: [
    'M8 7V4h8v3',
    'M7 8h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z',
    'M9 12h.01',
    'M15 12h.01',
    'M9 16h6',
  ],
  antenna: [
    'M12 14v7',
    'M8 21h8',
    'M12 3a6 6 0 0 1 6 6c0 3.5-2.5 5.5-6 8-3.5-2.5-6-4.5-6-8a6 6 0 0 1 6-6Z',
    'M12 9h.01',
  ],
  settings: [
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
    'M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.51 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.1 1.51 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.36.3.8.46 1.25.44H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.1c-.1.32-.16.66-.16 1Z',
  ],
  rocket: [
    'M5 15c-1.5 1.5-2 4.5-2 4.5s3 0 4.5-2',
    'M13.5 6.5 17 3l4 4-3.5 3.5',
    'M9 11l4 4',
    'M12 8.5 5.5 15A5 5 0 0 0 9 18.5L15.5 12',
  ],
  data: ['M4 18h16', 'M7 18V9', 'M12 18V5', 'M17 18v-7'],
  chevronDown: ['M7 10l5 5 5-5'],
  chevronRight: ['M10 7l5 5-5 5'],
}

type AdminIconProps = {
  name: AdminIconName
  className?: string
}

export function AdminIcon({ name, className = 'admin-icon' }: AdminIconProps) {
  const paths = ICONS[name]
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
