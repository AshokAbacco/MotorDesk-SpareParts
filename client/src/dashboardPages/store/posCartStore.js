import { create } from 'zustand';

const emptyCustomer = { garageId: '', customerName: '', customerPhone: '', customerGstin: '', customerState: '' };

/** Counter billing cart (not persisted — a bill is finished in one sitting) */
export const usePosCartStore = create((set, get) => ({
  lines: [], // { inventoryId, name, oemNumber, stock, price, mrp, unitPrice, quantity }
  customer: { ...emptyCustomer },
  paymentMode: 'CASH',
  discount: 0,

  addLine: (inv) => {
    const lines = [...get().lines];
    const found = lines.find((l) => l.inventoryId === inv.id);
    if (found) {
      if (found.quantity < inv.stock) found.quantity += 1;
    } else {
      lines.unshift({
        inventoryId: inv.id, name: inv.product.name, oemNumber: inv.product.oemNumber, stock: inv.stock,
        price: Number(inv.price), mrp: Number(inv.mrp), gstRate: Number(inv.product.gstRate), unitPrice: Number(inv.price), quantity: 1,
      });
    }
    set({ lines });
  },
  updateLine: (inventoryId, patch) => set({ lines: get().lines.map((l) => (l.inventoryId === inventoryId ? { ...l, ...patch } : l)) }),
  removeLine: (inventoryId) => set({ lines: get().lines.filter((l) => l.inventoryId !== inventoryId) }),
  setCustomer: (patch) => set({ customer: { ...get().customer, ...patch } }),
  setPaymentMode: (paymentMode) => set({ paymentMode }),
  setDiscount: (discount) => set({ discount: Math.max(0, Number(discount) || 0) }),
  reset: () => set({ lines: [], customer: { ...emptyCustomer }, paymentMode: 'CASH', discount: 0 }),

  /** Payload for /pos/quote and /pos/checkout */
  toPayload: () => {
    const { lines, customer, paymentMode, discount } = get();
    const clean = Object.fromEntries(Object.entries(customer).filter(([, v]) => v));
    return {
      items: lines.map((l) => ({ inventoryId: l.inventoryId, quantity: l.quantity, ...(l.unitPrice !== l.price && { unitPrice: l.unitPrice }) })),
      paymentMode,
      discount,
      ...clean,
    };
  },
}));
