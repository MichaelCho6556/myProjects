/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: Props) {
    const { children } = this.props;
    const { hasError } = this.state;

    // Reset error state if children change to non-erroring component
    if (hasError && prevProps.children !== children) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <main className="error-boundary" role="alert" aria-labelledby="error-title">
          <div className="error-content">
            <h2 id="error-title" className="error-title">
              Something went wrong
            </h2>

            <p className="error-message">We're sorry, but something unexpected happened. Please try again.</p>

            {/* Show error details in development mode */}
            {process.env.NODE_ENV === "development" && error && (
              <details className="error-details">
                <summary>Error Details (Development Mode)</summary>
                <pre className="error-stack">
                  {error.message}
                  {error.stack && (
                    <>
                      <br />
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
                aria-label="Reload page"
              >
                Reload Page
              </button>

              <a href="/" className="btn btn-secondary" aria-label="Go to homepage">
                Go to Homepage
              </a>
            </div>
          </div>
        </main>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
