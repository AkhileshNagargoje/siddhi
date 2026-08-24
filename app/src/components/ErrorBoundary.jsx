import { Component } from 'react'

/* Without this, any throw during render blanks the whole page to white with no
   recovery but a reload — on a projector, in front of judges. This turns every
   remaining edge case into one honest panel instead. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    // Gate on an explicit flag, not on the error value: `throw undefined` or
    // `throw ''` would leave a falsy error, render the children again, throw
    // again, and React would give up and unmount to the white screen this
    // component exists to prevent.
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Atreya render error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="shell">
        <div className="panel" style={{ maxWidth: 560, margin: '48px auto' }}>
          <h3 style={{ margin: 0 }}>This screen hit an error</h3>
          <p className="chart-sub" style={{ marginTop: 8 }}>
            The rest of the system is unaffected — data is still being recorded and
            detection is still running.
          </p>
          <p className="chart-sub" style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {String(this.state.error?.message ?? this.state.error ?? 'unknown error')}
          </p>
          {/* Reload alone re-enters the route that just threw, so a deterministic
              error offers a recovery that cannot recover. The boundary sits
              outside the router, so a hard link is the only way back. */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <a className="btn btn-accent" href="/" style={{ textDecoration: 'none' }}>Back to start</a>
            <button className="btn btn-quiet" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </div>
    )
  }
}
