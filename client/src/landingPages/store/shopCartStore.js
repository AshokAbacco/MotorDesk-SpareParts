import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Customer marketplace cart. Each line is a specific vendor offer (inventoryId).
 * Prices here are for display only; the server re-prices at checkout.
 */
export const useShopCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { inventoryId, productId, name, oemNumber, image, priceWithGst, mrp, maxQty, vendorName, quantity }
      isDrawerOpen: false,

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      addItem: (item, qty = 1) => {
        const items = [...get().items];
        const existing = items.find((i) => i.inventoryId === item.inventoryId);
        if (existing) existing.quantity = Math.min(existing.quantity + qty, item.maxQty ?? 99);
        else items.push({ ...item, quantity: Math.min(qty, item.maxQty ?? 99) });
        set({ items, isDrawerOpen: true });
      },
      updateQty: (inventoryId, quantity) =>
        set({ items: get().items.map((i) => (i.inventoryId === inventoryId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQty ?? 99)) } : i)) }),
      removeItem: (inventoryId) => set({ items: get().items.filter((i) => i.inventoryId !== inventoryId) }),
      /** Apply live price/stock from /marketplace/cart/validate */
      syncWithServer: (checks) =>
        set({
          items: get().items
            .map((i) => {
              const c = checks.find((x) => x.inventoryId === i.inventoryId);
              if (!c || !c.available) return null;
              return { ...i, priceWithGst: c.priceWithGst, maxQty: c.maxQty, quantity: Math.min(i.quantity, c.maxQty) };
            })
            .filter(Boolean),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: 'motordesk-cart', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ items: s.items }) }
  )
);

export const selectCartCount = (s) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartTotal = (s) => s.items.reduce((n, i) => n + i.priceWithGst * i.quantity, 0);
