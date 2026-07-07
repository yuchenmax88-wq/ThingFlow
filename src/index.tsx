import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import App from "./app";
import "./index.css";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-foreground">
      <p className="text-lg font-semibold">Something went wrong</p>
      <pre className="text-sm text-muted-foreground">{message}</pre>
      <button onClick={resetErrorBoundary} className="px-4 py-2 rounded bg-primary text-primary-foreground">
        Retry
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      )}>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>,
);
