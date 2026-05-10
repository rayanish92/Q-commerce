import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Database, CheckCircle, Plus, Trash2 } from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('staff');
  const [message, setMessage] = useState('');
  
  const [users, setUsers] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [approvals, setApprovals] = useState([]);
  
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries' });
  const [masterForm, setMasterForm] = useState({ name: '', description: '', category: 'Groceries', imageUrl: '' });

  const API_URL = import.meta.env.VITE_API_URL;
  
  // This dynamically grabs the freshest token to prevent cross-tab testing errors
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    setMessage('');
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'catalog') fetchMasterProducts();
    if (activeTab === 'approvals') fetchApprovals();
  }, [activeTab]);

  const fetchUsers = async () => {
    try { const res = await axios.get(`${API_URL}/api/admin/users`, getAuth()); setUsers(res.data); } 
    catch (err) { setMessage(err.response?.data?.message || 'Failed to load users'); }
  };
  const fetchMasterProducts = async () => {
    try { const res = await axios.get(`${API_URL}/api/admin/master-products`, getAuth()); setMasterProducts(res.data); } 
    catch (err) { setMessage(err.response?.data?.message || 'Failed to load catalog'); }
  };
  const fetchApprovals = async () => {
    try { const res = await axios.get(`${API_URL}/api/admin/pending-approvals`, getAuth()); setApprovals(res.data); } 
    catch (err) { setMessage(err.response?.data?.message || 'Failed to load approvals'); }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/admin-create-staff`, staffForm, getAuth());
      setMessage(res.data.message);
      setStaffForm({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries' });
    } catch (err) { setMessage(err.response?.data?.message || 'Error creating staff'); }
  };

  const handleCreateMaster = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/master-products`, masterForm, getAuth());
      setMessage('Master product added!');
      setMasterForm({ name: '', description: '', category: 'Groceries', imageUrl: '' });
      fetchMasterProducts();
    } catch (err) { setMessage(err.response?.data?.message || 'Error adding master product'); }
  };

  const handleApproval = async (id, action) => {
    try {
      await axios.put(`${API_URL}/api/admin/approve-product/${id}`, { action }, getAuth());
      setMessage(`Product ${action}d successfully`);
      fetchApprovals();
    } catch (err) { setMessage(err.response?.data?.message || 'Error processing approval'); }
  };

  const handleApproveDeletion = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/admin/approve-deletion/${id}`, getAuth());
      setMessage('Deletion approved and removed from platform');
      fetchApprovals();
    } catch (err) { setMessage(err.response?.data?.message || 'Error approving deletion'); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <div className="w-full md:w-64 bg-gray-900 text-white min-h-full p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-8 mt-4 px-2">
          <Shield className="w-8 h-8 text-red-500"/>
          <h1 className="text-xl font-extrabold tracking-widest uppercase">Admin Core</h1>
        </div>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'staff' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Create Staff</button>
          <button onClick={() => setActiveTab('catalog')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'catalog' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Database className="w-5 h-5"/> Master Catalog</button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'approvals' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><CheckCircle className="w-5 h-5"/> Approvals</button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'users' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> User Directory</button>
        </nav>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-12 bg-red-600 py-2 rounded font-bold hover:bg-red-700">Logout</button>
      </div>

      <div className="flex-1 p-8">
        
        {message && <div className="mb-6 p-4 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold shadow-sm animate-pulse">{message}</div>}

        {activeTab === 'staff' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Generate Credentials</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="retailer">Retailer (Shop Owner)</option>
                <option value="delivery_agent">Delivery Agent</option>
              </select>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" value={staffForm.name} onChange={(e) => setStaffForm({...staffForm, name: e.target.value})} required className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="email" placeholder="Login Email" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} required className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <input type="text" placeholder="Set Password" value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              
              {staffForm.role === 'retailer' && (
                <div className="grid grid-cols-2 gap-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-2">
                  <input type="text" placeholder="Shop Name" value={staffForm.shopName} onChange={(e) => setStaffForm({...staffForm, shopName: e.target.value})} required className="p-3 border rounded-lg outline-none" />
                  <select value={staffForm.retailerCategory} onChange={(e) => setStaffForm({...staffForm, retailerCategory: e.target.value})} className="p-3 border rounded-lg bg-white outline-none">
                    <option value="Groceries">Groceries</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Dairy & Meat">Dairy & Meat</option>
                    <option value="Apparel">Apparel</option>
                  </select>
                </div>
              )}
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 shadow-md transition mt-4">Create Account</button>
            </form>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Add to Master Catalog</h2>
              <form onSubmit={handleCreateMaster} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Official Product Name" required value={masterForm.name} onChange={(e) => setMasterForm({...masterForm, name: e.target.value})} className="p-3 border rounded-lg outline-none" />
                <select value={masterForm.category} onChange={(e) => setMasterForm({...masterForm, category: e.target.value})} className="p-3 border rounded-lg bg-white outline-none">
                  <option value="Groceries">Groceries</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Snacks">Snacks</option>
                </select>
                
                <input type="text" placeholder="Image URL (Optional)" value={masterForm.imageUrl} onChange={(e) => setMasterForm({...masterForm, imageUrl: e.target.value})} className="p-3 border rounded-lg outline-none" />
                <input type="text" placeholder="Description" value={masterForm.description} onChange={(e) => setMasterForm({...masterForm, description: e.target.value})} className="p-3 border rounded-lg outline-none" />
                <button type="submit" className="md:col-span-2 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Save to Master DB</button>
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-4">Current Master Data ({masterProducts.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {masterProducts.map(p => (
                  <div key={p._id} className="border p-2 rounded-lg text-center shadow-sm">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-24 w-full object-contain mb-2 bg-gray-50 rounded" />
                    ) : (
                      <div className="h-24 w-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs rounded mb-2">No Image</div>
                    )}
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Pending Actions</h2>
            {approvals.length === 0 ? <p className="text-gray-500">All caught up! No pending approvals.</p> : (
              <div className="space-y-4">
                {approvals.map(product => (
                  <div key={product._id} className={`flex items-center justify-between p-4 rounded-lg border ${product.status === 'Pending Deletion' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${product.status === 'Pending Deletion' ? 'bg-red-500' : 'bg-yellow-500'}`}>{product.status}</span>
                        <h3 className="font-bold text-lg">{product.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Requested by: <strong>{product.retailerId?.shopName || 'Unknown Shop'}</strong></p>
                      <p className="text-sm text-gray-600">Category: {product.category} | Price: ₹{product.price}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {product.status === 'Pending Deletion' ? (
                         <button onClick={() => handleApproveDeletion(product._id)} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700">Approve Deletion</button>
                      ) : (
                        <>
                          <button onClick={() => handleApproval(product._id, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">Approve</button>
                          <button onClick={() => handleApproval(product._id, 'reject')} className="bg-gray-800 text-white px-4 py-2 rounded font-bold hover:bg-black">Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Platform Users Directory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Name</th>
                    <th className="p-3 border-b">Email</th>
                    <th className="p-3 border-b">Role</th>
                    <th className="p-3 border-b">Shop/Category</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-medium">{user.name}</td>
                      <td className="p-3 border-b text-gray-600">{user.email}</td>
                      <td className="p-3 border-b">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role==='admin'?'bg-red-100 text-red-700' : user.role==='retailer'?'bg-emerald-100 text-emerald-700' : user.role==='customer'?'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 border-b text-sm text-gray-500">
                        {user.shopName ? `${user.shopName} (${user.retailerCategory})` : '-'}
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
