"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("App error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-2">சிக்கல் ஏற்பட்டது.</p>
            <p className="text-gray-400 text-xs mb-6">மீண்டும் முயற்சிக்கவும்.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
            >
              ← Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
