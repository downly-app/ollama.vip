import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'highlight.js/styles/github-dark.css'
import './i18n';

// Import test tools in development environment
if (import.meta.env.DEV) {
  import('./utils/testApiConfig');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
