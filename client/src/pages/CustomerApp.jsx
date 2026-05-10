import React from 'react';

export default function CustomerApp() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="bg-indigo-600 text-white p-4 rounded-xl shadow-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🛒 Customer App</h1>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="bg-indigo-800 px-4 py-2 rounded hover:bg-indigo-900 transition">Logout</button>
      </header>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Nearby Groceries</h2>
        <p className="text-gray-500">Your 10km radius feed will appear here...</p>
      </div>
    </div>
  );
}
