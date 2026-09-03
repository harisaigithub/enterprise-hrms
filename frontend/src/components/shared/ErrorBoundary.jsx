import React from "react";
import { AlertTriangle, RefreshCw, Home, ChevronDown } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, can log to an external monitoring endpoint like Sentry
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        });
      }

      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 16px",
          }}
        >
          <div
            style={{
              maxWidth: "560px",
              width: "100%",
              background: "var(--card, #ffffff)",
              borderRadius: "16px",
              border: "1px solid var(--border, #e2e8f0)",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#fef2f2",
                color: "#dc2626",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text, #0f172a)",
                marginBottom: "8px",
              }}
            >
              Something went wrong in this module
            </h2>

            <p
              style={{
                fontSize: "13.5px",
                color: "var(--subtext, #64748b)",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              An unexpected error prevented this component from displaying properly. Other parts of the system remain fully functional.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: "var(--primary, #0f766e)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <RefreshCw size={15} /> Try Again
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: "var(--background, #f8fafc)",
                  color: "var(--text, #0f172a)",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "1px solid var(--border, #e2e8f0)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Home size={15} /> Dashboard
              </button>
            </div>

            {this.state.error && (
              <div
                style={{
                  marginTop: "16px",
                  textAlign: "left",
                  background: "var(--background, #f8fafc)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  border: "1px solid var(--border, #e2e8f0)",
                }}
              >
                <div
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--subtext, #64748b)",
                  }}
                >
                  <span>Technical details</span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: this.state.showDetails ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>

                {this.state.showDetails && (
                  <pre
                    style={{
                      marginTop: "10px",
                      fontSize: "11px",
                      color: "#dc2626",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxHeight: "160px",
                      lineHeight: 1.4,
                      fontFamily: "monospace",
                    }}
                  >
                    {this.state.error?.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
