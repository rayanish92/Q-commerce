import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Search, Plus, Trash2, LogOut, ShoppingCart, BarChart2, Briefcase } from 'lucide-react';

export default function RetailerApp() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');
  const [shopName, setShopName] = useState('');

  // Dropdown & Search Form State
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaster, setFilteredMaster] = useState([]);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', retailerPrice: '', quantity: '', category: 'Groceries', imageUrl: '' });
  
  // Bank Details State
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', ifscCode: '' });

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setShopName(JSON.parse(atob(token.split('.')[1])).user.shopName);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prods, master, user] = await Promise.all([
        axios.get(`${API_URL}/api/products/me`, getAuth()),
        axios.get(`${API_URL}/api/admin/master-products`, getAuth()),
        axios.get(`${API_URL}/api/auth/me`, getAuth())
      ]);
      setProducts(prods.data); setMasterProducts(master.data); 
      if(user.data.bankDetails) setBankDetails(user.data.bankDetails);
    } catch (err) {}
  };

  const fetchOrders = async () => {
    try { setOrders((await axios.get(`${API_URL}/api/orders/retailer-orders`, getAuth())).data); } catch (err) {}
  };

  // NEW: Search Master Catalog Logic
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 1) setFilteredMaster(masterProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase())));
    else setFilteredMaster([]);
  };

  const handleMasterSelect = (master) => {
    if (master === 'CUSTOM') {
      setIsCustomProduct(true);
      setNewProduct({ name: '', description: '', retailerPrice: '', quantity: '', category: 'Groceries', imageUrl: '' });
    } else {
      setIsCustomProduct(false);
      setSearchTerm(master.name);
      setFilteredMaster([]);
      setNewProduct({ ...newProduct, name: master.name, description: master.description, category: master.category, imageUrl: master.imageUrl });
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/products/add`, newProduct, getAuth());
      setMessage('Product submitted!'); fetchData(); setActiveTab('inventory');
    } catch (err) { setMessage('Failed to add product.'); }
  };

  const handleUpdateBank = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/auth/bank`, bankDetails, getAuth());
      setMessage('Settlement Bank details updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('Failed to update bank info.'); }
  };

  const handleOrderAction = async (orderId, subOrderId, action) => {
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/suborder/${subOrderId}`, { action }, getAuth());
      setMessage(`Order ${action}ed`); fetchOrders();
    } catch (err) { setMessage(`Failed to process order.`); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><Package className="w-8 h-8" /><div><h1 className="text-xl font-extrabold leading-tight">Retailer Desk</h1><p className="text-xs font-medium text-emerald-100">Welcome back, {shopName}</p></div></div>
          <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="bg-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-900 font-semibold"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          <button onClick={()=>{setActiveTab('inventory'); fetchData();}} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='inventory'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><Package className="w-5 h-5"/> Inventory</button>
          <button onClick={()=>setActiveTab('add')} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='add'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><Plus className="w-5 h-5"/> Add Product</button>
          <button onClick={()=>{setActiveTab('orders'); fetchOrders();}} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='orders'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><ShoppingCart className="w-5 h-5"/> Orders</button>
          <button onClick={()=>setActiveTab('bank')} className={`flex items-center gap-2 px-6 py-4 font-bold ${activeTab==='bank'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><Briefcase className="w-5 h-5"/> Settlements</button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 mt-4 w-full">
        {message && <div className="mb-6 p-4 rounded-lg bg-emerald-100 text-emerald-800 font-bold">{message}</div>}

        {activeTab === 'add' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Add New Product</h3>
            
            <div className="mb-6 bg-emerald-50 p-4 rounded-lg border border-emerald-100 relative">
              <label className="block font-bold text-emerald-800 mb-2">Search Master Catalog</label>
              <div className="relative mb-2">
                <Search className="w-5 h-5 absolute left-3 top-3 text-emerald-500"/>
                <input type="text" placeholder="Type to search verified items..." value={searchTerm} onChange={handleSearchChange} className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                {filteredMaster.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto z-20">
                    {filteredMaster.map(m => (
                      <div key={m._id} onClick={() => handleMasterSelect(m)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b font-bold text-gray-700">{m.name} ({m.category})</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-center font-bold text-emerald-300 my-2">OR</div>
              <select onChange={(e) => handleMasterSelect(e.target.value === 'CUSTOM' ? 'CUSTOM' : masterProducts.find(m=>m._id===e.target.value))} className="w-full p-3 border rounded-lg font-bold text-gray-700 bg-white">
                <option value="">-- Choose from Dropdown --</option>
                {masterProducts.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                <option value="CUSTOM">➕ Add Custom Product Not in List</option>
              </select>
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} disabled={!isCustomProduct && newProduct.name !== ''} className="p-3 border rounded-lg bg-gray-50" />
              <input type="number" placeholder="Your Requested Price (₹)" required value={newProduct.retailerPrice} onChange={(e) => setNewProduct({...newProduct, retailerPrice: e.target.value})} className="p-3 border rounded-lg" />
              <input type="number" placeholder="Initial Quantity" required value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} className="p-3 border rounded-lg" />
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700">Submit for Approval</button>
            </form>
          </div>
        )}

        {/* INVENTORY / ORDERS code is same as previous, adding BANK TAB below */}
        {activeTab === 'bank' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2"><Briefcase className="w-6 h-6"/> Settlement Details</h3>
            <p className="text-sm text-gray-500 mb-6">Enter your bank account details where all your completed order amounts will be credited automatically.</p>
            <form onSubmit={handleUpdateBank} className="space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Account Holder Name</label><input type="text" required value={bankDetails.accountName} onChange={e=>setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full p-3 border rounded-lg"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Bank Account Number</label><input type="password" required value={bankDetails.accountNumber} onChange={e=>setBankDetails({...bankDetails, accountNumber: e.target.value})} className="w-full p-3 border rounded-lg"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">IFSC Code</label><input type="text" required value={bankDetails.ifscCode} onChange={e=>setBankDetails({...bankDetails, ifscCode: e.target.value})} className="w-full p-3 border rounded-lg uppercase"/></div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 mt-2">Save Bank Details</button>
            </form>
          </div>
        )}

        {/* Existing Tab Code for Orders... */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-6">Action Required: Orders</h2>
            <div className="space-y-4">
              {orders.length === 0 ? <p className="text-center p-4 text-gray-500 border rounded-lg font-bold">No assigned orders.</p> : null}
              {orders.map(order => (
                <div key={order._id} className="border rounded-xl p-5 bg-gray-50">
                   <div className="flex justify-between border-b pb-4 mb-4">
                     <div><p className="font-mono text-xs font-bold text-indigo-600">Order: {order.orderId}</p><p className="text-sm font-bold text-gray-800">{new Date(order.createdAt).toLocaleString()}</p></div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.subOrder.status==='Pending'?'bg-yellow-200 text-yellow-800':order.subOrder.status==='Accepted'?'bg-green-200 text-green-800':'bg-red-200 text-red-800'}`}>{order.subOrder.status}</span>
                   </div>
                   <ul className="mb-4">{order.subOrder.items.map((i, idx) => <li key={idx} className="font-bold text-gray-800">• {i.cartQty}x {i.name}</li>)}</ul>
                   {order.subOrder.status === 'Pending' && (
                     <div className="flex gap-3 pt-4 border-t">
                       <button onClick={() => handleOrderAction(order._id, order.subOrder._id, 'Accept')} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg">Accept Order</button>
                       <button onClick={() => handleOrderAction(order._id, order.subOrder._id, 'Reject')} className="flex-1 bg-red-100 text-red-700 font-bold py-3 rounded-lg">Reject</button>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
