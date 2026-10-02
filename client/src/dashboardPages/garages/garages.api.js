// client/src/dashboardPages/garages/garages.api.js
import api from '../../shared/axiosInstance.js';

export const getGarages = (params) => api.get('/garages', { params });
export const createGarage = (body) => api.post('/garages', body);
export const updateGarage = (id, body) => api.patch(`/garages/${id}`, body);
export const deleteGarage = (id) => api.delete(`/garages/${id}`);