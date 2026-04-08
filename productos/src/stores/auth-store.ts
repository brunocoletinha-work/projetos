import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Workspace } from "@/types/database";

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => set({ workspace }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, workspace: null, isLoading: false }),
}));
