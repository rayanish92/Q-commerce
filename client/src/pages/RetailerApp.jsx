{/* Replace the current TAB 3: ORDERS LIST with this in RetailerApp.jsx */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-6">Action Required: Orders</h2>
            
            <div className="space-y-4">
              {orders.length === 0 ? <p className="text-center p-4 text-gray-500 border rounded-lg">No orders assigned to you currently.</p> : null}
              
              {orders.map(order => (
                <div key={order._id} className="border rounded-xl p-5 bg-gray-50 relative overflow-hidden">
                   {order.subOrder.status === 'Pending' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
                   {order.subOrder.status === 'Accepted' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
                   
                   <div className="flex justify-between items-start mb-4 border-b pb-4">
                     <div>
                       <p className="font-mono text-xs font-bold text-indigo-600">Parent Order: {order.orderId}</p>
                       <p className="text-sm font-bold text-gray-800 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${order.subOrder.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : order.subOrder.status === 'Accepted' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                       {order.subOrder.status}
                     </span>
                   </div>

                   <div className="mb-4">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items to Fulfill:</p>
                     <ul className="space-y-1">
                       {order.subOrder.items.map((item, idx) => (
                         <li key={idx} className="font-bold text-gray-800">• {item.cartQty}x {item.name}</li>
                       ))}
                     </ul>
                   </div>

                   {order.subOrder.status === 'Pending' && (
                     <div className="flex gap-3 mt-4 pt-4 border-t">
                       <button onClick={async () => {
                         try {
                           await axios.put(`${API_URL}/api/orders/${order._id}/suborder/${order.subOrder._id}`, { action: 'Accept' }, getAuth());
                           fetchOrders();
                         } catch(err) { setMessage('Failed to accept order') }
                       }} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Accept Order</button>
                       
                       <button onClick={async () => {
                         try {
                           await axios.put(`${API_URL}/api/orders/${order._id}/suborder/${order.subOrder._id}`, { action: 'Reject' }, getAuth());
                           fetchOrders();
                         } catch(err) { setMessage('Failed to reject order') }
                       }} className="flex-1 bg-red-100 text-red-700 font-bold py-3 rounded-lg hover:bg-red-200">Reject</button>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}
