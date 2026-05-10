import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Trash2, Edit3, LogOut } from 'lucide-react';

export default function RetailerApp() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: 'Groceries',
    imageUrl: ''
  });

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Products on load
  useEffect(() => {
    fetchMyProducts();
  }, []);

  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/me`, axiosConfig);
      setProducts(res.data);
    } catch (err) {
      setMessage('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/products/add`, newProduct, axiosConfig);
      setProducts([res.data, ...products]);
      setShowAddForm(false);
      setNewProduct({ name: '', description: '', price: '', quantity: '', category: 'Groceries', imageUrl: '' });
      setMessage('Product added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to add product.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/delete/${id}`, axiosConfig);
      setProducts(products.filter(p => p._id !== id));
    } catch (err) {
      setMessage('Failed to delete product.');
    }
  };

  const handleUpdateQuantity = async (id, currentQty, amount) => {
    const newQty = currentQty + amount;
    if (newQty < 0) return;
    try {
      const res = await axios.put(`${API_URL}/api/products/update/${id}`, { quantity: newQty }, axiosConfig);
      setProducts(products.map(p => p._id === id ? res.data : p));
    } catch (err) {
      setMessage('Failed to update quantity.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8" />
            <h1 className="text-2xl font-extrabold tracking-tight">Retailer Dashboard</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-900 transition shadow-sm font-semibold">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 mt-6">
        {message && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-center border border-emerald-200 shadow-sm">
            {message}
          </div>
        )}

        {/* Dashboard Controls */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">My Inventory ({products.length})</h2>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-lg hover:bg-emerald-200 transition"
          >
            {showAddForm ? 'Cancel' : <><Plus className="w-5 h-5" /> Add New Product</>}
          </button>
        </div>

        {/* Add Product Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Add New Item</h3>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name (e.g. Aashirvaad Atta 5kg)" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="text" placeholder="Image URL (Optional)" value={newProduct.imageUrl} onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="number" placeholder="Price (₹)" required value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="number" placeholder="Stock Quantity" required value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="Groceries">Groceries</option>
                <option value="Vegetables">Vegetables & Fruits</option>
                <option value="Dairy">Dairy & Bakery</option>
                <option value="Snacks">Snacks & Beverages</option>
                <option value="Personal Care">Personal Care</option>
              </select>
              <input type="text" placeholder="Short Description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition shadow-md mt-2">
                Save Product to Inventory
              </button>
            </form>
          </div>
        )}

        {/* Inventory Grid */}
        {loading ? (
          <div className="text-center text-gray-500 py-12 font-medium">Loading your inventory...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Your store is empty.</p>
            <p className="text-sm">Click "Add New Product" to start selling.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="h-48 bg-gray-100 relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow text-emerald-700">
                    {product.category}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{product.name}</h3>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{product.price}</p>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Stock</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => handleUpdateQuantity(product._id, product.quantity, -1)} className="bg-gray-100 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-gray-200">-</button>
                        <span className="font-bold text-gray-800 w-6 text-center">{product.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(product._id, product.quantity, 1)} className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-emerald-200">+</button>
                      </div>
                    </div>
                    
                    <button onClick={() => handleDelete(product._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition" title="Delete Product">
                      <Trash2 className="w-5 h-5" />
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
