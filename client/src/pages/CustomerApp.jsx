import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2, Globe, Home, ShoppingCart, User as UserIcon, Trash2, ChevronRight, Settings, Smartphone, Truck, Package, Crosshair } from 'lucide-react';

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
  
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [locationName, setLocationName] = useState('Selecting Location...');
  const [location, setLocation] = useState({ lng: 88.3639, lat: 22.5726 }); 
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setUserName(JSON.parse(atob(token.split('.')[1])).user.name);
    fetchUserProfile();
    detectLocation();
  }, []);

  useEffect(() => {
    if (activeTab === 'home') fetchNearbyProducts();
    if (activeTab === 'account' && accountSubTab === 'orders') fetchMyOrders();
  }, [category, activeTab, testMode, selectedAddress, location.lat, location.lng]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, getAuth());
      setAddresses(res.data.addresses || []);
    } catch (err) {}
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName('Current GPS Location');
          setSelectedAddress(null); 
          setShowLocationModal(false);
        },
        () => {
          setLocationName('Kolkata (Default)');
          setSelectedAddress(null);
        }
      );
    }
  };

  const setCustomLocation = (e) => {
    e.preventDefault();
    if (!manualAddress) return;
    setLocationName(manualAddress);
    setLocation({ lat: 22.5, lng: 88.3 }); 
    setSelectedAddress(null); 
    setShowLocationModal(false);
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

  const fetchMyOrders = async () => { try { setMyOrders((await axios.get(`${API_URL}/api/orders/my-orders`, getAuth())).data); } catch(err){} };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/address`, newAddress, getAuth());
      setAddresses(res.data); setShowAddressForm(false); 
      setSelectedAddress(res.data[res.data.length - 1]);
      setLocationName(res.data[res.data.length - 1].address);
      setNewAddress({ label: 'Home', address: '', lat: 22.5, lng: 88.3 });
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
  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.cartQty), 0);

  const handlePlaceOrder = async () => {
    const orderAddress = selectedAddress ? selectedAddress.address : locationName;
    const orderLat = selectedAddress ? selectedAddress.lat : location.lat;
    const orderLng = selectedAddress ? selectedAddress.lng : location.lng;
    
    if (!orderAddress || orderAddress === 'Selecting Location...') return alert("Please specify a delivery location.");

    if (paymentMethod === 'UPI') {
      window.location.href = `upi://pay?pa=merchant@quickcomm.com&pn=QuickCommerce&am=${cartTotal}&cu=INR&tn=OrderPayment`;
    }

    try {
      await axios.post(`${API_URL}/api/orders/create`, {
        // FIX: WE NOW SAVE BOTH PRICES SO THE ADMIN CAN CALCULATE MARGINS
        items: cart.map(i => ({ name: i.name, cartQty: i.cartQty, price: i.sellingPrice, retailerPrice: i.retailerPrice })),
        totalAmount: cartTotal, paymentMethod, deliveryAddress: orderAddress,
        lat: orderLat, lng: orderLng
      }, getAuth());
      
      setCart([]); 
      alert("Order Successfully Placed & Dispatched!");
      setActiveTab('account'); setAccountSubTab('orders');
    } catch (err) { alert("Failed to place order. Try changing your location or turning on Test Mode."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:w-96 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Select Delivery Location</h3>
            <button onClick={detectLocation} className="w-full flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl mb-4 hover:bg-indigo-200">
              <Crosshair className="w-5 h-5"/> Use Current GPS Location
            </button>
            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span><div className="flex-grow border-t border-gray-300"></div></div>
            <form onSubmit={setCustomLocation} className="mt-2">
              <input type="text" placeholder="Enter Apartment, Street, City..." value={manualAddress} onChange={(e)=>setManualAddress(e.target.value)} className="w-full p-3 border rounded-xl mb-3 focus:ring-2 focus:ring-indigo-500" required />
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">Confirm Location</button>
            </form>
            <button onClick={()=>setShowLocationModal(false)} className="w-full mt-3 text-gray-500 font-bold py-2">Cancel</button>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> QuickComm</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTestMode(!testMode)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold border transition ${testMode ? 'bg-red-500' : 'bg-indigo-700'}`}>
              <Globe className="w-3 h-3" /> {testMode ? "Test" : "10km"}
            </button>
            <button onClick={() => setShowLocationModal(true)} className="flex flex-col items-end max-w-[150px] text-right">
              <span className="text-[10px] font-bold text-indigo-200 uppercase">Delivering to</span>
              <div className="flex items-center gap-1"><span className="font-bold text-sm truncate">{locationName}</span><MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" /></div>
            </button>
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
                  const inCart = cart.find(item => item._id === product._id);
                  return (
                    <div key={product._id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                      <div className="h-32 bg-white p-2 flex items-center justify-center"><img src={product.imageUrl} className="h-full object-contain" alt=""/></div>
                      <div className="p-3 bg-gray-50 border-t flex-1 flex flex-col justify-
