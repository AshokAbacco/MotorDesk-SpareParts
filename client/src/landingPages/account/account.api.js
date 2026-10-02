// client/src/landingPages/account/account.api.js
import api from '../../shared/axiosInstance.js';

// Profile
export const getMyProfile = () => api.get('/users/me');
export const updateMyProfile = (body) => api.patch('/users/me', body);
export const changeMyPassword = (body) => api.patch('/users/me/password', body);

// Address book
export const getAddresses = () => api.get('/users/me/addresses');
export const addAddress = (body) => api.post('/users/me/addresses', body);
export const updateAddress = (id, body) => api.put(`/users/me/addresses/${id}`, body);
export const deleteAddress = (id) => api.delete(`/users/me/addresses/${id}`);
export const setDefaultAddress = (id) => api.patch(`/users/me/addresses/${id}/default`);