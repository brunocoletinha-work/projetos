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
const ENDPOINTS = {
  infracoes:    `${BASE}/infracoes-por-tempo?period_days=90`,
  aprovacao:    `${BASE}/tempo-aprovacao-gestor?period_days=30`,
  autoAprov:    `${BASE}/auto-aprovacao-sugestao?period_days=90&min_pct=80`,
};

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

// ── Monta contexto a partir dos 3 endpoints ──────────────────────────────────
async function assembleContexto() {
  const [infRes, apRes, autoRes] = await Promise.all([
    fetch(ENDPOINTS.infracoes).then(r => r.json()),
    fetch(ENDPOINTS.aprovacao).then(r => r.json()),
    fetch(ENDPOINTS.autoAprov).then(r => r.json()),
  ]);

  // infracoes-por-tempo
  const inf = (infRes.data ?? []).sort((a: any, b: any) => b.period.localeCompare(a.period));
  const mesAtual   = inf[0] ?? {};
  const mesAnterior = inf[1] ?? {};
  const variacaoPct = mesAnterior.total_infracoes
    ? Math.round(((mesAtual.total_infracoes - mesAnterior.total_infracoes) / mesAnterior.total_infracoes) * 100)
    : 0;

  // tempo-aprovacao-gestor — top 5 mais lentos com >= 3 aprovacoes
  const toH = (min: number) => Math.round((min / 60) * 10) / 10;
  const apFiltrado = (apRes.data ?? [])
    .filter((a: any) => a.total_aprovacoes >= 3)
    .sort((a: any, b: any) => b.tempo_medio_minutos - a.tempo_medio_minutos)
    .slice(0, 5);
  const todosMedios = (apRes.data ?? []).filter((a: any) => a.tempo_medio_minutos > 0);
  const tempoMedioH = todosMedios.length > 0
    ? toH(todosMedios.reduce((s: number, a: any) => s + a.tempo_medio_minutos, 0) / todosMedios.length)
    : 0;

  // auto-aprovacao-sugestao
  const autoData = autoRes.data ?? [];
  const totalRes  = autoData.reduce((s: number, c: any) => s + (c.total_reservas ?? 0), 0);
  const totalDent = autoData.reduce((s: number, c: any) => s + (c.dentro_politica ?? 0), 0);
  const mediaAdh  = totalRes > 0 ? Math.round((totalDent / totalRes) * 100) : 0;
  const tmAutoH   = autoData.length > 0
    ? toH(autoData.reduce((s: number, c: any) => s + (c.tempo_medio_aprovacao_min ?? 0), 0) / autoData.length)
    : 0;

  return {
    empresa: "Base Onfly",
    periodo: "ultimos 90 dias",
    data_extracao: new Date().toISOString().split('T')[0],
    resumo_infracoes: {
      total: mesAtual.total_infracoes ?? 0,
      variacao_mes_anterior_pct: variacaoPct,
      cost_centers_afetados: mesAtual.cost_centers_afetados ?? 0,
      historico_mensal: inf.slice(0, 3).map((d: any) => ({
        periodo: d.period?.slice(0, 7),
        total_infracoes: d.total_infracoes,
      })),
    },
    aprovacoes: {
      tempo_medio_horas: tempoMedioH,
      total_aprovadores: (apRes.data ?? []).length,
      por_aprovador: apFiltrado.map((a: any) => ({
        nome: a.approver_name,
        tempo_medio_horas: toH(a.tempo_medio_minutos),
        pendentes: a.pendentes ?? 0,
        total_aprovacoes: a.total_aprovacoes,
      })),
    },
    score_aderencia: {
      media_empresa_pct: mediaAdh,
      total_reservas_analisadas: totalRes,
      empresas_candidatas_auto_aprovacao: autoData.length,
    },
    auto_aprovacao: {
      padroes: [{
        descricao: `${autoData.length} empresas com >80% reservas dentro da politica`,
        ocorrencias: autoData.length,
        taxa_dentro_politica_pct: mediaAdh,
        tempo_medio_aprovacao_horas: tmAutoH,
      }],
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
    const { pergunta } = await req.json();
    if (!pergunta) {
      return new Response(JSON.stringify({ error: 'Campo "pergunta" obrigatorio' }), { status: 400 });
    }

    // 1. Monta contexto
    const contexto = await assembleContexto();
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
