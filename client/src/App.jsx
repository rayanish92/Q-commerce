import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Auth from './pages/Auth';
import AdminAuth from './pages/AdminAuth';
import CustomerApp from './pages/CustomerApp';
import RetailerApp from './pages/RetailerApp';
import AgentApp from './pages/AgentApp';
import AdminApp from './pages/AdminApp';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;
  return children;
};

export default function App() {
  // Pulls the Client ID securely from Render
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-id';

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/secret-admin-login" element={<AdminAuth />} />
          <Route path="/customer" element={ <ProtectedRoute><CustomerApp /></ProtectedRoute> } />
          <Route path="/retailer" element={ <ProtectedRoute><RetailerApp /></ProtectedRoute> } />
          <Route path="/agent" element={ <ProtectedRoute><AgentApp /></ProtectedRoute> } />
          <Route path="/admin" element={ <ProtectedRoute><AdminApp /></ProtectedRoute> } />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
