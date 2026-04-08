import { create } from "zustand";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const savedState = typeof window !== "undefined"
  ? localStorage.getItem("sidebar-collapsed") === "true"
  : false;

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: savedState,
  toggle: () =>
    set((state) => {
      const next = !state.collapsed;
      localStorage.setItem("sidebar-collapsed", String(next));
      return { collapsed: next };
    }),
  setCollapsed: (collapsed) => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    set({ collapsed });
  },
}));
