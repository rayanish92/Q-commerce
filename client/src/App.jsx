import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';

// STRICT SMART PORTAL WRAPPER
const Portal = ({ children, allowedRole, portalName }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Auth portalName={portalName} />;
  }
  
  try {
    // ----------------------------------------------------------------------
    // CRITICAL FIX: Robust JWT Decoding.
    // Standard atob() crashes on '-' and '_' characters in Base64Url tokens.
    // This safely decodes the token so refreshing never logs you out again!
    // ----------------------------------------------------------------------
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const userRole = JSON.parse(jsonPayload).user.role;

    // STRICT SECURITY CHECK
    if (userRole === allowedRole) {
      return children;
    } else {
      // If a user tries to cross-contaminate portals, destroy their session
      localStorage.clear();
      return <Auth portalName={portalName} customError={`Access Denied. This portal is strictly for ${allowedRole.replace('_', ' ')}s.`} />;
    }
  } catch (e) {
    console.error("Token parsing error on refresh:", e);
    localStorage.clear();
    return <Auth portalName={portalName} />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Portal */}
        <Route path="/" element={<Portal allowedRole="customer" portalName="Customer"><CustomerApp /></Portal>} />
        
        {/* Retailer Portal */}
        <Route path="/retailer" element={<Portal allowedRole="retailer" portalName="Retailer"><RetailerApp /></Portal>} />
        
        {/* Admin Portal */}
        <Route path="/admin" element={<Portal allowedRole="admin" portalName="Admin"><AdminApp /></Portal>} />
        
        {/* Delivery Agent Portal */}
        <Route path="/agent" element={<Portal allowedRole="delivery_agent" portalName="Delivery Agent"><AgentApp /></Portal>} />

        {/* Fallback for typos */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
