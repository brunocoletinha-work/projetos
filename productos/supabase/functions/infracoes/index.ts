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
        COALESCE(cc.cc_name, t.cost_center_id, 'Sem Centro de Custo') AS centro_custo,
        COUNT(*) AS total_infracoes,
        ROUND(SUM(COALESCE(tai.sale_amount, 0)), 2) AS custo_total
      FROM \`dw-onfly-prd.management_core.protocol_trip_summary\` p
      JOIN \`dw-onfly-prd.cockpit.gold_travelers_date_trip\` t ON t.protocol = p.protocol
      LEFT JOIN \`dw-onfly-prd.management_core.dim_cost_centers\` cc ON cc.cc_id = t.cost_center_id
      LEFT JOIN \`dw-onfly-prd.cockpit.gold_travel_accounting_items\` tai
        ON tai.protocol = p.protocol AND tai.is_current = 1
      WHERE p.within_policy = false
        AND CAST(t.company_id AS INT64) = @company_id
        AND t.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @period_days DAY)
      GROUP BY centro_custo
      ORDER BY total_infracoes DESC
    `;

    const rows = await runQuery(sql, [
      intParam("company_id", companyId),
      intParam("period_days", periodDays),
    ]);

    const data = rows.map((r) => ({
      centro_custo: r.centro_custo,
      total_infracoes: Number(r.total_infracoes),
      custo_total: Number(r.custo_total),
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
