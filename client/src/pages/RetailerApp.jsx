import React from 'react';

export default function RetailerApp() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-emerald-900 font-sans">
      <header className="bg-emerald-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Retailer Desk</h1>
        <button onClick={handleLogout} className="bg-emerald-800 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-emerald-900 transition">
          Logout
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto mt-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to your Retailer Dashboard</h2>
          <p className="text-emerald-600 mb-6">Manage your inventory, process orders, and track your earnings here.</p>
        </div>
      </main>
    </div>
  );
}
