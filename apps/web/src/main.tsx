import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force a SW update check on every page load so stale workers (with old API caching) are
// replaced immediately rather than waiting for the browser's 24-hour check cycle.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().catch(() => {});
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
