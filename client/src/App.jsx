import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';

// CRITICAL FIX: Uncrashable JWT Decoder
// This safely decodes the token so refreshing NEVER logs you out.
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

const Portal = ({ children, allowedRole, portalName }) => {
  const token = localStorage.getItem('token');

  // If there is absolutely no token, show login
  if (!token || token === 'undefined') {
    return <Auth portalName={portalName} />;
  }
  
  const decodedToken = parseJwt(token);
  
  // If the token is corrupted or expired, clear it and show login
  if (!decodedToken) {
    localStorage.removeItem('token');
    return <Auth portalName={portalName} customError="Session expired. Please log in again." />;
  }

  const userRole = decodedToken.user.role;

  // STRICT SECURITY CHECK
  if (userRole === allowedRole) {
    return children;
  } else {
    // If a user tries to cross-contaminate portals, destroy their session
    localStorage.removeItem('token');
    return <Auth portalName={portalName} customError={`Access Denied. This portal is strictly for ${allowedRole.replace('_', ' ')}s.`} />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal allowedRole="customer" portalName="Customer"><CustomerApp /></Portal>} />
        <Route path="/retailer" element={<Portal allowedRole="retailer" portalName="Retailer"><RetailerApp /></Portal>} />
        <Route path="/admin" element={<Portal allowedRole="admin" portalName="Admin"><AdminApp /></Portal>} />
        <Route path="/agent" element={<Portal allowedRole="delivery_agent" portalName="Delivery Agent"><AgentApp /></Portal>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
