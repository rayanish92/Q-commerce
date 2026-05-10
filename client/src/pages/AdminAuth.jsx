import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const API_URL = import.meta.env.VITE_API_URL;

    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
        if (res.data.user.role !== 'admin') {
           setMessage('Access Denied: You are not an admin.');
           setLoading(false);
           return;
        }
        localStorage.setItem('token', res.data.token);
        navigate('/admin');
      } else {
        await axios.post(`${API_URL}/api/auth/register-admin`, { name, email, password, adminSecret });
        setMessage('Admin account created! You can now log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Dark theme to look distinct from the public app
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">System Admin</h1>
          <p className="text-gray-400 font-medium">Restricted Access Portal</p>
        </div>

        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm font-semibold text-center ${message.includes('created') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Admin Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>

          {/* The Secret Passcode Input */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-red-400 mb-1">Admin Secret Passcode</label>
              <input type="password" required value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-red-500 text-red-500 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="Enter secret code..." />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-lg mt-4 disabled:opacity-50">
            {loading ? 'Authenticating...' : (isLogin ? 'Login to Dashboard' : 'Initialize Admin')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-gray-400 hover:text-white text-sm transition">
            {isLogin ? "New System Admin? Register here" : "Return to Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
