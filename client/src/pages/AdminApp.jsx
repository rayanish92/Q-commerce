import React from 'react';

export default function AdminApp() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="bg-gray-800 text-white p-4 rounded-xl shadow-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🛡️ Admin Master Portal</h1>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="bg-gray-950 px-4 py-2 rounded hover:bg-black transition">Logout</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700">Total Revenue</h2>
          <p className="text-3xl font-bold mt-2">₹0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700">Registered Retailers</h2>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700">Active Agents</h2>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
