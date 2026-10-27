import React from "react";

type ErrorBoundaryState = {
  failed: boolean;
  message: string;
};

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unexpected renderer failure";
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    failed: false,
    message: ""
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      failed: true,
      message: getErrorMessage(error)
    };
  }

  componentDidCatch(error: unknown) {
    console.error("AFK HERO renderer failure", error);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetAndReload = async () => {
    try {
      const reset = await window.afkHeroStore?.reset();
      if (reset && !reset.ok) throw new Error("Native reset failed");
      const ownedKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter((key): key is string => key !== null && key.startsWith("afk-hero-"));
      for (const key of ownedKeys) localStorage.removeItem(key);
      window.location.reload();
    } catch {
      this.setState({ failed: true, message: "Reset failed; stored progress preserved" });
    }
  };

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <main className="aspect-shell">
        <section className="app-shell">
          <div className="crash-screen" role="alert">
            <div className="brand-mark large">AH</div>
            <span>Recovery Mode</span>
            <h1>AFK HERO stopped rendering.</h1>
            <p>{this.state.message}</p>
            <div className="crash-actions">
              <button type="button" onClick={this.reload}>
                Reload App
              </button>
              <button type="button" className="secondary" onClick={this.resetAndReload}>
                Start Fresh
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
