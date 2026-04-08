import { runQuery, intParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const companyId = parseInt(url.searchParams.get("company_id") ?? "0", 10);
    const periodDays = Math.max(1, parseInt(url.searchParams.get("period_days") ?? "90", 10) || 90);
    const minReservas = Math.max(1, parseInt(url.searchParams.get("min_reservas") ?? "2", 10) || 2);

    if (!companyId) {
      return new Response(JSON.stringify({ error: "company_id is required" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const sql = `
      SELECT
        p.requester_name AS viajante,
        COUNT(*) AS total_reservas,
        COUNTIF(p.within_policy = true) AS dentro_politica,
        COUNTIF(p.within_policy = false) AS fora_politica,
        ROUND(COUNTIF(p.within_policy = true) / COUNT(*) * 100, 1) AS pct_aderencia
      FROM \`dw-onfly-prd.management_core.protocol_trip_summary\` p
      JOIN \`dw-onfly-prd.cockpit.gold_travelers_date_trip\` t ON t.protocol = p.protocol
      WHERE CAST(t.company_id AS INT64) = @company_id
        AND t.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @period_days DAY)
        AND p.requester_name IS NOT NULL
      GROUP BY p.requester_name
      HAVING COUNT(*) >= @min_reservas
      ORDER BY pct_aderencia ASC
    `;

    const rows = await runQuery(sql, [
      intParam("company_id", companyId),
      intParam("period_days", periodDays),
      intParam("min_reservas", minReservas),
    ]);

    const data = rows.map((r) => ({
      viajante: r.viajante,
      total_reservas: Number(r.total_reservas),
      dentro_politica: Number(r.dentro_politica),
      fora_politica: Number(r.fora_politica),
      pct_aderencia: Number(r.pct_aderencia),
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
