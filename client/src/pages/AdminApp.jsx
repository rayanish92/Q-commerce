import React, { useState } from 'react';
import axios from 'axios';

export default function AdminApp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('retailer');
  const [shopName, setShopName] = useState('');
  const [message, setMessage] = useState('');

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const res = await axios.post(`${API_URL}/api/auth/admin-create-staff`, 
        { name, email, password, role, shopName },
        { headers: { Authorization: `Bearer ${token}` } } // Sends your Admin key to prove you have permission
      );
      setMessage(res.data.message);
      setName(''); setEmail(''); setPassword(''); setShopName('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error creating staff');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="bg-gray-800 text-white p-4 rounded-xl shadow-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🛡️ Admin Master Portal</h1>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="bg-gray-950 px-4 py-2 rounded hover:bg-black transition">Logout</button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CREATE STAFF TOOL */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-indigo-600">Create Staff Account</h2>
          {message && <div className="p-3 mb-4 bg-green-100 text-green-700 rounded font-bold">{message}</div>}
          
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded">
              <option value="retailer">Retailer</option>
              <option value="delivery_agent">Delivery Agent</option>
            </select>
            
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2 border rounded" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border rounded" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border rounded" />
            
            {role === 'retailer' && (
              <input type="text" placeholder="Shop/Store Name" value={shopName} onChange={(e) => setShopName(e.target.value)} required className="w-full p-2 border rounded" />
            )}
            
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700">Create Account</button>
          </form>
        </div>

        {/* STATS PLACEHOLDER */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Platform Stats</h2>
          <p className="text-gray-500">Live statistics will appear here soon.</p>
        </div>
      </div>
    </div>
  );
}
