import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import AppRouter from './routes/router'
import ErrorBoundary from './components/ErrorBoundary'
import { log } from './firebase'
import './index.css'

window.onerror = (message, source, lineno, colno, error) => {
  if (error) {
    log("js_error", {
      message: String(message),
      source: source || "unknown",
      line: lineno || 0,
      stack: error.stack || "",
    });
  }
  return false;
};

window.onunhandledrejection = (event) => {
  log("unhandled_rejection", {
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack || "",
  });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary name="root">
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
