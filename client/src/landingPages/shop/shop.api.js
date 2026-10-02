// client/src/landingPages/shop/shop.api.js
import api from '../../shared/axiosInstance.js';

// Public storefront
export const getShopProducts = (params) => api.get('/marketplace/products', { params });
export const getShopProduct = (id) => api.get(`/marketplace/products/${id}`);
// { related: [...], more: [...] } — rows under the product page
export const getRelatedProducts = (id) => api.get(`/marketplace/products/${id}/related`);
export const getCategories = () => api.get('/products/categories');

// Vehicle selector (type → brand → model → year)
export const getVehicleBrands = (type) => api.get('/vehicles/brands', { params: { type } });
export const getVehicleModels = (type, brand) => api.get('/vehicles/models', { params: { type, brand } });
export const getVehicleYears = (type, brand, model) => api.get('/vehicles/years', { params: { type, brand, model } });