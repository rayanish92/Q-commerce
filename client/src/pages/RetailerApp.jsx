import React from 'react';

export default function RetailerApp() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="bg-emerald-600 text-white p-4 rounded-xl shadow-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🏪 Retailer Dashboard</h1>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="bg-emerald-800 px-4 py-2 rounded hover:bg-emerald-900 transition">Logout</button>
      </header>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Manage Inventory</h2>
        <button className="bg-emerald-100 text-emerald-700 font-semibold py-2 px-4 rounded-lg mb-4 hover:bg-emerald-200">+ Add New Product</button>
        <p className="text-gray-500">Your product list will appear here...</p>
      </div>
    </div>
  );
}
