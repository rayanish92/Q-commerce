import React from 'react';

export default function AgentApp() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-fuchsia-50 text-fuchsia-900 font-sans">
      <header className="bg-fuchsia-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Delivery Fleet</h1>
        <button onClick={handleLogout} className="bg-fuchsia-700 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-fuchsia-800 transition">
          Logout
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto mt-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-fuchsia-100 text-center">
          <h2 className="text-2xl font-bold mb-2">Agent Active</h2>
          <p className="text-fuchsia-600 mb-6">View pending deliveries, optimize your route, and confirm handoffs.</p>
        </div>
      </main>
    </div>
  );
}
