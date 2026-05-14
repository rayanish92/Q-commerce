import React from 'react';
import { LogOut, Map } from 'lucide-react';

export default function AgentApp() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Map className="w-16 h-16 text-indigo-600 mb-4" />
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Delivery Agent Portal</h1>
      <p className="text-gray-500 mb-8">This module is currently under construction.</p>
      
      <button 
        onClick={() => { localStorage.clear(); window.location.href='/'; }} 
        className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600 flex items-center gap-2"
      >
        <LogOut className="w-5 h-5" /> Logout
      </button>
    </div>
  );
}
