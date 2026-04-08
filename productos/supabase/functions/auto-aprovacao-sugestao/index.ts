import { runQuery, intParam, floatParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const periodDays = Math.max(1, parseInt(url.searchParams.get("period_days") ?? "90", 10) || 90);
    const minPct = Math.max(0, Math.min(100, parseFloat(url.searchParams.get("min_pct") ?? "80") || 80));

    const sql = `
      SELECT
        CAST(a.company_id AS INT64) AS company_id,
        COUNT(*) AS total_reservas,
        COUNTIF(p.within_policy = true) AS dentro_politica,
        ROUND(COUNTIF(p.within_policy = true) / COUNT(*) * 100, 1) AS pct_dentro_politica,
        ROUND(AVG(TIMESTAMP_DIFF(a.approval_date, a.previus_date, MINUTE)), 0) AS tempo_medio_aprovacao_min
      FROM \`dw-onfly-prd.management_core.all_approvers_travel_bi\` a
      JOIN \`dw-onfly-prd.management_core.protocol_trip_summary\` p ON p.protocol = a.protocol
      JOIN \`dw-onfly-prd.cockpit.gold_companies_polices_settings\` cfg
        ON cfg.company_id = CAST(a.company_id AS INT64)
      WHERE cfg.employeesNeedApprovalToBuy = 'true'
        AND a.previus_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
        AND a.approver_name IS NOT NULL
      GROUP BY a.company_id
      HAVING pct_dentro_politica >= @min_pct
      ORDER BY pct_dentro_politica DESC
    `;

    const rows = await runQuery(sql, [
      intParam("period_days", periodDays),
      floatParam("min_pct", minPct),
    ]);

    const data = rows.map((r) => ({
      company_id: Number(r.company_id),
      total_reservas: Number(r.total_reservas),
      dentro_politica: Number(r.dentro_politica),
      pct_dentro_politica: Number(r.pct_dentro_politica),
      tempo_medio_aprovacao_min: Number(r.tempo_medio_aprovacao_min),
      sugestao: "auto-aprovacao",
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
