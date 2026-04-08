export const STATUS_COLORS = {
  on_track: "text-status-green bg-status-green/10 border-status-green/20",
  at_risk: "text-status-orange bg-status-orange/10 border-status-orange/20",
  off_track: "text-status-red bg-status-red/10 border-status-red/20",
  done: "text-primary bg-primary/10 border-primary/20",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  on_track: "No Caminho",
  at_risk: "Em Risco",
  off_track: "Fora do Caminho",
  done: "Concluído",
};

export const LEVEL_LABELS: Record<string, string> = {
  company: "Empresa",
  team: "Time",
  individual: "Individual",
};

export const PERIODS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "quarter", label: "Trimestre atual" },
] as const;

export const CONFIDENCE_EMOJIS = ["😰", "😕", "😐", "🙂", "🤩"] as const;

export const KR_TYPES = [
  { value: "number", label: "Número" },
  { value: "percentage", label: "Porcentagem" },
  { value: "currency", label: "Moeda (R$)" },
  { value: "binary", label: "Sim/Não" },
] as const;

export const METRIC_CATEGORIES = [
  { value: "satisfaction", label: "Satisfação" },
  { value: "revenue", label: "Receita" },
  { value: "operational", label: "Operacional" },
  { value: "quality", label: "Qualidade" },
  { value: "adoption", label: "Adoção" },
] as const;
