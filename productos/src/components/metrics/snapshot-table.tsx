import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MetricSnapshot } from "@/types/database";

interface SnapshotTableProps {
  snapshots: MetricSnapshot[];
  unit?: string;
  currentValue?: number;
}

function formatValue(value: number, unit: string = ""): string {
  if (unit === "BRL" || unit === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (unit === "%" || unit === "percentage") {
    return `${value.toFixed(2)}%`;
  }
  return value.toLocaleString("pt-BR");
}

function formatPeriod(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function SnapshotTable({
  snapshots,
  unit = "",
  currentValue,
}: SnapshotTableProps) {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Período
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Valor
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Variação
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fonte
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sorted.map((snap, index) => {
            const nextSnap = sorted[index + 1];
            const variation =
              nextSnap && nextSnap.value !== 0
                ? ((snap.value - nextSnap.value) / Math.abs(nextSnap.value)) * 100
                : null;

            return (
              <tr key={snap.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-700">
                  {formatPeriod(snap.period_start)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatValue(snap.value, unit)}
                  {index === 0 && currentValue !== undefined && (
                    <span className="ml-2 rounded-full bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
                      atual
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {variation !== null ? (
                    <span
                      className={
                        variation > 0
                          ? "text-green-600"
                          : variation < 0
                          ? "text-red-600"
                          : "text-gray-500"
                      }
                    >
                      {variation > 0 ? "+" : ""}
                      {variation.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{snap.source}</td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                Nenhum snapshot registrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
