import React, { useState } from 'react';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';

export default function Auth({ portalName = "Customer", customError }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState(customError || '');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // Helper to know exactly what role is allowed on this specific screen
  const getExpectedRole = () => {
    if (portalName === 'Retailer') return 'retailer';
    if (portalName === 'Admin') return 'admin';
    if (portalName === 'Delivery Agent') return 'delivery_agent';
    return 'customer';
  };

  const handleStandardAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
        const userRole = res.data.user.role;
        const expectedRole = getExpectedRole();

        // STRICT PORTAL CHECK: Stops the login before the token is even saved
        if (userRole !== expectedRole) {
          setLoading(false);
          return setMessage(`Access Denied: These credentials belong to a ${userRole.replace('_', ' ')} account.`);
        }

        // If it perfectly matches, save the token and hard refresh to load the app
        localStorage.setItem('token', res.data.token);
        window.location.reload(); 
      } else {
        await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
        setMessage('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Connection error.');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true); setMessage('Verifying Google Credentials...');
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, { credential: credentialResponse.credential });
      const userRole = res.data.user.role;
      const expectedRole = getExpectedRole();

      if (userRole !== expectedRole) {
        setLoading(false);
        return setMessage(`Access Denied: Google account linked to a ${userRole.replace('_', ' ')} profile.`);
      }

      localStorage.setItem('token', res.data.token);
      window.location.reload();
    } catch (error) {
      setMessage(`Login Failed: ${error.response?.data?.message || 'Check logs'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-pink-500 p-4">
      <div className="bg-white/95 p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-1">QuickComm</h1>
        <h2 className="text-sm font-bold text-center text-indigo-500 mb-6 uppercase tracking-widest">{portalName} Portal</h2>

        {/* CONDITIONALLY RENDER GOOGLE LOGIN ONLY FOR CUSTOMERS */}
        {portalName === 'Customer' && (
          <>
            <div className="flex justify-center mb-6">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setMessage('Google Login Failed')} useOneTap />
            </div>
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400">or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
          </>
        )}

        {message && <div className="p-3 mb-4 rounded bg-red-100 text-red-700 text-center font-bold">{message}</div>}

        <form onSubmit={handleStandardAuth} className="space-y-4">
          {!isLogin && <input type="text" placeholder="Full Name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" />}
          <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 shadow-lg mt-4">
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        {/* CONDITIONALLY HIDE REGISTRATION FOR STAFF PORTALS */}
        {portalName === 'Customer' && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-indigo-600 font-semibold hover:underline">
              {isLogin ? "New Customer? Register here" : "Already a customer? Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
