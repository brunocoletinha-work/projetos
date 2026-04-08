import { create } from "zustand";

export type Period = "7d" | "30d" | "90d" | "6m" | "1y" | "all";
export type ClientSize = "all" | "smb" | "mid" | "enterprise";

interface FilterState {
  period: Period;
  clientSize: ClientSize;
  clientId: string | null;
  setPeriod: (period: Period) => void;
  setClientSize: (clientSize: ClientSize) => void;
  setClientId: (clientId: string | null) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  period: "30d",
  clientSize: "all",
  clientId: null,
  setPeriod: (period) => set({ period }),
  setClientSize: (clientSize) => set({ clientSize }),
  setClientId: (clientId) => set({ clientId }),
  reset: () => set({ period: "30d", clientSize: "all", clientId: null }),
}));
