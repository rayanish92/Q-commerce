import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Database, CheckCircle, LogOut, Edit, MapPin, Upload, BarChart3, Truck, Search, Calendar, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('orders');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [globalOrders, setGlobalOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState({ startDate: '', endDate: '', retailerId: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [editingUser, setEditingUser] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchUsers();
    fetchGlobalOrders();
    const interval = setInterval(fetchGlobalOrders, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, getAuth());
      setUsers(res.data || []);
    } catch (err) { setUsers([]); }
  };

  const fetchGlobalOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders/all-orders`, getAuth());
      setGlobalOrders(res.data || []);
    } catch (err) { setGlobalOrders([]); }
  };

  const handleAssignAgent = async (orderId, agentId) => {
    if (!agentId) return;
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/assign`, { agentId }, getAuth());
      setMessage('Agent Assigned!');
      fetchGlobalOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('Assignment Failed'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete User?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${id}`, getAuth());
      fetchUsers();
    } catch (err) { }
  };

  // AGGREGATION
  const groupedOrders = {};
  if (Array.isArray(globalOrders)) {
    globalOrders.forEach(order => {
      order.subOrders.forEach(sub => {
        const rId = sub.retailerId?._id || 'unassigned';
        if (!groupedOrders[rId]) groupedOrders[rId] = { shopName: sub.retailerId?.shopName || 'Unknown', subOrders: [] };
        groupedOrders[rId].subOrders.push({
          parentOrderId: order._id,
          date: order.createdAt,
          customerName: order.customerId?.name || 'Unknown',
          status: sub.status,
          items: sub.items || []
        });
      });
    });
  }

  const agentsOnly = users.filter(u => u.role === 'delivery_agent');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <div className="w-full md:w-64 bg-gray-900 text-white p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8">Admin Core</h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('orders')} className={`w-full text-left p-3 rounded ${activeTab==='orders'?'bg-indigo-600':''}`}>Live Orders</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left p-3 rounded ${activeTab==='users'?'bg-indigo-600':''}`}>Users Directory</button>
          <button onClick={() => setActiveTab('agents')} className={`w-full text-left p-3 rounded ${activeTab==='agents'?'bg-indigo-600':''}`}>Agent Fleet</button>
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {message && <div className="bg-indigo-100 p-4 rounded mb-4 font-bold">{message}</div>}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Fulfillment Dashboard</h2>
            {Object.entries(groupedOrders).map(([rId, rData]) => (
              <div key={rId} className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-bold text-indigo-800 mb-4">{rData.shopName}</h3>
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b"><th>Date</th><th>Customer</th><th>Items</th><th>Status</th></tr></thead>
                  <tbody>
                    {rData.subOrders.map((so, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{new Date(so.date).toLocaleTimeString()}</td>
                        <td className="p-2 font-bold">{so.customerName}</td>
                        <td className="p-2">{so.items.map(i=>i.name).join(', ')}</td>
                        <td className="p-2">
                          {so.status === 'Accepted' ? (
                            <select 
                              className="border p-1 rounded text-xs bg-indigo-50 font-bold"
                              onChange={(e) => handleAssignAgent(so.parentOrderId, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Dispatch Fleet...</option>
                              {agentsOnly.map(a => <option key={a._id} value={a._id}>{a.name} {a.isOnline ? '🟢' : '⚪'}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs font-black uppercase">{so.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 uppercase text-xs"><tr><th className="p-4">Name</th><th>Role</th><th>Contact</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b text-sm">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td>{u.role}</td>
                    <td>{u.contactNumber}</td>
                    <td>
                      <button onClick={() => handleDeleteUser(u._id)} className="text-red-500"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
