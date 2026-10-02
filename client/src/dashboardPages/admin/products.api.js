// client/src/dashboardPages/admin/products.api.js
import api from '../../shared/axiosInstance.js';

// Master catalog
export const getProducts = (params) => api.get('/products', { params: { includeInactive: true, ...params } });
export const createProduct = (body) => api.post('/products', body);
export const updateProduct = (id, body) => api.patch(`/products/${id}`, body);
export const deactivateProduct = (id) => api.delete(`/products/${id}`);
export const getCategories = () => api.get('/products/categories');

// Vehicle master (for fitment mapping)
export const getVehicles = (params) => api.get('/vehicles', { params });
export const getVehicleBrands = (type) => api.get('/vehicles/brands', { params: { type } });
export const getVehicleModels = (type, brand) => api.get('/vehicles/models', { params: { type, brand } });
export const addVehicleRange = (body) => api.post('/vehicles/bulk', body);

// Images → Cloudflare R2
// "Add from URL": the server downloads the link and keeps its own copy in R2
export const uploadImageFromUrl = (url) => api.post('/uploads/images/from-url', { url });
export const uploadProductImages = (files) => {
  const form = new FormData();
  [...files].forEach((f) => form.append('images', f));
  return api.post('/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};