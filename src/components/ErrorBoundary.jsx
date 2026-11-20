import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: '6rem 2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F1B17' }}>Something went wrong</h2>
        <p style={{ color: '#6E6862', margin: '8px 0 20px' }}>This screen hit an unexpected error. Your data has not been changed.</p>
        <button
          onClick={() => { this.setState({ error: null }); }}
          style={{ background: '#ED7D31', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 9999, fontWeight: 700, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    );
  }
}
