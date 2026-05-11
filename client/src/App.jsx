import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';

// SMART PORTAL WRAPPER
const Portal = ({ children, allowedRole, portalName }) => {
  const token = localStorage.getItem('token');

  // If they are not logged in, show the Auth screen but KEEP them on their dedicated URL
  if (!token) {
    return <Auth portalName={portalName} />;
  }
  
  try {
    const userRole = JSON.parse(atob(token.split('.')[1])).user.role;
    // Admins can go anywhere. Everyone else must match their portal.
    if (userRole === 'admin' || userRole === allowedRole) {
      return children;
    } else {
      // If a customer sneaks into the retailer URL, block them
      localStorage.clear();
      return <Auth portalName={portalName} customError="Access Denied. Invalid Role." />;
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
        {/* Customer Portal (The Main Website) */}
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
