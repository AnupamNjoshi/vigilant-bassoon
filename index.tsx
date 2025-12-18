
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Target container 'root' not found.");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("Critical rendering failure:", err);
  rootElement.innerHTML = `
    <div style="background: #09090b; color: #ef4444; padding: 20px; font-family: monospace; border: 1px solid #ef4444; border-radius: 8px; margin: 20px;">
      <h1 style="margin: 0 0 10px 0;">Critical Boot Failure</h1>
      <pre style="white-space: pre-wrap;">${err instanceof Error ? err.message : 'Unknown Error'}</pre>
    </div>
  `;
}
