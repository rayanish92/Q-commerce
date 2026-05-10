import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Database, CheckCircle, LogOut, Edit, MapPin } from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('orders');
  const [message, setMessage] = useState('');
  
  // Initialize ALL states strictly as empty arrays to PREVENT white-screen crashes
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

  const handleApiError = (err, fallbackMsg) => {
    if (err.response?.status === 403) {
      setMessage('SECURITY ALERT: Redirecting...');
      setTimeout(() => { localStorage.clear(); window.location.href = '/secret-admin-login'; }, 2000);
    } else { setMessage(err.response?.data?.message || fallbackMsg); }
  };

  useEffect(() => {
    setMessage('');
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'catalog') fetchMasterProducts();
    if (activeTab === 'approvals') fetchApprovals();
    if (activeTab === 'orders') fetchGlobalOrders();
  }, [activeTab, orderFilter]);

  const fetchUsers = async () => { 
    try { 
      const res = await axios.get(`${API_URL}/api/admin/users`, getAuth()); 
      setUsers(Array.isArray(res.data) ? res.data : []); 
    } catch (err) { handleApiError(err, 'Failed to load users'); setUsers([]); } 
  };
  
  const fetchMasterProducts = async () => { 
    try { 
      const res = await axios.get(`${API_URL}/api/admin/master-products`, getAuth()); 
      setMasterProducts(Array.isArray(res.data) ? res.data : []); 
    } catch (err) { handleApiError(err, 'Failed to load catalog'); setMasterProducts([]); } 
  };
  
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
  
  const fetchGlobalOrders = async () => {
    try {
      const q = new URLSearchParams(orderFilter).toString();
      const res = await axios.get(`${API_URL}/api/orders/all-orders?${q}`, getAuth());
      setGlobalOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setGlobalOrders([]); }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/admin-create-staff`, staffForm, getAuth());
      setMessage(res.data.message);
      setStaffForm({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', contactNumber: '', lat: '', lng: '' });
    } catch (err) { handleApiError(err, 'Error creating staff'); }
  };

  const handleCreateMaster = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/master-products`, masterForm, getAuth());
      setMessage('Master product added!');
      setMasterForm({ name: '', description: '', category: 'Groceries', imageUrl: '' });
      fetchMasterProducts();
    } catch (err) {}
  };

  const handleApproval = async (id, action) => {
    try {
      await axios.put(`${API_URL}/api/admin/approve-product/${id}`, { action, sellingPrice: approvalPrices[id] }, getAuth());
      setMessage(`Product ${action}d successfully`);
      fetchApprovals();
    } catch (err) {}
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/admin/users/${editingUser._id}`, editingUser, getAuth());
      setMessage('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) { handleApiError(err, 'Failed to update user'); }
  };

  // --- RETAILER GROUPING LOGIC FOR ORDERS TAB ---
  const groupedOrders = {};
  if (Array.isArray(globalOrders)) {
    globalOrders.forEach(order => {
      if (Array.isArray(order.subOrders)) {
        order.subOrders.forEach(sub => {
          const rId = sub.retailerId?._id || 'unassigned';
          const shopName = sub.retailerId?.shopName || 'Unknown Retailer';
          
          if (!groupedOrders[rId]) {
            groupedOrders[rId] = { shopName, subOrders: [], totalOurPrice: 0, totalTheirPrice: 0 };
          }

          let ourPrice = 0;
          let theirPrice = 0;
          
          if (Array.isArray(sub.items)) {
            sub.items.forEach(item => {
              const qty = item.cartQty || item.quantity || 1;
              ourPrice += (item.price || 0) * qty;
              theirPrice += (item.retailerPrice || item.price || 0) * qty; 
            });
          }

          groupedOrders[rId].totalOurPrice += ourPrice;
          groupedOrders[rId].totalTheirPrice += theirPrice;

          groupedOrders[rId].subOrders.push({
            parentOrderId: order.orderId,
            date: order.createdAt,
            customerName: order.customerId?.name || 'Unknown',
            status: sub.status,
            items: sub.items || [],
            ourPrice,
            theirPrice
          });
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative">
      
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Edit User Profile</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <input type="text" placeholder="Name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border rounded-lg" required/>
              <input type="email" placeholder="Email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-3 border rounded-lg" required/>
              <input type="text" placeholder="Contact Number" value={editingUser.contactNumber || ''} onChange={e => setEditingUser({...editingUser, contactNumber: e.target.value})} className="w-full p-3 border rounded-lg" />
              
              {editingUser.role === 'retailer' && (
                <>
                  <input type="text" placeholder="Shop Name" value={editingUser.shopName || ''} onChange={e => setEditingUser({...editingUser, shopName: e.target.value})} className="w-full p-3 border rounded-lg bg-indigo-50" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="New Latitude" value={editingUser.location?.coordinates?.[1] || editingUser.lat || ''} onChange={e => setEditingUser({...editingUser, lat: e.target.value})} className="w-full p-3 border rounded-lg bg-indigo-50" />
                    <input type="text" placeholder="New Longitude" value={editingUser.location?.coordinates?.[0] || editingUser.lng || ''} onChange={e => setEditingUser({...editingUser, lng: e.target.value})} className="w-full p-3 border rounded-lg bg-indigo-50" />
                  </div>
                </>
              )}
              
              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold">Save Changes</button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="w-full md:w-64 bg-gray-900 text-white min-h-full p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-8 mt-4 px-2"><Shield className="w-8 h-8 text-red-500"/><h1 className="text-xl font-extrabold tracking-widest uppercase">Admin Core</h1></div>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'orders' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><MapPin className="w-5 h-5"/> Live Orders</button>
          <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'staff' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Create Staff</button>
          <button onClick={() => setActiveTab('catalog')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'catalog' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Database className="w-5 h-5"/> Master Catalog</button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'approvals' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><CheckCircle className="w-5 h-5"/> Approvals</button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'users' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Directory</button>
        </nav>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-12 bg-red-600 py-2 rounded font-bold hover:bg-red-700 flex items-center justify-center gap-2"><LogOut className="w-4 h-4"/> Logout</button>
      </div>

      <div className="flex-1 p-8">
        {message && <div className="mb-6 p-4 rounded-lg bg-indigo-100 text-indigo-800 border font-bold">{message}</div>}

        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Retailer Fulfillment Dashboard</h2>
            
            <div className="flex flex-wrap items-end gap-4 mb-8 bg-gray-50 p-4 rounded-xl border">
              <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label><input type="date" value={orderFilter.startDate} onChange={e=>setOrderFilter({...orderFilter, startDate: e.target.value})} className="border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">End Date</label><input type="date" value={orderFilter.endDate} onChange={e=>setOrderFilter({...orderFilter, endDate: e.target.value})} className="border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <button onClick={() => setOrderFilter({startDate: '', endDate: '', retailerId: '', location: ''})} className="text-red-500 font-bold ml-4 text-sm hover:underline">Clear Filters</button>
            </div>

            <div className="space-y-8">
              {Object.keys(groupedOrders).length === 0 && <p className="text-gray-500 font-bold p-6 text-center border rounded-xl">No orders found.</p>}
              
              {Object.entries(groupedOrders).map(([rId, rData]) => (
                <div key={rId} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                  <h3 className="text-xl font-black text-indigo-900 mb-4 pl-2">{rData.shopName}</h3>
                  
                  <div className="flex flex-wrap gap-4 mb-6 text-sm font-bold pl-2">
                     <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-100">
                       <span className="block text-[10px] text-blue-500 uppercase tracking-wider mb-1">Retailer Revenue (Their Price)</span>
                       ₹{rData.totalTheirPrice}
                     </div>
                     <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-100">
                       <span className="block text-[10px] text-green-500 uppercase tracking-wider mb-1">Customer Paid (Our Price)</span>
                       ₹{rData.totalOurPrice}
                     </div>
                     <div className="bg-purple-50 text-purple-800 px-4 py-2 rounded-lg border border-purple-100 shadow-sm">
                       <span className="block text-[10px] text-purple-500 uppercase tracking-wider mb-1">Platform Margin</span>
                       <span className="text-lg">₹{rData.totalOurPrice - rData.totalTheirPrice}</span>
                     </div>
                  </div>

                  <div className="overflow-x-auto pl-2">
                    <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="p-3 border-b rounded-tl-lg">Order ID</th>
                            <th className="p-3 border-b">Date</th>
                            <th className="p-3 border-b">Customer</th>
                            <th className="p-3 border-b">Items</th>
                            <th className="p-3 border-b">Their Price</th>
                            <th className="p-3 border-b">Our Price</th>
                            <th className="p-3 border-b rounded-tr-lg">Status</th>
                         </tr>
                       </thead>
                       <tbody>
                         {rData.subOrders.map((so, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 text-sm">
                               <td className="p-3 border-b font-mono font-bold text-gray-400">{so.parentOrderId}</td>
                               <td className="p-3 border-b text-gray-600">{new Date(so.date).toLocaleDateString()}</td>
                               <td className="p-3 border-b font-bold text-gray-700">{so.customerName}</td>
                               <td className="p-3 border-b text-gray-600">{so.items.map(i => `${i.cartQty||i.quantity||1}x ${i.name}`).join(', ')}</td>
                               <td className="p-3 border-b text-blue-600 font-bold">₹{so.theirPrice}</td>
                               <td className="p-3 border-b text-green-600 font-bold">₹{so.ourPrice}</td>
                               <td className="p-3 border-b"><span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${so.status==='Accepted'?'bg-green-100 text-green-700':so.status==='Pending'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{so.status}</span></td>
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

        {activeTab === 'staff' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm max-w-2xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Generate Credentials</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50"><option value="retailer">Retailer (Shop Owner)</option><option value="delivery_agent">Delivery Agent</option></select>
              <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Full Name" value={staffForm.name} onChange={(e) => setStaffForm({...staffForm, name: e.target.value})} required className="p-3 border rounded-lg" /><input type="email" placeholder="Login Email" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} required className="p-3 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4"><input type="password" placeholder="Set Password" value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} required className="p-3 border rounded-lg" /><input type="text" placeholder="Contact Number" value={staffForm.contactNumber} onChange={(e) => setStaffForm({...staffForm, contactNumber: e.target.value})} className="p-3 border rounded-lg" /></div>
              {staffForm.role === 'retailer' && (
                <div className="space-y-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Shop Name" value={staffForm.shopName} onChange={(e) => setStaffForm({...staffForm, shopName: e.target.value})} required className="p-3 border rounded-lg" /><select value={staffForm.retailerCategory} onChange={(e) => setStaffForm({...staffForm, retailerCategory: e.target.value})} className="p-3 border rounded-lg bg-white"><option value="Groceries">Groceries</option><option value="Pharmacy">Pharmacy</option></select></div>
                  <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Latitude (e.g. 22.5726)" value={staffForm.lat} onChange={(e) => setStaffForm({...staffForm, lat: e.target.value})} required className="p-3 border rounded-lg" /><input type="text" placeholder="Longitude (e.g. 88.3639)" value={staffForm.lng} onChange={(e) => setStaffForm({...staffForm, lng: e.target.value})} required className="p-3 border rounded-lg" /></div>
                </div>
              )}
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-indigo-700">Create Account</button>
            </form>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Add to Master Catalog</h2>
            <form onSubmit={handleCreateMaster} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name" required value={masterForm.name} onChange={(e) => setMasterForm({...masterForm, name: e.target.value})} className="p-3 border rounded-lg" />
              <select value={masterForm.category} onChange={(e) => setMasterForm({...masterForm, category: e.target.value})} className="p-3 border rounded-lg bg-white"><option value="Groceries">Groceries</option><option value="Vegetables">Vegetables</option><option value="Dairy">Dairy</option><option value="Snacks">Snacks</option></select>
              <input type="text" placeholder="Image URL (Optional)" value={masterForm.imageUrl} onChange={(e) => setMasterForm({...masterForm, imageUrl: e.target.value})} className="p-3 border rounded-lg" />
              <input type="text" placeholder="Description" value={masterForm.description} onChange={(e) => setMasterForm({...masterForm, description: e.target.value})} className="p-3 border rounded-lg" />
              <button type="submit" className="md:col-span-2 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Save to Master DB</button>
            </form>
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
                      {product.status === 'Pending Deletion' ? (
                         <button onClick={() => handleApproveDeletion(product._id)} className="bg-red-600 text-white px-4 py-2 rounded font-bold">Approve Deletion</button>
                      ) : (
                        <div className="flex gap-2 items-end">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Set Your Selling Price</label>
                            <input type="number" value={approvalPrices[product._id] || ''} onChange={(e) => setApprovalPrices({...approvalPrices, [product._id]: e.target.value})} className="border-2 border-indigo-200 p-2 rounded-lg w-28 text-center font-bold text-indigo-700 outline-none focus:border-indigo-500" placeholder="₹" />
                          </div>
                          <button onClick={() => handleApproval(product._id, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold h-11 hover:bg-green-700 shadow-sm">Approve</button>
                          <button onClick={() => handleApproval(product._id, 'reject')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold h-11 hover:bg-black shadow-sm">Reject</button>
                        </div>
                      )}
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
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><th className="p-3 border-b rounded-tl-lg">Name</th><th className="p-3 border-b">Shop Name</th><th className="p-3 border-b">Contact</th><th className="p-3 border-b">Email</th><th className="p-3 border-b">Location</th><th className="p-3 border-b rounded-tr-lg">Action</th></tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 text-sm">
                      <td className="p-3 border-b font-bold text-gray-700">{user.name}</td>
                      <td className="p-3 border-b text-indigo-700 font-bold">{user.shopName || '-'}</td>
                      <td className="p-3 border-b text-gray-600">{user.contactNumber || '-'}</td>
                      <td className="p-3 border-b text-gray-500">{user.email}</td>
                      <td className="p-3 border-b text-[10px] font-mono text-gray-400">{user.location?.coordinates ? `${user.location.coordinates[1]}, ${user.location.coordinates[0]}` : '-'}</td>
                      <td className="p-3 border-b">
                        <button onClick={() => setEditingUser(user)} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded font-bold hover:bg-gray-200 transition"><Edit className="w-3 h-3"/> Edit</button>
                      </td>
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
