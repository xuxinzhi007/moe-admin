const fs = require('fs')
const path = 'c:/Users/ZhuanZ1/Desktop/moe_social/moe-admin/src/components/BrainRpgPanel.tsx'
let s = fs.readFileSync(path, 'utf8')
s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

function mustReplace(label, oldStr, newStr) {
  if (!s.includes(oldStr)) {
    console.error(`${label} block not found`)
    process.exit(1)
  }
  s = s.replace(oldStr, newStr)
}

mustReplace(
  'loadRpg',
  `  const loadRpg = useCallback(async () => {
    if (!agentKey) return
    setLoading(true)
    try {
      const res = await client.getMoeBrainRpg(agentKey)
      if (!res.success || !res.data) {
        setRpg(null)
        showToast(res.message || 'RPG 数据加载失败')
        return
      }
      setRpg(normalizeBrainRpgData(res.data))
      setDreamCron(res.data.dream_cron || '0 4 * * *')
      setDreamEnabled(Boolean(res.data.dream_enabled))
      setAutonomousMind(Boolean(res.data.autonomous_mind_enabled))
    } catch (e) {
      setRpg(null)
      showToast(e instanceof DeployApiError ? e.message : 'RPG 数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [agentKey, client, showToast])`,
  `  const loadRpg = useCallback(async (): Promise<BrainRpgData | null> => {
    if (!agentKey) return null
    setLoading(true)
    try {
      const res = await client.getMoeBrainRpg(agentKey)
      if (!res.success || !res.data) {
        setRpg(null)
        showToast(res.message || 'RPG 数据加载失败')
        return null
      }
      const normalized = normalizeBrainRpgData(res.data)
      setRpg(normalized)
      setDreamCron(res.data.dream_cron || '0 4 * * *')
      setDreamEnabled(Boolean(res.data.dream_enabled))
      setAutonomousMind(Boolean(res.data.autonomous_mind_enabled))
      return normalized
    } catch (e) {
      setRpg(null)
      showToast(e instanceof DeployApiError ? e.message : 'RPG 数据加载失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [agentKey, client, showToast])`,
)

mustReplace(
  'dream',
  `      async () => {
        const res = await client.runMoeBrainDream(agentKey, { skip_curate: skipCurate, async: false })
        if (res.success && res.data) {
          setMessage(res.data.summary || '入梦完成')
          setMessageTone('ok')
          showToast(\`入梦 +\${res.data.xp_gained} XP · Lv.\${res.data.level}\`)
          setSideTab('dreams')
        }
        await loadRpg()
      },`,
  `      async () => {
        const data = await loadRpg()
        const lastDream = data?.recent_dreams?.[0]
        if (lastDream) {
          setMessage(lastDream.summary || '入梦完成')
          setMessageTone('ok')
          showToast(\`入梦 +\${lastDream.xp_gained} XP · Lv.\${data?.level ?? 1}\`)
        }
        setSideTab('dreams')
      },`,
)

mustReplace(
  'compress',
  `      async () => {
        const res = await client.compressMoeBrainMemories(agentKey, { days: 7, async: false })
        if (res.success && res.data) {
          const d = res.data
          const detail = [
            d.swept_count ? \`清扫 \${d.swept_count}\` : '',
            d.merged_clusters ? \`合并 \${d.merged_clusters} 簇\` : '',
            d.marked_count ? \`标记 \${d.marked_count}\` : '',
          ]
            .filter(Boolean)
            .join(' · ')
          setMessage(d.summary || detail || '压缩完成')
          setMessageTone('ok')
          showToast(\`\${detail || '压缩完成'} +\${d.xp_gained} XP\`)
          setSideTab('log')
        }
        await loadRpg()
      },`,
  `      async () => {
        const data = await loadRpg()
        const ev = data?.recent_events?.find((e) => e.kind === 'compress') ?? data?.recent_events?.[0]
        if (ev) {
          setMessage(ev.summary)
          setMessageTone('ok')
          showToast(ev.summary + (ev.xp_gained ? \` +\${ev.xp_gained} XP\` : ''))
        }
        setSideTab('log')
      },`,
)

mustReplace(
  'tidy',
  `      async () => {
        const res = await client.tidyMoeBrainFragments(agentKey, { max_episodes: 10, async: false })
        if (res.success && res.data) {
          const d = res.data
          setMessage(d.detail || \`整理 \${d.approved}/\${d.total}\`)
          setMessageTone(d.approved > 0 ? 'ok' : 'warn')
          showToast(d.detail || \`+\${d.xp_gained} XP\`)
          setSideTab('log')
        } else {
          showToast(res.message || '整理失败')
        }
        await loadRpg()
      },`,
  `      async () => {
        const data = await loadRpg()
        const ev = data?.recent_events?.find((e) => e.kind === 'tidy') ?? data?.recent_events?.[0]
        if (ev) {
          setMessage(ev.summary)
          setMessageTone(ev.xp_gained > 0 ? 'ok' : 'warn')
          showToast(ev.summary)
        }
        setSideTab('log')
      },`,
)

fs.writeFileSync(path, s.replace(/\n/g, '\r\n'), 'utf8')
console.log('OK: BrainRpgPanel.tsx updated')
