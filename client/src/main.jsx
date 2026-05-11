import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 1. IMPORT THE GOOGLE PROVIDER
import { GoogleOAuthProvider } from '@react-oauth/google';

// 2. IMPORT THE PWA REGISTRATION
import { registerSW } from 'virtual:pwa-register';

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

// 3. GET YOUR GOOGLE ID FROM RENDER
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 4. WRAP THE ENTIRE APP IN THE GOOGLE PROVIDER */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
