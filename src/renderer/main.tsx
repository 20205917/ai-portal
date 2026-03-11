import React, { type ReactNode } from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./styles.css";

interface RendererErrorBoundaryState {
  errorMessage: string | null;
}

class RendererErrorBoundary extends React.Component<{ children: ReactNode }, RendererErrorBoundaryState> {
  state: RendererErrorBoundaryState = { errorMessage: null };

  private readonly onWindowError = (event: ErrorEvent) => {
    if (event.error instanceof Error) {
      this.setState({ errorMessage: event.error.message });
      return;
    }
    this.setState({ errorMessage: event.message || "渲染层发生未知错误。" });
  };

  private readonly onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      this.setState({ errorMessage: reason.message });
      return;
    }
    this.setState({ errorMessage: String(reason || "渲染层发生未知错误。") });
  };

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { errorMessage: error.message || "渲染层发生未知错误。" };
  }

  componentDidCatch(error: Error): void {
    console.error("[AIDC] Renderer crashed:", error);
  }

  componentDidMount(): void {
    window.addEventListener("error", this.onWindowError);
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener("error", this.onWindowError);
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  render(): ReactNode {
    if (this.state.errorMessage) {
      return (
        <div className="loading-shell">
          <div className="loading-card">
            <span className="eyebrow">AIDC</span>
            <h1>渲染层异常</h1>
            <p>{this.state.errorMessage}</p>
            <button type="button" className="primary-action" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RendererErrorBoundary>
      <App />
    </RendererErrorBoundary>
  </React.StrictMode>
);
