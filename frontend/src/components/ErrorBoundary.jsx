import { Component } from "react";
import { log } from "../firebase";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    try {
      const stackLine = errorInfo.componentStack?.split("\n")[1]?.trim() || "unknown";
      log("render_error", {
        message: error.message,
        component: stackLine,
        boundary: this.props.name || "root",
        stack: error.stack || "",
      });
    } catch { /* Analytics offline */ }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Algo deu errado
            </h2>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a pagina.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
