import { Component } from "react";
import { Code2, AlertCircle } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-ink text-[#EDEEF0] p-8">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 w-16 h-16 rounded-xl border-2 border-rust/30 bg-rust/10 flex items-center justify-center">
              <AlertCircle size={24} className="text-rust" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-[#8B92A0] mb-4">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-[#f0b257] transition-colors"
            >
              Reload the page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
