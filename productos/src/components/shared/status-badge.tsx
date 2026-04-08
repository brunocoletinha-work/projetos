import { cn } from "@/lib/utils";
import type { OkrStatus } from "@/types/database";

interface StatusBadgeProps {
  status: OkrStatus;
  className?: string;
}

const statusConfig: Record<OkrStatus, { label: string; className: string }> = {
  on_track: {
    label: "No prazo",
    className: "bg-green-100 text-green-700",
  },
  at_risk: {
    label: "Em risco",
    className: "bg-yellow-100 text-yellow-700",
  },
  off_track: {
    label: "Atrasado",
    className: "bg-red-100 text-red-700",
  },
  done: {
    label: "Concluído",
    className: "bg-blue-100 text-blue-700",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
