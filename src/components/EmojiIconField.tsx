import { FormField } from './FormField'

const QUICK_EMOJIS = ['❤️', '👍', '🌹', '☕', '🧋', '💎', '🚀', '✨', '🎆', '🦄', '👑', '🎂']

type EmojiIconFieldProps = {
  value: string
  onChange: (value: string) => void
}

export function EmojiIconField({ value, onChange }: EmojiIconFieldProps) {
  return (
    <FormField label="图标" hint="支持 emoji，可在下方快速选择">
      <div className="emoji-icon-row">
        <span className="emoji-icon-preview" aria-hidden>
          {value || '🎁'}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入或粘贴 emoji"
          maxLength={8}
        />
      </div>
      <div className="emoji-quick-picks">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`emoji-quick-btn${value === emoji ? ' active' : ''}`}
            onClick={() => onChange(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </FormField>
  )
}
