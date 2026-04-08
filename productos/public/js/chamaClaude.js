/**
 * Policy Intelligence Engine — chamaClaude
 * Chama a API do Claude com system prompt v2 e retorna JSON estruturado.
 * Em caso de falha no parse, usa fallback estático baseado na pergunta.
 *
 * @param {string} pergunta  - Pergunta do gestor (ex: "Quais as infrações do mês?")
 * @param {object} contexto  - Objeto {CONTEXTO_DADOS} montado pelo backend/assembler
 * @param {string} apiKey    - Anthropic API Key (sk-ant-...)
 * @param {string} [endpoint] - (Opcional) URL de proxy. Se omitido, chama Anthropic direto.
 * @returns {Promise<object>} JSON no formato PIE {resposta, dados, acao, parametros}
 */

// ---------------------------------------------------------------------------
// System Prompt v2 — Policy Intelligence Engine
// ---------------------------------------------------------------------------
const _SYSTEM_PROMPT = `Voce e o Policy Intelligence Engine — o assistente de politica de viagens da Onfly.

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
- Se o dado e ruim, diga que e ruim. Sem amenizar, sem "porem vale ressaltar que..."
- Sugira a proxima acao de forma natural, como um colega faria: "Quer que eu simule...?"
- NUNCA diga: "otima pergunta", "com certeza", "fico feliz em ajudar", "vou analisar isso para voce"
- NUNCA comece com "Com base nos dados..." ou "De acordo com as informacoes..."
- Use numeros absolutos E percentuais juntos quando relevante: "12 infracoes (26% do total)"
</tom_de_voz>

<o_que_pode>
- Responder sobre infracoes de politica: quem infringiu, onde, quanto custou, por que
- Mostrar tempo e custo de aprovacao por gestor/aprovador
- Rankear viajantes por aderencia a politica
- Simular impacto de mudanca de limite (se os dados do simulador estiverem no contexto)
- Sugerir regras de auto-aprovacao quando detectar padrao repetitivo
- Comparar periodos (este mes vs anterior) quando o dado estiver disponivel
- Alertar sobre situacoes criticas
- Fazer projecoes baseadas nos dados, sempre sinalizando como "estimativa baseada nos ultimos X dias"
- Recomendar acoes ("faz sentido ajustar o teto") mas nunca como ordem
</o_que_pode>

<o_que_nao_pode>
- NUNCA inventar dado que nao esta no contexto injetado. Se nao tem, diga "nao tenho esse dado agora"
- NUNCA dar conselho juridico ou financeiro
- NUNCA acessar ou comparar dados de outras empresas (limitacao atual, potencial futuro)
- NUNCA responder sobre temas fora de viagens corporativas
- NUNCA prometer economia ou resultado especifico
- NUNCA executar acoes no sistema — voce sugere, o gestor decide
</o_que_nao_pode>

<thresholds>
Use estes thresholds pra classificar severidade nos campos "tipo" do JSON:

Tempo de aprovacao (ATENCAO: aplique com rigor, sem arredondar):
- < 2 horas = "success" (OK)
- 2 a 8 horas = "warning" (atencao)
- > 8 horas = "danger" (critico). Exemplos: 8.1h = danger, 9.8h = danger, 14.5h = danger

Infracoes por centro de custo (mensal):
- < 5 = "success"
- 5 a 10 = "warning"
- > 10 = "danger"

Score de aderencia do viajante:
- > 85% = "success"
- 60 a 85% = "warning"
- < 60% = "danger"

Hotel acima do limite:
- Ate o limite = "success"
- 1 a 30% acima = "warning"
- > 30% acima = "danger"

Antecedencia da reserva:
- > 7 dias = "success"
- 3 a 7 dias = "warning"
- < 3 dias = "danger"

Variacao vs periodo anterior:
- Melhora > 5% = "success"
- Variacao -5% a +5% = "info" (estavel)
- Piora > 5% = "danger"
</thresholds>

<formato_resposta>
Responda SEMPRE e SOMENTE neste formato JSON. Nenhum texto fora do JSON. Nenhum markdown.

{
  "resposta": "Texto curto e direto, max 3 frases, tom Onfly. Comeca com o dado principal.",
  "dados": [
    {
      "label": "Nome do indicador",
      "valor": "Valor formatado (ex: '47', 'R$ 23.400', '14.5h', '72%')",
      "tipo": "danger | warning | success | info"
    }
  ],
  "acao": "nome_da_acao ou null",
  "parametros": {}
}

Regras do JSON:
- "resposta": portugues, max 3 frases, tom descontraido Onfly
- "dados": array de EXATAMENTE 3 a 5 itens. Nem mais, nem menos. Escolha os mais relevantes.
- "tipo": usar thresholds acima pra classificar. SOMENTE estes valores: "danger", "warning", "success", "info"
- "acao": OBRIGATORIO usar um destes valores exatos (ou null). Nao invente outros:
    "simular_politica" — quando faz sentido ajustar limite
    "ver_aprovadores" — quando tempo de aprovacao e alto
    "criar_regra_auto" — quando ha padrao repetitivo
    "detalhar_centro_custo" — quando um CC se destaca
    "alertar_gestor" — quando ha situacao critica (aprovador lento, pico de infracoes)
    "ver_ranking" — quando aderencia geral e baixa
    null — quando nao ha acao natural
  Se nenhum valor acima encaixa, use null. NUNCA invente um valor novo.
- "parametros": contexto pra acao (ex: {"limite_atual": 350, "cc": "Comercial"})
</formato_resposta>

<contexto_dados>
Os dados abaixo sao da empresa do usuario. Extraidos do BigQuery em tempo real.
Use SOMENTE estes dados. Se um dado nao esta aqui, voce NAO TEM esse dado.

{CONTEXTO_DADOS}
</contexto_dados>`;

// ---------------------------------------------------------------------------
// Fallbacks estáticos — ativados quando o parse do JSON da API falha
// ---------------------------------------------------------------------------
const _FALLBACKS = {
  infracoes: {
    resposta: "Este mes foram 47 infracoes de politica, 18% a mais que o mes anterior. O centro de custo Comercial lidera com 12 ocorrencias e R$ 8.400 de custo excedente.",
    dados: [
      { label: "Total de infracoes", valor: "47", tipo: "danger" },
      { label: "Maior infrator (CC)", valor: "Comercial (12)", tipo: "warning" },
      { label: "Custo excedente total", valor: "R$ 23.400", tipo: "danger" },
      { label: "Tipo mais frequente", valor: "Hotel acima do limite (28)", tipo: "danger" },
      { label: "vs. mes anterior", valor: "+18%", tipo: "danger" }
    ],
    acao: "detalhar_centro_custo",
    parametros: { cc: "Comercial", periodo: "30d" }
  },
  aprovacoes: {
    resposta: "O tempo medio de aprovacao esta em 5.2 horas. Ricardo Almeida e critico com 14.5 horas e 23 aprovacoes paradas. O custo estimado dos atrasos e R$ 6.300 em tarifas que subiram.",
    dados: [
      { label: "Tempo medio geral", valor: "5.2h", tipo: "warning" },
      { label: "Ricardo Almeida", valor: "14.5h (23 pendentes)", tipo: "danger" },
      { label: "Fernanda Costa", valor: "9.8h (8 pendentes)", tipo: "danger" },
      { label: "Bruno Oliveira", valor: "1.4h (2 pendentes)", tipo: "success" },
      { label: "Custo do atraso (mes)", valor: "R$ 6.300", tipo: "danger" }
    ],
    acao: "alertar_gestor",
    parametros: { aprovador: "Ricardo Almeida", pendentes: 23 }
  },
  simular: {
    resposta: "Se o limite de hotel subir de R$ 350 para R$ 500, 32 infracoes seriam eliminadas (68% do total). O custo adicional estimado e R$ 18.400/mes, parcialmente compensado pela economia em tarifas e horas de gestores.",
    dados: [
      { label: "Infracoes eliminadas", valor: "-32 (68%)", tipo: "success" },
      { label: "Custo adicional estimado", valor: "R$ 18.400/mes", tipo: "warning" },
      { label: "Economia em tarifas", valor: "R$ 8.700", tipo: "success" },
      { label: "Saldo liquido", valor: "-R$ 3.500", tipo: "warning" }
    ],
    acao: "simular_politica",
    parametros: { limite_atual: 350, limite_simulado: 500 }
  },
  ranking: {
    resposta: "A aderencia media da empresa esta em 72%. Carlos Silva e o pior com 42% — 8 infracoes em 12 viagens. Ele e do Comercial, que lidera o ranking negativo.",
    dados: [
      { label: "Aderencia media", valor: "72%", tipo: "warning" },
      { label: "Melhor viajante", valor: "Lucia Ferreira (96%)", tipo: "success" },
      { label: "Pior viajante", valor: "Carlos Silva (42%)", tipo: "danger" },
      { label: "Viajantes acima de 85%", valor: "34 de 89", tipo: "info" }
    ],
    acao: "ver_ranking",
    parametros: { cc: "Comercial", viajante: "Carlos Silva" }
  }
};

// ---------------------------------------------------------------------------
// Detecta qual fallback usar com base em palavras-chave da pergunta
// ---------------------------------------------------------------------------
function _detectarFallback(pergunta) {
  const q = pergunta.toLowerCase();

  if (/simul|limite|teto|politica|ajust/.test(q)) return _FALLBACKS.simular;
  if (/aprovac|aprovador|aprova|lento|pendente/.test(q)) return _FALLBACKS.aprovacoes;
  if (/rank|aderencia|viajante|cumpri|score/.test(q)) return _FALLBACKS.ranking;
  // default: infrações
  return _FALLBACKS.infracoes;
}

// ---------------------------------------------------------------------------
// chamaClaude — função principal
// ---------------------------------------------------------------------------
async function chamaClaude(pergunta, contexto, apiKey, endpoint) {
  if (!apiKey && !endpoint) {
    console.warn('[PIE] Sem apiKey nem endpoint — retornando fallback direto.');
    return _detectarFallback(pergunta);
  }

  const contextStr = typeof contexto === 'string'
    ? contexto
    : JSON.stringify(contexto, null, 2);

  const systemPrompt = _SYSTEM_PROMPT.replace('{CONTEXTO_DADOS}', contextStr);

  try {
    let responseText;

    if (endpoint) {
      // Chama proxy/Supabase Edge Function
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta, contexto })
      });
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      const data = await res.json();
      // Edge Function pode retornar o JSON PIE diretamente ou wrapper {text: "..."}
      if (data.resposta) return data;
      responseText = data.text ?? JSON.stringify(data);
    } else {
      // Chama Anthropic direto (requer header especial para browser)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: pergunta }]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`API ${res.status}: ${err?.error?.message ?? res.statusText}`);
      }

      const data = await res.json();
      responseText = data?.content?.[0]?.text ?? '';
    }

    // Tenta extrair JSON mesmo se vier com markdown ```json ... ```
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1].trim() : responseText.trim();

    const parsed = JSON.parse(jsonStr);

    // Validação mínima
    if (!parsed.resposta || !Array.isArray(parsed.dados)) {
      throw new Error('JSON incompleto — faltam campos obrigatorios');
    }

    console.log('[PIE] Resposta Claude OK:', parsed.acao);
    return parsed;

  } catch (err) {
    console.warn('[PIE] Usando fallback. Motivo:', err.message);
    return _detectarFallback(pergunta);
  }
}

// ---------------------------------------------------------------------------
// Export: funciona como ES module e como global window
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { chamaClaude };
} else if (typeof window !== 'undefined') {
  window.chamaClaude = chamaClaude;
  window.PIE_FALLBACKS = _FALLBACKS;
}
