import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import type { Metric } from "@/types/database";

export function useMetrics() {
  const workspace = useAuthStore((s) => s.workspace);

  return useQuery({
    queryKey: ["metrics", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async (): Promise<Metric[]> => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNorthStarMetrics() {
  const workspace = useAuthStore((s) => s.workspace);

  return useQuery({
    queryKey: ["metrics", "north-star", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async (): Promise<Metric[]> => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .eq("is_active", true)
        .eq("is_north_star", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMetric(id: string | undefined) {
  return useQuery({
    queryKey: ["metrics", id],
    enabled: !!id,
    queryFn: async (): Promise<Metric> => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
