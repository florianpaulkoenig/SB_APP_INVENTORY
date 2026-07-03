import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initMonitoring, reportError } from './lib/monitoring';

initMonitoring();

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { source: 'unhandledrejection' });
});

// ---------------------------------------------------------------------------
// Stale-deploy recovery: after each deploy the hashed chunk filenames change
// and GitHub Pages deletes the old ones. A browser holding a cached
// index.html (max-age=600) then 404s on lazy chunks. Vite fires
// 'vite:preloadError' in that case — reload once to pick up the fresh
// index.html instead of showing a broken page.
// ---------------------------------------------------------------------------
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_FLAG = 'chunk-reload-at';
  const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
  // Only auto-reload if we haven't done so in the last 30s (avoids loops)
  if (Date.now() - lastReload > 30_000) {
    event.preventDefault(); // suppress the error; we're handling it
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
