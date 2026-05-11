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
    const userRole = JSON.parse(atob(token.split('.')[1])).user.role;
    
    // STRICT SECURITY CHECK: The user's role MUST exactly match the portal they are on.
    // We removed the Admin "Master Key" bypass here.
    if (userRole === allowedRole) {
      return children;
    } else {
      // If a user tries to cross-contaminate portals, destroy their session
      localStorage.clear();
      return <Auth portalName={portalName} customError={`Access Denied. This portal is strictly for ${allowedRole.replace('_', ' ')}s.`} />;
    }
  } catch (e) {
    localStorage.clear();
    return <Auth portalName={portalName} />;
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
