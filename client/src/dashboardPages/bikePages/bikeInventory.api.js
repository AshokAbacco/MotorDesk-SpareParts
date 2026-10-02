import api from '../../shared/axiosInstance.js';

const TYPE = 'BIKE';

// My bike-parts inventory
export const getBikeInventory = (params) => api.get('/inventory', { params: { ...params, vehicleType: TYPE } });
export const addBikePart = (body) => api.post('/inventory', body);
export const updateBikePart = (id, body) => api.patch(`/inventory/${id}`, body);
export const adjustBikeStock = (id, change) => api.patch(`/inventory/${id}/stock`, { change });
export const removeBikePart = (id) => api.delete(`/inventory/${id}`);

// Master catalog (bike parts only)
export const getBikeCatalog = (params) => api.get('/products', { params: { ...params, vehicleType: TYPE } });
export const getBikeCategories = () => api.get('/products/categories');
export const getBikeBrands = () => api.get('/vehicles/brands', { params: { type: TYPE } });
export const getBikeModels = (brand) => api.get('/vehicles/models', { params: { type: TYPE, brand } });
