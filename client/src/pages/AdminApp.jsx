import React from 'react';

export default function AdminApp() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Core</h1>
        <button onClick={handleLogout} className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-slate-700 transition">
          Logout
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto mt-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h2 className="text-2xl font-bold mb-2">Master Admin Control</h2>
          <p className="text-slate-600 mb-6">Monitor all system activity, manage users, and configure global settings.</p>
        </div>
      </main>
    </div>
  );
}
