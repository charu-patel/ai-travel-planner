// components/ErrorBoundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload(); // Quick UX fix since a refresh clears your stale state structure!
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto mt-8 p-6 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm text-center">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 text-xl mb-3">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-slate-950">
            {this.fallbackTitle || "Something went wrong loading this section"}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Data parsing encountered a temporary structure mismatch. A quick reload should clear it right up.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-4 inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm transition-all"
          >
            🔄 Refresh Page
          </button>
        </div>
      );
    }

    return this.children;
  }
}