import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="limited-page" style={{ padding: "40px 20px" }}>
          <div style={{
            background: "white",
            border: "1px solid var(--line)",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
          }}>
            <h1 style={{ color: "var(--red)", fontSize: "24px", marginBottom: "12px" }}>
              Something went wrong
            </h1>
            <p style={{ color: "var(--muted)", marginBottom: "20px" }}>
              An unexpected error occurred in this section. You can try refreshing the page.
            </p>
            <pre style={{
              background: "#f8fafc",
              padding: "12px",
              borderRadius: "6px",
              fontSize: "12px",
              textAlign: "left",
              overflowX: "auto",
              marginBottom: "24px",
              border: "1px solid var(--line)"
            }}>
              {this.state.error?.toString()}
            </pre>
            <button onClick={this.handleRetry}>
              Try Again
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
