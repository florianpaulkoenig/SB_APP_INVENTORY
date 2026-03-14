import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Per-route error boundary — catches render errors in individual pages
// without crashing the entire app.
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundaryInner extends Component<
  Props & { onNavigateHome: () => void },
  State
> {
  constructor(props: Props & { onNavigateHome: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
          <div className="rounded-full bg-red-50 p-3">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-primary-900">
            Something went wrong
          </h2>
          <p className="max-w-md text-sm text-primary-500">
            An unexpected error occurred on this page. The rest of the app is
            still working.
          </p>
          {this.state.error && (
            <p className="max-w-md rounded bg-primary-50 px-3 py-2 text-xs text-primary-400 font-mono">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-md bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
            >
              Try Again
            </button>
            <button
              onClick={this.props.onNavigateHome}
              className="rounded-md border border-primary-200 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Wrap around lazy-loaded page content to catch render errors per-route
 * without crashing the entire app layout.
 */
export function RouteErrorBoundary({ children }: Props) {
  const navigate = useNavigate();
  return (
    <RouteErrorBoundaryInner onNavigateHome={() => navigate('/')}>
      {children}
    </RouteErrorBoundaryInner>
  );
}
