/**
 * Policy Intelligence Engine — assembleContexto
 * Chama os 3 endpoints do Supabase e monta o CONTEXTO_DADOS
 * para ser injetado no system prompt do Claude.
 *
 * Fallback: retorna null em caso de erro (quem chama usa CONTEXTO_FAKE).
 */

const PIE_ENDPOINTS = {
  infracoes: 'https://utzfepfmufrszdngrrsn.supabase.co/functions/v1/infracoes-por-tempo?period_days=90',
  aprovacao: 'https://utzfepfmufrszdngrrsn.supabase.co/functions/v1/tempo-aprovacao-gestor?period_days=30',
  autoAprovacao: 'https://utzfepfmufrszdngrrsn.supabase.co/functions/v1/auto-aprovacao-sugestao?period_days=90&min_pct=80'
};

async function assembleContexto() {
  try {
    console.log('[PIE] Buscando dados reais dos endpoints...');

    const [infRes, apRes, autoRes] = await Promise.all([
      fetch(PIE_ENDPOINTS.infracoes).then(r => { if (!r.ok) throw new Error(`infracoes ${r.status}`); return r.json(); }),
      fetch(PIE_ENDPOINTS.aprovacao).then(r => { if (!r.ok) throw new Error(`aprovacao ${r.status}`); return r.json(); }),
      fetch(PIE_ENDPOINTS.autoAprovacao).then(r => { if (!r.ok) throw new Error(`auto ${r.status}`); return r.json(); })
    ]);

    // ── 1. INFRACOES-POR-TEMPO ─────────────────────────────────────────────
    // Campos: period, total_infracoes, cost_centers_afetados
    const infData = (infRes.data ?? []).sort((a, b) => b.period.localeCompare(a.period));
    const mesAtual   = infData[0] ?? {};
    const mesAnterior = infData[1] ?? {};

    const variacaoMesPct = mesAnterior.total_infracoes
      ? Math.round(((mesAtual.total_infracoes - mesAnterior.total_infracoes) / mesAnterior.total_infracoes) * 100)
      : 0;

    // ── 2. TEMPO-APROVACAO-GESTOR ──────────────────────────────────────────
    // Campos: approver_name, total_aprovacoes, tempo_medio_minutos, pendentes
    // Filtra aprovadores com >= 3 aprovações (remove one-offs) e pega os 5 mais lentos
    const apData = (apRes.data ?? [])
      .filter(a => a.total_aprovacoes >= 3)
      .sort((a, b) => b.tempo_medio_minutos - a.tempo_medio_minutos)
      .slice(0, 5);

    // Média geral sobre todos os aprovadores (sem filtro de mínimo)
    const todosMedios = (apRes.data ?? []).filter(a => a.tempo_medio_minutos > 0);
    const tempoMedioGlobalMin = todosMedios.length > 0
      ? todosMedios.reduce((s, a) => s + a.tempo_medio_minutos, 0) / todosMedios.length
      : 0;

    const toHoras = min => Math.round((min / 60) * 10) / 10;

    // ── 3. AUTO-APROVACAO-SUGESTAO ─────────────────────────────────────────
    // Campos: company_id, total_reservas, dentro_politica, pct_dentro_politica,
    //         tempo_medio_aprovacao_min, sugestao
    const autoData = autoRes.data ?? [];
    const totalReservas = autoData.reduce((s, c) => s + (c.total_reservas ?? 0), 0);
    const totalDentro   = autoData.reduce((s, c) => s + (c.dentro_politica ?? 0), 0);
    const mediaAdherencia = totalReservas > 0
      ? Math.round((totalDentro / totalReservas) * 100)
      : 0;
    const tempoMedioAutoMin = autoData.length > 0
      ? Math.round(autoData.reduce((s, c) => s + (c.tempo_medio_aprovacao_min ?? 0), 0) / autoData.length)
      : 0;

    // ── CONTEXTO MONTADO ───────────────────────────────────────────────────
    const contexto = {
      empresa: "Base Onfly (dados agregados)",
      periodo: "ultimos 90 dias",
      data_extracao: new Date().toISOString().split('T')[0],

      resumo_infracoes: {
        total: mesAtual.total_infracoes ?? 0,
        variacao_mes_anterior_pct: variacaoMesPct,
        cost_centers_afetados: mesAtual.cost_centers_afetados ?? 0,
        historico_mensal: infData.slice(0, 4).map(d => ({
          periodo: d.period?.slice(0, 7),
          total_infracoes: d.total_infracoes,
          cost_centers_afetados: d.cost_centers_afetados
        }))
      },

      aprovacoes: {
        tempo_medio_horas: toHoras(tempoMedioGlobalMin),
        total_aprovadores: (apRes.data ?? []).length,
        por_aprovador: apData.map(a => ({
          nome: a.approver_name,
          tempo_medio_horas: toHoras(a.tempo_medio_minutos),
          pendentes: a.pendentes ?? 0,
          total_aprovacoes: a.total_aprovacoes
        }))
      },

      score_aderencia: {
        media_empresa_pct: mediaAdherencia,
        total_reservas_analisadas: totalReservas,
        empresas_candidatas_auto_aprovacao: autoData.length
      },

      auto_aprovacao: {
        padroes: [{
          descricao: `${autoData.length} empresas com >80% reservas dentro da politica nos ultimos 90 dias`,
          ocorrencias: autoData.length,
          taxa_dentro_politica_pct: mediaAdherencia,
          tempo_medio_aprovacao_horas: toHoras(tempoMedioAutoMin),
          economia_potencial: `${autoData.length} empresas poderiam ter auto-aprovacao ativa`
        }]
      }
    };

    console.log('[PIE] Contexto montado com dados reais:', {
      infracoes_mes_atual: contexto.resumo_infracoes.total,
      aprovadores_lentos: contexto.aprovacoes.por_aprovador.length,
      aderencia_media: contexto.score_aderencia.media_empresa_pct + '%',
      empresas_auto: autoData.length
    });

    return contexto;

  } catch (err) {
    console.warn('[PIE] assembleContexto falhou, usando CONTEXTO_FAKE:', err.message);
    return null;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { assembleContexto, PIE_ENDPOINTS };
} else if (typeof window !== 'undefined') {
  window.assembleContexto = assembleContexto;
  window.PIE_ENDPOINTS = PIE_ENDPOINTS;
}
