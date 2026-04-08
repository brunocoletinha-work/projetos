import { runQuery, intParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "90", 10);
    const granularity = url.searchParams.get("granularity") === "week" ? "WEEK" : "MONTH";

    const sql = `
      SELECT
        DATE_TRUNC(t.purchase_date, ${granularity}) AS period,
        COUNT(*) AS total_infracoes,
        COUNT(DISTINCT t.cost_center_id) AS cost_centers_afetados
      FROM \`dw-onfly-prd.management_core.protocol_trip_summary\` p
      JOIN \`dw-onfly-prd.cockpit.gold_travelers_date_trip\` t ON t.protocol = p.protocol
      WHERE p.within_policy = false
        AND t.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @period_days DAY)
      GROUP BY period
      ORDER BY period DESC
    `;

    const rows = await runQuery(sql, [intParam("period_days", periodDays)]);

    const data = rows.map((r) => ({
      period: r.period,
      total_infracoes: Number(r.total_infracoes),
      cost_centers_afetados: Number(r.cost_centers_afetados),
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
