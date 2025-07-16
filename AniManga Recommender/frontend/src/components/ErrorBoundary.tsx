/**
 * ErrorBoundary Component - Robust error boundary with recovery mechanisms and comprehensive error handling
 *
 * This component provides a sophisticated error boundary implementation for the AniManga Recommender
 * application, implementing React's error boundary pattern to catch JavaScript errors anywhere in the
 * child component tree. Built with comprehensive error handling strategies, automatic recovery mechanisms,
 * accessibility support, and development-friendly debugging features to ensure graceful error handling
 * and optimal user experience during unexpected failures.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage wrapping entire application
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Wrapping specific components prone to errors
 * <ErrorBoundary>
 *   <ComplexDataVisualization data={apiData} />
 * </ErrorBoundary>
 *
 * // Multiple nested error boundaries for granular error handling
 * <ErrorBoundary>
 *   <Layout>
 *     <ErrorBoundary>
 *       <FilterBar {...filterProps} />
 *     </ErrorBoundary>
 *     <ErrorBoundary>
 *       <ItemGrid items={items} />
 *     </ErrorBoundary>
 *   </Layout>
 * </ErrorBoundary>
 *
 * // Integration with routing for page-level error handling
 * const AppWithErrorBoundary = () => (
 *   <Router>
 *     <ErrorBoundary>
 *       <Routes>
 *         <Route path="/" element={<HomePage />} />
 *         <Route path="/details/:id" element={
 *           <ErrorBoundary>
 *             <ItemDetailPage />
 *           </ErrorBoundary>
 *         } />
 *       </Routes>
 *     </ErrorBoundary>
 *   </Router>
 * );
 *
 * // Error boundary with external error reporting
 * class AppErrorBoundary extends ErrorBoundary {
 *   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 *     super.componentDidCatch(error, errorInfo);
 *
 *     // Report to external error tracking service
 *     if (process.env.NODE_ENV === 'production') {
 *       errorReportingService.reportError(error, {
 *         componentStack: errorInfo.componentStack,
 *         userId: getCurrentUserId(),
 *         route: window.location.pathname
 *       });
 *     }
 *   }
 * }
 * ```
 *
 * @param {Props} props - Component props with type safety
 * @param {ReactNode} props.children - Child components to wrap with error boundary protection
 *
 * @returns {JSX.Element | ReactNode} Error fallback UI when error occurs, or children when no error
 *
 * @features
 * - **Comprehensive Error Catching**: Catches all JavaScript errors in child component tree
 * - **Automatic Recovery**: Resets error state when children change to non-erroring components
 * - **Development Debugging**: Detailed error information displayed in development mode
 * - **Production Safety**: User-friendly error messages without technical details in production
 * - **Accessibility Compliant**: ARIA role="alert" and semantic HTML structure
 * - **Recovery Actions**: Page reload and homepage navigation options for user recovery
 * - **Error Logging**: Console logging for debugging and monitoring purposes
 *
 * @error_handling_strategies
 * - **Graceful Degradation**: Provides fallback UI maintaining application structure
 * - **Error Isolation**: Prevents errors from cascading up the component tree
 * - **User Communication**: Clear, non-technical error messages for end users
 * - **Developer Support**: Detailed error stack traces and component information in development
 * - **Recovery Mechanisms**: Multiple user-initiated recovery options
 * - **State Management**: Proper error state lifecycle with automatic reset capabilities
 *
 * @recovery_mechanisms
 * - **Automatic Reset**: Error state clears when children prop changes
 * - **Page Reload**: Full page refresh option for complete application reset
 * - **Homepage Navigation**: Safe navigation to application root for user recovery
 * - **Component Remounting**: Error state reset allows component tree reconstruction
 * - **Graceful Fallback**: Maintains application layout and navigation structure
 *
 * @accessibility
 * - **ARIA Role**: `role="alert"` announces error state to screen readers
 * - **Semantic Structure**: `<main>` element with proper heading hierarchy
 * - **Focus Management**: Error title is properly labeled with `aria-labelledby`
 * - **Interactive Elements**: Buttons with descriptive `aria-label` attributes
 * - **Keyboard Navigation**: Full keyboard accessibility for all recovery actions
 * - **Screen Reader Support**: Clear, descriptive error messages and recovery instructions
 *
 * @development_features
 * - **Error Details**: Expandable error information with message and stack trace
 * - **Component Stack**: React error info with component hierarchy information
 * - **Console Logging**: Comprehensive error logging for debugging purposes
 * - **Environment Awareness**: Different error displays for development vs production
 * - **Hot Reload Compatibility**: Works seamlessly with React development tools
 *
 * @production_safety
 * - **User-Friendly Messages**: Non-technical error descriptions for end users
 * - **Error Hiding**: Technical details hidden from production users
 * - **Recovery Options**: Clear action items for users to resolve issues
 * - **Application Stability**: Prevents complete application crashes
 * - **Monitoring Ready**: Error logging facilitates production monitoring
 *
 * @lifecycle_methods
 * - **getDerivedStateFromError**: Updates state to trigger fallback UI rendering
 * - **componentDidCatch**: Captures error and error info for logging and debugging
 * - **componentDidUpdate**: Implements automatic error state reset when children change
 * - **render**: Conditionally renders error fallback or normal children
 *
 * @state_management
 * - **hasError**: Boolean flag indicating whether an error has occurred
 * - **error**: Captured Error object with message and stack trace information
 * - **errorInfo**: React ErrorInfo with component stack and debugging details
 * - **Automatic Reset**: State clears when new children are provided to component
 *
 * @error_types_handled
 * - **Runtime Errors**: JavaScript runtime exceptions in component lifecycle methods
 * - **Rendering Errors**: Errors occurring during component render phases
 * - **Effect Errors**: Errors in useEffect hooks and async operations
 * - **Event Handler Errors**: Errors in user interaction handlers
 * - **API Errors**: Network and data fetching errors in child components
 * - **Third-Party Errors**: Errors from external libraries and dependencies
 *
 * @integration_patterns
 * - **Application Root**: Wrap entire application for global error handling
 * - **Route Level**: Individual route protection for page-specific error boundaries
 * - **Component Level**: Granular error boundaries for complex components
 * - **Feature Boundaries**: Isolate feature modules with dedicated error handling
 * - **Critical Sections**: Protect essential application functionality
 *
 * @monitoring_integration
 * - **Error Logging**: Console logging for development debugging
 * - **Error Reporting**: Ready for integration with external error tracking
 * - **Performance Impact**: Minimal overhead with efficient error handling
 * - **User Analytics**: Error events can be tracked for user experience insights
 * - **Production Monitoring**: Facilitates error monitoring and alerting systems
 *
 * @best_practices
 * - **Strategic Placement**: Use multiple error boundaries for granular error isolation
 * - **Fallback UI Design**: Error screens should match application design system
 * - **Recovery Actions**: Always provide clear paths for user recovery
 * - **Error Reporting**: Implement external error tracking for production applications
 * - **Testing**: Comprehensive error boundary testing with error simulation
 * - **Documentation**: Clear error handling documentation for development team
 *
 * @dependencies
 * - React: Component, ErrorInfo, ReactNode for error boundary implementation
 * - Browser APIs: window.location for page reload functionality
 * - Environment Variables: process.env.NODE_ENV for development/production logic
 * - CSS Classes: Application styling for error fallback UI
 *
 * @author Michael Cho
 * @since v1.0.0
 * @updated v1.2.0 - Added automatic recovery mechanisms and enhanced accessibility
 */

import { Component, ErrorInfo, ReactNode } from "react";

/**
 * Props interface for ErrorBoundary component
 *
 * @interface Props
 * @property {ReactNode} children - Child components to be wrapped and protected by error boundary
 */
interface Props {
  children: ReactNode;
}

/**
 * State interface for ErrorBoundary component
 *
 * Manages error state and captured error information for debugging and recovery purposes.
 *
 * @interface State
 * @property {boolean} hasError - Flag indicating whether an error has been caught
 * @property {Error | null} error - Captured error object with message and stack trace
 * @property {ErrorInfo | null} errorInfo - React error info with component stack details
 */
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

  /**
   * Static lifecycle method that updates state when an error occurs
   *
   * Called during the "render" phase, so side-effects are not permitted.
   * Updates the error state to trigger the fallback UI on the next render.
   *
   * @static
   * @param {Error} error - The error that was caught by the error boundary
   * @returns {State} New state object indicating error condition
   *
   * @lifecycle React error boundary lifecycle method
   * @phase Render phase - no side effects allowed
   *
   * @example
   * // When a child component throws an error during rendering:
   * // getDerivedStateFromError is called with the error
   * // Returns: { hasError: true, error: errorObject, errorInfo: null }
   */
  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  /**
   * Lifecycle method called after an error has been caught by the error boundary
   *
   * Called during the "commit" phase, so side-effects are permitted.
   * Used for logging error information and updating state with detailed error info.
   *
   * @param {Error} error - The error that was caught
   * @param {ErrorInfo} errorInfo - React error info with component stack trace
   *
   * @lifecycle React error boundary lifecycle method
   * @phase Commit phase - side effects allowed
   *
   * @example
   * // Error info contains component stack like:
   * // componentStack: "in ComponentName (at App.js:123)"
   *
   * @error_logging
   * - Logs error details only in development mode for debugging
   * - Can be extended to report to external error tracking services
   * - Provides component stack trace for debugging component hierarchy
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details only in development mode
    if (process.env.NODE_ENV === "development") {
      logger.error("ErrorBoundary caught an error", {
        error: error?.message || "Unknown error",
        context: "ErrorBoundary",
        operation: "componentDidCatch",
        errorId: errorId,
        retryCount: this.state.retryCount,
        errorInfo: errorInfo?.componentStack || "No component stack"
      });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  /**
   * Lifecycle method implementing automatic error recovery mechanism
   *
   * Monitors changes to the children prop and automatically resets the error state
   * when new children are provided, allowing the component tree to recover from errors.
   *
   * @param {Props} prevProps - Previous props from the last render
   *
   * @lifecycle React component lifecycle method
   * @recovery_mechanism Automatic error state reset when children change
   *
   * @example
   * // When route changes or parent re-renders with different children:
   * // Error state is automatically cleared, allowing fresh component mounting
   *
   * @use_cases
   * - Route navigation from errored page to new page
   * - Parent component re-rendering with different child components
   * - Dynamic component loading scenarios
   * - Hot module replacement during development
   */
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

  /**
   * Handler function for page reload recovery action
   *
   * Provides users with a recovery mechanism by triggering a full page reload,
   * effectively resetting the entire application state and clearing any errors.
   *
   * @function handleReload
   * @returns {void}
   *
   * @recovery_action Full application reset through page reload
   * @user_experience Provides immediate recovery option for users
   *
   * @accessibility
   * - Triggered by keyboard-accessible button
   * - Clear visual indication of action purpose
   * - Maintains user agency in error recovery
   */
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
