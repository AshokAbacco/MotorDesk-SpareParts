import api from '../../shared/axiosInstance.js';

const TYPE = 'CAR';

// My car-parts inventory
export const getCarInventory = (params) => api.get('/inventory', { params: { ...params, vehicleType: TYPE } });
export const addCarPart = (body) => api.post('/inventory', body);
export const updateCarPart = (id, body) => api.patch(`/inventory/${id}`, body);
export const adjustCarStock = (id, change) => api.patch(`/inventory/${id}/stock`, { change });
export const removeCarPart = (id) => api.delete(`/inventory/${id}`);

// Master catalog (car parts only)
export const getCarCatalog = (params) => api.get('/products', { params: { ...params, vehicleType: TYPE } });
export const getCarCategories = () => api.get('/products/categories');
export const getCarBrands = () => api.get('/vehicles/brands', { params: { type: TYPE } });
export const getCarModels = (brand) => api.get('/vehicles/models', { params: { type: TYPE, brand } });
