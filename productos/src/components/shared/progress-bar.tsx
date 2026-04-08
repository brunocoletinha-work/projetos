import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "default" | "success" | "warning" | "danger";
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const colorClasses = {
  default: "bg-accent",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  size = "md",
  color = "default",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full rounded-full bg-gray-100", sizeClasses[size])}>
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          className={cn(
            "rounded-full transition-all duration-300",
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="mt-1 text-xs text-gray-500">{Math.round(percentage)}%</span>
      )}
    </div>
  );
}
