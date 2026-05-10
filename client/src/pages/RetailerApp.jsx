import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Plus, Trash2, LogOut, Clock, AlertTriangle } from 'lucide-react';

export default function RetailerApp() {
  const [products, setProducts] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Search & Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaster, setFilteredMaster] = useState([]);
  
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', quantity: '', category: 'Groceries', imageUrl: ''
  });

  const API_URL = import.meta.env.VITE_API_URL;
  const axiosConfig = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  useEffect(() => {
    fetchMyProducts();
    fetchMasterProducts();
  }, []);

  const fetchMyProducts = async () => {
    try { const res = await axios.get(`${API_URL}/api/products/me`, axiosConfig); setProducts(res.data); } catch (err) { setMessage('Failed to load inventory.'); } finally { setLoading(false); }
  };

  const fetchMasterProducts = async () => {
    try { const res = await axios.get(`${API_URL}/api/admin/master-products`, axiosConfig); setMasterProducts(res.data); } catch (err) {}
  };

  // Smart Search Logic
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setNewProduct({ ...newProduct, name: val }); // Auto-update name if custom
    
    if (val.length > 0) {
      const results = masterProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
      setFilteredMaster(results);
    } else {
      setFilteredMaster([]);
    }
  };

  const selectMasterProduct = (master) => {
    setSearchTerm(master.name);
    setNewProduct({ ...newProduct, name: master.name, description: master.description, category: master.category, imageUrl: master.imageUrl });
    setFilteredMaster([]); // Hide dropdown
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/products/add`, newProduct, axiosConfig);
      setProducts([res.data, ...products]);
      setShowAddForm(false);
      setSearchTerm('');
      setNewProduct({ name: '', description: '', price: '', quantity: '', category: 'Groceries', imageUrl: '' });
      setMessage('Product submitted! Awaiting admin approval.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) { setMessage('Failed to add product.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Request admin to delete this product?')) return;
    try {
      const res = await axios.delete(`${API_URL}/api/products/delete/${id}`, axiosConfig);
      setMessage(res.data.message);
      fetchMyProducts(); // Refresh to show pending status
    } catch (err) { setMessage('Failed to request deletion.'); }
  };

  const handleUpdateQuantity = async (id, currentQty, amount, status) => {
    if (status !== 'Approved') return; // Only allow updates on approved items
    const newQty = currentQty + amount;
    if (newQty < 0) return;
    try {
      const res = await axios.put(`${API_URL}/api/products/update/${id}`, { quantity: newQty }, axiosConfig);
      setProducts(products.map(p => p._id === id ? res.data : p));
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><Package className="w-8 h-8" /><h1 className="text-2xl font-extrabold tracking-tight">Retailer Desk</h1></div>
          <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="flex items-center gap-2 bg-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-900 transition font-semibold"><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 mt-6">
        {message && <div className="mb-6 p-4 rounded-lg bg-yellow-100 text-yellow-800 font-bold border border-yellow-200">{message}</div>}

        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Inventory Status</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-lg hover:bg-emerald-200 transition">
            {showAddForm ? 'Cancel' : <><Plus className="w-5 h-5" /> Add Inventory</>}
          </button>
        </div>

        {/* SEARCH & ADD FORM */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-emerald-200 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Search Master Catalog or Add Custom</h3>
            
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
              <input type="text" placeholder="Search Master Catalog (e.g., Aashirvaad Atta)..." value={searchTerm} onChange={handleSearchChange} className="w-full pl-10 p-4 border-2 border-emerald-100 rounded-xl focus:border-emerald-500 outline-none font-medium text-lg bg-gray-50" />
              
              {/* Dropdown Suggestions */}
              {filteredMaster.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {filteredMaster.map(m => (
                    <div key={m._id} onClick={() => selectMasterProduct(m)} className="flex items-center gap-4 p-3 hover:bg-emerald-50 cursor-pointer border-b">
                      <img src={m.imageUrl} className="w-12 h-12 object-contain rounded bg-gray-100" alt="product"/>
                      <div><p className="font-bold text-gray-800">{m.name}</p><p className="text-xs text-gray-500">{m.category}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <input type="text" placeholder="Product Name (Will be Custom if not in Master list)" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="p-3 border rounded-lg outline-none" />
              <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="p-3 border rounded-lg bg-white outline-none">
                <option value="Groceries">Groceries</option><option value="Vegetables">Vegetables</option><option value="Dairy">Dairy</option><option value="Snacks">Snacks</option><option value="Pharmacy">Pharmacy</option>
              </select>
              <input type="number" placeholder="Your Selling Price (₹)" required value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="number" placeholder="Initial Stock Quantity" required value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} className="p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="text" placeholder="Image URL (Required if Custom)" value={newProduct.imageUrl} required onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})} className="p-3 border rounded-lg outline-none" />
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 shadow mt-2">Submit for Approval</button>
            </form>
          </div>
        )}

        {/* INVENTORY GRID */}
        {loading ? <div className="text-center py-12 text-gray-500">Loading inventory...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product._id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition ${product.status==='Pending'?'border-yellow-300 opacity-80':product.status==='Pending Deletion'?'border-red-300 opacity-60':'border-gray-200'}`}>
                
                {/* Status Badge Overlays */}
                <div className="h-48 bg-gray-100 relative flex items-center justify-center p-4">
                  {product.status === 'Pending' && <div className="absolute inset-0 bg-yellow-500/20 flex flex-col items-center justify-center z-10"><Clock className="w-10 h-10 text-yellow-700 mb-2"/><span className="bg-yellow-100 text-yellow-800 px-3 py-1 font-bold rounded-full text-sm">Pending Approval</span></div>}
                  {product.status === 'Pending Deletion' && <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center z-10"><AlertTriangle className="w-10 h-10 text-red-700 mb-2"/><span className="bg-red-100 text-red-800 px-3 py-1 font-bold rounded-full text-sm">Deletion Requested</span></div>}
                  
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain mix-blend-multiply" />
                  <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow text-emerald-700">{product.category}</div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{product.name}</h3>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{product.price}</p>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateQuantity(product._id, product.quantity, -1, product.status)} disabled={product.status !== 'Approved'} className="bg-gray-100 w-8 h-8 rounded font-bold disabled:opacity-50">-</button>
                      <span className="font-bold text-gray-800 w-6 text-center">{product.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(product._id, product.quantity, 1, product.status)} disabled={product.status !== 'Approved'} className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded font-bold disabled:opacity-50">+</button>
                    </div>
                    {product.status === 'Approved' && (
                      <button onClick={() => handleDelete(product._id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition" title="Request Deletion"><Trash2 className="w-5 h-5" /></button>
                    )}
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
