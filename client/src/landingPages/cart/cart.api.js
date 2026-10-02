import api from '../../shared/axiosInstance.js';

/** Re-checks price & stock of cart lines against the server */
export const validateCart = (items) =>
  api.post('/marketplace/cart/validate', { items: items.map(({ inventoryId, quantity }) => ({ inventoryId, quantity })) });
