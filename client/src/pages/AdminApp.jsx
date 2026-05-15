import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Database, CheckCircle, LogOut, Edit, MapPin, Upload, BarChart3, Truck, Search, Calendar, Image as ImageIcon } from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('orders');
  const [message, setMessage] = useState('');
  
  const [users, setUsers] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [globalOrders, setGlobalOrders] = useState([]);
  
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', customCategory: '', address: '', contactNumber: '', lat: '', lng: '' });
  const [masterForm, setMasterForm] = useState({ name: '', description: '', category: 'Groceries', customCategory: '', imageUrl: '' });
  const [approvalPrices, setApprovalPrices] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [editingMaster, setEditingMaster] = useState(null);
  
  // FILTERS
  const [orderFilter, setOrderFilter] = useState({ startDate: '', endDate: '', retailerId: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    setMessage('');
    
    // Initial fetch
    if (activeTab === 'users' || activeTab === 'agents' || activeTab === 'staff') fetchUsers();
    if (activeTab === 'catalog') fetchMasterProducts();
    if (activeTab === 'approvals') fetchApprovals();
    if (activeTab === 'orders' || activeTab === 'summary') fetchGlobalOrders();

    // Background Auto-Sync every 5 seconds!
    const interval = setInterval(() => {
      if (activeTab === 'orders' || activeTab === 'summary') fetchGlobalOrders();
      if (activeTab === 'approvals') fetchApprovals();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, orderFilter]);

  const fetchUsers = async () => { try { setUsers((await axios.get(`${API_URL}/api/admin/users`, getAuth())).data || []); } catch (err) { setUsers([]); } };
  const fetchMasterProducts = async () => { try { setMasterProducts((await axios.get(`${API_URL}/api/admin/master-products`, getAuth())).data || []); } catch (err) { setMasterProducts([]); } };
  const fetchApprovals = async () => { 
    try { 
      const res = await axios.get(`${API_URL}/api/admin/pending-approvals`, getAuth()); 
      const safeData = Array.isArray(res.data) ? res.data : [];
      setApprovals(safeData);
      const prices = {}; safeData.forEach(p => prices[p._id] = p.retailerPrice); setApprovalPrices(prices);
    } catch (err) { setApprovals([]); } 
  };
  const fetchGlobalOrders = async () => { 
    try { 
      const query = new URLSearchParams();
      if (orderFilter.startDate) query.append('startDate', orderFilter.startDate);
      if (orderFilter.endDate) query.append('endDate', orderFilter.endDate);
      if (orderFilter.retailerId) query.append('retailerId', orderFilter.retailerId);
      setGlobalOrders((await axios.get(`${API_URL}/api/orders/all-orders?${query.toString()}`, getAuth())).data || []); 
    } catch (err) { setGlobalOrders([]); } 
  };

  // SMART DYNAMIC CATEGORIES
  const baseCategories = ['Groceries', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Pharmacy', 'Meat & Seafood', 'Bakery', 'Personal Care', 'Home & Kitchen'];
  const dynamicCategories = Array.from(new Set([
    ...baseCategories,
    ...masterProducts.map(m => m.category),
    ...users.filter(u => u.role === 'retailer').map(u => u.retailerCategory)
  ])).filter(Boolean);

  const handleImageUpload = (e, formType) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (formType === 'master') setMasterForm({ ...masterForm, imageUrl: reader.result });
        if (formType === 'editMaster') setEditingMaster({ ...editingMaster, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const payload = { ...staffForm };
    if (payload.retailerCategory === 'CUSTOM') payload.retailerCategory = payload.customCategory;

    try { 
      await axios.post(`${API_URL}/api/auth/admin-create-staff`, payload, getAuth()); 
      setMessage("Staff Created Successfully!"); 
      setStaffForm({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', customCategory: '', address: '', contactNumber: '', lat: '', lng: '' });
      fetchUsers();
    } catch (err) { setMessage(err.response?.data?.message || 'Error creating staff'); }
  };

  const handleCreateMaster = async (e) => {
    e.preventDefault();
    const payload = { ...masterForm };
    if (payload.category === 'CUSTOM') payload.category = payload.customCategory;

    try { 
      await axios.post(`${API_URL}/api/admin/master-products`, payload, getAuth()); 
      setMessage('Master product added!'); 
      setMasterForm({ name: '', description: '', category: 'Groceries', customCategory: '', imageUrl: '' }); 
      fetchMasterProducts(); 
    } catch (err) {}
  };

  const handleUpdateMaster = async (e) => {
    e.preventDefault();
    const payload = { ...editingMaster };
    if (payload.category === 'CUSTOM') payload.category = payload.customCategory;

    try {
      await axios.put(`${API_URL}/api/admin/master-products/${editingMaster._id}`, payload, getAuth());
      setMessage('Master Product Updated Successfully!');
      setEditingMaster(null);
      fetchMasterProducts();
    } catch (err) { setMessage(err.response?.data?.message || 'Error updating product'); }
  };

  const handleApproval = async (id, action) => {
    try { await axios.put(`${API_URL}/api/admin/approve-product/${id}`, { action, sellingPrice: approvalPrices[id] }, getAuth()); fetchApprovals(); } catch (err) {}
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try { await axios.put(`${API_URL}/api/admin/users/${editingUser._id}`, editingUser, getAuth()); setEditingUser(null); fetchUsers(); } catch (err) {}
  };

  // NEW: ASSIGN AGENT FUNCTION
  const handleAssignAgent = async (orderId, agentId) => {
    if (!agentId) return;
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/assign`, { agentId }, getAuth());
      setMessage('Fleet Agent Successfully Dispatched!');
      fetchGlobalOrders(); 
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to assign agent.');
    }
  };

  // --- DATA AGGREGATIONS FOR SUMMARY & ORDERS ---
  const groupedOrders = {};
  let totalPlatformDeliveryFees = 0; let totalPlatformMarginItems = 0; let totalCustomerPaid = 0;

  if (Array.isArray(globalOrders)) {
    globalOrders.forEach(order => {
      let orderItemsTotalOurPrice = 0;
      if (order.subOrders) {
        order.subOrders.forEach(sub => {
          const rId = sub.retailerId?._id || 'unassigned';
          if (!groupedOrders[rId]) groupedOrders[rId] = { shopName: sub.retailerId?.shopName || 'Unknown', subOrders: [], totalOurPrice: 0, totalTheirPrice: 0 };
          
          let subOurPrice = 0; let subTheirPrice = 0;
          if (sub.items) {
            sub.items.forEach(item => { const qty = item.cartQty || 1; subOurPrice += (item.price || 0) * qty; subTheirPrice += (item.retailerPrice || item.price || 0) * qty; });
          }
          orderItemsTotalOurPrice += subOurPrice; groupedOrders[rId].totalOurPrice += subOurPrice; groupedOrders[rId].totalTheirPrice += subTheirPrice; totalPlatformMarginItems += (subOurPrice - subTheirPrice);
          groupedOrders[rId].subOrders.push({ parentOrderId: order._id, date: order.createdAt, customerName: order.customerId?.name || 'Unknown', status: sub.status, items: sub.items || [], ourPrice: subOurPrice, theirPrice: subTheirPrice });
        });
      }
      totalCustomerPaid += (order.totalAmount || 0);
      const calculatedFee = (order.totalAmount || 0) - orderItemsTotalOurPrice;
      if (calculatedFee > 0) totalPlatformDeliveryFees += calculatedFee;
    });
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name + u.email + (u.shopName||'') + (u.contactNumber||'')).toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });
  const retailersOnly = users.filter(u => u.role === 'retailer');
  const agentsOnly = users.filter(u => u.role === 'delivery_agent');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative">
      
      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Edit User Profile</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <input type="text" placeholder="Name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border rounded-lg outline-none" required/>
              <input type="email" placeholder="Email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-3 border rounded-lg outline-none" required/>
              <input type="text" placeholder="Contact Number" value={editingUser.contactNumber || ''} onChange={e => setEditingUser({...editingUser, contactNumber: e.target.value})} className="w-full p-3 border rounded-lg outline-none" />
              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold">Save Changes</button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MASTER CATALOG MODAL */}
      {editingMaster && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-indigo-900">Edit Master Product</h2>
            <form onSubmit={handleUpdateMaster} className="space-y-4">
              <input type="text" placeholder="Product Name" value={editingMaster.name} onChange={e => setEditingMaster({...editingMaster, name: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required/>
              
              <select value={editingMaster.category} onChange={(e) => setEditingMaster({...editingMaster, category: e.target.value})} className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="CUSTOM">➕ Add Custom Category</option>
              </select>
              {editingMaster.category === 'CUSTOM' && (
                <input type="text" placeholder="Type Custom Category" required value={editingMaster.customCategory} onChange={(e) => setEditingMaster({...editingMaster, customCategory: e.target.value})} className="w-full p-3 border rounded-lg outline-none bg-indigo-50 focus:ring-2 focus:ring-indigo-500" />
              )}

              <input type="text" placeholder="Description" value={editingMaster.description} onChange={e => setEditingMaster({...editingMaster, description: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 mb-2">Update Image</label>
                <input type="text" placeholder="Paste Image URL" value={editingMaster.imageUrl} onChange={(e) => setEditingMaster({...editingMaster, imageUrl: e.target.value})} className="w-full p-2 border rounded-lg outline-none mb-2 text-sm" />
                <div className="text-center font-bold text-gray-400 text-xs mb-2">OR</div>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'editMaster')} className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700" />
              </div>

              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-700">Save Changes</button>
                <button type="button" onClick={() => setEditingMaster(null)} className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-gray-900 text-white min-h-full p-4 shadow-xl z-10 flex flex-col">
        <div className="flex items-center gap-2 mb-8 mt-4 px-2"><Shield className="w-8 h-8 text-pink-500"/><h1 className="text-xl font-extrabold tracking-widest uppercase">Admin Core</h1></div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('summary')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'summary' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><BarChart3 className="w-5 h-5"/> Financial Summary</button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'orders' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><MapPin className="w-5 h-5"/> Live Orders</button>
          <button onClick={() => setActiveTab('agents')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'agents' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Truck className="w-5 h-5"/> Agent Logistics</button>
          <div className="border-t border-gray-700 my-4"></div>
          <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'staff' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Create Staff</button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'users' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Search className="w-5 h-5"/> Directory</button>
          <div className="border-t border-gray-700 my-4"></div>
          <button onClick={() => setActiveTab('catalog')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'catalog' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Database className="w-5 h-5"/> Master Catalog</button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'approvals' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><CheckCircle className="w-5 h-5"/> Approvals</button>
        </nav>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-8 bg-red-600 py-3 rounded-lg font-bold hover:bg-red-700 flex justify-center items-center gap-2 shadow-lg"><LogOut className="w-4 h-4"/> Logout</button>
      </div>

      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto">
        {message && <div className="mb-6 p-4 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold flex justify-between items-center">{message} <button onClick={()=>setMessage('')} className="text-indigo-500 hover:text-indigo-800">X</button></div>}

        {/* TAB 1: FINANCIAL SUMMARY */}
        {activeTab === 'summary' && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-black text-gray-800 mb-6">Financial Summary</h2>
            <div className="flex flex-wrap items-end gap-4 mb-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Start Date</label><input type="date" value={orderFilter.startDate} onChange={e=>setOrderFilter({...orderFilter, startDate: e.target.value})} className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">End Date</label><input type="date" value={orderFilter.endDate} onChange={e=>setOrderFilter({...orderFilter, endDate: e.target.value})} className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Filter by Retailer</label>
                <select value={orderFilter.retailerId} onChange={e=>setOrderFilter({...orderFilter, retailerId: e.target.value})} className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="">All Retailers</option>
                  {retailersOnly.map(r => <option key={r._id} value={r._id}>{r.shopName || r.name}</option>)}
                </select>
              </div>
              <button onClick={() => setOrderFilter({startDate: '', endDate: '', retailerId: ''})} className="text-indigo-600 font-bold ml-2 text-sm hover:underline py-2">Clear Filters</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg"><p className="text-indigo-200 font-bold text-xs uppercase tracking-wider mb-2">Total Customer Paid</p><p className="text-4xl font-black">₹{totalCustomerPaid}</p></div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Total Retailer Revenue</p><p className="text-4xl font-black text-blue-600">₹{Object.values(groupedOrders).reduce((acc, r) => acc + r.totalTheirPrice, 0)}</p></div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"><p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Delivery Fees Collected</p><p className="text-4xl font-black text-purple-600">₹{totalPlatformDeliveryFees}</p></div>
              <div className="bg-green-50 p-6 rounded-2xl shadow-sm border border-green-200"><p className="text-green-700 font-bold text-xs uppercase tracking-wider mb-2">Platform Margin (Items + Fees)</p><p className="text-4xl font-black text-green-700">₹{totalPlatformMarginItems + totalPlatformDeliveryFees}</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b bg-gray-50"><h3 className="font-bold text-lg text-gray-800">Revenue Breakdown by Retailer</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-white text-gray-400 text-xs uppercase tracking-wider"><th className="p-4 border-b">Retailer Shop Name</th><th className="p-4 border-b">Orders Fulfilled</th><th className="p-4 border-b text-blue-600">Their Revenue</th><th className="p-4 border-b text-green-600">Item Margin Earned</th></tr></thead>
                  <tbody>
                    {Object.entries(groupedOrders).map(([rId, rData]) => (
                      <tr key={rId} className="hover:bg-gray-50 transition border-b last:border-0"><td className="p-4 font-bold text-gray-800">{rData.shopName}</td><td className="p-4 font-medium text-gray-600">{rData.subOrders.length}</td><td className="p-4 font-black text-blue-600">₹{rData.totalTheirPrice}</td><td className="p-4 font-black text-green-600">₹{rData.totalOurPrice - rData.totalTheirPrice}</td></tr>
                    ))}
                    {Object.keys(groupedOrders).length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500 font-bold">No data matches current filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE ORDERS (UPDATED WITH DROPDOWN) */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Fulfillment Dashboard</h2>
            <div className="flex flex-wrap items-end gap-4 mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label><input type="date" value={orderFilter.startDate} onChange={e=>setOrderFilter({...orderFilter, startDate: e.target.value})} className="border p-2 rounded-lg outline-none focus:border-indigo-500" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">End Date</label><input type="date" value={orderFilter.endDate} onChange={e=>setOrderFilter({...orderFilter, endDate: e.target.value})} className="border p-2 rounded-lg outline-none focus:border-indigo-500" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Retailer</label>
                <select value={orderFilter.retailerId} onChange={e=>setOrderFilter({...orderFilter, retailerId: e.target.value})} className="border p-2.5 rounded-lg outline-none focus:border-indigo-500 bg-white">
                  <option value="">All Retailers</option>
                  {retailersOnly.map(r => <option key={r._id} value={r._id}>{r.shopName || r.name}</option>)}
                </select>
              </div>
              <button onClick={() => setOrderFilter({startDate: '', endDate: '', retailerId: ''})} className="text-indigo-500 font-bold ml-2 text-sm hover:underline">Reset</button>
            </div>

            <div className="space-y-8">
              {Object.keys(groupedOrders).length === 0 && <p className="text-gray-500 font-bold p-6 text-center bg-white border rounded-xl">No orders found.</p>}
              {Object.entries(groupedOrders).map(([rId, rData]) => (
                <div key={rId} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                  <h3 className="text-xl font-black text-indigo-900 mb-4 pl-2">{rData.shopName}</h3>
                  <div className="overflow-x-auto pl-2">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><th className="p-3 border-b">Order Date</th><th className="p-3 border-b">Order ID</th><th className="p-3 border-b">Customer</th><th className="p-3 border-b">Items</th><th className="p-3 border-b">Their Price</th><th className="p-3 border-b">Our Price</th><th className="p-3 border-b">Status</th></tr></thead>
                      <tbody>
                        {rData.subOrders.map((so, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 text-sm">
                            <td className="p-3 border-b text-gray-600 font-medium whitespace-nowrap">{new Date(so.date).toLocaleString()}</td>
                            <td className="p-3 border-b font-mono font-bold text-gray-400">{so.parentOrderId?.slice(-6).toUpperCase() || 'N/A'}</td>
                            <td className="p-3 border-b font-bold text-gray-700">{so.customerName}</td>
                            <td className="p-3 border-b text-gray-600">{so.items.map(i => `${i.cartQty||1}x ${i.name}`).join(', ')}</td>
                            <td className="p-3 border-b text-blue-600 font-bold">₹{so.theirPrice}</td>
                            <td className="p-3 border-b text-green-600 font-bold">₹{so.ourPrice}</td>
                            <td className="p-3 border-b">
                              {so.status === 'Pending' ? (
                                <select 
                                  className="text-[10px] font-bold border-2 border-indigo-200 rounded p-1 outline-none focus:border-indigo-500 bg-indigo-50 text-indigo-700 uppercase"
                                  onChange={(e) => handleAssignAgent(so.parentOrderId, e.target.value)}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Assign Fleet...</option>
                                  {agentsOnly.map(agent => (
                                    <option key={agent._id} value={agent._id}>{agent.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${so.status==='Assigned'?'bg-blue-100 text-blue-700':so.status==='Picked_Up'?'bg-yellow-100 text-yellow-700':so.status==='Delivered'?'bg-green-100 text-green-700':so.status.includes('Cancel')?'bg-red-100 text-red-700':'bg-gray-100'}`}>{so.status.replace('_', ' ')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LOGISTICS / DELIVERY AGENTS */}
        {activeTab === 'agents' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Delivery Fleet Tracker</h2>
            <p className="text-gray-500 mb-6">Manage agents, monitor active attendance, and track per-delivery payouts (₹15/delivery).</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between"><div className="font-bold text-gray-500 uppercase text-xs">Total Agents</div><div className="text-2xl font-black text-indigo-600">{agentsOnly.length}</div></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between"><div className="font-bold text-gray-500 uppercase text-xs">Active Today</div><div className="text-2xl font-black text-green-500">0 <span className="text-sm font-normal text-gray-400">(Dev Mode)</span></div></div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between"><div className="font-bold text-gray-500 uppercase text-xs">Total Fleet Payouts</div><div className="text-2xl font-black text-purple-600">₹0 <span className="text-sm font-normal text-gray-400">(Dev Mode)</span></div></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><th className="p-4 border-b">Agent Name</th><th className="p-4 border-b">Contact</th><th className="p-4 border-b">Joined Date</th><th className="p-4 border-b">Deliveries Completed</th><th className="p-4 border-b">Amount Earned</th><th className="p-4 border-b">Status</th></tr></thead>
                <tbody>
                  {agentsOnly.length === 0 && <tr><td colSpan="6" className="p-8 text-center font-bold text-gray-400">No delivery agents registered yet.</td></tr>}
                  {agentsOnly.map(agent => (
                    <tr key={agent._id} className="hover:bg-gray-50 text-sm">
                      <td className="p-4 border-b font-bold text-gray-800">{agent.name}</td>
                      <td className="p-4 border-b text-gray-600">{agent.contactNumber || 'N/A'}</td>
                      <td className="p-4 border-b text-gray-500">{new Date(agent.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 border-b font-bold text-indigo-600">0</td><td className="p-4 border-b font-black text-green-600">₹0</td>
                      <td className="p-4 border-b"><span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Offline</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CREATE STAFF */}
        {activeTab === 'staff' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm max-w-2xl border border-gray-100 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Generate Platform Credentials</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none">
                <option value="retailer">Retailer (Shop Owner)</option>
                <option value="delivery_agent">Delivery Agent</option>
              </select>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" value={staffForm.name} onChange={(e) => setStaffForm({...staffForm, name: e.target.value})} required className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="email" placeholder="Login Email" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} required className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="password" placeholder="Set Password" value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} required className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Contact Number" value={staffForm.contactNumber} onChange={(e) => setStaffForm({...staffForm, contactNumber: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {staffForm.role === 'retailer' && (
                <div className="space-y-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100 shadow-inner">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Shop Name" value={staffForm.shopName} onChange={(e) => setStaffForm({...staffForm, shopName: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                    <div className="relative">
                      <select value={staffForm.retailerCategory} onChange={(e) => setStaffForm({...staffForm, retailerCategory: e.target.value})} className="w-full p-3 border rounded-lg bg-white outline-none">
                        {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="CUSTOM">➕ Add Custom Category</option>
                      </select>
                    </div>
                  </div>

                  {staffForm.retailerCategory === 'CUSTOM' && (
                    <input type="text" placeholder="Type Custom Category Name" required value={staffForm.customCategory} onChange={(e) => setStaffForm({...staffForm, customCategory: e.target.value})} className="w-full p-3 border rounded-lg outline-none bg-white" />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Detailed Address / Location" value={staffForm.address} onChange={(e) => setStaffForm({...staffForm, address: e.target.value})} required className="md:col-span-2 p-3 border rounded-lg outline-none" />
                    <input type="text" placeholder="Latitude (e.g. 22.5726)" value={staffForm.lat} onChange={(e) => setStaffForm({...staffForm, lat: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                    <input type="text" placeholder="Longitude (e.g. 88.3639)" value={staffForm.lng} onChange={(e) => setStaffForm({...staffForm, lng: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                  </div>
                </div>
              )}
              
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-indigo-700">Create Secured Account</button>
            </form>
          </div>
        )}

        {/* TAB 5: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Platform Users Directory</h2>
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[250px]"><Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" /><input type="text" placeholder="Search by name, email, shop, or phone..." value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" /></div>
              <select value={userRoleFilter} onChange={e=>setUserRoleFilter(e.target.value)} className="border p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"><option value="All">All Roles</option><option value="customer">Customers</option><option value="retailer">Retailers</option><option value="delivery_agent">Delivery Agents</option></select>
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><th className="p-3 border-b">Name</th><th className="p-3 border-b">Role</th><th className="p-3 border-b">Shop/Contact</th><th className="p-3 border-b">Email</th><th className="p-3 border-b">Location (GPS)</th><th className="p-3 border-b">Joined Date</th></tr></thead>
                <tbody>
                  {filteredUsers.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400 font-bold">No users match your search.</td></tr>}
                  {filteredUsers.map(user => (
                    <tr key={user._id} className="hover:bg-indigo-50 transition text-sm">
                      <td className="p-3 border-b font-bold text-gray-700">{user.name}</td>
                      <td className="p-3 border-b"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role==='admin'?'bg-red-100 text-red-700':user.role==='retailer'?'bg-blue-100 text-blue-700':user.role==='delivery_agent'?'bg-purple-100 text-purple-700':'bg-gray-200 text-gray-700'}`}>{user.role.replace('_', ' ')}</span></td>
                      <td className="p-3 border-b text-gray-600">{user.shopName ? <span className="font-bold text-indigo-700 block">{user.shopName}</span> : null}<span className="text-xs">{user.contactNumber || 'No Phone'}</span></td>
                      <td className="p-3 border-b text-gray-500">{user.email}</td>
                      <td className="p-3 border-b font-mono text-[10px] text-gray-400">{user.location?.coordinates?.[1] ? `${user.location.coordinates[1].toFixed(4)}, ${user.location.coordinates[0].toFixed(4)}` : 'N/A'}</td>
                      <td className="p-3 border-b text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: MASTER CATALOG */}
        {activeTab === 'catalog' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Add to Master Catalog</h2>
            <form onSubmit={handleCreateMaster} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
              <input type="text" placeholder="Product Name" required value={masterForm.name} onChange={(e) => setMasterForm({...masterForm, name: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              
              <select value={masterForm.category} onChange={(e) => setMasterForm({...masterForm, category: e.target.value})} className="p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="CUSTOM">➕ Add Custom Category</option>
              </select>

              {masterForm.category === 'CUSTOM' && (
                <input type="text" placeholder="Type Custom Category Name" required value={masterForm.customCategory} onChange={(e) => setMasterForm({...masterForm, customCategory: e.target.value})} className="md:col-span-2 p-3 border rounded-lg outline-none bg-white" />
              )}

              <input type="text" placeholder="Description" value={masterForm.description} onChange={(e) => setMasterForm({...masterForm, description: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2" />
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">1. Paste Image URL</label><input type="text" placeholder="https://example.com/image.png" value={masterForm.imageUrl} onChange={(e) => setMasterForm({...masterForm, imageUrl: e.target.value})} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="flex flex-col justify-center"><label className="block text-xs font-bold text-gray-500 mb-1 text-center">OR 2. Upload Photo File</label><div className="border rounded-lg bg-gray-50 flex items-center justify-center p-1"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'master')} className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer" /></div></div>
              </div>
              <button type="submit" className="md:col-span-2 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-md">Save Product to Master DB</button>
            </form>

            <h3 className="text-lg font-bold mb-4 text-gray-700">Current Master Catalog</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider"><th className="p-3 border-b">Image</th><th className="p-3 border-b">Name</th><th className="p-3 border-b">Category</th><th className="p-3 border-b">Description</th><th className="p-3 border-b">Actions</th></tr></thead>
                <tbody>
                  {masterProducts.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50 text-sm">
                      <td className="p-3 border-b w-16">
                        {m.imageUrl ? <img src={m.imageUrl} className="w-10 h-10 object-contain rounded border bg-white shadow-sm" alt="img"/> : <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400"><ImageIcon className="w-5 h-5"/></div>}
                      </td>
                      <td className="p-3 border-b font-bold text-gray-800">{m.name}</td>
                      <td className="p-3 border-b"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{m.category}</span></td>
                      <td className="p-3 border-b text-gray-500 max-w-xs truncate">{m.description}</td>
                      <td className="p-3 border-b">
                         <button onClick={() => setEditingMaster({...m, customCategory: ''})} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded flex items-center gap-1 font-bold"><Edit className="w-4 h-4"/> Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Pending Action Required</h2>
            {approvals.length === 0 ? <p className="text-gray-500 font-bold p-6 text-center border rounded-xl bg-gray-50">No pending retailer requests at this time.</p> : (
              <div className="space-y-4">
                {approvals.map(product => (
                  <div key={product._id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border bg-yellow-50 border-yellow-200 shadow-sm">
                    <div>
                      <span className="bg-yellow-500 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold text-white shadow-sm">{product.status}</span>
                      <h3 className="font-bold text-lg mt-2 text-gray-800">{product.name}</h3>
                      <p className="text-sm text-gray-600">Requested By: <strong className="text-indigo-700">{product.retailerId?.shopName}</strong></p>
                      <p className="text-sm text-gray-600 mt-1">Retailer Quoted Price: <strong className="text-blue-600 text-lg">₹{product.retailerPrice}</strong></p>
                    </div>
                    <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end bg-white p-3 rounded-lg border border-yellow-100 shadow-sm">
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Set Platform Selling Price</label>
                      <div className="flex gap-2 items-center">
                        <span className="font-bold text-gray-400">₹</span>
                        <input type="number" value={approvalPrices[product._id] || ''} onChange={(e) => setApprovalPrices({...approvalPrices, [product._id]: e.target.value})} className="border-2 border-indigo-200 p-2 rounded-lg w-24 text-center font-black text-indigo-700 outline-none focus:border-indigo-500 text-lg" />
                        <button onClick={() => handleApproval(product._id, 'approve')} className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-sm transition transform hover:scale-105">Approve</button>
                        <button onClick={() => handleApproval(product._id, 'reject')} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg font-bold hover:bg-red-100 transition">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
