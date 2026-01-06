import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { getDoc } from 'firebase/firestore';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Fetch current user's role
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('Error fetching current user role:', error);
        }
      }
    };

    fetchCurrentUserRole();
  }, []);

  useEffect(() => {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    const today = new Date();
    const birthDate = birthdate.toDate ? birthdate.toDate() : new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    if (currentUserRole !== 'admin') {
      alert('Only admins can change user roles');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (currentUserRole !== 'admin') {
      alert('Only admins can delete users');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.phoneNumber?.includes(searchTerm));
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return '#ef4444';
      case 'staff':
        return '#3b82f6';
      case 'customer':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getRoleLabel = (role) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Customer';
  };

  // Get active admins and staff (online in last 30 minutes)
  const getActiveAdminsAndStaff = () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    return users.filter(user => {
      const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';
      const lastActive = user.lastActive?.toDate ? user.lastActive.toDate() : null;
      const isRecent = lastActive && lastActive > thirtyMinutesAgo;
      
      return isAdminOrStaff && isRecent;
    });
  };

  const activeAdminsAndStaff = getActiveAdminsAndStaff();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  // Check if user is not admin
  if (currentUserRole !== 'admin') {
    return (
      <div className="page-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="users-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Track and manage all registered users</p>
        </div>
        <div className="users-stats">
          <div className="stat-box">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{users.filter(u => u.role === 'admin').length}</div>
            <div className="stat-label">Admins</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{users.filter(u => u.role === 'staff').length}</div>
            <div className="stat-label">Staff</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{users.filter(u => u.role === 'customer' || !u.role).length}</div>
            <div className="stat-label">Customers</div>
          </div>
        </div>
      </div>

      {/* Active Admins and Staff Section */}
      {activeAdminsAndStaff.length > 0 && (
        <div className="active-users-section">
          <h3 className="active-users-title">
            🟢 Currently Active Admins & Staff ({activeAdminsAndStaff.length})
          </h3>
          <div className="active-users-list">
            {activeAdminsAndStaff.map(user => (
              <div key={user.id} className="active-user-card">
                <div className="active-user-avatar">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.displayName} />
                  ) : (
                    <div className="avatar-placeholder-small">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="online-indicator"></span>
                </div>
                <div className="active-user-info">
                  <div className="active-user-name">{user.displayName || 'No name'}</div>
                  <div className="active-user-role" style={{ color: getRoleBadgeColor(user.role) }}>
                    {getRoleLabel(user.role)}
                  </div>
                  {user.lastActive && (
                    <div className="active-user-time">
                      Active {Math.floor((Date.now() - user.lastActive.toDate()) / 60000)}m ago
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="users-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={filterRole === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('all')}
          >
            All ({users.length})
          </button>
          <button 
            className={filterRole === 'admin' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('admin')}
          >
            Admins ({users.filter(u => u.role === 'admin').length})
          </button>
          <button 
            className={filterRole === 'staff' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('staff')}
          >
            Staff ({users.filter(u => u.role === 'staff').length})
          </button>
          <button 
            className={filterRole === 'customer' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterRole('customer')}
          >
            Customers ({users.filter(u => u.role === 'customer' || !u.role).length})
          </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="no-users">
          <p>No users found</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Age</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.displayName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.displayName || 'No name'}</div>
                        <div className="user-id">ID: {user.id.substring(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="email-cell">{user.email || 'No email'}</div>
                  </td>
                  <td>
                    <div className="phone-cell">{user.phoneNumber || 'Not provided'}</div>
                  </td>
                  <td>
                    <div className="age-cell">
                      {user.birthdate ? `${calculateAge(user.birthdate)} years` : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      value={user.role || 'customer'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      style={{ 
                        backgroundColor: getRoleBadgeColor(user.role || 'customer'),
                        color: 'white'
                      }}
                    >
                      <option value="customer">Customer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <div className="date-cell">{formatDate(user.createdAt)}</div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view-user"
                        onClick={() => setSelectedUser(user)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        className="btn-delete-user"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="user-detail-header">
                <div className="user-detail-avatar">
                  {selectedUser.profilePicture ? (
                    <img src={selectedUser.profilePicture} alt={selectedUser.displayName} />
                  ) : (
                    <div className="avatar-placeholder-large">
                      {(selectedUser.displayName || selectedUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-detail-info">
                  <h3>{selectedUser.displayName || 'No name'}</h3>
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleBadgeColor(selectedUser.role || 'customer') }}
                  >
                    {getRoleLabel(selectedUser.role || 'customer')}
                  </span>
                </div>
              </div>

              <div className="detail-sections">
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item">
                    <span className="detail-label">📧 Email:</span>
                    <span className="detail-value">{selectedUser.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📱 Phone:</span>
                    <span className="detail-value">{selectedUser.phoneNumber || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📍 Address:</span>
                    <span className="detail-value">{selectedUser.address || 'Not provided'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Personal Information</h4>
                  <div className="detail-item">
                    <span className="detail-label">🎂 Age:</span>
                    <span className="detail-value">
                      {selectedUser.birthdate 
                        ? `${calculateAge(selectedUser.birthdate)} years old` 
                        : 'Not provided'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📅 Birthdate:</span>
                    <span className="detail-value">
                      {selectedUser.birthdate ? formatDate(selectedUser.birthdate) : 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Account Information</h4>
                  <div className="detail-item">
                    <span className="detail-label">🆔 User ID:</span>
                    <span className="detail-value">{selectedUser.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📅 Joined:</span>
                    <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">👤 Role:</span>
                    <span className="detail-value">{getRoleLabel(selectedUser.role || 'customer')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-delete"
                onClick={() => {
                  handleDeleteUser(selectedUser.id);
                }}
              >
                Delete User
              </button>
              <button className="btn-close" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;