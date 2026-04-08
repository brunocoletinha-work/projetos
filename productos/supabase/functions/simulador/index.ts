import { runQuery, intParam, floatParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const companyId = parseInt(url.searchParams.get("company_id") ?? "0", 10);
    const limite = Math.max(0, parseFloat(url.searchParams.get("limite") ?? "500") || 500);
    const periodDays = Math.max(1, parseInt(url.searchParams.get("period_days") ?? "90", 10) || 90);

    if (!companyId) {
      return new Response(JSON.stringify({ error: "company_id is required" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const sql = `
      SELECT
        COUNT(*) AS total_reservas,
        COUNTIF(total_amount > @limite) AS reservas_acima_limite,
        COUNTIF(total_amount <= @limite) AS reservas_abaixo_limite,
        ROUND(SUM(CASE WHEN total_amount > @limite THEN total_amount - @limite ELSE 0 END), 2) AS economia_estimada,
        ROUND(AVG(total_amount), 2) AS ticket_medio,
        ROUND(SUM(total_amount), 2) AS custo_total_periodo
      FROM \`dw-onfly-prd.sourcing.gold_hotel_orders\`
      WHERE company_id = @company_id
        AND purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @period_days DAY)
    `;

    const rows = await runQuery(sql, [
      intParam("company_id", companyId),
      floatParam("limite", limite),
      intParam("period_days", periodDays),
    ]);

    const r = rows[0] ?? {};

    return new Response(
      JSON.stringify({
        limite,
        total_reservas: Number(r.total_reservas ?? 0),
        reservas_acima_limite: Number(r.reservas_acima_limite ?? 0),
        reservas_abaixo_limite: Number(r.reservas_abaixo_limite ?? 0),
        economia_estimada: Number(r.economia_estimada ?? 0),
        ticket_medio: Number(r.ticket_medio ?? 0),
        custo_total_periodo: Number(r.custo_total_periodo ?? 0),
      }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
