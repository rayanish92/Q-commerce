import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import the PWA Virtual Module (Created by Vite during the Render build)
import { registerSW } from 'virtual:pwa-register';

// Auto-prompts the user to refresh if you push new code to Render
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New system update available! Click OK to refresh.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is cached and ready to work on weak networks.');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
