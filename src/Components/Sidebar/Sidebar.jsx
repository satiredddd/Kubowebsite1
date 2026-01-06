import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, MessageSquare, Package, ShoppingCart, LogOut, User, Users, Scan } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './Sidebar.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
      setLoading(false);
    };

    fetchUserRole();
  }, []);

  // Menu items with role restrictions
  const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'staff'] },
    { name: 'Products', icon: Package, path: '/products', roles: ['admin', 'staff'] },
    { name: 'AR Models', icon: Scan, path: '/ar-models', roles: ['admin'] }, // Admin only
    { name: 'Customer Transaction', icon: ShoppingCart, path: '/orders', roles: ['admin', 'staff'] },
    { name: 'User List', icon: Users, path: '/users', roles: ['admin'] }, // Admin only
    { name: 'Chat', icon: MessageSquare, path: '/chat', roles: ['admin', 'staff'] },
    { name: 'Account Information', icon: User, path: '/accountinfo', roles: ['admin', 'staff'] },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  if (loading) {
    return (
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header with Logo and Toggle */}
      <div className="sidebar-header">
        {isOpen && (
          <div className="logo-container">
            <div className="logo-icon">
              <span>K</span>
            </div>
            <div className="logo-info">
              <span className="logo-text">Kubo PH</span>
              {userRole && (
                <span className="role-badge">{userRole.toUpperCase()}</span>
              )}
            </div>
          </div>
        )}
        {!isOpen && (
          <div className="logo-icon-only">
            <span>K</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="toggle-btn"
          type="button"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  type="button"
                  title={!isOpen ? item.name : ''}
                >
                  <Icon size={20} />
                  {isOpen && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer with Logout */}
      <div className="sidebar-footer">
        <button 
          onClick={handleLogout} 
          className="logout-btn"
          type="button"
          title={!isOpen ? 'Logout' : ''}
        >
          <LogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;