import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import App from "./App";
import { ErrorFallback } from "./ErrorFallback";

import "./global.css";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
    </ErrorBoundary>,
);
