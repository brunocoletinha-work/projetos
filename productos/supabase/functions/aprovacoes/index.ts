import { runQuery, intParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const companyId = parseInt(url.searchParams.get("company_id") ?? "0", 10);
    const periodDays = Math.max(1, parseInt(url.searchParams.get("period_days") ?? "30", 10) || 30);

    if (!companyId) {
      return new Response(JSON.stringify({ error: "company_id is required" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const sql = `
      SELECT
        u.name AS nome,
        ROUND(AVG(TIMESTAMP_DIFF(h.history_created_at, h.previous_date_history_approval, MINUTE)) / 60.0, 2) AS tempo_medio_horas,
        COUNTIF(h.is_finished = 0) AS pendentes,
        COUNT(*) AS total_aprovacoes,
        ROUND(SUM(CASE WHEN h.is_finished = 0 THEN COALESCE(tai.sale_amount, 0) ELSE 0 END), 2) AS custo_atraso
      FROM \`dw-onfly-prd.management_core.fact_ms_approval_history_travel_bi\` h
      JOIN \`dw-onfly-prd.management_core.dim_users\` u ON u.id = CAST(h.approver AS INT64)
      LEFT JOIN \`dw-onfly-prd.cockpit.gold_travel_accounting_items\` tai
        ON tai.protocol = h.protocol AND tai.is_current = 1
      WHERE CAST(h.company_id AS INT64) = @company_id
        AND h.history_created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
        AND h.approver IS NOT NULL
        AND h.previous_date_history_approval IS NOT NULL
      GROUP BY u.name
      ORDER BY tempo_medio_horas DESC
    `;

    const rows = await runQuery(sql, [
      intParam("company_id", companyId),
      intParam("period_days", periodDays),
    ]);

    const data = rows.map((r) => ({
      nome: r.nome,
      tempo_medio_horas: Number(r.tempo_medio_horas),
      pendentes: Number(r.pendentes),
      total_aprovacoes: Number(r.total_aprovacoes),
      custo_atraso: Number(r.custo_atraso),
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
