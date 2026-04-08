import { useFilterStore, type Period, type ClientSize } from "@/stores/filter-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "1y", label: "Último ano" },
  { value: "all", label: "Todo período" },
];

const CLIENT_SIZE_OPTIONS: { value: ClientSize; label: string }[] = [
  { value: "all", label: "Todos os portes" },
  { value: "smb", label: "PME" },
  { value: "mid", label: "Mid-market" },
  { value: "enterprise", label: "Enterprise" },
];

export function FilterBar() {
  const { period, clientSize, setPeriod, setClientSize } = useFilterStore();

  return (
    <div className="flex items-center gap-3">
      <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={clientSize}
        onValueChange={(v) => setClientSize(v as ClientSize)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CLIENT_SIZE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
