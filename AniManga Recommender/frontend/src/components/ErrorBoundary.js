import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // This lifecycle method is used to render a fallback UI after an error has been thrown.
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // This lifecycle method is used to log error information.
  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
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
        >
          <h2>Oops! Something went wrong.</h2>
          <p>
            We're sorry for the inconvenience. Please try refreshing the page, or contact support if the
            problem persists.
          </p>
          {/* In development, you might want to show more details */}
          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <details
              style={{
                whiteSpace: "pre-wrap",
                marginTop: "20px",
                textAlign: "left",
                background: "#f9f9f9",
                padding: "10px",
              }}
            >
              <summary>Error Details (Development Mode)</summary>
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
