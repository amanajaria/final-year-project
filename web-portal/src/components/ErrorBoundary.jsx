import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f0f1a] text-white font-sans p-6">
          {/* Background glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-lg glass border border-red-500/20 rounded-3xl p-10 shadow-2xl text-center backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-6 shadow-lg shadow-red-500/5">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Interface Error</h1>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Something unexpected happened in the portal. Your session is safe — reload the interface to continue.
            </p>

            {this.state.error && (
              <div className="mb-6">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-xs text-[var(--text-muted)] hover:text-white transition-colors underline mb-3"
                >
                  {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
                </button>
                {this.state.showDetails && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-left max-h-40 overflow-y-auto font-mono text-[10px] text-red-300/80 custom-scrollbar animate-slide-up leading-relaxed">
                    <span className="font-semibold block text-red-400 mb-1">Diagnostic Log:</span>
                    {this.state.error.stack || this.state.error.message || String(this.state.error)}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="btn-primary w-full justify-center py-3 text-base font-semibold shadow-lg shadow-brand-600/30"
            >
              <RefreshCw size={18} className="animate-spin-hover" />
              Reload Interface
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
