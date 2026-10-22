// client/src/shared/utils/constants.js
export const APP_NAME = import.meta.env.VITE_APP_NAME || "MotorDesk";

export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
export const ORDER_FLOW = [
  "PENDING",
  "ACCEPTED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];
export const NEXT_STATUS = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "DELIVERED",
};
// Store-pickup orders skip "shipped": packed = ready for pickup, delivered = picked up
export const NEXT_STATUS_PICKUP = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PACKED",
  PACKED: "DELIVERED",
};
export const nextStatusFor = (order) =>
  (order.fulfilment === "PICKUP" ? NEXT_STATUS_PICKUP : NEXT_STATUS)[
    order.status
  ];

/** "Cash on delivery" on a pickup order means paying at the shop */
export const paymentLabel = (order) =>
  order.paymentMode === "COD" && order.fulfilment === "PICKUP"
    ? "Pay at shop"
    : order.paymentMode === "ONLINE"
      ? "Paid online"
      : (PAYMENT_LABELS[order.paymentMode] ?? order.paymentMode);

export const POS_PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
];

export const PAYMENT_LABELS = {
  COD: "Cash on delivery",
  ONLINE: "Paid online",
  UPI: "UPI",
  CASH: "Cash",
  CARD: "Card",
};

export const GST_RATES = [0, 5, 12, 18, 28];

export const EXPENSE_CATEGORIES = [
  "RENT",
  "SALARY",
  "ELECTRICITY",
  "TRANSPORT",
  "PURCHASE",
  "MAINTENANCE",
  "OTHER",
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];
