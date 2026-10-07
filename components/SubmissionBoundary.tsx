'use client';

// A review card must never take the whole teacher page down. A stored submission is whatever the
// student's browser sent, and the chart renderer (React Flow) throws on shapes it does not expect.
// lib/diagram-artifact.ts makes the chart it is handed well-formed, so this is the second line:
// anything that still throws while drawing ONE submission shows the raw text for that submission
// and leaves the rest of /teacher alone (round 7).

import { Component, type ReactNode } from 'react';

interface Props {
  /** The submission's own text, shown in place of whatever failed to draw. */
  raw: string;
  children: ReactNode;
}

export default class SubmissionBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn('A submission could not be displayed:', err);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ color: '#f8f8f2', fontSize: '0.85rem', lineHeight: 1.5 }}>
        <div style={{ color: '#ffb86c', fontWeight: 600, marginBottom: 4 }}>
          This submission could not be displayed. Its text is shown instead.
        </div>
        <div style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto', background: '#1e1f29', borderRadius: 4, padding: '6px 8px' }}>
          {this.props.raw || '(no response)'}
        </div>
      </div>
    );
  }
}
