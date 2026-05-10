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
    <div className="min-h-screen bg-gray-100 flex flex-col
