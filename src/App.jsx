import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Components
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Orders from './pages/Orders/Orders';
import Users from './pages/Users/users';
import Chat from './pages/Chat/Chat';
import AccountInfo from './pages/AccountInfo/Accountinfo';
import ARManagement from './pages/ARManagement/ARManagement';
import Sidebar from './Components/Sidebar/Sidebar';

// Hook to check authentication state
const useAuthState = (auth) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  return [user, loading];
};

// Hook to get user role
const useUserRole = (user) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return [role, loading];
};

// Activity Tracker Component
const ActivityTracker = () => {
  useEffect(() => {
    const updateActivity = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            lastActive: new Date(),
            isOnline: true
          });
        } catch (error) {
          console.error('Error updating activity:', error);
        }
      }
    };

    // Update immediately
    updateActivity();

    // Update every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [user, userLoading] = useAuthState(auth);
  const [role, roleLoading] = useUserRole(user);

  if (userLoading || roleLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user has required role
  if (requireAdmin && role !== 'admin') {
    return (
      <DashboardLayout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px'
          }}>🚫</div>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#666', fontSize: '16px' }}>
            This page is only accessible to administrators.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      {children}
      <ActivityTracker />
    </>
  );
};

// Layout with Sidebar
const DashboardLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ 
        flex: 1, 
        marginLeft: '280px', 
        padding: '24px',
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes - Accessible to both Admin and Staff */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Products />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Orders />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Chat />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/accountinfo" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AccountInfo />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Admin-Only Routes */}
        <Route 
          path="/ar-models" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <ARManagement />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <Users />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;