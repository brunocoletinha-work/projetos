import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SparklineData {
  value: number;
  date?: string;
}

interface SparklineChartProps {
  data: SparklineData[];
  color?: string;
  height?: number;
}

export function SparklineChart({
  data,
  color = "#6366f1",
  height = 40,
}: SparklineChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ height }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Tooltip
          content={() => null}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
