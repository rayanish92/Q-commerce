import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2, Globe, Home, ShoppingCart, User as UserIcon, Trash2, ChevronRight, Smartphone, Crosshair, ArrowLeft, Receipt, CheckCircle, Edit2 } from 'lucide-react';

export default function CustomerApp() {
  const MERCHANT_UPI_ID = "your-merchant-id@bank"; 
  const MERCHANT_NAME = "QuickComm";
  const DELIVERY_FEE = 30; 
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [accountSubTab, setAccountSubTab] = useState('profile');
  
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  
  // Profile & Edit State
  const [userProfile, setUserProfile] = useState({});
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  
  // Address States
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Home', contactName: '', phoneNumber: '', address: '', landmark: '', lat: 22.5726, lng: 88.3639 });
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [testMode, setTestMode] = useState(false);
  
  const [location, setLocation] = useState({ lng: 88.3639, lat: 22.5726 }); 
  const [cart, setCart] = useState([]);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiStatus, setUpiStatus] = useState('pending'); // pending, awaiting_utr
  const [utrNumber, setUtrNumber] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => { fetchUserProfile(); }, []);
  useEffect(() => {
    if (activeTab === 'home') fetchNearbyProducts();
    if (activeTab === 'account' && accountSubTab === 'orders') { fetchMyOrders(); setSelectedOrder(null); }
  }, [category, activeTab, testMode, selectedAddress, location.lat, location.lng]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, getAuth());
      setUserProfile(res.data);
      setAddresses(res.data.addresses || []);
      setEditPhoneValue(res.data.contactNumber || '');
      setNewAddress(prev => ({ ...prev, contactName: res.data.name, phoneNumber: res.data.contactNumber || '' }));
    } catch (err) {}
  };

  const handleSavePhone = async () => {
    try {
      await axios.put(`${API_URL}/api/auth/profile`, { contactNumber: editPhoneValue }, getAuth());
      setUserProfile(prev => ({...prev, contactNumber: editPhoneValue}));
      setIsEditingPhone(false);
      alert('Phone number updated successfully!');
    } catch (err) { alert('Failed to update phone number'); }
  };

  // SMART GPS REVERSE GEOCODING
  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude; const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          setNewAddress(prev => ({ ...prev, lat, lng, address: data.display_name }));
        } catch(err) { alert('GPS Found, but could not fetch street name. Please type it manually.'); }
      });
    }
  };

  const fetchNearbyProducts = async () => {
    setLoading(true);
    try {
      const lat = selectedAddress ? selectedAddress.lat : location.lat; 
      const lng = selectedAddress ? selectedAddress.lng : location.lng;
      const res = await axios.get(`${API_URL}/api/products/nearby?lng=${lng}&lat=${lat}&category=${category}&testMode=${testMode}`, getAuth());
      const uniqueProducts = []; const seenNames = new Set();
      res.data.forEach(p => { if (!seenNames.has(p.name)) { seenNames.add(p.name); uniqueProducts.push(p); } });
      setProducts(uniqueProducts);
    } catch (err) {} finally { setLoading(false); }
  };

  const fetchMyOrders = async () => { try { setMyOrders((await axios.get(`${API_URL}/api/orders/my-orders`, getAuth())).data || []); } catch(err){} };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/address`, newAddress, getAuth());
      setAddresses(res.data); setShowAddressForm(false); 
      setSelectedAddress(res.data[res.data.length - 1]);
      setNewAddress({ label: 'Home', contactName: userProfile.name, phoneNumber: userProfile.contactNumber || '', address: '', landmark: '', lat: 22.5726, lng: 88.3639 });
    } catch (err) { alert('Failed to save address'); }
  };

  const handleDeleteAddress = async (id) => {
    try { setAddresses((await axios.delete(`${API_URL}/api/auth/address/${id}`, getAuth())).data); } catch (err) {}
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) setCart(cart.map(item => item._id === product._id ? { ...item, cartQty: item.cartQty + 1 } : item));
    else setCart([...cart, { ...product, cartQty: 1 }]);
  };
  const updateCartQty = (id, amount) => { setCart(cart.map(i => i._id === id ? { ...i, cartQty: i.cartQty + amount } : i).filter(i => i.cartQty > 0)); };
  
  const itemTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.cartQty), 0);
  const grandTotal = itemTotal > 0 ? itemTotal + DELIVERY_FEE : 0;

  const triggerUPIApp = (appType) => {
    const upiString = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR&tn=QuickCommOrder`;
    if (appType === 'gpay') window.location.href = `gpay://upi/pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR`;
    else if (appType === 'phonepe') window.location.href = `phonepe://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR`;
    else if (appType === 'paytm') window.location.href = `paytmmp://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR`;
    else window.location.href = upiString;
    
    // Switch UI to ask for proof of payment
    setUpiStatus('awaiting_utr');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return alert("Please select a detailed delivery address.");
    if (paymentMethod === 'UPI' && utrNumber.length < 6) return alert("Please enter a valid UTR / Reference number to verify your payment.");

    const orderAddress = `${selectedAddress.address} (Landmark: ${selectedAddress.landmark || 'None'}) - Name: ${selectedAddress.contactName}, Phone: ${selectedAddress.phoneNumber}`;
    
    try {
      await axios.post(`${API_URL}/api/orders/create`, {
        items: cart.map(i => ({ name: i.name, cartQty: i.cartQty, price: i.sellingPrice, retailerPrice: i.retailerPrice })),
        totalAmount: grandTotal, 
        paymentMethod: paymentMethod === 'UPI' ? `UPI (UTR: ${utrNumber})` : 'COD', 
        deliveryAddress: orderAddress,
        lat: selectedAddress.lat, lng: selectedAddress.lng
      }, getAuth());
      
      setCart([]); setUpiStatus('pending'); setUtrNumber('');
      alert("Order Successfully Placed!");
      setActiveTab('account'); setAccountSubTab('orders');
    } catch (err) { alert("Failed to place order. Ensure items are in stock."); }
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
            <div className="flex flex-col items-end max-w-[150px] text-right">
              <span className="text-[10px] font-bold text-indigo-200 uppercase">Delivering to</span>
              <div className="flex items-center gap-1"><span className="font-bold text-sm truncate">{selectedAddress ? selectedAddress.label : 'No Address Selected'}</span><MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" /></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full p-4 flex-1">
        
        {activeTab === 'home' && (
          <>
            {!selectedAddress && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-4 font-bold flex items-center justify-between">
                <span>Please select a delivery address to see nearby items.</span>
                <button onClick={() => {setActiveTab('account'); setAccountSubTab('addresses')}} className="bg-yellow-200 px-3 py-1 rounded text-sm text-yellow-900 hover:bg-yellow-300">Select Address</button>
              </div>
            )}
            
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
                  const inCart = cart.find(item => item._id === product._id);
                  return (
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
                          ) : <button onClick={() => addToCart(product)} disabled={!selectedAddress} className={`border font-bold px-3 py-1 rounded text-sm ${selectedAddress ? 'bg-white border-pink-500 text-pink-600 hover:bg-pink-50' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>ADD</button>}
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
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Checkout</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-3">Delivery Address</h3>
              {addresses.length === 0 ? (
                <div className="text-center p-4 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200">You must add an address before checking out.<br/><button onClick={()=>{setActiveTab('account'); setAccountSubTab('addresses')}} className="mt-2 bg-red-600 text-white px-4 py-2 rounded">Go to Addresses</button></div>
              ) : (
                addresses.map(addr => (
                  <label key={addr._id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer mb-2 transition ${selectedAddress?._id === addr._id ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" checked={selectedAddress?._id === addr._id} onChange={() => setSelectedAddress(addr)} className="mt-1 w-4 h-4 text-indigo-600" />
                    <div className="flex-1">
                      <span className="font-bold bg-gray-200 px-2 py-0.5 rounded text-xs text-gray-800">{addr.label}</span>
                      <p className="text-sm font-bold text-gray-800 mt-1">{addr.contactName} - {addr.phoneNumber}</p>
                      <p className="text-xs font-medium text-gray-600 mt-1">{addr.address} {addr.landmark ? `(Landmark: ${addr.landmark})` : ''}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-3">Bill Summary</h3>
              <div className="flex justify-between text-gray-600 mb-2"><span className="font-medium">Item Total</span><span className="font-bold">₹{itemTotal}</span></div>
              <div className="flex justify-between text-gray-600 mb-2"><span className="font-medium">Delivery Fee</span><span className="font-bold">₹{DELIVERY_FEE}</span></div>
              <div className="flex justify-between text-xl font-extrabold text-gray-900 border-t pt-3"><span>Grand Total</span><span>₹{grandTotal}</span></div>
            </div>

            {selectedAddress && (
              <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6">
                <h3 className="font-bold text-gray-500 text-sm uppercase mb-4">Select Payment Method</h3>
                
                {upiStatus === 'pending' ? (
                  <>
                    <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer mb-3 ${paymentMethod === 'UPI' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                      <input type="radio" name="payment" value="UPI" checked={paymentMethod === 'UPI'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-gray-800 flex-1">Pay via UPI App</span>
                      <Smartphone className="w-6 h-6 text-gray-400"/>
                    </label>

                    {paymentMethod === 'UPI' && (
                      <div className="pl-8 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button onClick={() => triggerUPIApp('gpay')} className="bg-white border rounded-lg p-2 font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><span className="text-lg">GPay</span></button>
                        <button onClick={() => triggerUPIApp('phonepe')} className="bg-white border rounded-lg p-2 font-bold text-purple-700 hover:bg-purple-50 shadow-sm"><span className="text-lg">PhonePe</span></button>
                        <button onClick={() => triggerUPIApp('paytm')} className="bg-white border rounded-lg p-2 font-bold text-blue-500 hover:bg-blue-50 shadow-sm"><span className="text-lg">Paytm</span></button>
                        <button onClick={() => triggerUPIApp('other')} className="bg-white border rounded-lg p-2 font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><span className="text-lg">Other Apps</span></button>
                      </div>
                    )}

                    <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${paymentMethod === 'COD' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                      <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-gray-800 flex-1">Cash on Delivery (COD)</span>
                    </label>
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl text-center">
                    <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-pulse" />
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Waiting for Payment Confirmation</h3>
                    <p className="text-sm text-blue-700 mb-4">Once you have completed the payment in your UPI app, please enter the 12-digit UTR / Reference Number below to confirm your order.</p>
                    <input type="text" placeholder="Enter 12-Digit UTR Number" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="w-full p-3 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold tracking-widest mb-4" />
                    <button onClick={handlePlaceOrder} disabled={utrNumber.length < 6} className={`w-full font-bold py-3 rounded-xl shadow-md transition ${utrNumber.length >= 6 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Verify & Place Order</button>
                    <button onClick={() => setUpiStatus('pending')} className="mt-3 text-sm font-bold text-gray-500 hover:underline">Cancel & Try Another Method</button>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'COD' && selectedAddress && upiStatus === 'pending' && (
              <button onClick={handlePlaceOrder} className="w-full bg-indigo-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg hover:bg-indigo-700 transition transform hover:scale-[1.02]">Place Order (₹{grandTotal})</button>
            )}
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="flex flex-col md:flex-row gap-6">
            {!selectedOrder && (
              <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm border p-4 h-fit">
                <nav className="space-y-1">
                  <button onClick={() => setAccountSubTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><UserIcon className="w-5 h-5"/> Profile</button>
                  <button onClick={() => setAccountSubTab('addresses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'addresses' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><MapPin className="w-5 h-5"/> Addresses</button>
                  <button onClick={() => setAccountSubTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'orders' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><ShoppingBag className="w-5 h-5"/> My Orders</button>
                </nav>
                <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-8 flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-xl transition"><LogOut className="w-5 h-5"/> Sign Out</button>
              </div>
            )}

            <div className="flex-1">
              {/* PROFILE SECTION WITH EDIT */}
              {accountSubTab === 'profile' && !selectedOrder && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                   <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto md:mx-0"><UserIcon className="w-12 h-12"/></div>
                   <div className="space-y-6">
                     <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name</label><p className="text-xl font-bold text-gray-800">{userProfile.name}</p></div>
                     <div><label className="text-xs font-bold text-gray-500 uppercase">Email Address</label><p className="text-lg font-medium text-gray-600">{userProfile.email}</p></div>
                     
                     <div className="bg-gray-50 p-4 rounded-xl border">
                       <div className="flex justify-between items-center mb-2">
                         <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                         {!isEditingPhone && <button onClick={() => setIsEditingPhone(true)} className="text-indigo-600 hover:underline text-sm font-bold flex items-center gap-1"><Edit2 className="w-4 h-4"/> Edit</button>}
                       </div>
                       {isEditingPhone ? (
                         <div className="flex gap-2">
                           <input type="text" value={editPhoneValue} onChange={e => setEditPhoneValue(e.target.value)} className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                           <button onClick={handleSavePhone} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">Save</button>
                           <button onClick={() => setIsEditingPhone(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold">Cancel</button>
                         </div>
                       ) : (
                         <p className="text-lg font-medium text-gray-800">{userProfile.contactNumber || 'Not provided'}</p>
                       )}
                     </div>
                   </div>
                </div>
              )}

              {/* ADDRESSES SECTION */}
              {accountSubTab === 'addresses' && !selectedOrder && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex justify-between items-center">Saved Addresses <button onClick={() => setShowAddressForm(!showAddressForm)} className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-lg hover:bg-indigo-200">+ Add New</button></h3>
                  {showAddressForm && (
                    <form onSubmit={handleAddAddress} className="mb-6 p-5 bg-gray-50 border rounded-xl space-y-4 shadow-inner">
                      <button type="button" onClick={handleUseCurrentGPS} className="w-full bg-blue-100 text-blue-700 font-bold py-2 rounded-lg border border-blue-200 flex items-center justify-center gap-2 hover:bg-blue-200"><Crosshair className="w-4 h-4"/> Auto-fill with Current GPS Location</button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <select value={newAddress.label} onChange={e=>setNewAddress({...newAddress, label: e.target.value})} className="p-3 border rounded-lg font-bold outline-none"><option value="Home">Home</option><option value="Work">Work</option><option value="Other">Other</option></select>
                        <input type="text" placeholder="Contact Name" required value={newAddress.contactName} onChange={e=>setNewAddress({...newAddress, contactName: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <input type="text" placeholder="Phone Number" required value={newAddress.phoneNumber} onChange={e=>setNewAddress({...newAddress, phoneNumber: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input type="text" placeholder="Full Address (House, Street, Area, City)" required value={newAddress.address} onChange={e=>setNewAddress({...newAddress, address: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input type="text" placeholder="Landmark (Optional)" value={newAddress.landmark} onChange={e=>setNewAddress({...newAddress, landmark: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700">Save Address</button>
                    </form>
                  )}
                  <div className="space-y-3">
                    {addresses.length === 0 && <p className="text-gray-500 font-bold p-4 text-center border rounded-xl">No addresses saved yet.</p>}
                    {addresses.map(addr => (
                      <div key={addr._id} className="border p-4 rounded-xl flex justify-between items-start bg-white shadow-sm">
                        <div>
                          <span className="bg-indigo-100 text-indigo-800 font-bold text-xs px-2 py-0.5 rounded uppercase tracking-wider">{addr.label}</span>
                          <p className="text-gray-800 mt-2 font-bold">{addr.contactName} | {addr.phoneNumber}</p>
                          <p className="text-gray-600 text-sm mt-1">{addr.address}</p>
                          {addr.landmark && <p className="text-gray-500 text-xs mt-1">Landmark: {addr.landmark}</p>}
                        </div>
                        <button onClick={() => handleDeleteAddress(addr._id)} className="text-red-500 p-2 hover:bg-red-100 rounded transition"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ORDERS LIST & DRILL DOWN */}
              {accountSubTab === 'orders' && !selectedOrder && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-4">Order History</h3>
                  {myOrders.length === 0 && <p className="text-gray-500 font-bold p-4 text-center border rounded-xl bg-white">You haven't placed any orders yet.</p>}
                  {myOrders.map(order => (
                    <div key={order._id} onClick={() => setSelectedOrder(order)} className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                           <p className="font-mono text-xs font-bold text-gray-400">{order.orderId}</p>
                           <p className="text-sm font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                           <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${order.status.includes('Placed') ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span>
                           <p className="font-extrabold text-lg mt-1 text-gray-900">₹{order.totalAmount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedOrder && (
                <div className="bg-white rounded-2xl shadow-sm border p-6 animate-fade-in">
                  <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 text-indigo-600 font-bold mb-6 hover:underline"><ArrowLeft className="w-5 h-5"/> Back to Orders</button>
                  <div className="border-b pb-4 mb-4 flex justify-between items-center"><div><h2 className="text-2xl font-black text-gray-800">Receipt</h2><p className="font-mono text-sm text-gray-500 mt-1">{selectedOrder.orderId}</p></div><Receipt className="w-10 h-10 text-gray-300"/></div>
                  <div className="mb-6"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery Location</p><p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border">{selectedOrder.deliveryAddress}</p></div>
                  <div className="mb-6"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Products Ordered</p>
                    <div className="space-y-2">
                      {selectedOrder.subOrders.flatMap(sub => sub.items).map((item, idx) => {
                         const qty = item.cartQty || item.quantity || 1;
                         return (
                           <div key={idx} className="flex justify-between items-center p-2 border-b">
                             <div className="flex items-center gap-3"><span className="font-bold text-sm bg-gray-100 px-2 py-1 rounded">{qty}x</span><span className="font-bold text-gray-800">{item.name}</span></div>
                             <span className="font-medium text-gray-600">₹{item.price * qty}</span>
                           </div>
                         );
                      })}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border">
                    <div className="flex justify-between text-gray-600 mb-2"><span className="font-medium text-sm">Item Total</span><span className="font-bold text-sm">₹{selectedOrder.totalAmount - DELIVERY_FEE}</span></div>
                    <div className="flex justify-between text-gray-600 mb-2"><span className="font-medium text-sm">Delivery Fee</span><span className="font-bold text-sm">₹{DELIVERY_FEE}</span></div>
                    <div className="flex justify-between text-xl font-extrabold text-gray-900 border-t pt-3"><span>Total Paid via {selectedOrder.paymentMethod.split(' ')[0]}</span><span>₹{selectedOrder.totalAmount}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CART TAB */}
        {activeTab === 'cart' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Your Cart</h2>
            {cart.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border"><ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4"/><p className="text-xl font-bold text-gray-500">Your cart is empty</p></div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border p-4">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center p-1"><img src={item.imageUrl} className="max-h-full object-contain" alt=""/></div>
                      <div><h4 className="font-bold text-sm text-gray-800">{item.name}</h4><p className="font-extrabold text-gray-900 text-sm mt-1">₹{item.sellingPrice}</p></div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-1">
                      <button onClick={() => updateCartQty(item._id, -1)} className="font-bold text-lg text-gray-600">-</button><span className="font-bold text-sm">{item.cartQty}</span><button onClick={() => updateCartQty(item._id, 1)} className="font-bold text-lg text-gray-600">+</button>
                    </div>
                  </div>
                ))}
                <div className="mt-6 border-t pt-4"><div className="flex justify-between text-xl font-extrabold text-gray-900"><span>Sub Total</span><span>₹{itemTotal}</span></div></div>
                <button onClick={() => setActiveTab('checkout')} className="w-full mt-6 bg-pink-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg hover:bg-pink-600 flex justify-center items-center gap-2">Proceed to Checkout <ChevronRight className="w-5 h-5"/></button>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around items-center pb-safe pt-2 px-2 z-30 h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center flex-1 ${activeTab==='home' ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}><Home className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center flex-1 relative ${activeTab==='cart' || activeTab==='checkout' ? 'text-pink-600' : 'text-gray-400 hover:text-pink-400'}`}><ShoppingCart className="w-6 h-6 mb-1"/>{cart.length > 0 && <span className="absolute -top-1 right-4 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{cart.reduce((s, i)=>s+i.cartQty, 0)}</span>}<span className="text-[10px] font-bold">Cart</span></button>
        <button onClick={() => { setActiveTab('account'); setAccountSubTab('profile'); }} className={`flex flex-col items-center flex-1 ${activeTab==='account' ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}><UserIcon className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Account</span></button>
      </nav>
    </div>
  );
}
