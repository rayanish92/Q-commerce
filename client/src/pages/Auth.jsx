import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const routeUser = (role) => {
    if (role === 'customer') navigate('/customer');
    else if (role === 'retailer') navigate('/retailer');
    else if (role === 'delivery_agent') navigate('/agent');
  };

  const handleStandardAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        routeUser(res.data.user.role);
      } else {
        // Notice we no longer send 'role'. The backend forces it to 'customer'.
        await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
        setMessage('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Connection error.');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, {
        credential: credentialResponse.credential,
      });
      localStorage.setItem('token', res.data.token);
      routeUser(res.data.user.role);
    } catch (error) {
      setMessage('Google Login Failed. Have you set up your VITE_GOOGLE_CLIENT_ID?');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-pink-500 p-4">
      <div className="bg-white/95 p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">Quick Commerce</h1>
        
        {/* Google Login Button */}
        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setMessage('Google Login Failed')}
            useOneTap
          />
        </div>
        
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {message && <div className="p-3 mb-4 rounded bg-red-100 text-red-700 text-center font-bold">{message}</div>}

        <form onSubmit={handleStandardAuth} className="space-y-4">
          {!isLogin && (
             <input type="text" placeholder="Full Name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" />
          )}
          <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" />
          <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" />

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg mt-4 disabled:opacity-50">
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Customer Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-indigo-600 font-semibold hover:underline">
            {isLogin ? "New Customer? Register here" : "Already a customer? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
