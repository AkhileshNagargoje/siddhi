import { Component } from 'react'

/* Without this, any throw during render blanks the whole page to white with no
   recovery but a reload — on a projector, in front of judges. This turns every
   remaining edge case into one honest panel instead. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Drishti render error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="shell">
        <div className="panel" style={{ maxWidth: 560, margin: '48px auto' }}>
          <h3 style={{ margin: 0 }}>This screen hit an error</h3>
          <p className="chart-sub" style={{ marginTop: 8 }}>
            The rest of the system is unaffected — data is still being recorded and
            detection is still running.
          </p>
          <p className="chart-sub" style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {String(this.state.error?.message ?? this.state.error)}
          </p>
          <button className="btn btn-accent" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
