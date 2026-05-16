import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Package, CheckCircle, Clock, IndianRupee, LogOut, User, Navigation, Phone, Power, Map } from 'lucide-react';

export default function AgentApp() {
  const [activeTab, setActiveTab] = useState('deliveries');
  const [isOnline, setIsOnline] = useState(false);
  const [message, setMessage] = useState('');
  
  // Live Location State
  const [liveLocation, setLiveLocation] = useState({ lat: null, lng: null });
  const [currentAddress, setCurrentAddress] = useState(''); // NEW: Holds the Google Maps readable address
  
  // Data States
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [agentProfile, setAgentProfile] = useState({ name: 'Agent', contactNumber: '', totalEarnings: 0 });

  const API_URL = import.meta.env.VITE_API_URL || '';
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''; // Grab the key from .env

  const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    fetchAgentData();
    fetchDeliveries();

    const interval = setInterval(() => {
      if (isOnline) fetchDeliveries();
    }, 10000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const fetchAgentData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, getAuth());
      if (res.data) {
        setAgentProfile(res.data);
        setIsOnline(res.data.isOnline || false);
        
        if (res.data.location && res.data.location.coordinates) {
           const lat = res.data.location.coordinates[1];
           const lng = res.data.location.coordinates[0];
           setLiveLocation({ lat, lng });
           fetchAddressFromGoogle(lat, lng); // Fetch the readable address immediately
        }
      }
    } catch (err) {
      console.log("Could not fetch agent profile");
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders/agent-deliveries`, getAuth());
      const allOrders = res.data || [];
      setActiveDeliveries(allOrders.filter(o => ['Assigned', 'Picked_Up'].includes(o.status)));
      setDeliveryHistory(allOrders.filter(o => ['Delivered', 'Cancelled'].includes(o.status)));
    } catch (err) {
      console.log("Could not fetch deliveries yet.");
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/status`, { status: newStatus }, getAuth());
      setMessage(`Order marked as ${newStatus.replace('_', ' ')}!`);
      fetchDeliveries();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  // =========================================================
  // NEW: GOOGLE MAPS REVERSE GEOCODING
  // =========================================================
  const fetchAddressFromGoogle = async (lat, lng) => {
    if (!GOOGLE_MAPS_API_KEY) return; // Fail silently if no API key is provided
    try {
      const res = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`);
      if (res.data.results && res.data.results.length > 0) {
        setCurrentAddress(res.data.results[0].formatted_address);
      }
    } catch (err) {
      console.error("Google Maps API Error:", err);
    }
  };

  const refreshLiveLocation = () => {
    if (!navigator.geolocation) return setMessage("Geolocation not supported");
    setMessage("Detecting GPS...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLiveLocation({ lat, lng });
        fetchAddressFromGoogle(lat, lng); // Convert to street address
        
        if (isOnline) {
          await axios.put(`${API_URL}/api/orders/agent/status`, { isOnline: true, lat, lng }, getAuth());
        }
        setMessage("GPS Location Updated!");
        setTimeout(() => setMessage(''), 3000);
      },
      (error) => {
        setMessage("Please allow location access.");
        setTimeout(() => setMessage(''), 3000);
      }
    );
  };

  const toggleOnlineStatus = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by your browser.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const newStatus = !isOnline;
    
    if (newStatus === true) {
      setMessage("Connecting to satellite...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLiveLocation({ lat, lng });
          fetchAddressFromGoogle(lat, lng); // Convert to street address
          
          try {
            await axios.put(`${API_URL}/api/orders/agent/status`, { isOnline: true, lat, lng }, getAuth());
            setIsOnline(true);
            setMessage("You are Online! Auto-assign radar active.");
          } catch (err) {
            setMessage("Failed to connect to dispatch server.");
          }
          setTimeout(() => setMessage(''), 3000);
        },
        (error) => {
          setMessage("Location required to go online.");
          setTimeout(() => setMessage(''), 3000);
        }
      );
    } else {
      axios.put(`${API_URL}/api/orders/agent/status`, { isOnline: false }, getAuth())
        .then(() => {
          setIsOnline(false);
          setMessage("You are now Offline.");
          setTimeout(() => setMessage(''), 3000);
        })
        .catch(() => setMessage("Failed to go offline."));
    }
  };

  const handleOpenMap = (order) => {
    let destination = '';
    if (order.status === 'Assigned') {
      destination = `${order.retailerId?.shopName}, ${order.retailerId?.address}`;
    } else {
      destination = order.deliveryAddress || order.customerId?.address;
    }
    if (!destination || destination.trim() === 'undefined, undefined' || destination.trim() === '') {
      setMessage("Error: No valid address provided.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(mapUrl, '_blank');
  };

  const handlePhoneCall = (order) => {
    let phone = order.status === 'Assigned' ? order.retailerId?.contactNumber : order.customerId?.contactNumber;
    if (!phone) {
      setMessage("No phone number available.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans max-w-md mx-auto shadow-2xl relative pb-20">
      
      <header className="bg-fuchsia-700 text-white p-5 rounded-b-3xl shadow-lg z-10 relative">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-wide">Fleet App</h1>
            <p className="text-fuchsia-200 text-sm font-medium">Hello, {agentProfile.name}</p>
          </div>
          <button 
            onClick={toggleOnlineStatus}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 transition-all duration-300 ${isOnline ? 'bg-green-500 border-green-400 animate-pulse' : 'bg-gray-300 border-gray-200'}`}
          >
            <Power className="{`w-6" h-6 ${isOnline ? 'text-white' : 'text-gray-500'}`}/>
          </button>
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center border border-white/30">
          <div>
            <p className="text-fuchsia-100 text-xs font-bold uppercase tracking-wider mb-1">Today's Earnings</p>
            <p className="text-3xl font-black text-white flex items-center"><IndianRupee className="w-6 h-6 mr-1"/>{agentProfile.totalEarnings || 0}</p>
          </div>
          <div className="text-right">
            <p className="text-fuchsia-100 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
            <p className="text-xl font-bold text-white">{deliveryHistory.length} Trips</p>
          </div>
        </div>
      </header>

      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white p-4 rounded-xl shadow-2xl text-center font-bold text-sm">
            {message}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 overflow-y-auto mt-2">
        
        {activeTab === 'deliveries' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-lg font-black text-gray-800">Active Tasks</h2>
              <span className="bg-fuchsia-100 text-fuchsia-800 text-xs font-bold px-3 py-1 rounded-full">{activeDeliveries.length} Pending</span>
            </div>

            {!isOnline ? (
              <div className="bg-white p-8 rounded-2xl text-center border-2 border-dashed border-gray-300">
                <Power className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                <h3 className="font-bold text-gray-600 mb-1">You are Offline</h3>
                <p className="text-sm text-gray-400">Tap the power button above to connect your GPS and receive orders.</p>
              </div>
            ) : activeDeliveries.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 shadow-sm">
                <Clock className="w-12 h-12 text-fuchsia-300 mx-auto mb-3 animate-pulse"/>
                <h3 className="font-bold text-gray-600 mb-1">Looking for Orders</h3>
                <p className="text-sm text-gray-400">Your GPS is active. Stay nearby retailer hubs to get assignments faster.</p>
              </div>
            ) : (
              activeDeliveries.map(order => (
                <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-fuchsia-100 overflow-hidden">
                  <div className="bg-fuchsia-50 p-4 border-b border-fuchsia-100 flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-fuchsia-600 tracking-widest">ID: {order._id?.slice(-6).toUpperCase()}</span>
                    <span className="bg-white text-fuchsia-700 text-xs font-black px-2 py-1 rounded shadow-sm border border-fuchsia-200 uppercase">{order.status}</span>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div className="flex gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Package className="w-4 h-4 text-blue-600"/></div>
                        <div className="w-0.5 h-10 bg-gray-200 my-1"></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Pickup From</p>
                        <p className="font-bold text-gray-800">{order.retailerId?.shopName || 'Retailer Store'}</p>
                        <p className="text-sm text-gray-500">{order.retailerId?.address || 'Retailer Address missing'}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><MapPin className="w-4 h-4 text-green-600"/></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Deliver To</p>
                        <p className="font-bold text-gray-800">{order.customerId?.name || 'Customer'}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">{order.deliveryAddress || order.customerId?.address || 'Customer Address missing'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => handleOpenMap(order)}
                        className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-3 rounded-xl font-bold text-sm hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
                      >
                        <Navigation className="w-4 h-4"/> Navigate
                      </button>
                      <button 
                        onClick={() => handlePhoneCall(order)}
                        className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                      >
                        <Phone className="w-4 h-4"/> Call
                      </button>
                      
                      {order.status === 'Assigned' && (
                        <button onClick={() => handleStatusUpdate(order._id, 'Picked_Up')} className="col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-blue-700 shadow-md transform active:scale-95 transition">
                          Mark as Picked Up
                        </button>
                      )}
                      
                      {order.status === 'Picked_Up' && (
                        <button onClick={() => handleStatusUpdate(order._id, 'Delivered')} className="col-span-2 bg-green-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-green-700 shadow-md transform active:scale-95 transition">
                          Swipe to Deliver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-black text-gray-800 mb-4 px-1">Past Trips</h2>
            <div className="space-y-3">
              {deliveryHistory.length === 0 ? (
                <p className="text-center text-gray-400 font-bold py-8">No deliveries completed yet.</p>
              ) : (
                deliveryHistory.map(order => (
                  <div key={order._id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${order.status === 'Delivered' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {order.status === 'Delivered' ? <CheckCircle className="w-6 h-6 text-green-600"/> : <Package className="w-6 h-6 text-red-600"/>}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{order.customerId?.name || 'Customer'}</p>
                        <p className="text-xs text-gray-400 font-mono">{order._id?.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-800">₹15</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${order.status === 'Delivered' ? 'text-green-600' : 'text-red-500'}`}>{order.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-24 h-24 bg-fuchsia-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                <User className="w-10 h-10 text-fuchsia-600"/>
              </div>
              <h2 className="text-xl font-black text-gray-800">{agentProfile.name}</h2>
              <p className="text-gray-500 font-medium mb-6">{agentProfile.contactNumber || 'No Phone Number'}</p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Avg Rating</p>
                  <p className="text-xl font-black text-yellow-500">4.9 ★</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">On-Time</p>
                  <p className="text-xl font-black text-green-500">98%</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Map className="w-32 h-32"/>
              </div>
              <div className="flex justify-between items-center mb-3 relative z-10">
                <h3 className="font-black flex items-center gap-2"><Navigation className="w-5 h-5 text-blue-400"/> Radar Status</h3>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isOnline ? 'Active' : 'Standby'}
                </span>
              </div>
              
              <div className="bg-black/30 p-3 rounded-lg font-mono text-xs text-gray-300 mb-4 relative z-10">
                <p>LAT: <span className="text-blue-300 font-bold">{liveLocation.lat ? liveLocation.lat.toFixed(6) : 'Waiting...'}</span></p>
                <p>LNG: <span className="text-blue-300 font-bold">{liveLocation.lng ? liveLocation.lng.toFixed(6) : 'Waiting...'}</span></p>
                
                
                {currentAddress && (
                  <p className="mt-3 pt-3 border-t border-gray-700/50 text-fuchsia-300 font-sans leading-tight">
                    <MapPin className="w-3 h-3 inline mr-1"/> {currentAddress}
                  </p>
                )}
              </div>

              <button onClick={refreshLiveLocation} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-sm shadow-md transition relative z-10">
                Detect Current Location
              </button>
            </div>

            <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 transition">
              <LogOut className="w-5 h-5"/> Sign Out from Fleet
            </button>
          </div>
        )}
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 pb-safe">
        <div className="flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('deliveries')} className={`flex flex-col items-center p-2 w-20 transition-colors ${activeTab === 'deliveries' ? 'text-fuchsia-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Package className="{`w-6" h-6 mb-1 ${activeTab="==" 'deliveries' ? 'animate-bounce' : ''}`}/>
            <span className="text-[10px] font-bold uppercase tracking-wider">Tasks</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 w-20 transition-colors ${activeTab === 'history' ? 'text-fuchsia-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Clock className="w-6 h-6 mb-1"/>
            <span className="text-[10px] font-bold uppercase tracking-wider">History</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 w-20 transition-colors ${activeTab === 'profile' ? 'text-fuchsia-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <User className="w-6 h-6 mb-1"/>
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
