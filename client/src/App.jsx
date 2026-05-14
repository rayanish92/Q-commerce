import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Auth from './pages/Auth.jsx';
import CustomerApp from './pages/CustomerApp.jsx';
import RetailerApp from './pages/RetailerApp.jsx';
import AdminApp from './pages/AdminApp.jsx';
import AgentApp from './pages/AgentApp.jsx';
import InstallButton from './InstallButton.jsx'; // <-- 1. Import the button

// ... (keep your existing parseJwt and Portal code exactly the same) ...

export default function App() {
  return (
    <BrowserRouter>
      {/* 2. Place the button right here so it floats on top of all pages */}
      <InstallButton /> 
      
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
