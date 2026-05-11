import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Database, CheckCircle, LogOut, Edit, MapPin, Upload } from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('orders');
  const [message, setMessage] = useState('');
  
  const [users, setUsers] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [globalOrders, setGlobalOrders] = useState([]);
  
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', contactNumber: '', lat: '', lng: '' });
  const [masterForm, setMasterForm] = useState({ name: '', description: '', category: 'Groceries', imageUrl: '' });
  const [approvalPrices, setApprovalPrices] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [orderFilter, setOrderFilter] = useState({ startDate: '', endDate: '', retailerId: '', location: '' });

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    setMessage('');
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'catalog') fetchMasterProducts();
    if (activeTab === 'approvals') fetchApprovals();
    if (activeTab === 'orders') fetchGlobalOrders();
  }, [activeTab, orderFilter]);

  const fetchUsers = async () => { try { setUsers((await axios.get(`${API_URL}/api/admin/users`, getAuth())).data || []); } catch (err) { setUsers([]); } };
  const fetchMasterProducts = async () => { try { setMasterProducts((await axios.get(`${API_URL}/api/admin/master-products`, getAuth())).data || []); } catch (err) { setMasterProducts([]); } };
  
  const fetchApprovals = async () => { 
    try { 
      const res = await axios.get(`${API_URL}/api/admin/pending-approvals`, getAuth()); 
      const safeData = Array.isArray(res.data) ? res.data : [];
      setApprovals(safeData);
      const prices = {}; 
      safeData.forEach(p => prices[p._id] = p.retailerPrice); 
      setApprovalPrices(prices);
    } catch (err) { setApprovals([]); } 
  };
  
  const fetchGlobalOrders = async () => { try { setGlobalOrders((await axios.get(`${API_URL}/api/orders/all-orders?${new URLSearchParams(orderFilter).toString()}`, getAuth())).data || []); } catch (err) { setGlobalOrders([]); } };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMasterForm({ ...masterForm, imageUrl: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try { 
      await axios.post(`${API_URL}/api/auth/admin-create-staff`, staffForm, getAuth()); 
      setMessage("Staff Created Successfully!"); 
      setStaffForm({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', contactNumber: '', lat: '', lng: '' });
    } catch (err) { setMessage(err.response?.data?.message || 'Error creating staff'); }
  };

  const handleCreateMaster = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API_URL}/api/admin/master-products`, masterForm, getAuth()); setMessage('Master product added!'); fetchMasterProducts(); } catch (err) {}
  };

  const handleApproval = async (id, action) => {
    try { await axios.put(`${API_URL}/api/admin/approve-product/${id}`, { action, sellingPrice: approvalPrices[id] }, getAuth()); fetchApprovals(); } catch (err) {}
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try { await axios.put(`${API_URL}/api/admin/users/${editingUser._id}`, editingUser, getAuth()); setEditingUser(null); fetchUsers(); } catch (err) {}
  };

  const groupedOrders = {};
  if (Array.isArray(globalOrders)) {
    globalOrders.forEach(order => {
      if (order.subOrders) order.subOrders.forEach(sub => {
        const rId = sub.retailerId?._id || 'unassigned';
        if (!groupedOrders[rId]) groupedOrders[rId] = { shopName: sub.retailerId?.shopName || 'Unknown', subOrders: [], totalOurPrice: 0, totalTheirPrice: 0 };
        let ourPrice = 0; let theirPrice = 0;
        if (sub.items) sub.items.forEach(item => { const qty = item.cartQty || 1; ourPrice += (item.price || 0) * qty; theirPrice += (item.retailerPrice || item.price || 0) * qty; });
        groupedOrders[rId].totalOurPrice += ourPrice; groupedOrders[rId].totalTheirPrice += theirPrice;
        groupedOrders[rId].subOrders.push({ parentOrderId: order.orderId, date: order.createdAt, customerName: order.customerId?.name || 'Unknown', status: sub.status, items: sub.items || [], ourPrice, theirPrice });
      });
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative">
      <div className="w-full md:w-64 bg-gray-900 text-white min-h-full p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-8 mt-4 px-2"><Shield className="w-8 h-8 text-red-500"/><h1 className="text-xl font-extrabold tracking-widest uppercase">Admin Core</h1></div>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'orders' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><MapPin className="w-5 h-5"/> Live Orders</button>
          <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'staff' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Create Staff</button>
          <button onClick={() => setActiveTab('catalog')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'catalog' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Database className="w-5 h-5"/> Master Catalog</button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'approvals' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><CheckCircle className="w-5 h-5"/> Approvals</button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'users' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Directory</button>
        </nav>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-12 bg-red-600 py-2 rounded font-bold hover:bg-red-700 flex justify-center items-center gap-2"><LogOut className="w-4 h-4"/> Logout</button>
      </div>

      <div className="flex-1 p-8">
        {message && <div className="mb-6 p-4 rounded-lg bg-indigo-100 text-indigo-800 border font-bold">{message}</div>}

        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Retailer Fulfillment Dashboard</h2>
            <div className="space-y-8">
              {Object.entries(groupedOrders).map(([rId, rData]) => (
                <div key={rId} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                  <h3 className="text-xl font-black text-indigo-900 mb-4 pl-2">{rData.shopName}</h3>
                  <div className="flex flex-wrap gap-4 mb-6 text-sm font-bold pl-2">
                     <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-100"><span className="block text-[10px] text-blue-500 uppercase tracking-wider mb-1">Retailer Revenue (Their Price)</span>₹{rData.totalTheirPrice}</div>
                     <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-100"><span className="block text-[10px] text-green-500 uppercase tracking-wider mb-1">Customer Paid (Our Price)</span>₹{rData.totalOurPrice}</div>
                     <div className="bg-purple-50 text-purple-800 px-4 py-2 rounded-lg border border-purple-100 shadow-sm"><span className="block text-[10px] text-purple-500 uppercase tracking-wider mb-1">Platform Margin</span><span className="text-lg">₹{rData.totalOurPrice - rData.totalTheirPrice}</span></div>
                  </div>
                  <div className="overflow-x-auto pl-2">
                    <table className="w-full text-left border-collapse">
                       <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><th className="p-3 border-b">Order ID</th><th className="p-3 border-b">Customer</th><th className="p-3 border-b">Items</th><th className="p-3 border-b">Their Price</th><th className="p-3 border-b">Our Price</th><th className="p-3 border-b">Status</th></tr></thead>
                       <tbody>
                         {rData.subOrders.map((so, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 text-sm">
                               <td className="p-3 border-b font-mono font-bold text-gray-400">{so.parentOrderId}</td>
                               <td className="p-3 border-b font-bold text-gray-700">{so.customerName}</td>
                               <td className="p-3 border-b text-gray-600">{so.items.map(i => `${i.cartQty||1}x ${i.name}`).join(', ')}</td>
                               <td className="p-3 border-b text-blue-600 font-bold">₹{so.theirPrice}</td><td className="p-3 border-b text-green-600 font-bold">₹{so.ourPrice}</td>
                               <td className="p-3 border-b"><span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${so.status==='Accepted'?'bg-green-100 text-green-700':so.status==='Pending'?'bg-yellow-100 text-yellow-700':so.status.includes('Cancel')?'bg-red-100 text-red-700':'bg-gray-100'}`}>{so.status}</span></td>
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

        {/* RESTORED STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm max-w-2xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Generate Credentials</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50">
                <option value="retailer">Retailer (Shop Owner)</option>
                <option value="delivery_agent">Delivery Agent</option>
              </select>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" value={staffForm.name} onChange={(e) => setStaffForm({...staffForm, name: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                <input type="email" placeholder="Login Email" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} required className="p-3 border rounded-lg outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="password" placeholder="Set Password" value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                <input type="text" placeholder="Contact Number" value={staffForm.contactNumber} onChange={(e) => setStaffForm({...staffForm, contactNumber: e.target.value})} className="p-3 border rounded-lg outline-none" />
              </div>

              {staffForm.role === 'retailer' && (
                <div className="space-y-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Shop Name" value={staffForm.shopName} onChange={(e) => setStaffForm({...staffForm, shopName: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                    <select value={staffForm.retailerCategory} onChange={(e) => setStaffForm({...staffForm, retailerCategory: e.target.value})} className="p-3 border rounded-lg bg-white outline-none">
                      <option value="Groceries">Groceries</option>
                      <option value="Pharmacy">Pharmacy</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Latitude (e.g. 22.5726)" value={staffForm.lat} onChange={(e) => setStaffForm({...staffForm, lat: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                    <input type="text" placeholder="Longitude (e.g. 88.3639)" value={staffForm.lng} onChange={(e) => setStaffForm({...staffForm, lng: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                  </div>
                </div>
              )}
              
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-indigo-700">Create Account</button>
            </form>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Add to Master Catalog</h2>
            <form onSubmit={handleCreateMaster} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
              <input type="text" placeholder="Product Name" required value={masterForm.name} onChange={(e) => setMasterForm({...masterForm, name: e.target.value})} className="p-3 border rounded-lg outline-none" />
              <select value={masterForm.category} onChange={(e) => setMasterForm({...masterForm, category: e.target.value})} className="p-3 border rounded-lg bg-white outline-none"><option value="Groceries">Groceries</option><option value="Vegetables">Vegetables</option><option value="Dairy">Dairy</option><option value="Snacks">Snacks</option></select>
              <input type="text" placeholder="Description" value={masterForm.description} onChange={(e) => setMasterForm({...masterForm, description: e.target.value})} className="p-3 border rounded-lg outline-none" />
              <div className="p-2 border rounded-lg bg-white flex items-center gap-3"><Upload className="w-5 h-5 text-gray-400" /><input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" /></div>
              <button type="submit" className="md:col-span-2 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Save to Master DB</button>
            </form>

            <h3 className="text-lg font-bold mb-4 text-gray-700">Current Master Catalog</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider"><th className="p-3 border-b">Image</th><th className="p-3 border-b">Name</th><th className="p-3 border-b">Category</th><th className="p-3 border-b">Description</th></tr></thead>
                <tbody>
                  {masterProducts.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50 text-sm">
                      <td className="p-3 border-b w-16"><img src={m.imageUrl || 'https://via.placeholder.com/50'} className="w-10 h-10 object-contain rounded border bg-white" alt="img"/></td>
                      <td className="p-3 border-b font-bold text-gray-800">{m.name}</td>
                      <td className="p-3 border-b text-indigo-600 font-medium">{m.category}</td>
                      <td className="p-3 border-b text-gray-500 max-w-xs truncate">{m.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Pending Actions</h2>
            {approvals.length === 0 ? <p className="text-gray-500 font-bold p-6 text-center border rounded-xl">No pending approvals.</p> : (
              <div className="space-y-4">
                {approvals.map(product => (
                  <div key={product._id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg border bg-yellow-50 border-yellow-100">
                    <div>
                      <span className="bg-yellow-500 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold text-white">{product.status}</span>
                      <h3 className="font-bold text-lg mt-2 text-gray-800">{product.name}</h3>
                      <p className="text-sm text-gray-600">Shop: <strong>{product.retailerId?.shopName}</strong></p>
                      <p className="text-sm text-gray-600 mt-1">Requested Price: <strong className="text-blue-600">₹{product.retailerPrice}</strong></p>
                    </div>
                    <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
                      <div className="flex gap-2 items-end">
                        <div><label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Set Your Selling Price</label><input type="number" value={approvalPrices[product._id] || ''} onChange={(e) => setApprovalPrices({...approvalPrices, [product._id]: e.target.value})} className="border-2 border-indigo-200 p-2 rounded-lg w-28 text-center font-bold text-indigo-700 outline-none focus:border-indigo-500" placeholder="₹" /></div>
                        <button onClick={() => handleApproval(product._id, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold h-11 hover:bg-green-700 shadow-sm">Approve</button>
                        <button onClick={() => handleApproval(product._id, 'reject')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold h-11 hover:bg-black shadow-sm">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Platform Users Directory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><th className="p-3 border-b rounded-tl-lg">Name</th><th className="p-3 border-b">Role</th><th className="p-3 border-b">Shop Name</th><th className="p-3 border-b">Contact</th><th className="p-3 border-b">Email</th></tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 text-sm">
                      <td className="p-3 border-b font-bold text-gray-700">{user.name}</td>
                      <td className="p-3 border-b"><span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase">{user.role.replace('_', ' ')}</span></td>
                      <td className="p-3 border-b text-indigo-700 font-bold">{user.shopName || '-'}</td>
                      <td className="p-3 border-b text-gray-600">{user.contactNumber || '-'}</td>
                      <td className="p-3 border-b text-gray-500">{user.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
