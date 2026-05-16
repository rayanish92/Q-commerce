import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2, Globe, Home, ShoppingCart, User as UserIcon, Trash2, ChevronRight, Smartphone, Crosshair, ArrowLeft, Receipt, CheckCircle, Edit2, Info } from 'lucide-react';

export default function CustomerApp() {
  const MERCHANT_UPI_ID = "your-merchant-id@bank"; 
  const MERCHANT_NAME = "QuickComm";
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [accountSubTab, setAccountSubTab] = useState('profile');
  
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  
  const [userProfile, setUserProfile] = useState({});
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  
  // ADDRESS STATES
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editAddressId, setEditAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState({ label: 'Home', contactName: '', phoneNumber: '', address: '', landmark: '', pincode: '', lat: 22.5726, lng: 88.3639 });
  
  // LOCATION STATES
  const [selectedAddress, setSelectedAddress] = useState(null); 
  const [locationName, setLocationName] = useState('Selecting Location...');
  const [location, setLocation] = useState({ lng: 88.3639, lat: 22.5726 }); 
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [modalAddress, setModalAddress] = useState('');
  const [modalSuggestions, setModalSuggestions] = useState([]);
  const [formSuggestions, setFormSuggestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [testMode, setTestMode] = useState(false);
  const [cart, setCart] = useState([]);
  
  // PAYMENT & FEE STATES
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiStatus, setUpiStatus] = useState('pending');
  const [utrNumber, setUtrNumber] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(25);

  const baseCategories = ['All', 'Groceries', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Pharmacy', 'Meat & Seafood', 'Bakery', 'Personal Care', 'Home & Kitchen'];

  const API_URL = import.meta.env.VITE_API_URL || '';
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  // ---------------------------------------------------------
  // INJECT GOOGLE MAPS SCRIPT ON LOAD
  // ---------------------------------------------------------
  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY && !document.querySelector('#google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [GOOGLE_MAPS_API_KEY]);

  useEffect(() => { 
    fetchUserProfile(); 
    detectLocation(); 
  }, []);
  
  useEffect(() => {
    if (activeTab === 'home') fetchNearbyProducts();
    if (activeTab === 'account' && accountSubTab === 'orders') fetchMyOrders();
    
    const interval = setInterval(() => {
      if (activeTab === 'home') fetchNearbyProducts();
      if (activeTab === 'account' && accountSubTab === 'orders') fetchMyOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [category, activeTab, testMode, location.lat, location.lng, selectedAddress]);

  useEffect(() => {
    const fetchFee = async () => {
      if (cart.length === 0) return setDeliveryFee(25);
      try {
        const lat = selectedAddress ? selectedAddress.lat : location.lat;
        const lng = selectedAddress ? selectedAddress.lng : location.lng;
        const res = await axios.post(`${API_URL}/api/orders/estimate-fee`, { items: cart, lat, lng }, getAuth());
        if (res.data.possible) setDeliveryFee(res.data.fee);
      } catch (err) { setDeliveryFee(25); }
    };
    fetchFee();
  }, [cart, location.lat, location.lng, selectedAddress]);

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
    } catch (err) { alert('Failed to update phone number'); }
  };

  // ---------------------------------------------------------
  // REVERSE GEOCODING (Converts GPS to Address via Google)
  // ---------------------------------------------------------
  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude; 
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });
          setSelectedAddress(null); 
          
          if (window.google) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const formatted = results[0].formatted_address;
                setLocationName(formatted.split(',').slice(0,2).join(', '));
                setNewAddress(prev => ({...prev, lat, lng, address: '', pincode: '', landmark: ''}));
              } else {
                setLocationName('Current GPS Location');
              }
            });
          } else {
            setLocationName('Current GPS Location');
          }
          setShowLocationModal(false);
        },
        () => { setLocationName('Default Map Center'); setSelectedAddress(null); }
      );
    }
  };

  // ---------------------------------------------------------
  // GOOGLE PLACES AUTOCOMPLETE FOR MODAL (Top App Bar)
  // ---------------------------------------------------------
  const handleModalSearch = (e) => {
    const query = e.target.value; 
    setModalAddress(query);
    if (query.length > 2 && window.google) {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input: query, componentRestrictions: { country: 'in' } }, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setModalSuggestions(predictions);
        } else {
          setModalSuggestions([]);
        }
      });
    } else { 
      setModalSuggestions([]); 
    }
  };

  const selectModalSuggestion = (suggestion) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: suggestion.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        setLocation({ lat, lng });
        setLocationName(suggestion.description.split(',').slice(0, 2).join(', '));
        setNewAddress(prev => ({...prev, lat, lng, address: '', pincode: '', landmark: ''}));
        setSelectedAddress(null); 
        setShowLocationModal(false); 
        setModalSuggestions([]); 
        setModalAddress('');
      }
    });
  };

  // ---------------------------------------------------------
  // GOOGLE PLACES AUTOCOMPLETE FOR CHECKOUT FORM
  // ---------------------------------------------------------
  const handleFormSearch = (query) => {
    setNewAddress(prev => ({...prev, address: query}));
    if (query.length > 2 && window.google) {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input: query, componentRestrictions: { country: 'in' } }, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setFormSuggestions(predictions);
        } else {
          setFormSuggestions([]);
        }
      });
    } else { 
      setFormSuggestions([]); 
    }
  };

  const selectFormSuggestion = (suggestion) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: suggestion.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        
        // Try to auto-extract the PIN Code if Google provides it
        let pincode = '';
        results[0].address_components.forEach(component => {
          if (component.types.includes('postal_code')) {
            pincode = component.long_name;
          }
        });

        setNewAddress(prev => ({
          ...prev, 
          address: suggestion.description, 
          lat: loc.lat(), 
          lng: loc.lng(),
          pincode: pincode || prev.pincode // Use extracted pin, or keep whatever was there
        }));
        setFormSuggestions([]);
      }
    });
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

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editAddressId) {
        res = await axios.put(`${API_URL}/api/auth/address/${editAddressId}`, newAddress, getAuth());
      } else {
        res = await axios.post(`${API_URL}/api/auth/address`, newAddress, getAuth());
      }
      setAddresses(res.data); 
      setShowAddressForm(false); setEditAddressId(null);
      setNewAddress({ label: 'Home', contactName: userProfile.name, phoneNumber: userProfile.contactNumber || '', address: '', landmark: '', pincode: '', lat: location.lat, lng: location.lng });
    } catch (err) { alert('Failed to save address'); }
  };

  const handleEditAddressInit = (addr) => {
    setNewAddress(addr); setEditAddressId(addr._id); setShowAddressForm(true);
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
  const grandTotal = itemTotal > 0 ? itemTotal + deliveryFee : 0;

  const triggerUPIApp = (appType) => {
    const upiString = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR&tn=QuickCommOrder`;
    if (appType === 'gpay') window.location.href = `gpay://upi/pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR`;
    else if (appType === 'phonepe') window.location.href = `phonepe://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR`;
    else if (appType === 'paytm') window.location.href = `paytmmp://pay?pa=${MERCHANT_UPI_ID}&pn=${MERCHANT_NAME}&am=${grandTotal}&cu=INR`;
    else window.location.href = upiString;
    setUpiStatus('awaiting_utr');
  };

  const handlePlaceOrder = async () => {
    let orderAddress = "";
    let orderLat, orderLng;

    if (selectedAddress) {
      orderAddress = `${selectedAddress.address} (Landmark: ${selectedAddress.landmark || 'None'}) - PIN: ${selectedAddress.pincode || 'N/A'} - Name: ${selectedAddress.contactName}, Phone: ${selectedAddress.phoneNumber}`;
      orderLat = selectedAddress.lat; orderLng = selectedAddress.lng;
    } else {
      if (!newAddress.contactName || !newAddress.phoneNumber || !newAddress.address || !newAddress.pincode) return alert("Please fill out your complete contact details & PIN Code for this unsaved location.");
      orderAddress = `${newAddress.address} (Landmark: ${newAddress.landmark || 'None'}) - PIN: ${newAddress.pincode || 'N/A'} - Name: ${newAddress.contactName}, Phone: ${newAddress.phoneNumber}`;
      orderLat = location.lat; orderLng = location.lng;
    }

    if (paymentMethod === 'UPI' && utrNumber.length < 6) return alert("Please enter a valid UTR / Reference number to verify your payment.");

    try {
      await axios.post(`${API_URL}/api/orders/create`, {
        items: cart.map(i => ({ name: i.name, cartQty: i.cartQty, price: i.sellingPrice, retailerPrice: i.retailerPrice })),
        totalAmount: grandTotal, 
        paymentMethod: paymentMethod === 'UPI' ? `UPI (UTR: ${utrNumber})` : 'COD', 
        deliveryAddress: orderAddress,
        lat: orderLat, lng: orderLng
      }, getAuth());
      
      setCart([]); setUpiStatus('pending'); setUtrNumber('');
      alert("Order Successfully Placed!");
      setActiveTab('account'); setAccountSubTab('orders');
    } catch (err) { alert(err.response?.data?.message || "Failed to place order."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      {/* MAP LOCATION MODAL */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:w-96 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl h-[85vh] md:h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold mb-4">Set Map Location</h3>
            <button onClick={detectLocation} className="w-full flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl mb-4 hover:bg-indigo-200 shadow-sm"><Crosshair className="w-5 h-5"/> Use Current GPS Location</button>
            <div className="relative flex py-1 items-center"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-bold">Or Search City/Town</span><div className="flex-grow border-t border-gray-300"></div></div>
            <div className="mt-2 relative">
              <input type="text" placeholder="Search Google Maps..." value={modalAddress} onChange={handleModalSearch} className="w-full p-3 border rounded-xl mb-2 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" />
              {modalSuggestions.length > 0 && (
                <div className="bg-white border rounded-lg shadow-lg overflow-hidden absolute w-full z-10 max-h-48 overflow-y-auto">
                  {modalSuggestions.map((sug, i) => <button key={i} onClick={() => selectModalSuggestion(sug)} className="w-full text-left p-3 border-b hover:bg-gray-50 text-sm text-gray-700 font-medium">{sug.description}</button>)}
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center px-2 mt-1">Powered by Google Maps.</p>
            </div>
            {addresses.length > 0 && (
              <div className="mt-4 flex-1 overflow-hidden flex flex-col">
                <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-bold">Or Choose Saved</span><div className="flex-grow border-t border-gray-300"></div></div>
                <div className="overflow-y-auto space-y-2 mt-2 pr-1">
                  {addresses.map(addr => (
                    <button key={addr._id} onClick={() => { setSelectedAddress(addr); setShowLocationModal(false); }} className="w-full text-left p-3 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition bg-white shadow-sm">
                      <span className="font-bold text-sm text-indigo-700 block">{addr.label}</span><span className="text-xs text-gray-600 block truncate">{addr.address}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={()=>setShowLocationModal(false)} className="w-full mt-4 text-gray-500 font-bold py-3 bg-gray-100 rounded-xl hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> QuickComm</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTestMode(!testMode)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold border transition ${testMode ? 'bg-red-500' : 'bg-indigo-700'}`}><Globe className="w-3 h-3" /> {testMode ? "Test" : "10km"}</button>
            <button onClick={() => setShowLocationModal(true)} className="flex flex-col items-end max-w-[150px] text-right bg-indigo-700 p-2 rounded-lg hover:bg-indigo-800 transition shadow-inner">
              <span className="text-[10px] font-bold text-indigo-200 uppercase">Delivering to</span>
              <div className="flex items-center gap-1"><span className="font-bold text-sm truncate">{selectedAddress ? `${selectedAddress.label} (${selectedAddress.pincode})` : locationName}</span><MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" /></div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full p-4 flex-1">
        {activeTab === 'home' && (
          <>
            <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar mt-4">
              {baseCategories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`whitespace-nowrap px-5 py-2 rounded-full font-semibold shadow-sm transition-all ${category === cat ? 'bg-pink-500 text-white transform scale-105' : 'bg-white text-gray-600 border'}`}>{cat}</button>
              ))}
            </div>

            {loading ? <div className="flex justify-center py-20 text-indigo-500"><Loader2 className="w-10 h-10 animate-spin" /></div> 
            : products.length === 0 ? <div className="text-center py-16 bg-white rounded-2xl border"><h3 className="text-xl font-bold text-gray-700">No items nearby this location</h3></div>
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
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Checkout</h2>
            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-3">Delivery Address</h3>
              
              <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer mb-4 transition ${!selectedAddress ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'hover:bg-gray-50'}`}>
                <input type="radio" checked={!selectedAddress} onChange={() => { setSelectedAddress(null); setNewAddress(prev => ({...prev, address: '', pincode: '', landmark: ''})); }} className="mt-1 w-4 h-4 text-indigo-600" />
                <div className="flex-1">
                  <span className="font-bold bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">Active Map Location</span>
                  <p className="text-sm font-bold text-gray-800 mt-2">{locationName}</p>
                  
                  {!selectedAddress && (
                    <div className="mt-3 bg-white p-3 rounded border border-indigo-200 grid grid-cols-1 md:grid-cols-2 gap-2 shadow-inner">
                       <input type="text" placeholder="Contact Name" value={newAddress.contactName} onChange={(e) => setNewAddress({...newAddress, contactName: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                       <input type="text" placeholder="Phone Number" value={newAddress.phoneNumber} onChange={(e) => setNewAddress({...newAddress, phoneNumber: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                       
                       <div className="relative md:col-span-2">
                         <input type="text" placeholder="Start typing exact Google Maps Address..." value={newAddress.address} onChange={(e) => handleFormSearch(e.target.value)} className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                         {formSuggestions.length > 0 && (
                            <div className="absolute w-full bg-white border rounded shadow-2xl z-10 max-h-40 overflow-y-auto mt-1">
                               {formSuggestions.map((s, i) => <div key={i} onClick={() => selectFormSuggestion(s)} className="p-3 border-b hover:bg-indigo-50 text-xs cursor-pointer font-bold text-gray-700">{s.description}</div>)}
                            </div>
                         )}
                       </div>
                       
                       <input type="text" placeholder="Landmark" value={newAddress.landmark} onChange={(e) => setNewAddress({...newAddress, landmark: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                       <input type="text" placeholder="PIN Code" value={newAddress.pincode} onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})} className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold tracking-widest" />
                    </div>
                  )}
                </div>
              </label>

              {addresses.length > 0 && <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-t pt-4">Or Use Saved Address</div>}
              {addresses.map(addr => (
                <label key={addr._id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer mb-2 transition ${selectedAddress?._id === addr._id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'hover:bg-gray-50'}`}>
                  <input type="radio" checked={selectedAddress?._id === addr._id} onChange={() => setSelectedAddress(addr)} className="mt-1 w-4 h-4 text-indigo-600" />
                  <div className="flex-1"><span className="font-bold bg-gray-200 px-2 py-0.5 rounded text-xs text-gray-800">{addr.label}</span><p className="text-sm font-bold text-gray-800 mt-1">{addr.contactName} - {addr.phoneNumber}</p><p className="text-xs font-medium text-gray-600 mt-1">{addr.address} {addr.landmark ? `(${addr.landmark})` : ''} - PIN: {addr.pincode}</p></div>
                </label>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-3">Bill Summary</h3>
              <div className="flex justify-between text-gray-600 mb-2"><span className="font-medium">Item Total</span><span className="font-bold">₹{itemTotal}</span></div>
              <div className="flex justify-between text-gray-600 mb-2"><span className="font-medium flex items-center gap-1">Delivery Fee (Calculated by Distance) <Info className="w-3 h-3 text-indigo-400"/></span><span className="font-bold">₹{deliveryFee}</span></div>
              <div className="flex justify-between text-xl font-extrabold text-gray-900 border-t pt-3"><span>Grand Total</span><span>₹{grandTotal}</span></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-4">Select Payment Method</h3>
              {upiStatus === 'pending' ? (
                <>
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer mb-3 ${paymentMethod === 'UPI' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="payment" value="UPI" checked={paymentMethod === 'UPI'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-indigo-600" /><span className="font-bold text-gray-800 flex-1">Pay via UPI App</span><Smartphone className="w-6 h-6 text-gray-400"/>
                  </label>
                  {paymentMethod === 'UPI' && (
                    <div className="pl-8 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button onClick={() => triggerUPIApp('gpay')} className="bg-white border rounded-lg p-2 font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><span className="text-lg">GPay</span></button>
                      <button onClick={() => triggerUPIApp('phonepe')} className="bg-white border rounded-lg p-2 font-bold text-purple-700 hover:bg-purple-50 shadow-sm"><span className="text-lg">PhonePe</span></button>
                      <button onClick={() => triggerUPIApp('paytm')} className="bg-white border rounded-lg p-2 font-bold text-blue-500 hover:bg-blue-50 shadow-sm"><span className="text-lg">Paytm</span></button>
                      <button onClick={() => triggerUPIApp('other')} className="bg-white border rounded-lg p-2 font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><span className="text-lg">Other</span></button>
                    </div>
                  )}
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${paymentMethod === 'COD' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-indigo-600" /><span className="font-bold text-gray-800 flex-1">Cash on Delivery (COD)</span>
                  </label>
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl text-center">
                  <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-pulse" />
                  <h3 className="text-lg font-bold text-blue-900 mb-2">Awaiting Payment Confirmation</h3>
                  <p className="text-sm text-blue-700 mb-4">Enter your 12-digit UPI UTR/Reference Number to verify your payment.</p>
                  <input type="text" placeholder="Enter 12-Digit UTR" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="w-full p-3 border border-blue-300 rounded-lg text-center font-bold tracking-widest mb-4 outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handlePlaceOrder} disabled={utrNumber.length < 6} className={`w-full font-bold py-3 rounded-xl shadow-md transition ${utrNumber.length >= 6 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Verify & Place Order</button>
                  <button onClick={() => setUpiStatus('pending')} className="mt-3 text-sm font-bold text-gray-500 hover:underline">Cancel</button>
                </div>
              )}
            </div>

            {paymentMethod === 'COD' && upiStatus === 'pending' && (
              <button onClick={handlePlaceOrder} className="w-full bg-indigo-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg hover:bg-indigo-700 transition transform hover:scale-[1.02]">Place Order (₹{grandTotal})</button>
            )}
            <button onClick={() => setActiveTab('cart')} className="w-full mt-3 text-gray-500 font-bold py-2 hover:underline">Back to Cart</button>
          </div>
        )}

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
              {accountSubTab === 'profile' && !selectedOrder && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                   <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto md:mx-0"><UserIcon className="w-12 h-12"/></div>
                   <div className="space-y-6">
                     <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name</label><p className="text-xl font-bold text-gray-800">{userProfile.name}</p></div>
                     <div><label className="text-xs font-bold text-gray-500 uppercase">Email Address</label><p className="text-lg font-medium text-gray-600">{userProfile.email}</p></div>
                     <div className="bg-gray-50 p-4 rounded-xl border">
                       <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>{!isEditingPhone && <button onClick={() => setIsEditingPhone(true)} className="text-indigo-600 hover:underline text-sm font-bold flex items-center gap-1"><Edit2 className="w-4 h-4"/> Edit</button>}</div>
                       {isEditingPhone ? (
                         <div className="flex gap-2"><input type="text" value={editPhoneValue} onChange={e => setEditPhoneValue(e.target.value)} className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" /><button onClick={handleSavePhone} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">Save</button></div>
                       ) : <p className="text-lg font-medium text-gray-800">{userProfile.contactNumber || 'Not provided'}</p>}
                     </div>
                   </div>
                </div>
              )}

              {accountSubTab === 'addresses' && !selectedOrder && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex justify-between items-center">Saved Addresses <button onClick={() => {setEditAddressId(null); setNewAddress({ label: 'Home', contactName: userProfile.name, phoneNumber: userProfile.contactNumber || '', address: '', landmark: '', pincode: '', lat: location.lat, lng: location.lng }); setShowAddressForm(!showAddressForm);}} className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-lg hover:bg-indigo-200">+ Add New</button></h3>
                  {showAddressForm && (
                    <form onSubmit={handleSaveAddress} className="mb-6 p-5 bg-gray-50 border rounded-xl space-y-4 shadow-inner">
                      <div className="grid grid-cols-2 gap-4">
                        <select value={newAddress.label} onChange={e=>setNewAddress({...newAddress, label: e.target.value})} className="p-3 border rounded-lg font-bold outline-none"><option value="Home">Home</option><option value="Work">Work</option><option value="Other">Other</option></select>
                        <input type="text" placeholder="Contact Name" required value={newAddress.contactName} onChange={e=>setNewAddress({...newAddress, contactName: e.target.value})} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Phone Number" required value={newAddress.phoneNumber} onChange={e=>setNewAddress({...newAddress, phoneNumber: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="text" placeholder="Pincode" required value={newAddress.pincode} onChange={e=>setNewAddress({...newAddress, pincode: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="Full Address (Powered by Google Maps)" required value={newAddress.address} onChange={(e) => handleFormSearch(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        {formSuggestions.length > 0 && (
                          <div className="absolute w-full bg-white border rounded shadow-2xl z-10 max-h-40 overflow-y-auto mt-1">
                             {formSuggestions.map((s, i) => <div key={i} onClick={() => selectFormSuggestion(s)} className="p-3 border-b hover:bg-indigo-50 text-sm cursor-pointer text-gray-700 font-bold">{s.description}</div>)}
                          </div>
                        )}
                      </div>
                      <input type="text" placeholder="Landmark (Optional)" value={newAddress.landmark} onChange={e=>setNewAddress({...newAddress, landmark: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700">{editAddressId ? 'Update Address' : 'Save Address'}</button>
                        <button type="button" onClick={() => setShowAddressForm(false)} className="bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-400">Cancel</button>
                      </div>
                    </form>
                  )}
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr._id} className="border p-4 rounded-xl flex justify-between items-start bg-white shadow-sm">
                        <div>
                          <span className="bg-indigo-100 text-indigo-800 font-bold text-xs px-2 py-0.5 rounded uppercase tracking-wider">{addr.label}</span>
                          <p className="text-gray-800 mt-2 font-bold">{addr.contactName} | {addr.phoneNumber}</p>
                          <p className="text-gray-600 text-sm mt-1">{addr.address}</p>
                          <p className="text-gray-500 text-xs mt-1">PIN: {addr.pincode} {addr.landmark ? `| Landmark: ${addr.landmark}` : ''}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleEditAddressInit(addr)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded"><Edit2 className="w-5 h-5"/></button>
                          <button onClick={() => handleDeleteAddress(addr._id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {accountSubTab === 'orders' && !selectedOrder && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-4">Order History</h3>
                  {myOrders.length === 0 && <p className="text-gray-500 font-bold p-4 text-center border rounded-xl bg-white">You haven't placed any orders yet.</p>}
                  {myOrders.map(order => (
                    <div key={order._id} onClick={() => setSelectedOrder(order)} className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div><p className="font-mono text-xs font-bold text-gray-400">{order.orderId}</p><p className="text-sm font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p></div>
                        <div className="text-right">
                           <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${order.status.includes('Cancel') ? 'bg-red-100 text-red-800' : order.status.includes('Placed') ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span>
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
                      {selectedOrder.subOrders.flatMap(sub => sub.items).map((item, idx) => (
                           <div key={idx} className="flex justify-between items-center p-2 border-b">
                             <div className="flex items-center gap-3"><span className="font-bold text-sm bg-gray-100 px-2 py-1 rounded">{item.cartQty || item.quantity || 1}x</span><span className="font-bold text-gray-800">{item.name}</span></div>
                             <span className="font-medium text-gray-600">₹{item.price * (item.cartQty || item.quantity || 1)}</span>
                           </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border">
                    <div className="flex justify-between text-xl font-extrabold text-gray-900 pt-3"><span>Total Paid via {selectedOrder.paymentMethod.split(' ')[0]}</span><span>₹{selectedOrder.totalAmount}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Your Cart</h2>
            {cart.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border"><ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4"/><p className="text-xl font-bold text-gray-500">Your cart is empty</p></div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border p-4">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3"><img src={item.imageUrl} className="w-12 h-12 object-contain" alt=""/><div><h4 className="font-bold text-sm text-gray-800">{item.name}</h4><p className="font-extrabold text-gray-900 text-sm mt-1">₹{item.sellingPrice}</p></div></div>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-1"><button onClick={() => updateCartQty(item._id, -1)} className="font-bold text-lg text-gray-600">-</button><span className="font-bold text-sm">{item.cartQty}</span><button onClick={() => updateCartQty(item._id, 1)} className="font-bold text-lg text-gray-600">+</button></div>
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
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center flex-1 ${activeTab==='home' ? 'text-indigo-600' : 'text-gray-400'}`}><Home className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center flex-1 relative ${activeTab==='cart'||activeTab==='checkout' ? 'text-pink-600' : 'text-gray-400'}`}><ShoppingCart className="w-6 h-6 mb-1"/>{cart.length>0&&<span className="absolute -top-1 right-4 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{cart.reduce((s,i)=>s+i.cartQty,0)}</span>}<span className="text-[10px] font-bold">Cart</span></button>
        <button onClick={() => { setActiveTab('account'); setAccountSubTab('profile'); }} className={`flex flex-col items-center flex-1 ${activeTab==='account' ? 'text-indigo-600' : 'text-gray-400'}`}><UserIcon className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Account</span></button>
      </nav>
    </div>
  );
}
