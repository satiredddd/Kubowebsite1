import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, TrendingUp, AlertCircle, X, Tag, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import './Products.css';
import { db } from '../../firebase'; 
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'demir77ar';
const CLOUDINARY_UPLOAD_PRESET = 'kubo_products_preset';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Validation constants
const MAX_PRICE = 100000;
const MAX_STOCK = 10000;
const ITEMS_PER_PAGE = 5;

const Products = () => {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Chair', icon: '🪑' },
    { id: 2, name: 'Table', icon: '🪵' },
    { id: 3, name: 'Sofa', icon: '🛋️' },
    { id: 4, name: 'Cabinet', icon: '🚪' },
    { id: 5, name: 'Bed', icon: '🛏️' },
  ]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [productForm, setProductForm] = useState({
    name: '',
    company: 'Kubo PH',
    price: '',
    stock: '',
    rating: '4.5',
    material: '',
    dimensionL: '',
    dimensionW: '',
    dimensionH: '',
    warrantyValue: '',
    warrantyUnit: 'years',
    colors: '',
    description: '',
    image: '',
    imageUrl: '',
  });

  // Real-time listener for products from Firebase
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = [];
      snapshot.forEach((doc) => {
        productsData.push({ 
          id: doc.id, 
          ...doc.data() 
        });
      });
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Reset to page 1 when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  const categoryProducts = products.filter(p => p.categoryId === selectedCategory);
  const filteredProducts = categoryProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Input validation helper
  const validateNumberInput = (value, max, fieldName) => {
    const numValue = parseFloat(value);
    
    if (value === '' || value === null) {
      return '';
    }
    
    if (isNaN(numValue)) {
      alert(`Please enter a valid number for ${fieldName}`);
      return productForm[fieldName === 'Price' ? 'price' : 'stock'];
    }
    
    if (numValue < 0) {
      alert(`${fieldName} cannot be negative`);
      return '0';
    }
    
    if (numValue > max) {
      alert(`${fieldName} cannot exceed ${max.toLocaleString()}`);
      return max.toString();
    }
    
    return value;
  };

  // Handle price input with validation
  const handlePriceChange = (e) => {
    const value = e.target.value;
    const validatedValue = validateNumberInput(value, MAX_PRICE, 'Price');
    setProductForm({...productForm, price: validatedValue});
  };

  // Handle stock input with validation
  const handleStockChange = (e) => {
    const value = e.target.value;
    const validatedValue = validateNumberInput(value, MAX_STOCK, 'Stock');
    setProductForm({...productForm, stock: validatedValue});
  };

  // Handle rating input with validation
  const handleRatingChange = (e) => {
    const value = e.target.value;
    const numValue = parseFloat(value);
    
    if (value === '') {
      setProductForm({...productForm, rating: ''});
      return;
    }
    
    if (isNaN(numValue) || numValue < 0) {
      setProductForm({...productForm, rating: '0'});
    } else if (numValue > 5) {
      setProductForm({...productForm, rating: '5.0'});
    } else {
      setProductForm({...productForm, rating: value});
    }
  };

  // Handle warranty value with validation
  const handleWarrantyValueChange = (e) => {
    const value = e.target.value;
    const numValue = parseInt(value);
    
    if (value === '') {
      setProductForm({...productForm, warrantyValue: ''});
      return;
    }
    
    if (isNaN(numValue) || numValue < 0) {
      setProductForm({...productForm, warrantyValue: '0'});
    } else if (numValue > 100) {
      setProductForm({...productForm, warrantyValue: '100'});
      alert('Warranty value cannot exceed 100');
    } else {
      setProductForm({...productForm, warrantyValue: value});
    }
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (file) => {
    if (!file) return null;

    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'kubo-products');

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const data = await response.json();
      
      setUploadingImage(false);
      return { 
        url: data.secure_url,
        path: data.public_id
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImage(false);
      alert('Failed to upload image: ' + error.message);
      throw error;
    }
  };

  const deleteImage = async (imagePath) => {
    console.log('Image path to delete:', imagePath);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const product = products.find(p => p.id === id);
        
        if (product.imagePath) {
          await deleteImage(product.imagePath);
        }

        await deleteDoc(doc(db, 'products', id));
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    
    // Parse dimensions if they exist
    let dimL = '', dimW = '', dimH = '';
    if (product.dimensions) {
      const dimParts = product.dimensions.split('x').map(d => d.trim());
      if (dimParts.length === 3) {
        dimL = dimParts[0].replace(/[^\d.]/g, '');
        dimW = dimParts[1].replace(/[^\d.]/g, '');
        dimH = dimParts[2].replace(/[^\d.]/g, '');
      }
    }

    // Parse warranty if it exists
    let warrantyVal = '', warrantyUnit = 'years';
    if (product.warranty) {
      const warrantyMatch = product.warranty.match(/(\d+)\s*(day|days|week|weeks|month|months|year|years)/i);
      if (warrantyMatch) {
        warrantyVal = warrantyMatch[1];
        const unit = warrantyMatch[2].toLowerCase();
        if (unit.startsWith('day')) warrantyUnit = 'days';
        else if (unit.startsWith('week')) warrantyUnit = 'weeks';
        else if (unit.startsWith('month')) warrantyUnit = 'months';
        else warrantyUnit = 'years';
      }
    }

    setProductForm({
      name: product.name,
      company: product.company || 'Kubo PH',
      price: product.price.toString(),
      stock: product.stock.toString(),
      rating: product.rating.toString(),
      material: product.material || '',
      dimensionL: dimL,
      dimensionW: dimW,
      dimensionH: dimH,
      warrantyValue: warrantyVal,
      warrantyUnit: warrantyUnit,
      colors: product.colors ? product.colors.join(', ') : '',
      description: product.description || '',
      image: product.image || '',
      imageUrl: product.imageUrl || '',
    });
    setImagePreview(product.imageUrl || null);
    setImageFile(null);
    setShowProductModal(true);
  };

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      company: 'Kubo PH',
      price: '',
      stock: '',
      rating: '4.5',
      material: '',
      dimensionL: '',
      dimensionW: '',
      dimensionH: '',
      warrantyValue: '',
      warrantyUnit: 'years',
      colors: '',
      description: '',
      image: '',
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setShowProductModal(true);
  };

  const handlePostProduct = async () => {
    // Validate required fields
    if (!productForm.name || !productForm.company || !productForm.price || !productForm.stock) {
      alert('Please fill in all required fields (Name, Company, Price, Stock)');
      return;
    }

    // Final validation before submission
    const price = parseFloat(productForm.price);
    const stock = parseInt(productForm.stock);
    const rating = parseFloat(productForm.rating);

    if (isNaN(price) || price < 0 || price > MAX_PRICE) {
      alert(`Price must be between 0 and ${MAX_PRICE.toLocaleString()}`);
      return;
    }

    if (isNaN(stock) || stock < 0 || stock > MAX_STOCK) {
      alert(`Stock must be between 0 and ${MAX_STOCK.toLocaleString()}`);
      return;
    }

    if (isNaN(rating) || rating < 0 || rating > 5) {
      alert('Rating must be between 0 and 5.0');
      return;
    }

    try {
      let imageData = {
        url: productForm.imageUrl || '',
        path: editingProduct?.imagePath || '',
      };

      if (imageFile) {
        if (editingProduct?.imagePath) {
          await deleteImage(editingProduct.imagePath);
        }

        imageData = await uploadImage(imageFile);
      }

      // Build dimensions string
      let dimensionsStr = '';
      if (productForm.dimensionL && productForm.dimensionW && productForm.dimensionH) {
        dimensionsStr = `${productForm.dimensionL}cm L x ${productForm.dimensionW}cm W x ${productForm.dimensionH}cm H`;
      }

      // Build warranty string
      let warrantyStr = '';
      if (productForm.warrantyValue) {
        warrantyStr = `${productForm.warrantyValue} ${productForm.warrantyUnit}`;
      }

      const productData = {
        name: productForm.name,
        company: productForm.company,
        price: price,
        stock: stock,
        rating: rating,
        categoryId: selectedCategory,
        material: productForm.material,
        dimensions: dimensionsStr,
        warranty: warrantyStr,
        colors: productForm.colors.split(',').map(c => c.trim()).filter(c => c),
        description: productForm.description,
        image: productForm.image || '📦',
        imageUrl: imageData.url,
        imagePath: imageData.path,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        alert('Product updated successfully!');
      } else {
        await addDoc(collection(db, 'products'), productData);
        alert('Product posted successfully!');
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview(null);
      setProductForm({
        name: '',
        company: 'Kubo PH',
        price: '',
        stock: '',
        rating: '4.5',
        material: '',
        dimensionL: '',
        dimensionW: '',
        dimensionH: '',
        warrantyValue: '',
        warrantyUnit: 'years',
        colors: '',
        description: '',
        image: '',
        imageUrl: '',
      });
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    const newCategory = {
      id: Date.now(),
      name: newCategoryName,
      icon: newCategoryIcon || '📦',
    };

    setCategories([...categories, newCategory]);
    setShowCategoryModal(false);
    setNewCategoryName('');
    setNewCategoryIcon('📦');
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm('Delete this category? All products in this category will remain but need reassignment.')) {
      setCategories(categories.filter(c => c.id !== id));
      if (selectedCategory === id) {
        setSelectedCategory(categories[0]?.id);
      }
    }
  };

  const removeImagePreview = () => {
    setImageFile(null);
    setImagePreview(null);
    setProductForm({...productForm, imageUrl: ''});
  };

  return (
    <div className="products-container">
      <div className="products-content">
        <div className="products-header">
          <h1 className="products-title">Product Management</h1>
          <div className="header-buttons">
            <button onClick={() => setShowCategoryModal(true)} className="btn btn-category">
              <Tag size={20} /> Add Category
            </button>
            <button onClick={handleAddNewProduct} className="btn btn-primary">
              <Plus size={20} /> Add Product
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <Package size={24} color="#2563eb" />
              <span className="stat-label">Total Products</span>
            </div>
            <p className="stat-value">{totalProducts}</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <TrendingUp size={24} color="#10b981" />
              <span className="stat-label">Inventory Value</span>
            </div>
            <p className="stat-value">₱{totalValue.toLocaleString()}</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <AlertCircle size={24} color="#ef4444" />
              <span className="stat-label">Low Stock Items</span>
            </div>
            <p className="stat-value">{lowStockCount}</p>
          </div>
        </div>

        <div className="category-tabs">
          {categories.map(category => (
            <div key={category.id} className="category-tab-wrapper">
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
              >
                <span className="category-icon">{category.icon}</span>
                {category.name}
                <span className={`category-badge ${selectedCategory === category.id ? 'active' : ''}`}>
                  {products.filter(p => p.categoryId === category.id).length}
                </span>
              </button>
              {categories.length > 1 && (
                <button onClick={() => handleDeleteCategory(category.id)} className="delete-category-btn">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="products-table-card">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          {loading ? (
            <div className="empty-state" style={{ padding: '40px' }}>Loading products...</div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Company</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Material</th>
                      <th>Warranty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-state">
                          {filteredProducts.length === 0 
                            ? 'No products in this category. Click "Add Product" to create one.'
                            : 'No products found matching your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map(product => (
                        <tr key={product.id}>
                          <td>
                            <div className="product-cell">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="product-image-thumb"
                                />
                              ) : (
                                <span className="product-image">{product.image || '📦'}</span>
                              )}
                              <div>
                                <div className="product-name">{product.name}</div>
                                <div className="product-rating">⭐ {product.rating}</div>
                              </div>
                            </div>
                          </td>
                          <td className="company-cell">{product.company}</td>
                          <td className="price-cell">₱{product.price.toLocaleString()}</td>
                          <td>
                            <span className={`stock-badge ${product.stock < 5 ? 'low' : 'good'}`}>
                              {product.stock} units
                            </span>
                          </td>
                          <td className="material-cell">{product.material || '-'}</td>
                          <td className="warranty-cell">{product.warranty || '-'}</td>
                          <td>
                            <div className="action-buttons">
                              <button onClick={() => handleEditProduct(product)} className="action-btn edit-btn">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteProduct(product.id)} className="action-btn delete-btn">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredProducts.length > ITEMS_PER_PAGE && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderTop: '1px solid #e5e7eb',
                  fontSize: '13px'
                }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ color: '#6b7280', padding: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal product-modal">
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowProductModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

             <div className="modal-body-scrollable">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Product Image</label>
                  <div className="image-upload-container">
                    {imagePreview ? (
                      <div className="image-preview-wrapper">
                        <img src={imagePreview} alt="Preview" className="image-preview" />
                        <button 
                          type="button"
                          onClick={removeImagePreview}
                          className="remove-image-btn"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="image-upload-label">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="image-input"
                        />
                        <div className="upload-placeholder">
                          <Upload size={32} />
                          <p>Click to upload image</p>
                          <span className="upload-hint">PNG, JPG up to 5MB</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={productForm.company}
                    onChange={(e) => setProductForm({...productForm, company: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Price (₱) * (Max: {MAX_PRICE.toLocaleString()})</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={handlePriceChange}
                    min="0"
                    max={MAX_PRICE}
                    step="0.01"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Stock * (Max: {MAX_STOCK.toLocaleString()})</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={handleStockChange}
                    min="0"
                    max={MAX_STOCK}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    value={productForm.material}
                    onChange={(e) => setProductForm({...productForm, material: e.target.value})}
                    placeholder="e.g., Solid Oak, Steel Frame"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Rating (Max: 5.0)</label>
                  <input
                    type="number"
                    value={productForm.rating}
                    onChange={handleRatingChange}
                    min="0"
                    max="5"
                    step="0.1"
                    className="form-input"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Dimensions (L x W x H)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <input
                      type="number"
                      value={productForm.dimensionL}
                      onChange={(e) => setProductForm({...productForm, dimensionL: e.target.value})}
                      placeholder="Length (cm)"
                      className="form-input"
                      min="0"
                    />
                    <input
                      type="number"
                      value={productForm.dimensionW}
                      onChange={(e) => setProductForm({...productForm, dimensionW: e.target.value})}
                      placeholder="Width (cm)"
                      className="form-input"
                      min="0"
                    />
                    <input
                      type="number"
                      value={productForm.dimensionH}
                      onChange={(e) => setProductForm({...productForm, dimensionH: e.target.value})}
                      placeholder="Height (cm)"
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Warranty (Max: 100)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <input
                      type="number"
                      value={productForm.warrantyValue}
                      onChange={handleWarrantyValueChange}
                      placeholder="Enter number"
                      className="form-input"
                      min="0"
                      max="100"
                    />
                    <select
                      value={productForm.warrantyUnit}
                      onChange={(e) => setProductForm({...productForm, warrantyUnit: e.target.value})}
                      className="form-input"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Color Options (comma-separated)</label>
                  <input
                    type="text"
                    value={productForm.colors}
                    onChange={(e) => setProductForm({...productForm, colors: e.target.value})}
                    placeholder="e.g., White, Black, Gray"
                    className="form-input"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    rows="3"
                    className="form-textarea"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowProductModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handlePostProduct} 
                className="btn btn-primary"
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : (editingProduct ? 'Update Product' : 'Post Product')}
              </button>
            </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Products;