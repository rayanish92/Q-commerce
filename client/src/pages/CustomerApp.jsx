import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Search, MapPin, LogOut, Loader2, Globe, Home, ShoppingCart, User as UserIcon, CreditCard, Crosshair, ChevronRight, Package, Settings, Truck } from 'lucide-react';

export default function CustomerApp() {
  const [activeTab, setActiveTab] = useState('home'); 
  const [accountSubTab, setAccountSubTab] = useState('profile'); // profile, orders, track
  
  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  
  const [testMode, setTestMode] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  const [locationName, setLocationName] = useState('Selecting Location...');
  const [location, setLocation] = useState({ lng: 88.3639, lat: 22.5726 }); 
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const API_URL = import.meta.env.VITE_API_URL;
  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const categories = ['All', 'Groceries', 'Vegetables', 'Dairy', 'Snacks', 'Pharmacy'];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserName(payload.user.name);
      setUserEmail(payload.user.email);
    }
    detectLocation();
  }, []);

  // Fix for "Intermittent Orders": Fetch triggers strictly when tabs change
  useEffect(() => {
    if (activeTab === 'home') fetchNearbyProducts();
    if (activeTab === 'account' && (accountSubTab === 'orders' || accountSubTab === 'track')) fetchMyOrders();
  }, [category, location, activeTab, accountSubTab, testMode]);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName('Current GPS Location');
          setShowLocationModal(false);
        },
        () => setLocationName('Kolkata (Default)')
      );
    }
  };

  const setCustomLocation = (e) => {
    e.preventDefault();
    if (!manualAddress) return;
    setLocationName(manualAddress);
    setLocation({ lat: 22.5, lng: 88.3 }); 
    setShowLocationModal(false);
  };

  const fetchNearbyProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/products/nearby?lng=${location.lng}&lat=${location.lat}&category=${category}&testMode=${testMode}`, getAuth());
      
      // UNIQUE FILTER: Hide duplicates if multiple retailers sell the same item
      const uniqueProducts = [];
      const seenNames = new Set();
      res.data.forEach(p => {
        if (!seenNames.has(p.name)) {
          seenNames.add(p.name);
          uniqueProducts.push(p);
        }
      });
      setProducts(uniqueProducts);
    } catch (err) {} finally { setLoading(false); }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders/my-orders`, getAuth());
      setMyOrders(res.data);
    } catch (err) {}
  };

  const addToCart = (product) => {
    // RETAILER CHECK COMPLETELY REMOVED! Add anything you want!
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item => item._id === product._id ? { ...item, cartQty: item.cartQty + 1 } : item));
    } else {
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  };

  const updateCartQty = (id, amount) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        const newQty = item.cartQty + amount;
        return newQty > 0 ? { ...item, cartQty: newQty } : item;
      }
      return item;
    }).filter(item => item.cartQty > 0)); // Auto-remove if 0
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.cartQty), 0);

  const handlePlaceOrder = async () => {
    try {
      const orderData = {
        items: cart.map(i => ({ name: i.name, cartQty: i.cartQty, price: i.sellingPrice })),
        totalAmount: cartTotal,
        paymentMethod: paymentMethod,
        deliveryAddress: locationName,
        lat: location.lat,
        lng: location.lng
      };
      await axios.post(`${API_URL}/api/orders/create`, orderData, getAuth());
      setCart([]);
      alert("Order successfully placed & routed!");
      setActiveTab('account');
      setAccountSubTab('track');
    } catch (err) { alert("Failed to place order."); }
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
            <button onClick={() => setTestMode(!testMode)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold border transition ${testMode ? 'bg-red-500 border-red-400' : 'bg-indigo-700 border-indigo-500'}`}>
              <Globe className="w-3 h-3" /> {testMode ? "Test" : "10km"}
            </button>
            <button onClick={() => setShowLocationModal(true)} className="flex flex-col items-end max-w-[120px]">
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Delivering to</span>
              <div className="flex items-center gap-1"><span className="font-bold text-sm truncate">{locationName}</span><MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" /></div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full p-4 flex-1">
        
        {activeTab === 'home' && (
          <>
            <div className="relative mb-4"><input type="text" placeholder="Search for 'Milk', 'Atta'..." className="w-full py-3 pl-12 pr-4 rounded-xl text-gray-800 shadow-sm border focus:outline-none focus:ring-2 focus:ring-pink-500" /><Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" /></div>
            <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar">
              {categories.map(cat => <button key={cat} onClick={() => setCategory(cat)} className={`whitespace-nowrap px-5 py-2 rounded-full font-semibold shadow-sm transition-all ${category === cat ? 'bg-pink-500 text-white transform scale-105' : 'bg-white text-gray-600 border'}`}>{cat}</button>)}
            </div>

            {loading ? <div className="flex flex-col items-center justify-center py-20 text-indigo-500"><Loader2 className="w-10 h-10 animate-spin mb-4" /></div> 
            : products.length === 0 ? <div className="text-center py-16 bg-white rounded-2xl shadow-sm border"><h3 className="text-xl font-bold text-gray-700">No {category !== 'All' ? category : ''} items nearby</h3></div>
            : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => {
                  const inCart = cart.find(item => item._id === product._id);
                  return (
                    // RETAILER BADGE IS COMPLETELY REMOVED HERE
                    <div key={product._id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                      <div className="h-32 bg-white p-2 flex items-center justify-center">
                        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full object-contain" /> : <div className="text-gray-400 text-xs">No Image</div>}
                      </div>
                      <div className="p-3 bg-gray-50 border-t flex-1 flex flex-col justify-between">
                        <h3 className="font-bold text-sm text-gray-800 line-clamp-2 h-10 leading-tight">{product.name}</h3>
                        <div className="flex justify-between items-end mt-2">
                          <p className="text-lg font-extrabold text-gray-900">₹{product.sellingPrice}</p>
                          {inCart ? (
                            <div className="flex items-center gap-2 bg-pink-100 rounded px-2 py-1 border border-pink-200">
                              <button onClick={() => updateCartQty(product._id, -1)} className="font-bold text-pink-700">-</button><span className="font-bold text-sm text-pink-900">{inCart.cartQty}</span><button onClick={() => updateCartQty(product._id, 1)} className="font-bold text-pink-700">+</button>
                            </div>
                          ) : <button onClick={() => addToCart(product)} className="bg-white border border-pink-500 text-pink-600 font-bold px-3 py-1 rounded shadow-sm hover:bg-pink-50 text-sm">ADD</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'cart' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Your Cart</h2>
            {cart.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border"><p className="text-xl font-bold text-gray-500">Your cart is empty</p></div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border p-4">
                {cart.map(item => (
                  <div key={item._id} className="flex justify-between items-center mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center p-1"><img src={item.imageUrl} className="max-h-full object-contain" alt=""/></div>
                      <div><h4 className="font-bold text-sm text-gray-800">{item.name}</h4><p className="font-extrabold text-gray-900 text-sm mt-1">₹{item.sellingPrice}</p></div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-1">
                        <button onClick={() => updateCartQty(item._id, -1)} className="font-bold text-lg text-gray-600">-</button><span className="font-bold text-sm">{item.cartQty}</span><button onClick={() => updateCartQty(item._id, 1)} className="font-bold text-lg text-gray-600">+</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-6">
                  <div className="flex justify-between text-xl font-extrabold text-gray-900 mt-4 border-t pt-4"><span>Grand Total</span><span>₹{cartTotal}</span></div>
                </div>
                <button onClick={() => setActiveTab('checkout')} className="w-full mt-6 bg-pink-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg hover:bg-pink-600 flex justify-center items-center gap-2">Proceed to Checkout <ChevronRight className="w-5 h-5"/></button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'checkout' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Checkout</h2>
            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-3">Delivery Address</h3>
              <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border"><MapPin className="w-6 h-6 text-indigo-600 mt-0.5" /><p className="font-bold text-gray-800">{locationName}</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6">
              <h3 className="font-bold text-gray-500 text-sm uppercase mb-4">Select Payment Method</h3>
              <div className="space-y-3">
                {['UPI', 'Credit/Debit Card', 'Cash on Delivery (COD)'].map(method => (
                  <label key={method} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${paymentMethod === method ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-gray-800 flex-1">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handlePlaceOrder} className="w-full bg-indigo-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg hover:bg-indigo-700">Place Order • ₹{cartTotal}</button>
            <button onClick={() => setActiveTab('cart')} className="w-full mt-3 text-gray-500 font-bold py-2">Back to Cart</button>
          </div>
        )}

        {/* TAB 4: ACCOUNT SUB-SECTIONS */}
        {activeTab === 'account' && (
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Account Sidebar Navigation */}
            <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm border p-4 h-fit">
              <h2 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4 px-2">Account Settings</h2>
              <nav className="space-y-1">
                <button onClick={() => setAccountSubTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Settings className="w-5 h-5"/> Profile Details</button>
                <button onClick={() => setAccountSubTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'orders' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Package className="w-5 h-5"/> Order History</button>
                <button onClick={() => setAccountSubTab('track')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${accountSubTab === 'track' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Truck className="w-5 h-5"/> Track Orders</button>
              </nav>
              <button onClick={() => { localStorage.clear(); window.location.href='/'; }} className="w-full mt-8 flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-xl transition"><LogOut className="w-5 h-5"/> Sign Out</button>
            </div>

            {/* Account Content Area */}
            <div className="flex-1">
              {accountSubTab === 'profile' && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                   <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4"><UserIcon className="w-10 h-10"/></div>
                   <h2 className="text-2xl font-bold text-gray-800">{userName}</h2>
                   <p className="text-gray-500 mb-6">{userEmail}</p>
                   <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100">You can update your delivery address at checkout.</p>
                </div>
              )}

              {accountSubTab === 'orders' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg">Past Orders</h3>
                  {myOrders.length === 0 ? <p className="text-gray-500 bg-white p-6 rounded-2xl border text-center font-bold">No past orders found.</p> : 
                    myOrders.map(order => (
                      <div key={order._id} className="bg-white rounded-2xl shadow-sm border p-5">
                        <div className="flex justify-between items-start border-b pb-3 mb-3">
                          <div><p className="font-mono text-xs font-bold text-gray-400">{order.orderId}</p><p className="text-sm font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p></div>
                          <div className="text-right"><span className="bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-1 rounded">{order.status}</span><p className="font-extrabold text-lg mt-1">₹{order.totalAmount}</p></div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {/* Handles both old and new order structures safely */}
                          <span className="font-bold">Items: </span> 
                          {order.subOrders ? 
                            order.subOrders.map(s => s.items.map(i => `${i.cartQty}x ${i.name}`).join(', ')).join(' | ') :
                            order.items?.map(i => `${i.cartQty || i.quantity}x ${i.name}`).join(', ')
                          }
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {accountSubTab === 'track' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg">Live Tracking</h3>
                  {myOrders.filter(o => o.status !== 'Delivered').length === 0 ? 
                    <p className="text-gray-500 bg-white p-6 rounded-2xl border text-center font-bold">No active orders to track.</p> :
                    myOrders.filter(o => o.status !== 'Delivered').map(order => (
                       <div key={order._id} className="bg-white rounded-2xl shadow-sm border p-5 border-l-4 border-l-indigo-500">
                          <p className="font-mono text-xs font-bold text-gray-400 mb-2">Order {order.orderId}</p>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><Truck className="w-6 h-6"/></div>
                            <div>
                              <h4 className="font-bold text-xl text-indigo-900">{order.status}</h4>
                              <p className="text-sm text-gray-500 mt-1">Estimated delivery in 10-15 mins to {order.deliveryAddress}</p>
                            </div>
                          </div>
                       </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around items-center pb-safe pt-2 px-2 z-30 h-16">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center flex-1 ${activeTab==='home' ? 'text-indigo-600' : 'text-gray-400'}`}><Home className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center flex-1 relative ${activeTab==='cart' ? 'text-pink-600' : 'text-gray-400'}`}><div className="relative"><ShoppingCart className="w-6 h-6 mb-1"/>{cart.length > 0 && <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cart.reduce((s, i)=>s+i.cartQty, 0)}</span>}</div><span className="text-[10px] font-bold">Cart</span></button>
        <button onClick={() => setActiveTab('account')} className={`flex flex-col items-center flex-1 ${activeTab==='account' ? 'text-indigo-600' : 'text-gray-400'}`}><UserIcon className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Account</span></button>
      </nav>
    </div>
  );
}
