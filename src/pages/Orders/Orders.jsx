import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, query, orderBy, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6;

  useEffect(() => {
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('orderDate', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      confirmation: '#f59e0b',
      shipping: '#3b82f6',
      receiving: '#8b5cf6',
      completed: '#10b981',
      reviews: '#06b6d4',
    };
    return colors[status] || '#6b7280';
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      confirmation: 'shipping',
      shipping: 'receiving',
      receiving: 'completed',
      completed: 'reviews',
      reviews: null,
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status) => {
    const labels = {
      confirmation: 'Confirmation',
      shipping: 'Shipping',
      receiving: 'Receiving',
      completed: 'Completed',
      reviews: 'Reviews',
    };
    return labels[status] || status;
  };

  // Get status message for customer notification
  const getStatusMessage = (status, orderData) => {
    const orderId = orderData.id ? `#${orderData.id.substring(0, 8)}` : '';
    const totalItems = orderData.items?.length || 0;
    
    const messages = {
      confirmation: `✅ Your order ${orderId} has been confirmed! We're preparing ${totalItems} item(s) for shipment. Total: ₱${orderData.totalAmount?.toFixed(2)}`,
      shipping: `🚚 Great news! Your order ${orderId} is now being shipped to ${orderData.deliveryAddress}. You'll receive it soon!`,
      receiving: `📦 Your order ${orderId} is out for delivery! Our courier will arrive at your address shortly.`,
      completed: `✨ Your order ${orderId} has been delivered! We hope you enjoy your purchase. Thank you for shopping with us!`,
      reviews: `⭐ How was your experience? We'd love to hear your feedback on order ${orderId}. Please leave a review!`,
    };
    
    return messages[status] || `Your order status has been updated to ${getStatusLabel(status)}`;
  };

  // Send automatic message to customer
  const sendCustomerNotification = async (userId, message, orderData) => {
    try {
      // Check if conversation exists, if not create one
      const conversationsRef = collection(db, 'conversations');
      const conversationDocRef = doc(conversationsRef, userId);
      
      // Create/update conversation
      await updateDoc(conversationDocRef, {
        lastMessage: message,
        timestamp: new Date().toISOString(),
        unreadByUser: true,
        unreadByAdmin: false,
      }).catch(async (error) => {
        // If conversation doesn't exist, create it
        if (error.code === 'not-found') {
          await setDoc(conversationDocRef, {
            userId: userId,
            userName: orderData.userEmail?.split('@')[0] || 'Customer',
            lastMessage: message,
            timestamp: new Date().toISOString(),
            unreadByUser: true,
            unreadByAdmin: false,
          });
        }
      });

      // Add message to messages subcollection
      const messagesRef = collection(db, `conversations/${userId}/messages`);
      await addDoc(messagesRef, {
        text: message,
        timestamp: new Date().toISOString(),
        isAdmin: true,
        read: false,
      });

      console.log('✅ Customer notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending customer notification:', error);
      return false;
    }
  };

  const handleUpdateStatus = async (orderId, currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) {
      alert('Order is already in final stage');
      return;
    }

    // Get the order data
    const orderData = orders.find(o => o.id === orderId);
    if (!orderData) {
      alert('Order not found');
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      
      const newStatusEntry = {
        status: nextStatus,
        timestamp: new Date(),
        note: `Status updated to ${getStatusLabel(nextStatus)}`,
      };
      
      // Update order status
      await updateDoc(orderRef, {
        status: nextStatus,
        statusHistory: arrayUnion(newStatusEntry),
      });

      // Send automatic notification to customer
      const notificationMessage = getStatusMessage(nextStatus, orderData);
      const messageSent = await sendCustomerNotification(
        orderData.userId, 
        notificationMessage,
        orderData
      );

      if (messageSent) {
        alert(`Order updated to ${getStatusLabel(nextStatus)} and customer has been notified!`);
      } else {
        alert(`Order updated to ${getStatusLabel(nextStatus)} but failed to send notification.`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="orders-header">
        <h1 className="page-title">Order Management</h1>
        <div className="filter-buttons">
          <button 
            className={filterStatus === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('all')}
          >
            All ({orders.length})
          </button>
          <button 
            className={filterStatus === 'confirmation' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('confirmation')}
          >
            Confirmation ({orders.filter(o => o.status === 'confirmation').length})
          </button>
          <button 
            className={filterStatus === 'shipping' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('shipping')}
          >
            Shipping ({orders.filter(o => o.status === 'shipping').length})
          </button>
          <button 
            className={filterStatus === 'receiving' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('receiving')}
          >
            Receiving ({orders.filter(o => o.status === 'receiving').length})
          </button>
          <button 
            className={filterStatus === 'completed' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('completed')}
          >
            Completed ({orders.filter(o => o.status === 'completed').length})
          </button>
        </div>
      </div>

      <div className="orders-grid">
        {currentOrders.length === 0 ? (
          <div className="no-orders">
            <p>No orders found</p>
          </div>
        ) : (
          currentOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <h3>Order #{order.id.substring(0, 8)}</h3>
                  <p className="order-date">{formatDate(order.orderDate)}</p>
                </div>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="order-info">
                <div className="info-row">
                  <span className="info-label">Customer:</span>
                  <span className="info-value">{order.userEmail}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{order.deliveryAddress}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Items:</span>
                  <span className="info-value">{order.items?.length || 0} item(s)</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total:</span>
                  <span className="info-value total">₱{order.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="order-actions">
                <button 
                  className="btn-view"
                  onClick={() => setSelectedOrder(order)}
                >
                  View Details
                </button>
                {getNextStatus(order.status) && (
                  <button 
                    className="btn-update"
                    onClick={() => handleUpdateStatus(order.id, order.status)}
                  >
                    Move to {getStatusLabel(getNextStatus(order.status))}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="pagination-info">
            Page {currentPage} of {totalPages} ({filteredOrders.length} orders)
          </div>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - #{selectedOrder.id.substring(0, 8)}</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Customer Information</h3>
                <p><strong>Email:</strong> {selectedOrder.userEmail}</p>
                <p><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                <p><strong>Payment:</strong> {selectedOrder.paymentMethod}</p>
              </div>

              <div className="detail-section">
                <h3>Order Items</h3>
                <div className="items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-info">
                        <p className="item-name">{item.name}</p>
                        <p className="item-details">Qty: {item.quantity} × ₱{item.price?.toFixed(2)}</p>
                      </div>
                      <p className="item-total">₱{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <strong>Total Amount:</strong>
                  <strong>₱{selectedOrder.totalAmount?.toFixed(2)}</strong>
                </div>
              </div>

              <div className="detail-section">
                <h3>Status History</h3>
                <div className="status-timeline">
                  {selectedOrder.statusHistory?.map((history, index) => (
                    <div key={index} className="timeline-item">
                      <div 
                        className="timeline-dot"
                        style={{ backgroundColor: getStatusColor(history.status) }}
                      />
                      <div className="timeline-content">
                        <p className="timeline-status">{getStatusLabel(history.status)}</p>
                        <p className="timeline-date">{formatDate(history.timestamp)}</p>
                        <p className="timeline-note">{history.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {getNextStatus(selectedOrder.status) && (
                <button 
                  className="btn-update-modal"
                  onClick={() => {
                    handleUpdateStatus(selectedOrder.id, selectedOrder.status);
                    setSelectedOrder(null);
                  }}
                >
                  Move to {getStatusLabel(getNextStatus(selectedOrder.status))}
                </button>
              )}
              <button className="btn-close" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;