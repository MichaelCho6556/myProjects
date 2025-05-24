import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component - Catches JavaScript errors in component tree with TypeScript support
 *
 * This component provides a fallback UI when errors occur and logs error information
 * for debugging purposes in development mode.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * This lifecycle method is used to render a fallback UI after an error has been thrown.
   *
   * @param error - The error that was thrown
   * @returns Updated state to trigger fallback UI
   */
  static getDerivedStateFromError(_error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  /**
   * This lifecycle method is used to log error information.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Component stack trace information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          style={{
            margin: "20px",
            padding: "20px",
            border: "1px solid red",
            borderRadius: "8px",
            backgroundColor: "#fff0f0",
            textAlign: "center",
          }}
          role="alert"
          aria-live="assertive"
        >
          <h2>Oops! Something went wrong.</h2>
          <p>
            We're sorry for the inconvenience. Please try refreshing the page, or contact support if the
            problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>

          {/* In development, you might want to show more details */}
          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <details
              style={{
                whiteSpace: "pre-wrap",
                marginTop: "20px",
                textAlign: "left",
                background: "#f9f9f9",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                Error Details (Development Mode)
              </summary>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}

export default ErrorBoundary;
