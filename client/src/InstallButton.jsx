import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const location = useLocation(); // Gets the current URL

  // Dynamically change the button text based on the URL
  let buttonText = "Install QuickComm";
  if (location.pathname.includes('/retailer')) {
    buttonText = "Install Retailer Desk";
  } else if (location.pathname.includes('/admin')) {
    buttonText = "Install Admin Core";
  } else if (location.pathname.includes('/agent')) {
    buttonText = "Install Delivery Fleet";
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setShowButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
      <button
        onClick={handleInstallClick}
        className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg border-2 border-white flex items-center gap-2 animate-bounce hover:bg-indigo-700 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {buttonText}
      </button>
    </div>
  );
};

export default InstallButton;
