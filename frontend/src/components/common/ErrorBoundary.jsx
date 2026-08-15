import React from "react";

// Top-level error boundary — catches any uncaught render error anywhere in
// the tree (including a failed 3D/WebGL init, since Canvas errors propagate
// as normal React errors) and shows a calm recovery screen instead of a
// blank white crash. This does not change any progression logic; it only
// changes what the user sees if something unexpected throws.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Kept intentionally minimal — no telemetry/logging endpoint exists in
    // this app, so we just surface it to the browser console for debugging
    // rather than silently swallowing it.
    // eslint-disable-next-line no-console
    console.error("AXIOM ErrorBoundary caught:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#000", color: "#EAEAEA", fontFamily: "monospace", textAlign: "center", padding: 24,
        }}
      >
        <div>
          <div style={{ color: "#00F0FF", letterSpacing: "0.4em", fontSize: 12, marginBottom: 16 }}>
            // AXIOM SYSTEM INTERRUPTION
          </div>
          <div style={{ fontSize: 20, marginBottom: 20 }}>
            Something went wrong rendering this screen. Your progression is safe on the server.
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              background: "transparent", border: "1px solid rgba(0,240,255,0.5)", color: "#00F0FF",
              padding: "10px 20px", letterSpacing: "0.2em", fontFamily: "monospace", cursor: "pointer",
            }}
          >
            RELOAD AXIOM
          </button>
        </div>
      </div>
    );
  }
}
