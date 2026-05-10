import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2, Globe } from 'lucide-react';

export default function CustomerApp() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  
  // THE NEW TEST MODE TOGGLE
  const [testMode, setTestMode] = useState(false);
  
  const [location, setLocation] = useState({ lng: 88.3639, lat: 22.5726 }); 

  const API_URL = import.meta.env.VITE_API_URL;
  const axiosConfig = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  const categories = ['All', 'Groceries', 'Vegetables', 'Dairy', 'Snacks', 'Pharmacy'];

  useEffect(() => {
    fetchNearbyProducts();
  }, [category, testMode]); // Refetch if category OR testMode changes

  const fetchNearbyProducts = async () => {
    setLoading(true);
    try {
      // Sends testMode flag to backend to ignore location requirements
      const res = await axios.get(`${API_URL}/api/products/nearby?lng=${location.lng}&lat=${location.lat}&category=${category}&testMode=${testMode}`, axiosConfig);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" />
            <h1 className="text-xl font-extrabold tracking-tight">QuickComm</h1>
          </div>
          <div className="flex items-center gap-4">
            
            {/* TEST MODE TOGGLE BUTTON */}
            <button 
              onClick={() => setTestMode(!testMode)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold border transition ${testMode ? 'bg-red-500 border-red-400' : 'bg-indigo-700 border-indigo-500 hover:bg-indigo-800'}`}
            >
              <Globe className="w-4 h-4" /> 
              {testMode ? "Test Mode: ON (Showing All)" : "Location Strict: 10km"}
            </button>

            <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="hover:text-indigo-200 transition"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto mt-4 relative">
          <input type="text" placeholder="Search for 'Milk', 'Atta'..." className="w-full py-3 pl-12 pr-4 rounded-xl text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-pink-500" />
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-2">
        <div className="flex overflow-x-auto pb-4 pt-2 gap-3 hide-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full font-semibold shadow-sm transition-all ${category === cat ? 'bg-pink-500 text-white shadow-md transform scale-105' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-bold text-gray-800 mt-4 mb-4">
          {testMode ? `All Approved Inventory (${category})` : `Nearby Store Inventory (${category})`}
        </h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-bold">Scanning {testMode ? 'all stores' : 'nearby stores'}...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-5xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-gray-700">No {category !== 'All' ? category : ''} items {testMode ? 'found' : 'nearby'}</h3>
            <p className="text-gray-500 mt-2">
              {testMode ? "There are no approved products in this category yet." : "Try clicking the 'Location Strict' button above to turn on Test Mode!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group relative">
                
                {/* Store Name Tag */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-bold z-10">
                  {product.retailerId?.shopName}
                </div>

                <div className="h-32 bg-white relative p-2 flex items-center justify-center">
                  {product.imageUrl ? (
                     <img src={product.imageUrl} alt={product.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                     <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs rounded">No Image</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-50 to-transparent"></div>
                </div>
                
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <h3 className="font-bold text-sm text-gray-800 line-clamp-2 h-10 leading-tight mt-1">{product.name}</h3>
                  
                  <div className="flex justify-between items-end mt-2">
                    {/* THIS IS THE ADMIN'S SELLING PRICE */}
                    <p className="text-lg font-extrabold text-gray-900">₹{product.sellingPrice}</p>
                    <button className="bg-white border border-pink-500 text-pink-600 font-bold px-3 py-1 rounded shadow-sm hover:bg-pink-50 transition text-sm">
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
