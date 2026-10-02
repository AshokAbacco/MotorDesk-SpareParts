// client/src/landingPages/checkout/checkout.api.js
import api from '../../shared/axiosInstance.js';

/** Saved addresses (default first). Adding/editing uses the account address-book API. */
export const getSavedAddresses = () => api.get('/users/me/addresses');

/** COD → orders go straight to the shop.  UPI → orders wait for payment to each shop's own UPI ID. */
export const placeOrder = (payload) => api.post('/orders', payload);

/** Live price/stock + whether each item's shop accepts UPI */
export const checkCart = (items) =>
  api.post('/marketplace/cart/validate', { items: items.map(({ inventoryId, quantity }) => ({ inventoryId, quantity })) });