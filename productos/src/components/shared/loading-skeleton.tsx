import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  className?: string;
}

export function MetricCardSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
