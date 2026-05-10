import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Plus, Trash2, LogOut, Clock, Edit3, ShoppingCart, BarChart2 } from 'lucide-react';

export default function RetailerApp() {
  const [activeTab, setActiveTab] = useState('inventory'); // add, inventory, orders, summary
  const [products, setProducts] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');
  
  // Custom Shop Name greeting
  const [shopName, setShopName] = useState('');

  // Search & Add Form State
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaster, setFilteredMaster] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', retailerPrice: '', quantity: '', category: 'Groceries', imageUrl: '' });

  // Summary Filters
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    // Parse JWT token to get shopName
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setShopName(payload.user.shopName || payload.user.name);
    }
    fetchMyProducts();
    fetchMasterProducts();
    fetchOrders();
  }, []);

  const fetchMyProducts = async () => { try { const res = await axios.get(`${API_URL}/api/products/me`, getAuth()); setProducts(res.data); } catch (err) {} };
  const fetchMasterProducts = async () => { try { const res = await axios.get(`${API_URL}/api/admin/master-products`, getAuth()); setMasterProducts(res.data); } catch (err) {} };
  
  const fetchOrders = async () => {
    try {
      const query = dateFilter.startDate && dateFilter.endDate ? `?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}` : '';
      const res = await axios.get(`${API_URL}/api/orders/retailer-orders${query}`, getAuth());
      setOrders(res.data);
    } catch (err) { setMessage('Failed to load orders.'); }
  };

  // Trigger search when date filter applied
  useEffect(() => { if (dateFilter.startDate && dateFilter.endDate) fetchOrders(); }, [dateFilter]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setNewProduct({ ...newProduct, name: val });
    if (val.length > 0) setFilteredMaster(masterProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase())));
    else setFilteredMaster([]);
  };

  const selectMasterProduct = (master) => {
    setSearchTerm(master.name);
    setNewProduct({ ...newProduct, name: master.name, description: master.description, category: master.category, imageUrl: master.imageUrl });
    setFilteredMaster([]);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/products/add`, newProduct, getAuth());
      setProducts([res.data, ...products]);
      setSearchTerm('');
      setNewProduct({ name: '', description: '', retailerPrice: '', quantity: '', category: 'Groceries', imageUrl: '' });
      setMessage('Product submitted! Awaiting admin approval.');
      setActiveTab('inventory'); // Auto-switch to inventory tab
      setTimeout(() => setMessage(''), 4000);
    } catch (err) { setMessage('Failed to add product.'); }
  };

  const handleUpdateQuantity = async (id, quantity) => {
    try {
      const res = await axios.put(`${API_URL}/api/products/update-quantity/${id}`, { quantity }, getAuth());
      setProducts(products.map(p => p._id === id ? res.data : p));
    } catch (err) {}
  };

  const handleRequestPriceChange = async (id) => {
    const newPrice = prompt("Enter new requested price:");
    if (!newPrice || isNaN(newPrice)) return;
    try {
      const res = await axios.put(`${API_URL}/api/products/request-price-change/${id}`, { newPrice: Number(newPrice) }, getAuth());
      setProducts(products.map(p => p._id === id ? res.data : p));
      setMessage('Price change request sent to Admin.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Request admin to delete this product?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/delete/${id}`, getAuth());
      fetchMyProducts(); 
    } catch (err) {}
  };

  // Generate Test Order function
  const generateTestOrder = async () => {
    try {
      await axios.post(`${API_URL}/api/orders/generate-dummy`, {}, getAuth());
      fetchOrders();
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Retailer Desk</h1>
              {/* WELCOME RETAILER SHOP NAME */}
              <p className="text-xs font-medium text-emerald-100">Welcome, {shopName}</p>
            </div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="flex items-center gap-2 bg-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-900 transition font-semibold"><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          <button onClick={()=>setActiveTab('inventory')} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='inventory' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-gray-500'}`}><Package className="w-5 h-5"/> Inventory Mgmt</button>
          <button onClick={()=>setActiveTab('add')} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='add' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-gray-500'}`}><Plus className="w-5 h-5"/> Add Product</button>
          <button onClick={()=>setActiveTab('orders')} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='orders' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-gray-500'}`}><ShoppingCart className="w-5 h-5"/> Orders List</button>
          <button onClick={()=>setActiveTab('summary')} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='summary' ? 'text-emerald-600 border-b-4 border-emerald-600' : 'text-gray-500'}`}><BarChart2 className="w-5 h-5"/> Summary</button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 mt-4 w-full">
        {message && <div className="mb-6 p-4 rounded-lg bg-emerald-100 text-emerald-800 font-bold">{message}</div>}

        {/* TAB 1: ADD PRODUCT */}
        {activeTab === 'add' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Add New Product</h3>
            <div className="relative mb-6">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-4" />
              <input type="text" placeholder="Search Master Catalog..." value={searchTerm} onChange={handleSearchChange} className="w-full pl-10 p-4 border-2 border-emerald-100 rounded-xl focus:border-emerald-500 bg-gray-50" />
              {filteredMaster.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {filteredMaster.map(m => (
                    <div key={m._id} onClick={() => selectMasterProduct(m)} className="flex items-center gap-4 p-3 hover:bg-emerald-50 cursor-pointer border-b">
                      <div><p className="font-bold text-gray-800">{m.name}</p><p className="text-xs text-gray-500">{m.category}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="p-3 border rounded-lg" />
              <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="p-3 border rounded-lg bg-white">
                <option value="Groceries">Groceries</option><option value="Dairy">Dairy</option>
              </select>
              {/* THE REQUESTED RETAILER PRICE */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Your Requested Price</label>
                <input type="number" placeholder="₹" required value={newProduct.retailerPrice} onChange={(e) => setNewProduct({...newProduct, retailerPrice: e.target.value})} className="w-full p-3 border rounded-lg focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Initial Quantity</label>
                <input type="number" required value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full p-3 border rounded-lg focus:border-emerald-500" />
              </div>
              <input type="text" placeholder="Image URL (Optional)" value={newProduct.imageUrl} onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})} className="p-3 border rounded-lg md:col-span-2" />
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700">Submit for Approval</button>
            </form>
          </div>
        )}

        {/* TAB 2: INVENTORY & QUANTITY MGMT */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Manage Available Quantity & Prices</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Product</th>
                    <th className="p-3 border-b">Status</th>
                    <th className="p-3 border-b">Your Price</th>
                    <th className="p-3 border-b">Customer Price</th>
                    <th className="p-3 border-b">Qty Available</th>
                    <th className="p-3 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-bold">{product.name}</td>
                      <td className="p-3 border-b">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${product.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{product.status}</span>
                      </td>
                      <td className="p-3 border-b text-gray-600">₹{product.retailerPrice}</td>
                      <td className="p-3 border-b font-bold text-emerald-600">
                        {product.status === 'Approved' ? `₹${product.sellingPrice}` : 'Waiting...'}
                      </td>
                      <td className="p-3 border-b">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateQuantity(product._id, product.quantity - 1)} className="bg-gray-200 px-2 rounded font-bold">-</button>
                          <span className="w-6 text-center font-bold">{product.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(product._id, product.quantity + 1)} className="bg-gray-200 px-2 rounded font-bold">+</button>
                        </div>
                      </td>
                      <td className="p-3 border-b flex gap-2">
                        {product.status === 'Approved' && (
                          <>
                            <button onClick={() => handleRequestPriceChange(product._id)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold hover:bg-blue-200">Change Price</button>
                            <button onClick={() => handleDelete(product._id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">List of Orders</h2>
              {/* Just for testing so you can populate dummy data! */}
              <button onClick={generateTestOrder} className="bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded text-sm">+ Simulate Order</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Order ID</th>
                    <th className="p-3 border-b">Date & Time</th>
                    <th className="p-3 border-b">Status</th>
                    <th className="p-3 border-b">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No orders found.</td></tr> : null}
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-mono font-bold text-indigo-600">{order.orderId}</td>
                      <td className="p-3 border-b text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="p-3 border-b"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{order.status}</span></td>
                      <td className="p-3 border-b font-extrabold text-gray-900">₹{order.totalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Revenue Summary</h2>
            
            {/* DATE FILTERS */}
            <div className="flex items-end gap-4 mb-8 bg-gray-50 p-4 rounded-lg border">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                <input type="date" value={dateFilter.startDate} onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})} className="border p-2 rounded focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                <input type="date" value={dateFilter.endDate} onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})} className="border p-2 rounded focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={() => setDateFilter({startDate: '', endDate: ''})} className="text-gray-500 hover:text-red-500 text-sm font-bold ml-4">Clear Filters</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-emerald-800 font-bold uppercase text-sm">Total Orders Placed</p>
                  <p className="text-4xl font-extrabold text-emerald-600">{orders.length}</p>
                </div>
                <ShoppingCart className="w-12 h-12 text-emerald-200" />
              </div>
              
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-indigo-800 font-bold uppercase text-sm">Total Revenue</p>
                  <p className="text-4xl font-extrabold text-indigo-600">₹{orders.reduce((sum, order) => sum + order.totalAmount, 0)}</p>
                </div>
                <BarChart2 className="w-12 h-12 text-indigo-200" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
