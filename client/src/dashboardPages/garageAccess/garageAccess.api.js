// client/src/dashboardPages/garageAccess/garageAccess.api.js
import api from '../../shared/axiosInstance.js';

/** MotorDesk Garage CRM garages with their show / hide state (admin) */
export const getGarageAccess = (params) => api.get('/admin/garage-access', { params });
/** Show (visible: true) or hide (visible: false) garages for every shop */
export const setGarageAccess = (crmIds, visible) => api.patch('/admin/garage-access', { crmIds, visible });