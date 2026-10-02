// server/src/constants/paymentModes.js
export const PAYMENT_MODES = Object.freeze({
  UPI: 'UPI',
  CASH: 'CASH',
  CARD: 'CARD',
  COD: 'COD',       // marketplace cash on delivery
  ONLINE: 'ONLINE', // marketplace Razorpay (UPI / card / netbanking)
});

export const POS_PAYMENT_MODES = ['UPI', 'CASH', 'CARD'];