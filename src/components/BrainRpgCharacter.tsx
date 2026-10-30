import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrainPresenceData } from '../lib/brainRpgPresence'
import { ACTIVITY_LABEL, THOUGHT_SOURCE_LABEL } from '../lib/brainRpgPresence'
import {
  pickWanderPoint,
  RPG_ZONES,
  zoneForActivity,
  type RpgZone,
  type RpgZoneId,
} from '../lib/brainRpgWorld'

type Props = {
  presence: BrainPresenceData | null
  displayName?: string
  lockedSkillCount?: number
  onZoneClick?: (zone: RpgZone) => void
}

type NpcState = {
  x: number
  y: number
  targetX: number
  targetY: number
  facing: 'left' | 'right'
  walking: boolean
  pauseUntil: number
  homeZone: RpgZoneId
}

const STEP = 0.62
const ARRIVE = 1.6

function initialNpc(zone: RpgZone): NpcState {
  const pos = pickWanderPoint(zone)
  return {
    x: pos.x,
    y: pos.y,
    targetX: pos.x,
    targetY: pos.y,
    facing: 'right',
    walking: false,
    pauseUntil: 0,
    homeZone: zone.id,
  }
}

export function BrainRpgCharacter({
  presence,
  displayName,
  lockedSkillCount = 0,
  onZoneClick,
}: Props) {
  const activity = presence?.activity ?? 'idle'
  const thought = presence?.thought || '…'
  const thoughtSource = presence?.thought_source ?? 'rule'
  const mood = presence?.mood ?? 'calm'
  const name = displayName || presence?.display_name || 'Bot'
  const isBusy =
    activity === 'posting' ||
    activity === 'dreaming' ||
    activity === 'tidying' ||
    activity === 'compressing' ||
    Boolean(presence?.dreaming)

  const activeZoneId = useMemo(
    () => zoneForActivity(activity, lockedSkillCount),
    [activity, lockedSkillCount],
  )
  const activeZone = RPG_ZONES[activeZoneId]

  const [npc, setNpc] = useState<NpcState>(() => initialNpc(activeZone))
  const [selectedZone, setSelectedZone] = useState<RpgZoneId | null>(null)
  const prevZoneRef = useRef(activeZoneId)

  useEffect(() => {
    const zone = RPG_ZONES[activeZoneId]
    const zoneChanged = prevZoneRef.current !== activeZoneId
    prevZoneRef.current = activeZoneId

    setNpc((prev) => {
      if (zoneChanged || isBusy) {
        return {
          ...prev,
          homeZone: activeZoneId,
          targetX: zone.cx,
          targetY: zone.cy,
          walking: true,
          pauseUntil: 0,
          facing: zone.cx >= prev.x ? 'right' : 'left',
        }
      }
      if (prev.homeZone !== activeZoneId) {
        const pos = pickWanderPoint(zone, { x: prev.x, y: prev.y })
        return {
          ...prev,
          homeZone: activeZoneId,
          targetX: pos.x,
          targetY: pos.y,
          walking: true,
          facing: pos.x >= prev.x ? 'right' : 'left',
        }
      }
      return prev
    })
  }, [activeZoneId, isBusy])

  const canWander =
    !isBusy && (activity === 'exploring' || activity === 'walking' || activity === 'idle')

  useEffect(() => {
    if (!canWander) return
    const id = window.setInterval(() => {
      setNpc((prev) => {
        if (prev.walking || Date.now() < prev.pauseUntil) return prev
        const zone = RPG_ZONES[prev.homeZone]
        const next = pickWanderPoint(zone, { x: prev.x, y: prev.y })
        return {
          ...prev,
          targetX: next.x,
          targetY: next.y,
          walking: true,
          facing: next.x >= prev.x ? 'right' : 'left',
        }
      })
    }, 1200)
    return () => window.clearInterval(id)
  }, [canWander])

  useEffect(() => {
    if (!npc.walking) return
    const id = window.setInterval(() => {
      setNpc((prev) => {
        const now = Date.now()
        if (prev.pauseUntil > now) return prev
        const dx = prev.targetX - prev.x
        const dy = prev.targetY - prev.y
        const dist = Math.hypot(dx, dy)
        if (dist <= ARRIVE) {
          const pauseMs = isBusy ? 0 : 700 + Math.random() * 1800
          return {
            ...prev,
            x: prev.targetX,
            y: prev.targetY,
            walking: canWander && pauseMs > 0,
            pauseUntil: now + pauseMs,
          }
        }
        const nx = prev.x + (dx / dist) * STEP
        const ny = prev.y + (dy / dist) * STEP
        return {
          ...prev,
          x: nx,
          y: ny,
          facing: dx >= 0 ? 'right' : 'left',
        }
      })
    }, 48)
    return () => window.clearInterval(id)
  }, [npc.walking, canWander, isBusy])

  const moving = npc.walking

  function handleZoneClick(zone: RpgZone) {
    setSelectedZone(zone.id)
    onZoneClick?.(zone)
    setNpc((prev) => ({
      ...prev,
      homeZone: zone.id,
      targetX: zone.cx,
      targetY: zone.cy,
      walking: true,
      pauseUntil: 0,
      facing: zone.cx >= prev.x ? 'right' : 'left',
    }))
  }

  return (
    <div className="brain-rpg-scene" aria-label={`${name} 的小世界`}>
      <div className="brain-rpg-scene-bg" />
      {Object.values(RPG_ZONES).map((zone) => (
        <button
          key={zone.id}
          type="button"
          className={`brain-rpg-zone ${zone.id === activeZoneId ? 'brain-rpg-zone--active' : ''} ${selectedZone === zone.id ? 'brain-rpg-zone--selected' : ''}`}
          style={{
            left: `${zone.minX}%`,
            bottom: `${zone.minY}%`,
            width: `${zone.maxX - zone.minX}%`,
            height: `${zone.maxY - zone.minY}%`,
          }}
          onClick={() => handleZoneClick(zone)}
          aria-label={zone.label}
        >
          <span className="brain-rpg-zone-label">{zone.label}</span>
        </button>
      ))}
      <div className="brain-rpg-scene-hud">
        <span className="brain-rpg-scene-name">{name}</span>
        <span className="brain-rpg-scene-zone">{activeZone.label}</span>
        <span className={`brain-rpg-scene-activity brain-rpg-scene-activity--${activity}`}>
          {ACTIVITY_LABEL[activity] ?? activity}
        </span>
      </div>
      <div
        className={`brain-rpg-avatar-wrap ${moving ? 'brain-rpg-avatar-wrap--walk' : ''} brain-rpg-avatar-wrap--${mood}`}
        style={{ left: `${npc.x}%`, bottom: `${npc.y}%` }}
      >
        <div
          className={`brain-rpg-bubble ${isBusy ? 'brain-rpg-bubble--busy' : ''} brain-rpg-bubble--${thoughtSource}`}
          role="status"
          aria-live="polite"
        >
          <span className="brain-rpg-bubble-text">{thought}</span>
          <span className={`brain-rpg-thought-badge brain-rpg-thought-badge--${thoughtSource}`}>
            {THOUGHT_SOURCE_LABEL[thoughtSource] ?? thoughtSource}
          </span>
        </div>
        <div className={`brain-rpg-avatar ${npc.facing === 'left' ? 'brain-rpg-avatar--left' : ''}`}>
          <span className="brain-rpg-avatar-face" aria-hidden>
            ◕‿◕
          </span>
          <span className="brain-rpg-avatar-body" aria-hidden />
        </div>
        <span className="brain-rpg-avatar-shadow" aria-hidden />
      </div>
    </div>
  )
}
