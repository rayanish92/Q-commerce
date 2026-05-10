import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-indigo-600 mb-2">Quick Commerce</h1>
          <p className="text-gray-500">Your hyper-local delivery network</p>
        </div>
        
        <div className="space-y-4">
          <button className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md">
            Login as Customer
          </button>
          <button className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-lg hover:bg-emerald-600 transition duration-300 shadow-md">
            Login as Retailer
          </button>
          <button className="w-full bg-amber-500 text-white font-semibold py-3 rounded-lg hover:bg-amber-600 transition duration-300 shadow-md">
            Login as Delivery Agent
          </button>
          <button className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg hover:bg-gray-900 transition duration-300 shadow-md">
            Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
}
