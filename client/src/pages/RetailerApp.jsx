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
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setShopName(JSON.parse(atob(token.split('.')[1])).user.shopName);
    fetchData();
    fetchOrders();
  }, []);

  const fetchData = async () => {
    try {
      const [prods, master, user] = await Promise.all([
        axios.get(`${API_URL}/api/products/me`, getAuth()),
        axios.get(`${API_URL}/api/admin/master-products`, getAuth()),
        axios.get(`${API_URL}/api/auth/me`, getAuth())
      ]);
      setProducts(prods.data); 
      setMasterProducts(master.data); 
      if(user.data.bankDetails) setBankDetails(user.data.bankDetails);
    } catch (err) {}
  };

  const fetchOrders = async () => {
    try {
      const query = dateFilter.startDate && dateFilter.endDate ? `?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}` : '';
      const res = await axios.get(`${API_URL}/api/orders/retailer-orders${query}`, getAuth());
      setOrders(res.data);
    } catch (err) { setMessage('Failed to load orders.'); }
  };

  useEffect(() => { if (dateFilter.startDate && dateFilter.endDate) fetchOrders(); }, [dateFilter]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 1) {
      setFilteredMaster(masterProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase())));
    } else {
      setFilteredMaster([]);
    }
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
      setMessage('Product submitted for admin approval!'); 
      setNewProduct({ name: '', description: '', retailerPrice: '', quantity: '', category: 'Groceries', imageUrl: '' });
      setSearchTerm('');
      fetchData(); 
      setActiveTab('inventory');
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
    const newPrice = prompt("Enter new requested price (₹):");
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
      fetchData(); 
    } catch (err) {}
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
      setMessage(`Order ${action}ed successfully.`); 
      fetchOrders();
      // THIS FETCH SYNC ENSURES THE REFUNDED QUANTITY INSTANTLY APPEARS IN THE UI
      fetchData(); 
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage(`Failed to process order action.`); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Retailer Desk</h1>
              <p className="text-xs font-medium text-emerald-100">Welcome back, {shopName}</p>
            </div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="bg-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-900 font-semibold flex items-center gap-2">
            <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto flex overflow-x-auto hide-scrollbar">
          <button onClick={()=>{setActiveTab('inventory'); fetchData();}} className={`flex items-center gap-2 px-6 py-4 font-bold whitespace-nowrap ${activeTab==='inventory'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><Package className="w-5 h-5"/> Inventory</button>
          <button onClick={()=>setActiveTab('add')} className={`flex items-center gap-2 px-6 py-4 font-bold whitespace-nowrap ${activeTab==='add'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><Plus className="w-5 h-5"/> Add Product</button>
          <button onClick={()=>{setActiveTab('orders'); fetchOrders();}} className={`flex items-center gap-2 px-6 py-4 font-bold whitespace-nowrap ${activeTab==='orders'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><ShoppingCart className="w-5 h-5"/> Orders</button>
          <button onClick={()=>setActiveTab('bank')} className={`flex items-center gap-2 px-6 py-4 font-bold whitespace-nowrap ${activeTab==='bank'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><Briefcase className="w-5 h-5"/> Settlements</button>
          <button onClick={()=>setActiveTab('summary')} className={`flex items-center gap-2 px-6 py-4 font-bold whitespace-nowrap ${activeTab==='summary'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-500'}`}><BarChart2 className="w-5 h-5"/> Summary</button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 mt-4 w-full">
        {message && <div className="mb-6 p-4 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">{message}</div>}

        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold mb-4">Manage Quantity & Prices</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Product</th>
                    <th className="p-3 border-b">Status</th>
                    <th className="p-3 border-b">Your Quoted Price</th>
                    <th className="p-3 border-b">Qty Available</th>
                    <th className="p-3 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-500">No products added yet.</td></tr>}
                  {products.map(product => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-bold text-gray-800">{product.name}</td>
                      <td className="p-3 border-b">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${product.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{product.status}</span>
                      </td>
                      <td className="p-3 border-b font-bold text-emerald-700">₹{product.retailerPrice}</td>
                      <td className="p-3 border-b">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateQuantity(product._id, product.quantity - 1)} className="bg-gray-200 px-2 rounded font-bold hover:bg-gray-300">-</button>
                          <span className="w-6 text-center font-bold">{product.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(product._id, product.quantity + 1)} className="bg-gray-200 px-2 rounded font-bold hover:bg-gray-300">+</button>
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

        {/* TAB 2: ADD PRODUCT */}
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
              <select onChange={(e) => handleMasterSelect(e.target.value === 'CUSTOM' ? 'CUSTOM' : masterProducts.find(m=>m._id===e.target.value))} className="w-full p-3 border rounded-lg font-bold text-gray-700 bg-white outline-none">
                <option value="">-- Choose from Dropdown --</option>
                {masterProducts.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                <option value="CUSTOM">➕ Add Custom Product Not in List</option>
              </select>
            </div>

            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} disabled={!isCustomProduct && newProduct.name !== ''} className="p-3 border rounded-lg bg-gray-50 outline-none" />
              <input type="number" placeholder="Your Requested Price (₹)" required value={newProduct.retailerPrice} onChange={(e) => setNewProduct({...newProduct, retailerPrice: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="number" placeholder="Initial Quantity" required value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 shadow-md">Submit for Approval</button>
            </form>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold mb-6">Action Required: Orders</h2>
            <div className="space-y-4">
              {orders.length === 0 ? <p className="text-center p-4 text-gray-500 border rounded-lg font-bold">No assigned orders.</p> : null}
              {orders.map(order => (
                <div key={order._id} className="border rounded-xl p-5 bg-gray-50 shadow-sm relative overflow-hidden">
                   {order.subOrder.status === 'Pending' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
                   {order.subOrder.status === 'Accepted' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
                   {order.subOrder.status === 'Rejected' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}

                   <div className="flex justify-between items-start border-b pb-4 mb-4">
                     <div>
                       <p className="font-mono text-xs font-bold text-indigo-600">Parent Order: {order.orderId}</p>
                       <p className="text-sm font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${order.subOrder.status==='Pending'?'bg-yellow-200 text-yellow-800':order.subOrder.status==='Accepted'?'bg-green-200 text-green-800':'bg-red-200 text-red-800'}`}>
                       {order.subOrder.status}
                     </span>
                   </div>
                   
                   <div className="mb-4">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items to Fulfill:</p>
                     <ul className="space-y-1">
                       {order.subOrder.items.map((i, idx) => (
                         <li key={idx} className="font-bold text-gray-800 flex justify-between">
                            <span>• {i.cartQty || i.quantity || 1}x {i.name}</span>
                            <span className="text-gray-500">₹{i.price * (i.cartQty || i.quantity || 1)}</span>
                         </li>
                       ))}
                     </ul>
                   </div>

                   {order.subOrder.status === 'Pending' && (
                     <div className="flex gap-3 pt-4 border-t">
                       <button onClick={() => handleOrderAction(order._id, order.subOrder._id, 'Accept')} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-sm">Accept Order</button>
                       <button onClick={() => handleOrderAction(order._id, order.subOrder._id, 'Reject')} className="flex-1 bg-red-100 text-red-700 font-bold py-3 rounded-lg hover:bg-red-200">Reject</button>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BANK SETTLEMENTS */}
        {activeTab === 'bank' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2"><Briefcase className="w-6 h-6"/> Settlement Details</h3>
            <p className="text-sm text-gray-500 mb-6">Enter your bank account details where all your completed order amounts will be credited automatically.</p>
            <form onSubmit={handleUpdateBank} className="space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Account Holder Name</label><input type="text" required value={bankDetails.accountName} onChange={e=>setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Bank Account Number</label><input type="password" required value={bankDetails.accountNumber} onChange={e=>setBankDetails({...bankDetails, accountNumber: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">IFSC Code</label><input type="text" required value={bankDetails.ifscCode} onChange={e=>setBankDetails({...bankDetails, ifscCode: e.target.value})} className="w-full p-3 border rounded-lg uppercase outline-none focus:ring-2 focus:ring-emerald-500"/></div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 mt-2 shadow-md">Save Bank Details</button>
            </form>
          </div>
        )}

        {/* TAB 5: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100">
            <h2 className="text-xl font-bold mb-4">Revenue Summary</h2>
            <div className="flex items-end gap-4 mb-8 bg-gray-50 p-4 rounded-lg border">
              <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label><input type="date" value={dateFilter.startDate} onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})} className="border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">End Date</label><input type="date" value={dateFilter.endDate} onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})} className="border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
              <button onClick={() => { setDateFilter({startDate: '', endDate: ''}); fetchOrders(); }} className="text-gray-500 hover:text-red-500 text-sm font-bold ml-4">Clear Filters</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-emerald-800 font-bold uppercase text-sm">Routed Orders</p>
                  <p className="text-4xl font-extrabold text-emerald-600">{orders.length}</p>
                </div>
                <ShoppingCart className="w-12 h-12 text-emerald-200" />
              </div>
              
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-indigo-800 font-bold uppercase text-sm">Your Fulfillment Revenue</p>
                  <p className="text-4xl font-extrabold text-indigo-600">
                    ₹{orders.reduce((sum, order) => sum + order.subOrder.items.reduce((itemSum, item) => itemSum + (item.price * (item.cartQty || item.quantity || 1)), 0), 0)}
                  </p>
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
