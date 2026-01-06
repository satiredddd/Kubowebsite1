import '../Dashboard/Dashboard.css';
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Search, Package, MapPin, CreditCard, X, ShoppingBag, Image, Loader } from 'lucide-react';
import { chatService } from '../../services/chatService';
import './Chat.css'; 

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'demir77ar';
const CLOUDINARY_UPLOAD_PRESET = 'kubo_products_preset';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = chatService.subscribeToConversations((convos) => {
      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const unsubscribe = chatService.subscribeToMessages(
        selectedUser.userId,
        (msgs) => {
          setMessages(msgs);
          scrollToBottom();
        }
      );

      // Mark as read
      chatService.markAsRead(selectedUser.userId);

      return () => unsubscribe();
    }
  }, [selectedUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const messageText = newMessage;
    setNewMessage('');

    const result = await chatService.sendAdminMessage(
      selectedUser.userId,
      messageText
    );

    if (!result.success) {
      alert('Failed to send message');
      setNewMessage(messageText);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle image upload to Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'kubo-chat');

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = data.secure_url;

      // Send image message
      const result = await chatService.sendAdminImageMessage(
        selectedUser.userId,
        imageUrl
      );

      if (!result.success) {
        throw new Error('Failed to send image message');
      }

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleViewOrder = (orderData) => {
    setSelectedOrder(orderData);
    setShowOrderModal(true);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // NEW: Render order message as a card
  const renderOrderMessage = (msg) => {
    if (!msg.orderRelated || !msg.orderData) {
      return null;
    }

    const { items, totalAmount, deliveryAddress, orderId } = msg.orderData;

    return (
      <div className="order-message-card">
        <div className="order-card-header">
          <ShoppingBag size={20} color="#10b981" />
          <span className="order-card-title">New Order Placed</span>
        </div>
        
        <div className="order-card-body">
          <div className="order-summary">
            <Package size={16} />
            <span>{items?.length || 0} item(s)</span>
          </div>
          
          <div className="order-total">
            <span className="order-total-label">Total:</span>
            <span className="order-total-amount">₱{totalAmount?.toLocaleString() || '0'}</span>
          </div>

          <button 
            className="view-order-btn"
            onClick={() => handleViewOrder(msg.orderData)}
          >
            View Details
          </button>
        </div>

        <div className="order-card-footer">
          <div className="order-time">
            {new Date(msg.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          {orderId && (
            <div className="order-id">Order #{orderId.slice(-6)}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="chat-container">
        {/* Conversations List */}
        <div className="conversations-list">
          <div className="search-box">
            <Search size={18} color="#666" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="conversations-scroll">
            {loading ? (
              <div className="loading">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-conversations">No conversations yet</div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedUser?.userId === conv.userId ? 'active' : ''} ${conv.hasNewOrder ? 'has-new-order' : ''}`}
                  onClick={() => setSelectedUser(conv)}
                >
                  <div className="avatar">
                    <User size={24} color="#666" />
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="user-name">{conv.userName || 'Unknown User'}</span>
                      <span className="timestamp">{formatTime(conv.timestamp)}</span>
                    </div>
                    <div className="last-message-row">
                      <span className="last-message">{conv.lastMessage || 'No messages'}</span>
                      <div className="badges-row">
                        {conv.hasNewOrder && (
                          <span className="new-order-badge">
                            <ShoppingBag size={12} />
                            New Order
                          </span>
                        )}
                        {conv.unreadByAdmin > 0 && (
                          <span className="unread-badge">{conv.unreadByAdmin}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="avatar">
                  <User size={24} color="#666" />
                </div>
                <div>
                  <div className="chat-header-name">{selectedUser.userName || 'Unknown User'}</div>
                  <div className="chat-header-status">Customer</div>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-messages">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-wrapper ${msg.isAdmin ? 'admin' : 'user'}`}
                    >
                      {msg.orderRelated ? (
                        renderOrderMessage(msg)
                      ) : (
                        <div className={`message-content ${msg.isAdmin ? 'admin' : 'user'}`}>
                          {/* Image if present */}
                          {msg.imageUrl && (
                            <div 
                              className="message-image-container"
                              onClick={() => setPreviewImage(msg.imageUrl)}
                            >
                              <img 
                                src={msg.imageUrl} 
                                alt="Shared" 
                                className="message-image"
                              />
                            </div>
                          )}
                          {/* Text bubble if present */}
                          {msg.text && (
                            <div className={`message-bubble ${msg.isAdmin ? 'admin' : 'user'}`}>
                              <div className="message-text">{msg.text}</div>
                              <div className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          )}
                          {/* Time for image-only messages */}
                          {msg.imageUrl && !msg.text && (
                            <div className="image-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                {/* Image upload button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="image-upload-button"
                  disabled={uploadingImage}
                  title="Send Image"
                >
                  {uploadingImage ? (
                    <Loader size={20} className="spinning" />
                  ) : (
                    <Image size={20} />
                  )}
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="message-input"
                  disabled={uploadingImage}
                />
                <button 
                  onClick={handleSendMessage}
                  className="send-button"
                  disabled={!newMessage.trim() || uploadingImage}
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <User size={64} color="#ccc" />
              <h3>Select a conversation</h3>
              <p>Choose a customer to view their messages</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <h2>Order Details</h2>
              <button 
                className="order-modal-close"
                onClick={() => setShowOrderModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="order-modal-body">
              {/* Order ID */}
              {selectedOrder.orderId && (
                <div className="order-info-section">
                  <div className="order-info-label">Order ID</div>
                  <div className="order-info-value">#{selectedOrder.orderId}</div>
                </div>
              )}

              {/* Items */}
              <div className="order-info-section">
                <div className="order-info-label">
                  <Package size={18} />
                  Items Ordered
                </div>
                <div className="order-items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="order-item">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="order-item-image"
                        />
                      ) : (
                        <div className="order-item-image-placeholder">
                          {item.image || '📦'}
                        </div>
                      )}
                      <div className="order-item-details">
                        <div className="order-item-name">{item.name}</div>
                        <div className="order-item-quantity">Quantity: {item.quantity}</div>
                        <div className="order-item-price">₱{item.price.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="order-info-section">
                <div className="order-info-label">
                  <MapPin size={18} />
                  Delivery Address
                </div>
                <div className="order-info-value">{selectedOrder.deliveryAddress}</div>
              </div>

              {/* Payment Method */}
              {selectedOrder.paymentMethod && (
                <div className="order-info-section">
                  <div className="order-info-label">
                    <CreditCard size={18} />
                    Payment Method
                  </div>
                  <div className="order-info-value">
                    {selectedOrder.paymentMethod === 'card_2222' && '💳 **** 2222'}
                    {selectedOrder.paymentMethod === 'card_1111' && '💳 **** 1111'}
                    {selectedOrder.paymentMethod === 'email' && '📧 Email Payment'}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="order-total-section">
                <span className="order-total-label">Total Amount</span>
                <span className="order-total-amount">₱{selectedOrder.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            <div className="order-modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowOrderModal(false)}
              >
                Close
              </button>
              <button className="btn btn-primary">
                Update Order Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <button 
            className="image-preview-close"
            onClick={() => setPreviewImage(null)}
          >
            <X size={30} />
          </button>
          <img 
            src={previewImage} 
            alt="Preview" 
            className="image-preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;