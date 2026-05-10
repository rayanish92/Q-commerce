import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2, Globe, Home, ShoppingCart, User as UserIcon, Plus, Trash2, ChevronRight, Settings, Smartphone } from 'lucide-react';

export default function CustomerApp() {
  const [activeTab, setActiveTab] = useState('home'); 
  const [accountSubTab, setAccountSubTab] = useState('profile');
  
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [testMode, setTestMode] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Checkout & Location State
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Home', address: '', lat: 22.5, lng: 88.3 });
  
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setUserName(JSON.parse(atob(token.split('.')[1])).user.name);
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'home') fetchNearbyProducts();
    if (activeTab === 'account' && accountSubTab === 'orders') fetchMyOrders();
  }, [category, activeTab, testMode]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, getAuth());
      setAddresses(res.data.addresses || []);
      if(res.data.addresses?.length > 0) setSelectedAddress(res.data.addresses[0]);
    } catch (err) {}
  };

  const fetchNearbyProducts = async () => {
    setLoading(true);
    try {
      const lat = selectedAddress?.lat || 22.5726; const lng = selectedAddress?.lng || 88.3639;
      const res = await axios.get(`${API_URL}/api/products/nearby?lng=${lng}&lat=${lat}&category=${category}&testMode=${testMode}`, getAuth());
      
      // HIDE RETAILERS: Group by product name so customer only sees the item, not who sells it
      const uniqueProducts = []; const seenNames = new Set();
      res.data.forEach(p => { if (!seenNames.has(p.name)) { seenNames.add(p.name); uniqueProducts.push(p); } });
      setProducts(uniqueProducts);
    } catch (err) {} finally { setLoading(false); }
  };

  const fetchMyOrders = async () => { try { setMyOrders((await axios.get(`${API_URL}/api/orders/my-orders`, getAuth())).data); } catch(err){} };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/address`, newAddress, getAuth());
      setAddresses(res.data); setShowAddressForm(false); setSelectedAddress(res.data[res.data.length - 1]);
      setNewAddress({ label: 'Home', address: '', lat: 22.5, lng: 88.3 });
    } catch (err) { alert('Failed to save address'); }
  };

  const handleDeleteAddress = async (id) => {
    try { setAddresses((await axios.delete(`${API_URL}/api/auth/address/${id}`, getAuth())).data); } catch (err) {}
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.name === product.name);
    if (existing) setCart(cart.map(item => item.name === product.name ? { ...item, cartQty: item.cartQty + 1 } : item));
    else setCart([...cart, { ...product, cartQty: 1 }]);
  };

  const updateCartQty = (id, amount) => { setCart(cart.map(i => i._id === id ? { ...i, cartQty: i.cartQty + amount } : i).filter(i => i.cartQty > 0)); };
  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.cartQty), 0);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return alert("Please select or add a delivery address.");
    
    // NATIVE UPI APP DEEP LINK INTEGRATION
    if (paymentMethod === 'UPI') {
      const upiUrl = `upi://pay?pa=merchant@quickcomm.com&pn=QuickCommerce&am=${cartTotal}&cu=INR&tn=OrderPayment`;
      window.location.href = upiUrl;
      // Note: On mobile, this opens GPay/PhonePe. If the user cancels or is on desktop, it fails silently.
      // In production, you await a callback from the payment gateway. We proceed here for UX.
    }

    try {
      await axios.post(`${API_URL}/api/orders/create`, {
        items: cart.map(i => ({ name: i.name, cartQty: i.cartQty, price: i.sellingPrice })),
        totalAmount: cartTotal, paymentMethod, deliveryAddress: selectedAddress.address,
        lat: selectedAddress.lat, lng: selectedAddress.lng
      }, getAuth());
      setCart([]); alert("Order Successfully Placed & Dispatched!");
      setActiveTab('account'); setAccountSubTab('orders');
    } catch (err) { alert("Failed to place order."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> QuickComm</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTestMode(!testMode)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold border transition ${testMode ? 'bg-red-500' : 'bg-indigo-700'}`}>
              <Globe className="w-3 h-3" /> {testMode ? "Test" : "10km"}
            </button>
            <div className="flex flex-col items-end max-w-[150px]">
              <span className="text-[10px] font-bold text-indigo-200 uppercase">Delivering to</span>
              <div className="flex items-center gap-1"><span className="font-bold text-sm truncate">{selectedAddress ? selectedAddress.label : 'No Address'}</span><MapPin className="w-4 h-4 text-pink-400" /></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full p-4 flex-1">
        
        {activeTab === 'home' && (
          <>
            <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar mt-4">
              {['All', 'Groceries', 'Dairy', 'Vegetables', 'Snacks', 'Pharmacy'].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`whitespace-nowrap px-5 py-2 rounded-full font-semibold shadow-sm transition-all ${category === cat ? 'bg-pink-500 text-white transform scale-105' : 'bg-white text-gray-600 border'}`}>{cat}</button>
              ))}
            </div>

            {loading ? <div className="flex justify-center py-20 text-indigo-500"><Loader2 className="w-10 h-10 animate-spin" /></div> 
            : products.length === 0 ? <div className="text-center py-16 bg-white rounded-2xl border"><h3 className="text-xl font-bold text-gray-700">No items nearby</h3></div>
            : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => {
                  const inCart = cart.find(item => item.name === product.name);
                  return (
                    // RETAILER BADGE IS 100% GONE. Customers don't know who fulfills it!
                    <div key={product._id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                      <div className="h-32 bg-white p-2 flex items-center justify-center"><img src={product.imageUrl} className="h-full object-contain" alt=""/></div>
                      <div className="p-3 bg-gray-50 border-t flex-1 flex flex-col justify-between">
                        <h3 className="font-bold text-sm text-gray-800 line-clamp-2 h-10 leading-tight">{product.name}</h3>
                        <div className="flex justify-between items-end mt-2">
                          <p className="text-lg font-extrabold text-gray-900">₹{product.sellingPrice}</p>
                          {inCart ? (
                            <div className="flex items-center gap-2 bg-pink-100 rounded px-2 py-1 border border-pink-200">
                              <button onClick={() => updateCartQty(product._id, -1)} className="font-bold text-pink-700">-</button><span className="font-bold text-sm text-pink-900">{inCart.cartQty}</span><button onClick={() => updateCartQty(product._id, 1)} className="font-bold text-pink-700">+</button>
                            </div>
                          ) : <button onClick={() => addToCart(product)} className="bg-white border border-pink-500 text-pink-600 font-bold px-3 py-1 rounded hover:bg-pink-50 text-sm">ADD</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'checkout' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">Checkout</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-3">Delivery Address</h3>
              {addresses.map(addr => (
                <label key={addr._id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer mb-2 ${selectedAddress?._id === addr._id ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" checked={selectedAddress?._id === addr._id} onChange={() => setSelectedAddress(addr)} className="mt-1 w-4 h-4 text-indigo-600" />
                  <div className="flex-1">
                    <span className="font-bold bg-gray-200 px-2 py-0.5 rounded text-xs text-gray-800">{addr.label}</span>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{addr.address}</p>
                  </div>
                </label>
              ))}
              <button onClick={() => { setActiveTab('account'); setAccountSubTab('addresses'); }} className="text-indigo-600 font-bold text-sm mt-2 flex items-center gap-1">+ Add New Address</button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-4">Select Payment Method</h3>
              <div className="space-y-3">
                {['UPI', 'Credit/Debit Card', 'Cash on Delivery (COD)'].map(method => (
                  <label key={method} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${paymentMethod === method ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-gray-800 flex-1">{method}</span>
                    {method === 'UPI' && <Smartphone className="w-6 h-6 text-gray-400"/>}
                  </label>
                ))}
              </div>
            </div>
            
            <button onClick={handlePlaceOrder} className="w-full bg-indigo-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg hover:bg-indigo-700">Pay ₹{cartTotal} & Place Order</button>
          </div>
        )}

        {/* TAB 4: ACCOUNT SUB-SECTIONS (ADDRESS MANAGER) */}
        {activeTab === 'account' && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm border p-4 h-fit">
              <h2 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4 px-2">Account Settings</h2>
              <nav className="space-y-1">
                <button onClick={() => setAccountSubTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><UserIcon className="w-5 h-5"/> Profile</button>
                <button onClick={() => setAccountSubTab('addresses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'addresses' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><MapPin className="w-5 h-5"/> Addresses</button>
                <button onClick={() => setAccountSubTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'orders' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><ShoppingBag className="w-5 h-5"/> My Orders</button>
              </nav>
              <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-8 flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-xl transition"><LogOut className="w-5 h-5"/> Sign Out</button>
            </div>

            <div className="flex-1">
              {accountSubTab === 'addresses' && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex justify-between items-center">Saved Addresses <button onClick={() => setShowAddressForm(!showAddressForm)} className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-lg">+ Add New</button></h3>
                  
                  {showAddressForm && (
                    <form onSubmit={handleAddAddress} className="mb-6 p-4 bg-gray-50 border rounded-xl">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <select value={newAddress.label} onChange={e=>setNewAddress({...newAddress, label: e.target.value})} className="p-2 border rounded font-bold"><option value="Home">Home</option><option value="Work">Work</option><option value="Other">Other</option></select>
                        <input type="text" placeholder="Full Address" required value={newAddress.address} onChange={e=>setNewAddress({...newAddress, address: e.target.value})} className="p-2 border rounded col-span-2" />
                      </div>
                      <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700">Save Address</button>
                    </form>
                  )}

                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr._id} className="border p-4 rounded-xl flex justify-between items-center">
                        <div><span className="bg-gray-200 text-gray-800 font-bold text-xs px-2 py-0.5 rounded">{addr.label}</span><p className="text-gray-700 mt-2 font-medium">{addr.address}</p></div>
                        <button onClick={() => handleDeleteAddress(addr._id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {accountSubTab === 'orders' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-4">Order History</h3>
                  {myOrders.map(order => (
                    <div key={order._id} className="bg-white rounded-2xl shadow-sm border p-5">
                      <div className="flex justify-between items-start border-b pb-3 mb-3">
                        <div><p className="font-mono text-xs font-bold text-gray-400">{order.orderId}</p><p className="text-sm font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p></div>
                        <div className="text-right"><span className="bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-1 rounded">{order.status}</span><p className="font-extrabold text-lg mt-1">₹{order.totalAmount}</p></div>
                      </div>
                      <div className="text-sm text-gray-600"><span className="font-bold">Items: </span> {order.subOrders ? order.subOrders.map(s => s.items.map(i => `${i.cartQty}x ${i.name}`).join(', ')).join(' | ') : order.items?.map(i => `${i.cartQty}x ${i.name}`).join(', ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around items-center pb-safe pt-2 px-2 z-30 h-16">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center flex-1 ${activeTab==='home' ? 'text-indigo-600' : 'text-gray-400'}`}><Home className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center flex-1 relative ${activeTab==='cart' || activeTab==='checkout' ? 'text-pink-600' : 'text-gray-400'}`}><div className="relative"><ShoppingCart className="w-6 h-6 mb-1"/>{cart.length > 0 && <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cart.reduce((s, i)=>s+i.cartQty, 0)}</span>}</div><span className="text-[10px] font-bold">Cart</span></button>
        <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center flex-1 ${activeTab==='account' ? 'text-indigo-600' : 'text-gray-400'}`}><UserIcon className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Account</span></button>
      </nav>
    </div>
  );
}
