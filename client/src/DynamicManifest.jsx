import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DynamicManifest = () => {
  const location = useLocation();

  useEffect(() => {
    // 1. Check the URL to see which portal the user is on
    let manifestUrl = '/manifest-customer.json';
    if (location.pathname.startsWith('/admin')) {
      manifestUrl = '/manifest-admin.json';
    } else if (location.pathname.startsWith('/retailer')) {
      manifestUrl = '/manifest-retailer.json';
    } else if (location.pathname.startsWith('/agent')) {
      manifestUrl = '/manifest-agent.json';
    }

    // 2. Find the default manifest link that the offline cache loaded
    let manifestTag = document.querySelector('link[rel="manifest"]');
    
    // 3. Forcefully swap it to the correct one
    if (manifestTag) {
      manifestTag.href = manifestUrl;
    } else {
      manifestTag = document.createElement('link');
      manifestTag.rel = 'manifest';
      manifestTag.href = manifestUrl;
      document.head.appendChild(manifestTag);
    }
  }, [location.pathname]); // This runs every time the URL changes!

  return null; // This component works invisibly in the background
};

export default DynamicManifest;
