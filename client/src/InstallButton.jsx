import React, { useEffect, useState } from 'react';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // This listens for Chrome saying "This app is ready to be installed natively!"
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome's unreliable automatic popup
      e.preventDefault();
      // Save the event so we can trigger it with our button
      setDeferredPrompt(e);
      // Show our custom button
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If the app is already installed, hide the button
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
    
    // Force Chrome to show the native Android install popup
    deferredPrompt.prompt();
    
    // Wait for the user to click "Install" or "Cancel"
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    
    // Reset the prompt
    setDeferredPrompt(null);
  };

  // If Chrome says it can't be installed (or already is), render nothing
  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
      <button
        onClick={handleInstallClick}
        className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg border-2 border-white flex items-center gap-2 animate-bounce hover:bg-indigo-700 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Install QuickComm App
      </button>
    </div>
  );
};

export default InstallButton;
