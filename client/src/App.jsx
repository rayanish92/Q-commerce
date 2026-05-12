import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Download } from 'lucide-react';

import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';

// CRITICAL FIX: Uncrashable JWT Decoder
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// SMART INSTALL BUTTON (Triggers Native Chrome Popup)
const InstallAppTrigger = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic prompt
      e.preventDefault();
      // Save the event so it can be triggered by our button
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the native browser prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Only show the button if the app is NOT installed AND the browser is ready
  if (isInstalled || !deferredPrompt) return null;

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <button 
        onClick={handleInstallClick} 
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg hover:bg-indigo-700 transition transform hover:scale-105 border-2 border-white"
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    </div>
  );
};

const Portal = ({ children, allowedRole, portalName }) => {
  const token = localStorage.getItem('token');

  if (!token || token === 'undefined') {
    return <Auth portalName={portalName} />;
  }
  
  const decodedToken = parseJwt(token);
  
  if (!decodedToken) {
    localStorage.removeItem('token');
    return <Auth portalName={portalName} customError="Session expired. Please log in again." />;
  }

  const userRole = decodedToken.user.role;

  if (userRole === allowedRole) {
    return children;
  } else {
    localStorage.removeItem('token');
    return <Auth portalName={portalName} customError={`Access Denied. This portal is strictly for ${allowedRole.replace('_', ' ')}s.`} />;
  }
};

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Portal allowedRole="customer" portalName="Customer"><CustomerApp /></Portal>} />
          <Route path="/retailer" element={<Portal allowedRole="retailer" portalName="Retailer"><RetailerApp /></Portal>} />
          <Route path="/admin" element={<Portal allowedRole="admin" portalName="Admin"><AdminApp /></Portal>} />
          <Route path="/agent" element={<Portal allowedRole="delivery_agent" portalName="Delivery Agent"><AgentApp /></Portal>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      
      {/* Floating Install Button that calls the Native Prompt */}
      <InstallAppTrigger />
    </>
  );
}
