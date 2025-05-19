import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            border: "1px solid red",
            margin: "20px",
          }}
        >
          <h2>Something went wrong.</h2>
          <p>We're sorry, an unexpected error occurred.</p>
          {/* In development, you might want to show details */}
          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <details style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
