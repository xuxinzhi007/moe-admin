import { useCallback, useEffect, useRef, useState } from 'react'
import type { EnvKvRow } from '../components/EnvKv'
import { useDeploy } from '../context/DeployContext'
import type { AgentMeta } from '../context/DeployContext'

export type OverviewState = {
  loading: boolean
  localLoading: boolean
  localRows: EnvKvRow[]
  localBadge: { text: string; kind: 'ok' | 'fail' | 'pending' }
  cloudRows: EnvKvRow[]
  cloudBadge: { text: string; kind: 'ok' | 'fail' | 'pending' }
  cloudHostLabel: string
  cloudDockerOut: string
  metricsRows: EnvKvRow[]
  metricsLoading: boolean
}

const pendingLocal: EnvKvRow[] = [{ key: '状态', value: '加载中…' }]

export function useOverviewData(metricsTarget: string) {
  const { client, token, authOk, agentMeta, showToast } = useDeploy()
  const [state, setState] = useState<OverviewState>({
    loading: true,
    localLoading: false,
    localRows: pendingLocal,
    localBadge: { text: '—', kind: 'pending' },
    cloudRows: [{ key: '状态', value: '等待加载…' }],
    cloudBadge: { text: '—', kind: 'pending' },
    cloudHostLabel: '云 VPS',
    cloudDockerOut: '容器状态加载中…',
    metricsRows: [],
    metricsLoading: true,
  })

  const refreshLocal = useCallback(
    async (meta: AgentMeta | null, soft = false) => {
      if (!token.trim()) {
        setState((s) => ({
          ...s,
          localLoading: false,
          localRows: [{ key: '状态', value: '运维网关未就绪，请打开设置检测 Agent' }],
          localBadge: { text: '需 Token', kind: 'pending' },
        }))
        return
      }
      setState((s) => ({
        ...s,
        localLoading: true,
        ...(soft
          ? {}
          : {
              localRows: pendingLocal,
              localBadge: { text: '检测中', kind: 'pending' },
            }),
      }))
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), 35000)
      try {
        const data = await client.host('local', ctrl.signal)
        const h = data.host || {}
        const paths = data.resolved_paths || {}
        const goLine = (h.go_version || '').split('\n')[0].trim()
        const flutterLine = (h.flutter_version || '').split('\n')[0].trim()
        setState((s) => ({
          ...s,
          localLoading: false,
          localRows: [
            {
              key: '系统',
              value: `${h.platform || h.os || '—'} / ${h.arch || '—'}`,
            },
            {
              key: '本机 Shell',
              value: h.shell || meta?.windows_shell_label || '—',
            },
            { key: 'Go', value: goLine || '未检测到（检查 PATH）' },
            {
              key: 'Flutter',
              value: flutterLine || '未安装 / 不在 PATH',
            },
            {
              key: 'Make',
              value: h.has_make ? '可用' : '回退 go build',
            },
            {
              key: '工作区',
              value: paths.workspace || h.workspace_root || '—',
            },
            {
              key: 'Backend',
              value: paths.backend || h.backend_dir || '—',
            },
            {
              key: '编包目录',
              value: 'backend/bin/moe-social（Linux 单二进制产物）',
            },
          ],
          localBadge: {
            text: h.platform || h.os || '本机',
            kind: 'ok',
          },
        }))
      } catch (e) {
        const msg =
          e instanceof Error && e.name === 'AbortError'
            ? '本机环境检测超时（Docker/Flutter 较慢），请点刷新重试'
            : e instanceof Error
              ? e.message
              : '加载失败'
        setState((s) => ({
          ...s,
          localLoading: false,
          localRows: [{ key: '状态', value: msg }],
          localBadge: { text: '失败', kind: 'fail' },
        }))
      } finally {
        window.clearTimeout(timer)
      }
    },
    [client, token],
  )

  const refreshCloud = useCallback(async (soft = false) => {
    if (!token.trim()) {
      setState((s) => ({
        ...s,
        cloudRows: [{ key: '状态', value: '运维网关未就绪，请打开设置检测 Agent' }],
        cloudBadge: { text: '需 Token', kind: 'pending' },
        cloudDockerOut: '—',
      }))
      return
    }
    if (!soft) {
      setState((s) => ({
        ...s,
        cloudBadge: { text: '检测中', kind: 'pending' },
      }))
    }
    try {
      const info = await client.info()
      const runtime = info.cloud_deploy || {}
      if (String(runtime.backend_dir || '').includes('moe_social')) {
        showToast('Agent 可能仍用旧路径，请 deploy-agent-stop 后重启')
      }
      const targets = await client.targets()
      const cloud =
        targets.targets?.find((t) => t.id === 'cloud' || t.kind === 'ssh') ||
        {}
      const hostLabel = cloud.host
        ? `${cloud.user || 'root'}@${cloud.host}`
        : cloud.label || 'cloud'

      let sshOk = false
      let sshMsg = '—'
      try {
        const ssh = await client.sshCheck('cloud')
        sshOk = !!ssh.success
        sshMsg = ssh.probe?.message || (sshOk ? 'SSH 连通' : 'SSH 失败')
      } catch (e) {
        sshMsg = e instanceof Error ? e.message : 'SSH 检查失败'
      }

      let pathMsg = '—'
      let backendDir = String(runtime.backend_dir || cloud.backend_dir || '—')
      const composePath =
        String(runtime.compose_path || '') ||
        `${backendDir}/docker-compose.binary.yml`
      let composeOk = '—'
      try {
        const chk = await client.remoteCheck('cloud')
        const c = chk.check || {}
        pathMsg = c.message || (chk.success ? '路径就绪' : '路径异常')
        backendDir = c.backend_dir || backendDir
        composeOk = c.compose_file_exists ? '存在' : '缺失'
      } catch (e) {
        pathMsg = e instanceof Error ? e.message : '巡检失败'
      }

      let dockerOut = '—'
      try {
        const st = await client.status('cloud')
        dockerOut = st.output || st.message || '(无输出)'
        if (!st.success && st.message) {
          dockerOut = `${st.message}\n${dockerOut}`
        }
      } catch (e) {
        dockerOut = e instanceof Error ? e.message : '状态获取失败'
      }

      setState((s) => ({
        ...s,
        cloudHostLabel: hostLabel,
        cloudRows: [
          { key: 'SSH', value: sshOk ? '连通 ✓' : sshMsg },
          { key: '主机', value: hostLabel },
          { key: 'Agent 云路径', value: backendDir },
          { key: 'compose', value: composePath },
          { key: 'compose 就绪', value: composeOk },
          { key: '容器', value: 'moe-social' },
          {
            key: '线上 API',
            value: String(cloud.api_base_url || runtime.api_base_url || '—'),
          },
          { key: '路径巡检', value: pathMsg },
        ],
        cloudDockerOut: dockerOut,
        cloudBadge: {
          text: sshOk ? 'SSH 在线' : 'SSH 异常',
          kind: sshOk ? 'ok' : 'fail',
        },
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败'
      setState((s) => ({
        ...s,
        cloudRows: [{ key: '错误', value: msg }],
        cloudDockerOut: msg,
        cloudBadge: { text: '失败', kind: 'fail' },
      }))
    }
  }, [client, showToast, token])

  const refreshMetrics = useCallback(async () => {
    if (!token.trim()) {
      setState((s) => ({ ...s, metricsRows: [], metricsLoading: false }))
      return
    }
    setState((s) => ({ ...s, metricsLoading: true }))
    try {
      const data = await client.host(metricsTarget)
      const h = data.host || {}
      const tgt = (data.target || {}) as Record<string, string>
      const isCloud = metricsTarget === 'cloud'
      setState((s) => ({
        ...s,
        metricsLoading: false,
        metricsRows: [
          { key: '当前目标', value: tgt.label || metricsTarget },
          { key: '运行平台', value: h.platform || h.os || '—' },
          {
            key: 'Docker',
            value: isCloud
              ? h.docker_version || '远程'
              : '本机不检测（云 VPS 使用）',
          },
          {
            key: 'Compose',
            value: isCloud ? h.compose_cli || '—' : '—',
          },
          { key: 'Make', value: h.has_make ? '可用' : '回退 go build' },
          { key: 'Go', value: (h.go_version || '—').split('\n')[0] },
          { key: 'Flutter', value: (h.flutter_version || '—').split('\n')[0] },
          {
            key: '线上 API',
            value: isCloud ? tgt.api_base_url || '—' : '—',
          },
          { key: '工作区', value: h.workspace_root || '—' },
        ],
      }))
    } catch (e) {
      setState((s) => ({
        ...s,
        metricsLoading: false,
        metricsRows: [
          {
            key: '连接失败',
            value: e instanceof Error ? e.message : 'error',
          },
        ],
      }))
    }
  }, [client, metricsTarget, token])

  const refreshAll = useCallback(
    async (soft = false) => {
      if (!soft) setState((s) => ({ ...s, loading: true }))
      await Promise.all([
        refreshLocal(agentMeta, soft),
        refreshCloud(soft),
        refreshMetrics(),
      ])
      setState((s) => ({ ...s, loading: false }))
    },
    [agentMeta, refreshCloud, refreshLocal, refreshMetrics],
  )

  /** 仅在 Token 验证通过后拉取一次，避免 probeAgent 更新 agentMeta 时反复刷新卡片 */
  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (authOk !== true) {
      initialLoadDone.current = false
      if (!token.trim()) {
        setState((s) => ({
          ...s,
          loading: false,
          localRows: [{ key: '状态', value: '运维网关未就绪' }],
          cloudRows: [{ key: '状态', value: '运维网关未就绪' }],
        }))
      }
      return
    }
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    void refreshAll(false)
  }, [authOk, token, refreshAll])

  useEffect(() => {
    if (authOk === true) void refreshMetrics()
  }, [authOk, metricsTarget, refreshMetrics])

  return {
    ...state,
    refreshAll: () => refreshAll(true),
    refreshCloud: () => refreshCloud(true),
    refreshLocal: () => refreshLocal(agentMeta, true),
    refreshMetrics,
  }
}
