import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  setDoc,
  doc,
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';  

// Helper function to convert timestamp to milliseconds
const getTimestampMillis = (timestamp) => {
  if (!timestamp) return Date.now();
  
  // If it's a Firestore Timestamp object
  if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  // If it's an ISO string
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }
  
  // If it's already a number (milliseconds)
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // Fallback
  return Date.now();
};

export const chatService = {
  subscribeToConversations(callback) {
    const q = query(
      collection(db, 'conversations'),
      orderBy('timestamp', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: getTimestampMillis(doc.data().timestamp)
      }));
      callback(conversations);
    });
  },

  subscribeToMessages(userId, callback) {
    const q = query(
      collection(db, 'conversations', userId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: getTimestampMillis(doc.data().timestamp)
      }));
      callback(messages);
    });
  },

  // Sends message from admin
  async sendAdminMessage(userId, messageText) {
    try {
      // Add message to the messages subcollection
      await addDoc(
        collection(db, 'conversations', userId, 'messages'),
        {
          senderId: 'admin',
          text: messageText,
          timestamp: serverTimestamp(),
          isAdmin: true,
          read: false
        }
      );

      // Update conversation document using setDoc with merge (like Flutter does)
      await setDoc(doc(db, 'conversations', userId), {
        lastMessage: messageText,
        timestamp: serverTimestamp(),
        unreadByAdmin: 0,
        unreadByUser: increment(1)
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  },

  // Mark conversation as read
  async markAsRead(userId) {
    try {
      await updateDoc(doc(db, 'conversations', userId), {
        unreadByAdmin: 0
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  // Clear new order flag after sending payment instructions
  async clearNewOrderFlag(userId) {
    try {
      await updateDoc(doc(db, 'conversations', userId), {
        hasNewOrder: false,
        pendingOrderId: null
      });
    } catch (error) {
      console.error('Error clearing new order flag:', error);
    }
  },

  // Mark order message as processed (instructions sent)
  async markOrderAsProcessed(userId, messageId) {
    try {
      await updateDoc(doc(db, 'conversations', userId, 'messages', messageId), {
        instructionsSent: true
      });
    } catch (error) {
      console.error('Error marking order as processed:', error);
    }
  },

  // Send image message from admin
  async sendAdminImageMessage(userId, imageUrl) {
    try {
      // Add image message to the messages subcollection
      await addDoc(
        collection(db, 'conversations', userId, 'messages'),
        {
          senderId: 'admin',
          text: '',
          imageUrl: imageUrl,
          timestamp: serverTimestamp(),
          isAdmin: true,
          read: false,
          type: 'image'
        }
      );

      // Update conversation document
      await setDoc(doc(db, 'conversations', userId), {
        lastMessage: '📷 Image',
        timestamp: serverTimestamp(),
        unreadByAdmin: 0,
        unreadByUser: increment(1)
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error sending image message:', error);
      return { success: false, error };
    }
  }
};