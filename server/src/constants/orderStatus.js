export const ORDER_STATUS = Object.freeze({
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

// Allowed forward transitions for a vendor
export const ORDER_TRANSITIONS = Object.freeze({
  AWAITING_PAYMENT: [], // moves to PENDING only via a verified Razorpay payment
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'DELIVERED'], // DELIVERED directly = picked up (PICKUP orders only, checked in orders.service)
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
});