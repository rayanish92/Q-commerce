import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import all your portals
import Auth from './pages/Auth';
import CustomerApp from './pages/CustomerApp';
import RetailerApp from './pages/RetailerApp';
import AdminApp from './pages/AdminApp';
import AgentApp from './pages/AgentApp'; // We will build this next!

// A simple security check to ensure people don't bypass the login screen
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;
  
  try {
    const userRole = JSON.parse(atob(token.split('.')[1])).user.role;
    // If they are an admin, let them go anywhere. Otherwise, check their specific role.
    if (userRole === 'admin' || userRole === allowedRole) {
      return children;
    } else {
      return <Navigate to="/" />;
    }
  } catch (e) {
    return <Navigate to="/" />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Main Login Page */}
        <Route path="/" element={<Auth />} />

        {/* The 4 Separate App Links */}
        <Route path="/customer" element={
          <ProtectedRoute allowedRole="customer"><CustomerApp /></ProtectedRoute>
        } />
        
        <Route path="/retailer" element={
          <ProtectedRoute allowedRole="retailer"><RetailerApp /></ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin"><AdminApp /></ProtectedRoute>
        } />
        
        <Route path="/agent" element={
          <ProtectedRoute allowedRole="delivery_agent"><AgentApp /></ProtectedRoute>
        } />

        {/* If they type a weird URL, send them back to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
