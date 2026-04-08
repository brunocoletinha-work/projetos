import { vi } from "vitest";

export const mockSupabaseFrom = vi.fn();
export const mockSupabaseSelect = vi.fn();
export const mockSupabaseEq = vi.fn();
export const mockSupabaseOrder = vi.fn();
export const mockSupabaseLimit = vi.fn();
export const mockSupabaseSingle = vi.fn();
export const mockSupabaseGte = vi.fn();
export const mockSupabaseLte = vi.fn();

const chainable = {
  select: mockSupabaseSelect,
  eq: mockSupabaseEq,
  order: mockSupabaseOrder,
  limit: mockSupabaseLimit,
  single: mockSupabaseSingle,
  gte: mockSupabaseGte,
  lte: mockSupabaseLte,
};

// Make each method return the chain
Object.values(chainable).forEach((fn) => {
  fn.mockReturnValue(chainable);
});

mockSupabaseFrom.mockReturnValue(chainable);

export const mockSupabase = {
  from: mockSupabaseFrom,
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}));
