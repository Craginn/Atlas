import React from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';

// Catches a rendering crash inside one view so it can't take the whole app down.
//
// Without this, any error thrown while React renders unmounts everything and
// the window goes blank white. With it, the crashed view shows what happened
// and a "Try again" button, and the menu (and every other view) keeps working.
// Your scripts and state live above this boundary, so nothing is lost.

interface Props {
  /** Shown in the message, e.g. "Block Canvas". */
  viewName: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ViewErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the full trace in the developer console (Ctrl+Shift+I).
    console.error(`[Atlas] ${this.props.viewName} crashed:`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0a0a0c]">
        <div className="max-w-lg w-full rounded-xl border border-red-500/40 bg-red-950/20 p-5 space-y-3 font-sans">
          <div className="flex items-center gap-2 text-red-200 font-semibold">
            <AlertOctagon size={18} className="text-red-400" />
            {this.props.viewName} ran into a problem
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            This view crashed while drawing, so Atlas stopped it here instead of closing the whole app.
            Your scripts and state are safe. Try again, or switch to another view from the menu.
          </p>
          <pre className="text-[11px] font-mono text-red-200/80 bg-black/40 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">
            {error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 text-sm font-semibold"
          >
            <RotateCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }
}
