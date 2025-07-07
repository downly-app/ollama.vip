import 'highlight.js/styles/github-dark.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';
import './i18n';
import './index.css';

// Import test tools in development environment
if (import.meta.env.DEV) {
  import('./utils/testApiConfig');
  import('./utils/test-optimization');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
