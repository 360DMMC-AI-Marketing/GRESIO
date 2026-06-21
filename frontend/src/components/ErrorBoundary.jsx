import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-surface-800 mb-2">Something went wrong</h2>
            <p className="text-surface-500 mb-6 text-sm">
              {this.state.error.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
