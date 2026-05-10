import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import our new pages
import Auth from './pages/Auth';
import CustomerApp from './pages/CustomerApp';
import RetailerApp from './pages/RetailerApp';
import AgentApp from './pages/AgentApp';
import AdminApp from './pages/AdminApp';

// A simple security check to ensure users are logged in
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The main login screen */}
        <Route path="/" element={<Auth />} />
        
        {/* The 4 separate apps, protected by the security check */}
        <Route path="/customer" element={ <ProtectedRoute><CustomerApp /></ProtectedRoute> } />
        <Route path="/retailer" element={ <ProtectedRoute><RetailerApp /></ProtectedRoute> } />
        <Route path="/agent" element={ <ProtectedRoute><AgentApp /></ProtectedRoute> } />
        <Route path="/admin" element={ <ProtectedRoute><AdminApp /></ProtectedRoute> } />
      </Routes>
    </BrowserRouter>
  );
}
