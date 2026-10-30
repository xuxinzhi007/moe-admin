import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Moe Ops UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-fallback">
          <h2>页面渲染异常</h2>
          <p>{this.state.error.message}</p>
          <p className="hint">
            若在子路径刷新出错，请确认通过{' '}
            <a href="/ops/">/ops/</a> 访问；或返回总览后重试。
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              this.setState({ error: null })
              window.location.href = '/ops/'
            }}
          >
            回到总览
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
