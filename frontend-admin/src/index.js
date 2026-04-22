import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// IMPORTANT:
// To avoid stale builds on normal refresh (F5), keep service worker disabled.
// Also unregister any previously installed worker and clean old xclean caches.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      if (window.caches?.keys) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key.startsWith("xclean-"))
            .map((key) => window.caches.delete(key))
        );
      }
      console.log("[xClean] Legacy service workers and caches cleaned.");
    } catch (err) {
      console.warn("[xClean] SW cleanup failed:", err);
    }
  });
}
