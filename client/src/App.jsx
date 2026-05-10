import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // This securely pulls your backend URL from Render
    const API_URL = import.meta.env.VITE_API_URL;

    try {
      if (isLogin) {
        // LOGIN LOGIC
        const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
        setMessage(`Success! Logged in as ${res.data.user.role}.`);
        localStorage.setItem('token', res.data.token); // Save the security key
      } else {
        // REGISTRATION LOGIC
        await axios.post(`${API_URL}/api/auth/register`, { name, email, password, role });
        setMessage('Registration successful! You can now log in.');
        setIsLogin(true); // Switch back to login screen automatically
      }
    } catch (err) {
      // If user types wrong password or email exists, show the error
      setMessage(err.response?.data?.message || 'Cannot connect to server. Check your VITE_API_URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Beautiful dynamic gradient background
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      
      {/* Sleek, shadow-heavy card */}
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Quick Commerce</h1>
          <p className="text-gray-500 font-medium">
            {isLogin ? 'Welcome back! Please login.' : 'Create your account.'}
          </p>
        </div>

        {/* Status Message Display */}
        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm font-semibold text-center ${message.includes('Success') || message.includes('successful') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show Name field if Registering */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {/* Only show Role dropdown if Registering */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
              >
                <option value="customer">Customer</option>
                <option value="retailer">Retailer</option>
                <option value="delivery_agent">Delivery Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-lg disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage(''); }} 
            className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition"
          >
            {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
}
