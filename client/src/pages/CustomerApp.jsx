import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2 } from 'lucide-react';

export default function CustomerApp() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  
  // Using a mocked location for testing (Normally you would use navigator.geolocation)
  const [location, setLocation] = useState({ lng: 88.3639, lat: 22.5726 }); // Default: Kolkata coordinates

  const API_URL = import.meta.env.VITE_API_URL;
  const axiosConfig = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  const categories = ['All', 'Groceries', 'Vegetables', 'Dairy', 'Snacks', 'Pharmacy'];

  useEffect(() => {
    fetchNearbyProducts();
  }, [category]); // Re-fetch when category changes

  const fetchNearbyProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/products/nearby?lng=${location.lng}&lat=${location.lat}&category=${category}`, axiosConfig);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" />
            <h1 className="text-xl font-extrabold tracking-tight">QuickComm</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 text-sm bg-indigo-700 px-3 py-1 rounded-full text-indigo-100">
              <MapPin className="w-4 h-4" /> <span>Delivery in 10 mins</span>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="hover:text-indigo-200 transition"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mt-4 relative">
          <input type="text" placeholder="Search for 'Milk', 'Atta'..." className="w-full py-3 pl-12 pr-4 rounded-xl text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-pink-500" />
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-2">
        {/* Category Horizontal Scroll */}
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

        {/* Product Grid */}
        <h2 className="text-lg font-bold text-gray-800 mt-4 mb-4">Nearby Store Inventory ({category})</h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-bold">Scanning nearby stores...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-5xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-gray-700">No {category !== 'All' ? category : ''} items nearby</h3>
            <p className="text-gray-500 mt-2">Try selecting a different category or location.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
                <div className="h-32 bg-white relative p-2 flex items-center justify-center">
                  <img src={product.imageUrl} alt={product.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-50 to-transparent"></div>
                </div>
                
                <div className="p-3 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1 line-clamp-1">{product.retailerId?.shopName}</p>
                  <h3 className="font-bold text-sm text-gray-800 line-clamp-2 h-10 leading-tight">{product.name}</h3>
                  
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-lg font-extrabold text-gray-900">₹{product.price}</p>
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
