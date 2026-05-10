import { Component } from 'react';

const ERROR_BOUNDARY_RETRY_KEY = 'merxus.errorBoundaryModuleRetryTriggered';
const RETRY_WINDOW_MS = 30 * 1000;

function isRecoverableModuleError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('failed to load module script') ||
    message.includes('loading chunk') ||
    message.includes('mime type') ||
    message.includes("reading 'default'") ||
    message.includes('reading "default"')
  );
}

function retryWithCacheBust() {
  if (typeof window === 'undefined') return false;
  const lastRetry = Number(window.sessionStorage.getItem(ERROR_BOUNDARY_RETRY_KEY) || 0);
  if (Number.isFinite(lastRetry) && Date.now() - lastRetry < RETRY_WINDOW_MS) return false;
  window.sessionStorage.setItem(ERROR_BOUNDARY_RETRY_KEY, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set('__module_boundary_retry', String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (isRecoverableModuleError(error) && retryWithCacheBust()) {
      return;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-primary-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 mb-4">
              An unexpected error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer">Error details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

