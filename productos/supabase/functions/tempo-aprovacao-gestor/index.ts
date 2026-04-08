import { runQuery, intParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const periodDays = Math.max(1, parseInt(url.searchParams.get("period_days") ?? "30", 10) || 30);

    const sql = `
      SELECT
        u.name AS approver_name,
        COUNT(*) AS total_aprovacoes,
        ROUND(AVG(TIMESTAMP_DIFF(h.history_created_at, h.previous_date_history_approval, MINUTE)), 0) AS tempo_medio_minutos,
        COUNTIF(h.is_finished = 0) AS pendentes
      FROM \`dw-onfly-prd.management_core.fact_ms_approval_history_travel_bi\` h
      JOIN \`dw-onfly-prd.management_core.dim_users\` u ON u.id = CAST(h.approver AS INT64)
      WHERE h.history_created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
        AND h.approver IS NOT NULL
        AND h.previous_date_history_approval IS NOT NULL
      GROUP BY u.name
      ORDER BY tempo_medio_minutos DESC
    `;

    const rows = await runQuery(sql, [intParam("period_days", periodDays)]);

    const data = rows.map((r) => ({
      approver_name: r.approver_name,
      total_aprovacoes: Number(r.total_aprovacoes),
      tempo_medio_minutos: Number(r.tempo_medio_minutos),
      pendentes: Number(r.pendentes),
    }));

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
