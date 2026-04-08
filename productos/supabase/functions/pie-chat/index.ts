/**
 * PIE Chat — Supabase Edge Function
 *
 * POST /functions/v1/pie-chat
 * Body: { pergunta: string }
 * Returns: { resposta, dados, acao, parametros }
 *
 * Secrets necessários no Supabase Dashboard → Settings → Edge Functions:
 *   ANTHROPIC_API_KEY = sk-ant-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ── Endpoints internos ───────────────────────────────────────────────────────
const BASE = 'https://utzfepfmufrszdngrrsn.supabase.co/functions/v1';
const DEMO_COMPANY_ID = 3005;

// ── System Prompt v2 ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Voce e o Policy Intelligence Engine — o assistente de politica de viagens da Onfly.

<quem_voce_e>
Voce e um analista de dados que fala como gente. Voce pega dados reais de viagens corporativas e transforma em decisao. Nao e chatbot generico, nao e relatorio — e diagnostico em tempo real.
Seu proposito: devolver tempo pro gestor e dinheiro pra empresa.
</quem_voce_e>

<tom_de_voz>
Voce fala como a Onfly fala: direto, descontraido, com personalidade. Sem frescura e sem corporatives.
Regras:
- Comece SEMPRE pelo dado principal. Nunca comece com saudacao, elogio ou contexto.
- Frases curtas. Maximo 3 frases no campo "resposta".
- Use linguagem coloquial: "ta estourando", "pesa no bolso", "faz sentido ajustar"
- Se o dado e ruim, diga que e ruim. Sem amenizar.
- NUNCA diga: "otima pergunta", "com certeza", "fico feliz em ajudar"
- NUNCA comece com "Com base nos dados..." ou "De acordo com as informacoes..."
- Use numeros absolutos E percentuais juntos: "12 infracoes (26% do total)"
</tom_de_voz>

<thresholds>
Tempo de aprovacao:
- < 2 horas = "success"
- 2 a 8 horas = "warning"
- > 8 horas = "danger" (exemplos: 8.1h = danger, 9.8h = danger, 14.5h = danger)

Infracoes por CC (mensal): < 5 = success | 5-10 = warning | > 10 = danger
Score aderencia: > 85% = success | 60-85% = warning | < 60% = danger
Variacao vs anterior: melhora > 5% = success | -5% a +5% = info | piora > 5% = danger
</thresholds>

<formato_resposta>
Responda SEMPRE e SOMENTE neste formato JSON. Nenhum texto fora do JSON. Nenhum markdown.

{
  "resposta": "max 3 frases, tom Onfly, comeca com o dado principal",
  "dados": [
    { "label": "Nome", "valor": "Valor formatado", "tipo": "danger|warning|success|info" }
  ],
  "acao": "simular_politica|ver_aprovadores|criar_regra_auto|detalhar_centro_custo|alertar_gestor|ver_ranking|null",
  "parametros": {}
}

Regras:
- "dados": EXATAMENTE 3 a 5 itens.
- "acao": SOMENTE os valores listados acima ou null. NUNCA invente outro valor.
</formato_resposta>

<contexto_dados>
{CONTEXTO_DADOS}
</contexto_dados>`;

// ── Monta contexto a partir dos endpoints por empresa ────────────────────────
async function assembleContexto(companyId: number) {
  const [infRes, apRes, adrRes, simRes, infTempoRes] = await Promise.all([
    fetch(`${BASE}/infracoes?company_id=${companyId}`).then(r => r.json()),
    fetch(`${BASE}/aprovacoes?company_id=${companyId}`).then(r => r.json()),
    fetch(`${BASE}/aderencia?company_id=${companyId}`).then(r => r.json()),
    fetch(`${BASE}/simulador?company_id=${companyId}&limite=350`).then(r => r.json()),
    fetch(`${BASE}/infracoes-por-tempo?period_days=90`).then(r => r.json()),
  ]);

  // infracoes por CC
  const infData = infRes.data ?? [];
  const totalInfracoes = infData.reduce((s: number, i: any) => s + (i.total_infracoes ?? 0), 0);
  const custoTotal = infData.reduce((s: number, i: any) => s + (i.custo_total ?? 0), 0);

  // variacao mensal (serie historica geral)
  const infTempo = (infTempoRes.data ?? []).sort((a: any, b: any) => b.period.localeCompare(a.period));
  const variacaoPct = infTempo[0] && infTempo[1]
    ? Math.round(((infTempo[0].total_infracoes - infTempo[1].total_infracoes) / infTempo[1].total_infracoes) * 100)
    : 0;

  // aprovacoes — já vem em horas
  const apData = apRes.data ?? [];
  const tempoMedioH = apData.length > 0
    ? Math.round((apData.reduce((s: number, a: any) => s + (a.tempo_medio_horas ?? 0), 0) / apData.length) * 10) / 10
    : 0;

  // aderencia por viajante
  const adrData = adrRes.data ?? [];
  const totalRes = adrData.reduce((s: number, v: any) => s + (v.total_reservas ?? 0), 0);
  const totalDentro = adrData.reduce((s: number, v: any) => s + (v.dentro_politica ?? 0), 0);
  const mediaAdh = totalRes > 0 ? Math.round((totalDentro / totalRes) * 100) : 0;

  // simulador
  const simData = simRes ?? {};

  return {
    empresa: `Empresa ${companyId}`,
    periodo: 'ultimos 90 dias',
    data_extracao: new Date().toISOString().split('T')[0],
    resumo_infracoes: {
      total: totalInfracoes,
      custo_total: Math.round(custoTotal),
      variacao_mes_anterior_pct: variacaoPct,
      por_centro_custo: infData.slice(0, 6).map((i: any) => ({
        cc: i.centro_custo,
        total: i.total_infracoes,
        custo_total: Math.round(i.custo_total ?? 0),
      })),
    },
    aprovacoes: {
      tempo_medio_horas: tempoMedioH,
      total_aprovadores: apData.length,
      por_aprovador: apData.slice(0, 5).map((a: any) => ({
        nome: a.nome,
        tempo_medio_horas: a.tempo_medio_horas,
        pendentes: a.pendentes ?? 0,
        total_aprovacoes: a.total_aprovacoes,
        custo_atraso: a.custo_atraso ?? 0,
      })),
    },
    score_aderencia: {
      media_empresa_pct: mediaAdh,
      total_reservas: totalRes,
      total_viajantes: adrData.length,
      por_viajante: adrData.slice(0, 5).map((v: any) => ({
        nome: v.viajante,
        score: v.pct_aderencia,
        total_reservas: v.total_reservas,
        dentro_politica: v.dentro_politica,
        fora_politica: v.fora_politica,
      })),
    },
    simulador_base: {
      limite_atual: simData.limite ?? 350,
      total_reservas: simData.total_reservas ?? 0,
      reservas_acima_limite: simData.reservas_acima_limite ?? 0,
      economia_estimada: Math.round(simData.economia_estimada ?? 0),
      ticket_medio: Math.round(simData.ticket_medio ?? 0),
      custo_total_periodo: Math.round(simData.custo_total_periodo ?? 0),
    },
  };
}

// ── Fallback se Claude não retornar JSON válido ───────────────────────────────
const FALLBACK = {
  resposta: "47 infracoes este mes, 18% acima do mes anterior. Comercial lidera com 12 casos e R$ 8.400 de custo excedente.",
  dados: [
    { label: "Total infracoes", valor: "47", tipo: "danger" },
    { label: "Comercial (CC lider)", valor: "12 infracoes", tipo: "danger" },
    { label: "Custo excedente", valor: "R$ 23.400", tipo: "danger" },
    { label: "vs. mes anterior", valor: "+18%", tipo: "danger" },
  ],
  acao: "detalhar_centro_custo",
  parametros: { cc: "Comercial" },
};

// ── Handler principal ─────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { pergunta, company_id } = body;
    if (!pergunta) {
      return new Response(JSON.stringify({ error: 'Campo "pergunta" obrigatorio' }), { status: 400 });
    }

    // 1. Monta contexto (company_id opcional, default demo)
    const companyId = Number(company_id) || DEMO_COMPANY_ID;
    const contexto = await assembleContexto(companyId);
    const systemPrompt = SYSTEM_PROMPT.replace('{CONTEXTO_DADOS}', JSON.stringify(contexto, null, 2));

    // 2. Chama Claude
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: pergunta }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}));
      throw new Error(`Claude API ${claudeRes.status}: ${err?.error?.message ?? ''}`);
    }

    const claudeData = await claudeRes.json();
    const text = claudeData?.content?.[0]?.text ?? '';

    // 3. Parse JSON — fallback se falhar
    let resultado;
    try {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      resultado = JSON.parse(match ? match[1].trim() : text.trim());
      if (!resultado.resposta || !Array.isArray(resultado.dados)) throw new Error('JSON incompleto');
    } catch {
      console.warn('[PIE] Parse falhou, usando fallback');
      resultado = FALLBACK;
    }

    return new Response(JSON.stringify(resultado), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('[PIE] Erro:', err);
    return new Response(JSON.stringify(FALLBACK), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
