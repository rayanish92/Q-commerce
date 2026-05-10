import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import our pages
import Auth from './pages/Auth';
import AdminAuth from './pages/AdminAuth'; // The new hidden page
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
  return (
    <BrowserRouter>
      <Routes>
        {/* The main public login screen */}
        <Route path="/" element={<Auth />} />
        
        {/* THE SECRET ADMIN LOGIN URL */}
        <Route path="/secret-admin-login" element={<AdminAuth />} />
        
        {/* The 4 separate apps */}
        <Route path="/customer" element={ <ProtectedRoute><CustomerApp /></ProtectedRoute> } />
        <Route path="/retailer" element={ <ProtectedRoute><RetailerApp /></ProtectedRoute> } />
        <Route path="/agent" element={ <ProtectedRoute><AgentApp /></ProtectedRoute> } />
        <Route path="/admin" element={ <ProtectedRoute><AdminApp /></ProtectedRoute> } />
      </Routes>
    </BrowserRouter>
  );
}
