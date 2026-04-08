/**
 * Policy Intelligence Engine — assembleContexto
 * Chama os endpoints do Supabase e monta CONTEXTO_DADOS para o Claude.
 * Fallback: retorna null em caso de erro (quem chama usa CONTEXTO_FAKE).
 *
 * @param {number} companyId - ID da empresa (default: 3005 para demo)
 */

const BASE_URL = 'https://utzfepfmufrszdngrrsn.supabase.co/functions/v1';

// company_id padrão para o demo
const DEMO_COMPANY_ID = 3005;

async function assembleContexto(companyId = DEMO_COMPANY_ID) {
  try {
    console.log(`[PIE] Buscando dados reais (company_id=${companyId})...`);

    const [infRes, apRes, adrRes, simRes, infTempoRes] = await Promise.all([
      fetch(`${BASE_URL}/infracoes?company_id=${companyId}`).then(r => r.json()),
      fetch(`${BASE_URL}/aprovacoes?company_id=${companyId}`).then(r => r.json()),
      fetch(`${BASE_URL}/aderencia?company_id=${companyId}`).then(r => r.json()),
      fetch(`${BASE_URL}/simulador?company_id=${companyId}&limite=350`).then(r => r.json()),
      fetch(`${BASE_URL}/infracoes-por-tempo?period_days=90`).then(r => r.json()),
    ]);

    // ── 1. INFRACOES por centro de custo ────────────────────────────────────
    // Campos: centro_custo, total_infracoes, custo_total
    const infData = infRes.data ?? [];
    const totalInfracoes = infData.reduce((s, i) => s + (i.total_infracoes ?? 0), 0);
    const custoTotal = infData.reduce((s, i) => s + (i.custo_total ?? 0), 0);

    // Variação mensal vem do endpoint de série histórica (agregado geral)
    const infTempo = (infTempoRes.data ?? []).sort((a, b) => b.period.localeCompare(a.period));
    const variacaoPct = infTempo[0] && infTempo[1]
      ? Math.round(((infTempo[0].total_infracoes - infTempo[1].total_infracoes) / infTempo[1].total_infracoes) * 100)
      : 0;

    // ── 2. APROVACOES por aprovador ─────────────────────────────────────────
    // Campos: nome, tempo_medio_horas, pendentes, total_aprovacoes, custo_atraso
    const apData = apRes.data ?? [];
    const tempoMedioH = apData.length > 0
      ? Math.round((apData.reduce((s, a) => s + (a.tempo_medio_horas ?? 0), 0) / apData.length) * 10) / 10
      : 0;

    // ── 3. ADERENCIA por viajante ───────────────────────────────────────────
    // Campos: viajante, total_reservas, dentro_politica, fora_politica, pct_aderencia
    const adrData = adrRes.data ?? [];
    const totalRes = adrData.reduce((s, v) => s + (v.total_reservas ?? 0), 0);
    const totalDentro = adrData.reduce((s, v) => s + (v.dentro_politica ?? 0), 0);
    const mediaAdh = totalRes > 0 ? Math.round((totalDentro / totalRes) * 100) : 0;

    // ── 4. SIMULADOR (limite atual = 350) ───────────────────────────────────
    // Campos: limite, total_reservas, reservas_acima_limite, reservas_abaixo_limite,
    //         economia_estimada, ticket_medio, custo_total_periodo
    const simData = simRes ?? {};

    // ── CONTEXTO MONTADO ────────────────────────────────────────────────────
    const contexto = {
      empresa: `Empresa ${companyId}`,
      periodo: 'ultimos 90 dias',
      data_extracao: new Date().toISOString().split('T')[0],

      resumo_infracoes: {
        total: totalInfracoes,
        custo_total: Math.round(custoTotal),
        variacao_mes_anterior_pct: variacaoPct,
        por_centro_custo: infData.slice(0, 6).map(i => ({
          cc: i.centro_custo,
          total: i.total_infracoes,
          custo_total: Math.round(i.custo_total ?? 0),
        })),
      },

      aprovacoes: {
        tempo_medio_horas: tempoMedioH,
        total_aprovadores: apData.length,
        por_aprovador: apData.slice(0, 5).map(a => ({
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
        por_viajante: adrData.slice(0, 5).map(v => ({
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
        reservas_abaixo_limite: simData.reservas_abaixo_limite ?? 0,
        economia_estimada_limite_atual: Math.round(simData.economia_estimada ?? 0),
        ticket_medio: Math.round(simData.ticket_medio ?? 0),
        custo_total_periodo: Math.round(simData.custo_total_periodo ?? 0),
      },
    };

    console.log('[PIE] Contexto montado:', {
      infracoes: totalInfracoes,
      custo: `R$ ${Math.round(custoTotal).toLocaleString('pt-BR')}`,
      aprovadores: apData.length,
      tempo_medio: `${tempoMedioH}h`,
      aderencia: `${mediaAdh}%`,
    });

    return contexto;

  } catch (err) {
    console.warn('[PIE] assembleContexto falhou, usando CONTEXTO_FAKE:', err.message);
    return null;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { assembleContexto, BASE_URL, DEMO_COMPANY_ID };
} else if (typeof window !== 'undefined') {
  window.assembleContexto = assembleContexto;
  window.PIE_BASE_URL = BASE_URL;
  window.PIE_DEMO_COMPANY_ID = DEMO_COMPANY_ID;
}
