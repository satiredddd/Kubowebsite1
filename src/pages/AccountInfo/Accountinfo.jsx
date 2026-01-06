import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import './AccountInfo.css';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'demir77ar';
const CLOUDINARY_UPLOAD_PRESET = 'kubo_admin_preset';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const AccountInfo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    address: '',
    profilePicture: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in');
        setLoading(false);
        return;
      }

      // Try to load from business_info first (this is what Flutter reads)
      const businessDoc = await getDoc(doc(db, 'business_info', 'kubo_ph'));
      
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        setFormData({
          displayName: businessData.displayName || '',
          email: businessData.email || '',
          phoneNumber: businessData.phoneNumber || '',
          address: businessData.address || '',
          profilePicture: businessData.profilePicture || '',
        });
      } else {
        // Fallback to user's doc if business_info doesn't exist
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData({
            displayName: userData.displayName || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || '',
            address: userData.address || '',
            profilePicture: userData.profilePicture || '',
          });
        } else {
          // Initialize with auth data
          setFormData({
            displayName: user.displayName || user.email?.split('@')[0] || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
            profilePicture: user.photoURL || '',
          });
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setImageUploading(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formDataUpload.append('folder', 'kubo-admin-profiles');

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const data = await response.json();
      const downloadURL = data.secure_url;

      setFormData(prev => ({
        ...prev,
        profilePicture: downloadURL
      }));

      setSuccess('Image uploaded successfully');
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      const businessData = {
        displayName: formData.displayName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        profilePicture: formData.profilePicture,
        updatedAt: new Date().toISOString(),
      };

      // CRITICAL: Save to business_info collection (this is what Flutter reads!)
      await setDoc(doc(db, 'business_info', 'kubo_ph'), {
        ...businessData,
        createdAt: new Date().toISOString(), // Only set if doesn't exist
      }, { merge: true }); // Use merge to not overwrite createdAt if it exists

      // Also save to user's document for backup
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, businessData);
      } else {
        await setDoc(userDocRef, {
          ...businessData,
          userId: user.uid,
          authEmail: user.email,
          createdAt: new Date().toISOString(),
        });
      }

      setSuccess('Business information updated successfully! Changes will appear in the mobile app.');
      
      // Reload data to confirm
      setTimeout(() => {
        loadUserData();
      }, 1000);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(`Failed to update information: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="account-info-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-info-container">
      <div className="account-info-header">
        <h1>KUBO PH Business Information</h1>
        <p>Manage business information displayed in the mobile app</p>
        <div className="info-notice">
          <span className="info-icon">ℹ️</span>
          <span>This information represents KUBO PH's business details and will be displayed to all customers in the mobile app. Your authentication credentials remain unchanged.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="account-info-form">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Profile Picture Section */}
        <div className="profile-picture-section">
          <div className="profile-picture-wrapper">
            {formData.profilePicture ? (
              <img 
                src={formData.profilePicture} 
                alt="Business Logo" 
                className="profile-picture"
              />
            ) : (
              <div className="profile-picture-placeholder">
                {formData.displayName?.charAt(0)?.toUpperCase() || '🏢'}
              </div>
            )}
            {imageUploading && (
              <div className="upload-overlay">
                <div className="spinner-small"></div>
              </div>
            )}
          </div>
          <div className="profile-picture-actions">
            <label htmlFor="profile-picture-input" className="upload-button">
              {imageUploading ? 'Uploading...' : 'Change Business Logo'}
            </label>
            <input
              id="profile-picture-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={imageUploading}
              style={{ display: 'none' }}
            />
            {formData.profilePicture && (
              <button
                type="button"
                className="remove-button"
                onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="displayName">Business Name *</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              required
              placeholder="e.g., KUBO PH Furniture"
            />
            <small>Business name shown to customers</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Business Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="e.g., contact@kubo.ph"
            />
            <small>Customer support email address</small>
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Business Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="+63 XXX XXX XXXX"
            />
            <small>Customer service contact number</small>
          </div>

          <div className="form-group full-width">
            <label htmlFor="address">Business Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows="3"
              placeholder="Enter your business address"
            />
            <small>Physical store or office location</small>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={loadUserData}
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={saving || imageUploading}
          >
            {saving ? 'Saving...' : 'Save Business Information'}
          </button>
        </div>
      </form>

      {/* Preview Section */}
      <div className="preview-section">
        <h3>Mobile App Preview</h3>
        <p className="preview-subtitle">This is how your information will appear in the app</p>
        <div className="preview-card">
          <div className="preview-header">
            <div className="preview-avatar">
              {formData.profilePicture ? (
                <img src={formData.profilePicture} alt="Logo" />
              ) : (
                <div className="preview-avatar-placeholder">
                  {formData.displayName?.charAt(0)?.toUpperCase() || 'K'}
                </div>
              )}
            </div>
            <div className="preview-info">
              <div className="preview-label">KUBO PH</div>
              <div className="preview-name">{formData.displayName || 'Business Name'}</div>
            </div>
          </div>
          <div className="preview-divider"></div>
          <div className="preview-details">
            <div className="preview-detail-item">
              <span className="preview-icon">📧</span>
              <div>
                <div className="preview-detail-label">Email</div>
                <div className="preview-detail-value">{formData.email || 'Not provided'}</div>
              </div>
            </div>
            <div className="preview-detail-item">
              <span className="preview-icon">📱</span>
              <div>
                <div className="preview-detail-label">Phone</div>
                <div className="preview-detail-value">{formData.phoneNumber || 'Not provided'}</div>
              </div>
            </div>
            <div className="preview-detail-item">
              <span className="preview-icon">📍</span>
              <div>
                <div className="preview-detail-label">Address</div>
                <div className="preview-detail-value">{formData.address || 'Not provided'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Auth Info (Read-only) */}
      <div className="auth-info-section">
        <h3>Current Authentication Info</h3>
        <div className="auth-info-content">
          <div className="auth-info-item">
            <span className="auth-label">Admin Login Email:</span>
            <span className="auth-value">{auth.currentUser?.email || 'N/A'}</span>
          </div>
          <div className="auth-info-item">
            <span className="auth-label">User ID:</span>
            <span className="auth-value">{auth.currentUser?.uid || 'N/A'}</span>
          </div>
          <p className="auth-note">
            <strong>Note:</strong> These are your admin login credentials and cannot be changed here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountInfo;