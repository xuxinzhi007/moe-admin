import { useState } from 'react'
import { AvatarComposerPage } from './AvatarComposerPage'
import { SpriteRepairPage } from './SpriteRepairPage'
import './sprite-studio.css'

export function SpriteStudioPage() {
  const [mode, setMode] = useState<'avatar' | 'sheet'>('avatar')

  return (
    <div className="sprite-studio-shell">
      <nav className="sprite-studio-mode-switch" aria-label="养成素材工作台">
        <div>
          <span>MOE PET ASSET WORKBENCH</span>
          <strong>{mode === 'avatar' ? '角色素材包编辑器' : '序列帧整理工作台'}</strong>
        </div>
        <div className="sprite-studio-mode-tabs" role="tablist" aria-label="素材工作模式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'avatar'}
            className={mode === 'avatar' ? 'active' : ''}
            onClick={() => setMode('avatar')}
          >
            角色装扮
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sheet'}
            className={mode === 'sheet' ? 'active' : ''}
            onClick={() => setMode('sheet')}
          >
            序列帧整理
          </button>
        </div>
      </nav>
      {mode === 'avatar' ? <AvatarComposerPage /> : <SpriteRepairPage />}
    </div>
  )
}
