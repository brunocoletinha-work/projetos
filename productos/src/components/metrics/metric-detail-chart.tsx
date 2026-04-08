import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SparklineDataPoint } from "@/types/metrics";

interface MetricDetailChartProps {
  data: SparklineDataPoint[];
  targetValue?: number | null;
  unit?: string;
  color?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
}

function formatValue(value: number, unit: string = ""): string {
  if (unit === "BRL" || unit === "currency") {
    if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$${(value / 1_000).toFixed(1)}K`;
    return `R$${value.toFixed(0)}`;
  }
  if (unit === "%" || unit === "percentage") return `${value.toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("pt-BR");
}

export function MetricDetailChart({
  data,
  targetValue,
  unit = "",
  color = "#6366f1",
}: MetricDetailChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Sem dados para exibir
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatValue(v, unit)}
          width={60}
        />
        <Tooltip
          formatter={(value: number) => [formatValue(value, unit), "Valor"]}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        {targetValue !== null && targetValue !== undefined && (
          <ReferenceLine
            y={targetValue}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{
              value: `Meta: ${formatValue(targetValue, unit)}`,
              fill: "#f59e0b",
              fontSize: 11,
              position: "insideTopRight",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace("#", "")})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
