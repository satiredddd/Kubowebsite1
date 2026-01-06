import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { 
  Users, 
  ShoppingCart, 
  UserPlus, 
  RefreshCw, 
  TrendingUp, 
  Package, 
  DollarSign,
  Activity,
  LogOut
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    newUsers: 0,
    returningUsers: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user's role
  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            setUserName(userData.displayName || userData.email || 'User');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    };

    fetchUserRole();
  }, []);

  useEffect(() => {
    // Real-time listener for users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalUsers = users.length;
      
      // Calculate new users (registered in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsers = users.filter(user => {
        if (!user.createdAt) return false;
        const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        return createdAt >= thirtyDaysAgo;
      }).length;
      
      setStats(prev => ({ ...prev, totalUsers, newUsers }));
    });

    // Real-time listener for orders
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalOrders = orders.length;
      
      // Calculate total revenue using totalAmount field
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      // Calculate pending/confirmation orders
      const pendingOrders = orders.filter(order => 
        order.status === 'confirmation' || order.status === 'pending'
      ).length;
      
      // Calculate returning users (users with multiple orders)
      const userOrderCounts = {};
      orders.forEach(order => {
        const userId = order.userId;
        if (userId) {
          userOrderCounts[userId] = (userOrderCounts[userId] || 0) + 1;
        }
      });
      const returningUsers = Object.values(userOrderCounts).filter(count => count > 1).length;
      
      // Get recent orders and sort by orderDate
      const sortedOrders = orders.sort((a, b) => {
        const dateA = a.orderDate?.toDate ? a.orderDate.toDate() : new Date(a.orderDate);
        const dateB = b.orderDate?.toDate ? b.orderDate.toDate() : new Date(b.orderDate);
        return dateB - dateA;
      });
      setRecentOrders(sortedOrders.slice(0, 5));
      
      setStats(prev => ({ 
        ...prev, 
        totalOrders, 
        totalRevenue, 
        pendingOrders,
        returningUsers 
      }));
    });

    // Real-time listener for products
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalProducts = products.length;
      const lowStockProducts = products.filter(p => p.stock < 5).length;
      
      setStats(prev => ({ ...prev, totalProducts, lowStockProducts }));
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'confirmation': 'Pending',
      'shipping': 'Shipping',
      'receiving': 'Out for Delivery',
      'completed': 'Completed',
      'reviews': 'Reviewed',
      'cancelled': 'Cancelled'
    };
    return statusLabels[status] || status;
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      'confirmation': 'pending',
      'shipping': 'processing',
      'receiving': 'processing',
      'completed': 'completed',
      'reviews': 'completed',
      'cancelled': 'cancelled'
    };
    return statusClasses[status] || 'pending';
  };

  // Get dashboard title based on role
  const getDashboardTitle = () => {
    if (userRole === 'admin') {
      return 'Admin Dashboard';
    } else if (userRole === 'staff') {
      return 'Staff Dashboard';
    }
    return 'Dashboard';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <Users size={24} />,
      color: '#2563eb',
      bgColor: '#eff6ff',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: <ShoppingCart size={24} />,
      color: '#10b981',
      bgColor: '#f0fdf4',
    },
    {
      title: 'New Users',
      value: stats.newUsers,
      subtitle: 'Last 30 days',
      icon: <UserPlus size={24} />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      title: 'Returning Users',
      value: stats.returningUsers,
      icon: <RefreshCw size={24} />,
      color: '#8b5cf6',
      bgColor: '#faf5ff',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: <DollarSign size={24} />,
      color: '#06b6d4',
      bgColor: '#ecfeff',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: <Package size={24} />,
      color: '#ec4899',
      bgColor: '#fdf2f8',
    },
    {
      title: 'Low Stock Alert',
      value: stats.lowStockProducts,
      subtitle: 'Below 5 units',
      icon: <Activity size={24} />,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: <TrendingUp size={24} />,
      color: '#14b8a6',
      bgColor: '#f0fdfa',
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{getDashboardTitle()}</h1>
          <p className="dashboard-subtitle">
            Welcome back, {userName}
            {userRole && (
              <span className="role-badge-inline" style={{
                background: userRole === 'admin' ? '#ef4444' : '#3b82f6',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                marginLeft: '8px',
                textTransform: 'uppercase'
              }}>
                {userRole}
              </span>
            )}
          </p>
        </div>
      </div>
      
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.title}</p>
              <h3 className="stat-value">{stat.value}</h3>
              {stat.subtitle && <p className="stat-subtitle">{stat.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="section recent-orders">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <button className="view-all-btn" onClick={() => navigate('/orders')}>
              View All
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={48} color="#ccc" />
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id}>
                      <td>#{order.id.substring(0, 8)}</td>
                      <td>{order.userEmail || 'Guest'}</td>
                      <td>{formatDate(order.orderDate)}</td>
                      <td>{order.items?.length || 0} items</td>
                      <td className="order-total">{formatCurrency(order.totalAmount || 0)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section quick-stats">
          <div className="section-header">
            <h2>Quick Stats</h2>
          </div>
          <div className="quick-stats-list">
            <div className="quick-stat-item">
              <div className="quick-stat-label">Average Order Value</div>
              <div className="quick-stat-value">
                {formatCurrency(stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0)}
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-label">User Retention Rate</div>
              <div className="quick-stat-value">
                {stats.totalUsers > 0 ? ((stats.returningUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-label">Products in Stock</div>
              <div className="quick-stat-value">
                {stats.totalProducts - stats.lowStockProducts}
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-label">Completion Rate</div>
              <div className="quick-stat-value">
                {stats.totalOrders > 0 ? (((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;