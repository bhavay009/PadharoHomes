import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Catches render errors so a single broken component can't white-screen the app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production this is where you'd report to Sentry/LogRocket.
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-bg-light px-6 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-muted">
              An unexpected error occurred. Please reload the page — if it keeps
              happening, try again shortly.
            </p>
            <button
              onClick={() => window.location.assign("/")}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-brand-500 px-5 font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
