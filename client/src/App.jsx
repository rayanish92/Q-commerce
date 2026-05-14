import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import your pages
import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';
import InstallButton from './InstallButton.jsx';
import DynamicManifest from './DynamicManifest.jsx'; // <-- 1. Import it

/**
 * HELPER: parseJwt
 * Decodes the login token to see who the user is
 */
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

/**
 * COMPONENT: Portal
 * Protects routes and checks if the user has the right role (Customer, Retailer, etc.)
 */
const Portal = ({ children, allowedRole, portalName }) => {
  const token = localStorage.getItem('token');

  // If no token, show login page
  if (!token || token === 'undefined') {
    return <Auth portalName={portalName} />;
  }
  
  const decodedToken = parseJwt(token);
  
  // If token is invalid/expired, clear it and show login
  if (!decodedToken) {
    localStorage.removeItem('token');
    return <Auth portalName={portalName} customError="Session expired. Please log in again." />;
  }

  const userRole = decodedToken.user.role;

  // If user role matches (e.g. "customer"), show the page. Otherwise, deny access.
  if (userRole === allowedRole) {
    return children;
  } else {
    localStorage.removeItem('token');
    return <Auth portalName={portalName} customError={`Access Denied. This portal is strictly for ${allowedRole.replace('_', ' ')}s.`} />;
  }
};

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  return (
    <BrowserRouter>
      {/* This button stays on top of every page */}
      <DynamicManifest />
      <InstallButton /> 
      
      <Routes>
        {/* Customer Portal */}
        <Route 
          path="/" 
          element={
            <Portal allowedRole="customer" portalName="Customer">
              <CustomerApp />
            </Portal>
          } 
        />

        {/* Retailer Portal */}
        <Route 
          path="/retailer" 
          element={
            <Portal allowedRole="retailer" portalName="Retailer">
              <RetailerApp />
            </Portal>
          } 
        />

        {/* Admin Portal */}
        <Route 
          path="/admin" 
          element={
            <Portal allowedRole="admin" portalName="Admin">
              <AdminApp />
            </Portal>
          } 
        />

        {/* Delivery Agent Portal */}
        <Route 
          path="/agent" 
          element={
            <Portal allowedRole="delivery_agent" portalName="Delivery Agent">
              <AgentApp />
            </Portal>
          } 
        />

        {/* Catch-all: Redirect back to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
