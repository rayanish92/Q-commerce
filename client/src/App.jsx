import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Download, X } from 'lucide-react';

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

// CUSTOM PWA INSTALL PROMPT
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detect if the user is on iOS (Safari doesn't support automatic prompts)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    // If they are on iOS and haven't installed it yet, show the iOS manual instructions
    if (isIosDevice && !isInStandaloneMode) {
      setIsIOS(true);
      
      // Delay prompt slightly so it doesn't aggressive-block the initial load
      setTimeout(() => setShowPrompt(true), 3000); 
    }

    // 2. Detect Android / Chrome PWA readiness
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Detect if it gets successfully installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the native install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 w-[92%] max-w-sm bg-white p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 z-[100] flex flex-col gap-3">
      <button onClick={() => setShowPrompt(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-800 p-1"><X className="w-5 h-5"/></button>
      <div className="flex items-center gap-4">
        <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 flex-shrink-0"><Download className="w-6 h-6"/></div>
        <div>
          <h4 className="font-extrabold text-gray-800 text-sm">Install App</h4>
          <p className="text-xs text-gray-500 mt-0.5">Add to home screen for a faster, full-screen experience.</p>
        </div>
      </div>
      
      {isIOS ? (
        <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
          To install on iOS: tap the <strong>Share</strong> icon at the bottom of Safari and select <strong>Add to Home Screen</strong>.
        </div>
      ) : (
        <button onClick={handleInstallClick} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 shadow-md">
          Install Now
        </button>
      )}
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
      
      {/* Renders the Install Banner globally over all portals */}
      <PWAInstallPrompt />
    </>
  );
}
