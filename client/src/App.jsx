import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';

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
