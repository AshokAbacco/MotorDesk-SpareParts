import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set) => ({
      sidebarOpen: false, // mobile drawer
      viewMode: 'table',  // inventory: 'table' | 'grid'
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    { name: 'motordesk-ui', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ viewMode: s.viewMode }) }
  )
);
