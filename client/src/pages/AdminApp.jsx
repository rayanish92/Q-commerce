import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Database, CheckCircle, LogOut, Edit } from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('staff');
  const [message, setMessage] = useState('');
  
  const [users, setUsers] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [approvals, setApprovals] = useState([]);
  
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', contactNumber: '', lat: '', lng: '' });
  const [masterForm, setMasterForm] = useState({ name: '', description: '', category: 'Groceries', imageUrl: '' });
  const [approvalPrices, setApprovalPrices] = useState({});

  const [editingUser, setEditingUser] = useState(null);

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
  }, [activeTab]);

  const fetchUsers = async () => { try { const res = await axios.get(`${API_URL}/api/admin/users`, getAuth()); setUsers(res.data); } catch (err) { handleApiError(err, 'Failed to load users'); } };
  const fetchMasterProducts = async () => { try { const res = await axios.get(`${API_URL}/api/admin/master-products`, getAuth()); setMasterProducts(res.data); } catch (err) { handleApiError(err, 'Failed to load catalog'); } };
  const fetchApprovals = async () => { 
    try { 
      const res = await axios.get(`${API_URL}/api/admin/pending-approvals`, getAuth()); 
      setApprovals(res.data);
      const prices = {};
      res.data.forEach(p => prices[p._id] = p.retailerPrice);
      setApprovalPrices(prices);
    } catch (err) { handleApiError(err, 'Failed to load approvals'); } 
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/admin-create-staff`, staffForm, getAuth());
      setMessage(res.data.message);
      setStaffForm({ name: '', email: '', password: '', role: 'retailer', shopName: '', retailerCategory: 'Groceries', contactNumber: '', lat: '', lng: '' });
    } catch (err) { handleApiError(err, 'Error creating staff'); }
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

  const handleCreateMaster = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/master-products`, masterForm, getAuth());
      setMessage('Master product added!');
      setMasterForm({ name: '', description: '', category: 'Groceries', imageUrl: '' });
      fetchMasterProducts();
    } catch (err) { handleApiError(err, 'Error adding master product'); }
  };

  const handleApproval = async (id, action) => {
    try {
      const sellingPrice = approvalPrices[id];
      await axios.put(`${API_URL}/api/admin/approve-product/${id}`, { action, sellingPrice }, getAuth());
      setMessage(`Product ${action}d successfully`);
      fetchApprovals();
    } catch (err) { handleApiError(err, 'Error processing approval'); }
  };

  const handleApproveDeletion = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/admin/approve-deletion/${id}`, getAuth());
      setMessage('Deletion approved');
      fetchApprovals();
    } catch (err) { handleApiError(err, 'Error approving deletion'); }
  };

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
        <div className="flex items-center gap-2 mb-8 mt-4 px-2">
          <Shield className="w-8 h-8 text-red-500"/>
          <h1 className="text-xl font-extrabold tracking-widest uppercase">Admin Core</h1>
        </div>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'staff' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Create Staff</button>
          <button onClick={() => setActiveTab('catalog')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'catalog' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Database className="w-5 h-5"/> Master Catalog</button>
          <button onClick={() => setActiveTab('approvals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'approvals' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><CheckCircle className="w-5 h-5"/> Approvals</button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'users' ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}><Users className="w-5 h-5"/> Directory</button>
        </nav>
        <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-12 bg-red-600 py-2 rounded font-bold hover:bg-red-700 flex items-center justify-center gap-2"><LogOut className="w-4 h-4"/> Logout</button>
      </div>

      <div className="flex-1 p-8">
        {message && <div className="mb-6 p-4 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">{message}</div>}

        {activeTab === 'staff' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Generate Credentials</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50">
                <option value="retailer">Retailer (Shop Owner)</option>
                <option value="delivery_agent">Delivery Agent</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" value={staffForm.name} onChange={(e) => setStaffForm({...staffForm, name: e.target.value})} required className="p-3 border rounded-lg" />
                <input type="email" placeholder="Login Email" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} required className="p-3 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="password" placeholder="Set Password" value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} required className="p-3 border rounded-lg" />
                <input type="text" placeholder="Contact Number" value={staffForm.contactNumber} onChange={(e) => setStaffForm({...staffForm, contactNumber: e.target.value})} className="p-3 border rounded-lg" />
              </div>
              
              {staffForm.role === 'retailer' && (
                <div className="space-y-4 bg-indigo-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Shop Name" value={staffForm.shopName} onChange={(e) => setStaffForm({...staffForm, shopName: e.target.value})} required className="p-3 border rounded-lg" />
                    <select value={staffForm.retailerCategory} onChange={(e) => setStaffForm({...staffForm, retailerCategory: e.target.value})} className="p-3 border rounded-lg bg-white">
                      <option value="Groceries">Groceries</option><option value="Pharmacy">Pharmacy</option><option value="Electronics">Electronics</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Latitude (e.g. 22.5726)" value={staffForm.lat} onChange={(e) => setStaffForm({...staffForm, lat: e.target.value})} required className="p-3 border rounded-lg" />
                    <input type="text" placeholder="Longitude (e.g. 88.3639)" value={staffForm.lng} onChange={(e) => setStaffForm({...staffForm, lng: e.target.value})} required className="p-3 border rounded-lg" />
                  </div>
                </div>
              )}
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700">Create Account</button>
            </form>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Add to Master Catalog</h2>
            <form onSubmit={handleCreateMaster} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name" required value={masterForm.name} onChange={(e) => setMasterForm({...masterForm, name: e.target.value})} className="p-3 border rounded-lg" />
              <select value={masterForm.category} onChange={(e) => setMasterForm({...masterForm, category: e.target.value})} className="p-3 border rounded-lg bg-white"><option value="Groceries">Groceries</option><option value="Vegetables">Vegetables</option><option value="Dairy">Dairy</option><option value="Snacks">Snacks</option></select>
              <input type="text" placeholder="Image URL (Optional)" value={masterForm.imageUrl} onChange={(e) => setMasterForm({...masterForm, imageUrl: e.target.value})} className="p-3 border rounded-lg" />
              <input type="text" placeholder="Description" value={masterForm.description} onChange={(e) => setMasterForm({...masterForm, description: e.target.value})} className="p-3 border rounded-lg" />
              <button type="submit" className="md:col-span-2 bg-green-600 text-white font-bold py-3 rounded-lg">Save to Master DB</button>
            </form>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Pending Actions</h2>
            {approvals.length === 0 ? <p className="text-gray-500">No pending approvals.</p> : (
              <div className="space-y-4">
                {approvals.map(product => (
                  <div key={product._id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg border bg-yellow-50">
                    <div>
                      <span className="bg-yellow-500 px-2 py-1 rounded text-xs font-bold text-white">{product.status}</span>
                      <h3 className="font-bold text-lg mt-1">{product.name}</h3>
                      <p className="text-sm text-gray-600">Shop: <strong>{product.retailerId?.shopName}</strong></p>
                      <p className="text-sm text-gray-600">Retailer Requested Price: <strong className="text-red-600">₹{product.retailerPrice}</strong></p>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
                      {product.status === 'Pending Deletion' ? (
                         <button onClick={() => handleApproveDeletion(product._id)} className="bg-red-600 text-white px-4 py-2 rounded font-bold">Approve Deletion</button>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <div>
                            <label className="text-xs text-gray-500 block">Set Selling Price</label>
                            <input type="number" value={approvalPrices[product._id] || ''} onChange={(e) => setApprovalPrices({...approvalPrices, [product._id]: e.target.value})} className="border p-2 rounded w-24 text-center font-bold" />
                          </div>
                          <button onClick={() => handleApproval(product._id, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded font-bold h-10 mt-4">Approve</button>
                          <button onClick={() => handleApproval(product._id, 'reject')} className="bg-gray-800 text-white px-4 py-2 rounded font-bold h-10 mt-4">Reject</button>
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
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Platform Users Directory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100"><th className="p-3 border-b">Name</th><th className="p-3 border-b">Shop Name</th><th className="p-3 border-b">Contact</th><th className="p-3 border-b">Email</th><th className="p-3 border-b">Location</th><th className="p-3 border-b">Action</th></tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 text-sm">
                      <td className="p-3 border-b font-medium">{user.name}</td>
                      <td className="p-3 border-b text-indigo-700 font-bold">{user.shopName || '-'}</td>
                      <td className="p-3 border-b">{user.contactNumber || '-'}</td>
                      <td className="p-3 border-b text-gray-500">{user.email}</td>
                      <td className="p-3 border-b text-xs text-gray-400">{user.location?.coordinates ? `${user.location.coordinates[1]}, ${user.location.coordinates[0]}` : '-'}</td>
                      <td className="p-3 border-b">
                        <button onClick={() => setEditingUser(user)} className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded font-bold hover:bg-gray-300"><Edit className="w-4 h-4"/> Edit</button>
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
