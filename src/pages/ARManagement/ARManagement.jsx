import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Eye, Upload, X } from 'lucide-react';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './ARManagement.css';

const ARManagement = () => {
  const [arModels, setArModels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    modelUrl: '',
    thumbnailUrl: '',
    scale: '1',
    rotation: '0,0,0',
    position: '0,0,0',
    metadata: {
      dimensions: '',
      material: '',
      colors: '',
    },
  });

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

  // Fetch AR models from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'arModels'), (snapshot) => {
      const models = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArModels(models);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (file, type) => {
    if (!file) return null;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${type}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, `ar-models/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleModelFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await handleFileUpload(file, 'models');
      if (url) {
        setFormData({ ...formData, modelUrl: url });
      }
    }
  };

  const handleThumbnailChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await handleFileUpload(file, 'thumbnails');
      if (url) {
        setFormData({ ...formData, thumbnailUrl: url });
      }
    }
  };

  const handleSubmit = async () => {
    if (currentUserRole !== 'admin') {
      alert('Only admins can manage AR models');
      return;
    }

    if (!formData.name || !formData.modelUrl) {
      alert('Please fill in the name and upload a 3D model');
      return;
    }

    const arModelData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      modelUrl: formData.modelUrl,
      thumbnailUrl: formData.thumbnailUrl,
      scale: parseFloat(formData.scale),
      rotation: formData.rotation,
      position: formData.position,
      metadata: {
        dimensions: formData.metadata.dimensions,
        material: formData.metadata.material,
        colors: formData.metadata.colors.split(',').map(c => c.trim()).filter(c => c),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingModel) {
        await updateDoc(doc(db, 'arModels', editingModel.id), {
          ...arModelData,
          updatedAt: new Date().toISOString(),
        });
        alert('AR Model updated successfully!');
      } else {
        await addDoc(collection(db, 'arModels'), arModelData);
        alert('AR Model added successfully!');
      }

      setShowModal(false);
      setEditingModel(null);
      resetForm();
    } catch (error) {
      console.error('Error saving AR model:', error);
      alert('Failed to save AR model. Please try again.');
    }
  };

  const handleEdit = (model) => {
    if (currentUserRole !== 'admin') {
      alert('Only admins can edit AR models');
      return;
    }

    setEditingModel(model);
    setFormData({
      name: model.name,
      description: model.description || '',
      category: model.category || '',
      modelUrl: model.modelUrl,
      thumbnailUrl: model.thumbnailUrl || '',
      scale: model.scale?.toString() || '1',
      rotation: model.rotation || '0,0,0',
      position: model.position || '0,0,0',
      metadata: {
        dimensions: model.metadata?.dimensions || '',
        material: model.metadata?.material || '',
        colors: model.metadata?.colors?.join(', ') || '',
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (currentUserRole !== 'admin') {
      alert('Only admins can delete AR models');
      return;
    }

    if (window.confirm('Are you sure you want to delete this AR model?')) {
      try {
        await deleteDoc(doc(db, 'arModels', id));
        alert('AR Model deleted successfully!');
      } catch (error) {
        console.error('Error deleting AR model:', error);
        alert('Failed to delete AR model.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      modelUrl: '',
      thumbnailUrl: '',
      scale: '1',
      rotation: '0,0,0',
      position: '0,0,0',
      metadata: {
        dimensions: '',
        material: '',
        colors: '',
      },
    });
  };

  const filteredModels = arModels.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user is not admin
  if (currentUserRole !== 'admin') {
    return (
      <div className="ar-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page. Only admins can manage AR models.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-container">
      <div className="ar-content">
        <div className="ar-header">
          <div>
            <h1 className="ar-title">AR Model Management</h1>
            <p className="ar-subtitle">Upload and manage 3D models for the mobile AR experience</p>
          </div>
          <button
            onClick={() => {
              setEditingModel(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={20} /> Upload AR Model
          </button>
        </div>

        <div className="ar-stats">
          <div className="stat-card-ar">
            <Package size={24} color="#2563eb" />
            <div>
              <p className="stat-label-ar">Total Models</p>
              <h3 className="stat-value-ar">{arModels.length}</h3>
            </div>
          </div>
          <div className="stat-card-ar">
            <Eye size={24} color="#10b981" />
            <div>
              <p className="stat-label-ar">Active Models</p>
              <h3 className="stat-value-ar">{arModels.filter(m => m.modelUrl).length}</h3>
            </div>
          </div>
        </div>

        <div className="ar-table-card">
          <input
            type="text"
            placeholder="Search AR models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          {loading ? (
            <div className="loading-state">Loading models...</div>
          ) : filteredModels.length === 0 ? (
            <div className="empty-state">
              <Package size={48} color="#ccc" />
              <p>No AR models yet. Upload your first 3D model!</p>
            </div>
          ) : (
            <div className="ar-grid">
              {filteredModels.map(model => (
                <div key={model.id} className="ar-card">
                  <div className="ar-card-image">
                    {model.thumbnailUrl ? (
                      <img src={model.thumbnailUrl} alt={model.name} />
                    ) : (
                      <div className="ar-placeholder">
                        <Package size={48} color="#ccc" />
                      </div>
                    )}
                  </div>
                  <div className="ar-card-content">
                    <h3 className="ar-card-title">{model.name}</h3>
                    {model.category && (
                      <span className="ar-category">{model.category}</span>
                    )}
                    {model.description && (
                      <p className="ar-card-description">{model.description}</p>
                    )}
                    <div className="ar-card-meta">
                      <span>Scale: {model.scale || 1}</span>
                      {model.metadata?.material && (
                        <span>Material: {model.metadata.material}</span>
                      )}
                    </div>
                  </div>
                  <div className="ar-card-actions">
                    <button onClick={() => handleEdit(model)} className="action-btn edit-btn">
                      <Edit2 size={16} /> Edit
                    </button>
                    <button onClick={() => handleDelete(model.id)} className="action-btn delete-btn">
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal ar-modal">
            <div className="modal-header">
              <h2>{editingModel ? 'Edit AR Model' : 'Upload AR Model'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Model Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Modern Chair"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-textarea"
                    rows="3"
                    placeholder="Brief description of the 3D model"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select Category</option>
                    <option value="Chair">Chair</option>
                    <option value="Table">Table</option>
                    <option value="Sofa">Sofa</option>
                    <option value="Cabinet">Cabinet</option>
                    <option value="Bed">Bed</option>
                    <option value="Decor">Decor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Scale</label>
                  <input
                    type="number"
                    value={formData.scale}
                    onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                    className="form-input"
                    step="0.1"
                    placeholder="1.0"
                  />
                </div>

                <div className="form-group full-width">
                  <label>3D Model File (GLB/GLTF) *</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handleModelFileChange}
                      className="file-input"
                      id="modelFile"
                    />
                    <label htmlFor="modelFile" className="file-label">
                      <Upload size={20} />
                      {uploading ? 'Uploading...' : formData.modelUrl ? 'Change Model' : 'Upload Model'}
                    </label>
                    {formData.modelUrl && (
                      <span className="file-success">✓ Model uploaded</span>
                    )}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Thumbnail Image</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="file-input"
                      id="thumbnailFile"
                    />
                    <label htmlFor="thumbnailFile" className="file-label">
                      <Upload size={20} />
                      {uploading ? 'Uploading...' : formData.thumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail'}
                    </label>
                    {formData.thumbnailUrl && (
                      <span className="file-success">✓ Thumbnail uploaded</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Rotation (X,Y,Z)</label>
                  <input
                    type="text"
                    value={formData.rotation}
                    onChange={(e) => setFormData({ ...formData, rotation: e.target.value })}
                    className="form-input"
                    placeholder="0,0,0"
                  />
                </div>

                <div className="form-group">
                  <label>Position (X,Y,Z)</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="form-input"
                    placeholder="0,0,0"
                  />
                </div>

                <div className="form-group">
                  <label>Dimensions</label>
                  <input
                    type="text"
                    value={formData.metadata.dimensions}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, dimensions: e.target.value }
                    })}
                    className="form-input"
                    placeholder="e.g., 60cm x 45cm x 85cm"
                  />
                </div>

                <div className="form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    value={formData.metadata.material}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, material: e.target.value }
                    })}
                    className="form-input"
                    placeholder="e.g., Wood, Metal"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Available Colors (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.metadata.colors}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, colors: e.target.value }
                    })}
                    className="form-input"
                    placeholder="e.g., White, Black, Brown"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : editingModel ? 'Update Model' : 'Upload Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARManagement;