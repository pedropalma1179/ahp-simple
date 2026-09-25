/**
 * lib/__tests__/a12-diagnostico.test.ts
 *
 * A.12, BLOQUEIOS: rodada de DIAGNÓSTICO.
 *
 * ⚠ **Levanta e mede. NÃO escolhe fonte de universo, NÃO corrige dado e NÃO altera
 * produção.** A decisão é do autor, e a rodada para na proposta.
 *
 * ⚠ **Nenhuma geração de parecer, real ou simulada.** O cliente do modelo é um
 * duplo que CAPTURA a chamada e INTERROMPE, lançando um sentinela, antes de
 * devolver qualquer conteúdo.
 *
 * ⚠ **O relato separa três coisas**, e este arquivo também: o comportamento
 * EXECUTADO antes da interrupção; a RESPOSTA DECORRENTE da interrupção do ensaio;
 * e o comportamento POSTERIOR, apenas LIDO no código. **Leitura da interface não é
 * apresentação exercitada.**
 */

export {};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const ARTEFATO = path.join(RAIZ, 'docs', 'dados', 'a12-diagnostico', 'medicao.json');
const GRAVAR = process.env.A12_GRAVAR === '1';

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const shaArquivo = (rel: string) => sha256(fs.readFileSync(path.join(RAIZ, rel)));
const ler = (rel: string) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

const REQUISICAO = 'docs/dados/a33-etapa4-v2/requisicao-referencia-r2.json';
const PROJETO = 'docs/calculations-13jul2026.json';
const CONTRATO = 'lib/ai-reviewer/avaliacao-qualidade.ts';
const ROTA = 'app/api/ai-reviewer/route.ts';
const TELA = 'app/decisor/resultados/[projectId]/page.tsx';
const COMPONENTE = 'components/ParecerAISection.tsx';

// ============================================================
// 3.1 AS FONTES CANDIDATAS DE UNIVERSO
// ============================================================

/**
 * ⚠ **Cada fonte declara o que PODE e o que NÃO PODE responder.** O contrato
 * escrito vem de `lib/ai-reviewer/review-request.ts` quando existe; onde não há
 * contrato escrito, o campo diz isso.
 */
const CANDIDATAS = [
  {
    chave: 'responseCount',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.responseCount', contrato: 'lib/ai-reviewer/review-request.ts, ReviewRequest.responseCount' },
    oQueAfirma: 'quantidade de respostas contabilizadas pela tela ao montar a requisicao',
    podeResponder: 'quantas respostas a tela contou',
    naoPodeResponder: 'quem sao elas, nem se foram avaliadas, nem se alguma foi excluida',
  },
  {
    chave: 'qualityAnalysis.respondents',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.qualityAnalysis.respondents', contrato: 'lib/ai-reviewer/review-request.ts, RespondentData[]' },
    oQueAfirma: 'a LISTA de respondentes avaliados, com CR individual quando houver',
    podeResponder: 'quem esta listado e quais tem CR; e a UNICA fonte com identidade por unidade',
    naoPodeResponder: 'se a lista cobre o universo que deveria ter sido avaliado',
  },
  {
    chave: 'qualityAnalysis.statistics.total',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.qualityAnalysis.statistics.total', contrato: 'lib/ai-reviewer/review-request.ts, statistics.total' },
    oQueAfirma: 'total declarado pela API de qualidade',
    podeResponder: 'o total que aquela API declarou',
    naoPodeResponder: 'a identidade de quem compoe esse total',
  },
  {
    chave: 'qualityAnalysis.statistics.byStatus (soma)',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.qualityAnalysis.statistics.byStatus', contrato: 'lib/ai-reviewer/review-request.ts, byStatus' },
    oQueAfirma: 'distribuicao por categoria de status',
    podeResponder: 'a soma das categorias declaradas',
    naoPodeResponder: 'nada sobre identidade; ⚠ o proprio contrato registra que byStatus sozinho NAO e avaliacao',
  },
  {
    chave: 'qualityAnalysis.summary.total',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.qualityAnalysis.summary.total', contrato: 'lib/ai-reviewer/review-request.ts, summary' },
    oQueAfirma: 'total do resumo da analise de qualidade',
    podeResponder: 'o total que o resumo declarou',
    naoPodeResponder: 'identidade, e coerencia com as demais',
  },
  {
    chave: 'overallStats.total',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.overallStats.total', contrato: 'lib/ai-reviewer/review-request.ts, overallStats' },
    oQueAfirma: 'total das estatisticas gerais',
    podeResponder: 'o total declarado ali',
    naoPodeResponder: 'identidade',
  },
  {
    chave: 'demographicsSummary.total',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.demographicsSummary.total', contrato: 'NAO LOCALIZADO contrato escrito para este campo' },
    oQueAfirma: 'total do resumo demografico',
    podeResponder: 'o total demografico declarado',
    naoPodeResponder: 'identidade, e a relacao dele com os respondentes avaliados',
  },
  {
    chave: 'exclusionInfo',
    ondeEsta: { artefato: REQUISICAO, caminho: 'requisicao.exclusionInfo', contrato: 'lib/ai-reviewer/review-request.ts:63-68, com totalCollected, activeCount, excludedCount e reason' },
    oQueAfirma: 'quantos foram coletados, quantos ficaram ativos e quantos sairam',
    podeResponder: 'os tres TOTAIS e uma razao textual',
    naoPodeResponder: 'QUEM foi excluido: o contrato nao tem identificador',
  },
  {
    chave: 'metadata.excludedRespondentIds',
    ondeEsta: { artefato: PROJETO, caminho: 'metadata.excludedRespondentIds', contrato: 'NAO LOCALIZADO contrato escrito; o nome do campo declara IDs' },
    oQueAfirma: 'os identificadores dos respondentes excluidos',
    podeResponder: 'QUEM foi excluido, por identificador, quando preenchido',
    naoPodeResponder: 'o motivo de cada exclusao: o campo guarda so os IDs',
  },
  {
    chave: 'responseCount (dados do projeto)',
    ondeEsta: { artefato: PROJETO, caminho: 'responseCount', contrato: 'NAO LOCALIZADO contrato escrito' },
    oQueAfirma: 'quantidade de respostas no estado do projeto',
    podeResponder: 'o total registrado no calculo publicado',
    naoPodeResponder: 'identidade, nem a lista',
  },
];

function valorDe(chave: string, req: any, proj: any): unknown {
  switch (chave) {
    case 'responseCount': return req?.responseCount;
    case 'qualityAnalysis.respondents': return Array.isArray(req?.qualityAnalysis?.respondents) ? req.qualityAnalysis.respondents.length : undefined;
    case 'qualityAnalysis.statistics.total': return req?.qualityAnalysis?.statistics?.total;
    case 'qualityAnalysis.statistics.byStatus (soma)': {
      const b = req?.qualityAnalysis?.statistics?.byStatus;
      return b ? Object.values(b).reduce((a: number, v: any) => a + (typeof v === 'number' ? v : 0), 0) : undefined;
    }
    case 'qualityAnalysis.summary.total': return req?.qualityAnalysis?.summary?.total;
    case 'overallStats.total': return req?.overallStats?.total;
    case 'demographicsSummary.total': return req?.demographicsSummary?.total;
    case 'exclusionInfo': return req?.exclusionInfo === undefined ? 'AUSENTE na requisicao' : req.exclusionInfo;
    case 'metadata.excludedRespondentIds': return Array.isArray(proj?.metadata?.excludedRespondentIds) ? { tipo: 'array', tamanho: proj.metadata.excludedRespondentIds.length, itens: proj.metadata.excludedRespondentIds } : 'AUSENTE';
    case 'responseCount (dados do projeto)': return proj?.responseCount;
    default: return undefined;
  }
}

// ============================================================
// 3.2 COBERTURA POR IDENTIFICADOR
// ============================================================

/**
 * ⚠ **A comparação é por IDENTIFICADOR.** Sem identificador não há comparação: o
 * resultado fica **NÃO DETERMINADO**, e contagens iguais NÃO a substituem.
 */
function identificadoresDe(lista: any[]): { comId: string[]; semId: number; campoUsado: string | null } {
  const campos = ['id', 'respondentId', 'responseId', 'userId', 'email', 'name'];
  let campoUsado: string | null = null;
  for (const c of campos) {
    if (lista.some((r) => r && typeof r === 'object' && typeof r[c] === 'string' && r[c] !== '')) { campoUsado = c; break; }
  }
  if (!campoUsado) return { comId: [], semId: lista.length, campoUsado: null };
  const comId: string[] = [];
  let semId = 0;
  for (const r of lista) {
    const v = r && typeof r === 'object' ? r[campoUsado] : undefined;
    if (typeof v === 'string' && v !== '') comId.push(v); else semId++;
  }
  return { comId, semId, campoUsado };
}

/** ⚠ Presença de CR é distinta de valor VÁLIDO segundo o contrato existente. */
function crPorRespondente(lista: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { medicaoPorRespondente } = require('@/lib/ai-reviewer/avaliacao-qualidade');
  const m = medicaoPorRespondente(lista);
  // "válido" pelo contrato: número finito, que é o que crDoRespondente aceita.
  const finitos = lista.filter((r: any) => {
    for (const v of [r?.cr, r?.metrics?.avgCR, r?.avgCR, r?.consistency?.cr]) {
      if (typeof v === 'number' && Number.isFinite(v)) return true;
    }
    return false;
  }).length;
  return { total: m.total, presencaDeCR: m.comCR, valorFinitoPeloContrato: finitos };
}

// ============================================================
// OS QUATRO CASOS: CONDIÇÃO PREPARADA, DECLARADA ANTES
// ============================================================

const respondente = (i: number, cr: number | null) => ({
  id: `resp-${i}`,
  name: `Respondente ${i}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
});
const balde = (total: number, valid: number, warning = 0, critical = 0) => ({ total, valid, warning, critical, avgCR: 0.05 });

function base() {
  return {
    projectName: 'Projeto sintético do diagnóstico A.12',
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    finalScores: [
      { code: 'A1', name: 'Alternativa 1', score: 0.62 },
      { code: 'A2', name: 'Alternativa 2', score: 0.38 },
    ],
  } as Record<string, unknown>;
}

/**
 * ⚠ **CONDIÇÃO PREPARADA de cada caso, declarada ANTES da execução.** O que a
 * classificação devolve fica registrado À PARTE, e os dois nunca se confundem.
 */
/**
 * ⚠ **Marcadores do contexto, e são o TEXTO DE PRODUÇÃO.** O teste
 * `os marcadores do contexto coincidem com o texto de producao` confere cada um
 * contra `app/api/ai-reviewer/route.ts`, de modo que reescrita do prompt reprova o
 * instrumento em vez de devolver `false` em silêncio.
 *
 * ⚠ **Defeito do próprio instrumento, achado na conferência à mão do caso mais
 * visível, na PRIMEIRA execução.** A detecção de percentual era o regex
 * `/Respostas (confiáveis|com alerta|críticas):/`, que cobre só o ramo de
 * `overallStats`. Os ramos de `byStatus` e de `respondents` escrevem
 * `- Respostas CONFIÁVEIS (CR ≤ 0.10):`, em caixa alta e com sufixo diferente, e o
 * regex devolvia **falso negativo** nos dois casos com avaliação disponível. O
 * valor errado tinha a forma esperada e nenhum teste reprovava.
 */
const MARCA_SUSPENSAO = '⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL';
const MARCA_NOTA_SAATY_P1 = '**Nota:** Conforme Saaty (1977), CR individual > 0.10';
const CABECALHO_P12 = '**Distribuição de Qualidade dos Respondentes (CR Individual):**';
const CABECALHO_P3 = '**Distribuição de Qualidade dos Respondentes:**';
const CABECALHO_SUSPENSAO = '**Qualidade dos Dados:**';

/** Uma linha por ramo que apresenta percentual. Nenhuma inventada: ver o teste. */
const MARCADORES_DE_PERCENTUAL = [
  '- Respostas CONFIÁVEIS (CR ≤ 0.10):',
  '- Respostas para REVISAR (0.10 < CR ≤ 0.15):',
  '- Respostas SUSPEITAS (0.15 < CR ≤ 0.20):',
  '- Respostas CRÍTICAS (CR > 0.20):',
  '- Respostas válidas (CR ≤ 0.10):',
  '- Respostas com alerta:',
  '- Respostas críticas:',
];

/** String que o regex defeituoso procurava, e que NÃO existe em produção. */
const MARCADOR_INEXISTENTE = '- Respostas confiáveis:';

/** Qual dos quatro ramos de `respondentSummary` escreveu no contexto capturado. */
function ramoDoResumo(texto: string): string {
  if (texto.includes(MARCA_SUSPENSAO)) return 'suspensao: nenhum percentual apresentado';
  if (texto.includes(CABECALHO_P12)) {
    return texto.includes(MARCA_NOTA_SAATY_P1)
      ? 'P1: percentual derivado de qualityAnalysis.statistics.byStatus'
      : 'P2: percentual derivado de qualityAnalysis.respondents';
  }
  if (texto.includes(CABECALHO_P3)) return 'P3: percentual derivado de overallStats';
  return 'nenhum dos quatro ramos reconhecido';
}

/**
 * Recorta o bloco de qualidade do contexto: do cabeçalho até a primeira linha
 * vazia, no máximo dez linhas. ⚠ **É recorte por regra declarada aqui**, e não o
 * `respondentSummary` lido da rota.
 */
function blocoDeQualidade(texto: string): string[] {
  const cabecalho = [CABECALHO_P12, CABECALHO_P3, CABECALHO_SUSPENSAO].find((c) => texto.includes(c));
  if (!cabecalho) return [];
  const linhas = texto.slice(texto.indexOf(cabecalho)).split('\n');
  const bloco: string[] = [cabecalho];
  for (const l of linhas.slice(1, 11)) {
    if (l.trim() === '') break;
    bloco.push(l);
  }
  return bloco;
}

const CASOS = [
  {
    nome: 'C-disponivel',
    condicaoPreparada: {
      campos: 'qualityAnalysis.respondents com 4 itens, todos com cr numerico finito; overallStats e individualStats coerentes com eles',
      valores: '4 respondentes, cr 0.05 cada; overallStats {total:4, valid:4, warning:0, critical:0}',
      relacoes: 'individuais e agregados CONCORDAM: 4 listados, 4 com CR, 4 validos',
    },
    montar: () => {
      const rs = [1, 2, 3, 4].map((i) => respondente(i, 0.05));
      return {
        ...base(),
        responseCount: 4,
        qualityAnalysis: { respondents: rs, statistics: { byStatus: { 'CONFIÁVEL': 4, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 4, avgCR: 0.05 }, summary: { total: 4, ok: 4, suspicious: 0, critical: 0 } },
        overallStats: { total: 4, valid: 4, warning: 0, critical: 0 },
        individualStats: { Benefits: balde(4, 4), Opportunities: balde(4, 4), Costs: balde(4, 4), Risks: balde(4, 4) },
      };
    },
  },
  {
    nome: 'C-ausente',
    condicaoPreparada: {
      campos: 'sem qualityAnalysis.respondents; byStatus FABRICADO com CONFIAVEL igual ao numero de respostas',
      valores: 'respondents ausente; byStatus {CONFIAVEL:12}; overallStats {total:12, valid:0}',
      relacoes: 'nao ha individuais; os agregados afirmam 12 confiaveis sem lista que os sustente',
    },
    montar: () => ({
      ...base(),
      responseCount: 12,
      qualityAnalysis: { respondents: [], statistics: { byStatus: { 'CONFIÁVEL': 12, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 12, avgCR: 0 }, summary: { total: 12, ok: 12, suspicious: 0, critical: 0 } },
      overallStats: { total: 12, valid: 0, warning: 0, critical: 0 },
    }),
  },
  {
    nome: 'C-incompleta',
    condicaoPreparada: {
      campos: 'qualityAnalysis.respondents com 4 itens, sendo 2 SEM cr',
      valores: '4 respondentes; cr 0.05 em dois, ausente nos outros dois',
      relacoes: 'individuais INCOMPLETOS: 2 de 4 com CR',
    },
    montar: () => {
      const rs = [respondente(1, 0.05), respondente(2, 0.05), respondente(3, null), respondente(4, null)];
      return {
        ...base(),
        responseCount: 4,
        qualityAnalysis: { respondents: rs, statistics: { byStatus: { 'CONFIÁVEL': 2, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 4, avgCR: 0.05 }, summary: { total: 4, ok: 2, suspicious: 0, critical: 0 } },
        overallStats: { total: 4, valid: 2, warning: 0, critical: 0 },
        individualStats: { Benefits: balde(4, 2), Opportunities: balde(4, 2), Costs: balde(4, 2), Risks: balde(4, 2) },
      };
    },
  },
  {
    nome: 'C-contradicao',
    condicaoPreparada: {
      campos: 'campos SUFICIENTES para disponibilidade pelo contrato ATUAL, com contradicao EXPLICITA entre individuais e agregados',
      valores: '4 respondentes, TODOS com cr 0.05, logo todos validos pelo limiar; mas overallStats {total:4, valid:0, critical:4} e summary {ok:4, critical:4}; e statistics.total 9, diferente dos 4 listados',
      relacoes: 'contradicao 1: individuais dizem 4 validos, overallStats diz 0 validos e 4 criticos; contradicao 2: summary.ok 4 contra summary.critical 4, somando 8 sobre total 4; contradicao 3: statistics.total 9 contra 4 listados',
      oQueOContratoAtualVE: 'total 4 e comCR 4, logo temMedicao verdadeiro: NENHUMA das tres contradicoes e examinada',
    },
    montar: () => {
      const rs = [1, 2, 3, 4].map((i) => respondente(i, 0.05));
      return {
        ...base(),
        responseCount: 4,
        qualityAnalysis: { respondents: rs, statistics: { byStatus: { 'CONFIÁVEL': 0, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 9 }, total: 9, avgCR: 0.9 }, summary: { total: 4, ok: 4, suspicious: 0, critical: 4 } },
        overallStats: { total: 4, valid: 0, warning: 0, critical: 4 },
        individualStats: { Benefits: balde(4, 0, 0, 4), Opportunities: balde(4, 0, 0, 4), Costs: balde(4, 0, 0, 4), Risks: balde(4, 0, 0, 4) },
      };
    },
  },
];

// ============================================================
// EXECUÇÃO DO HANDLER REAL, COM CAPTURA E INTERRUPÇÃO
// ============================================================

const CHAVES_FALSAS: Record<string, string> = {
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC'];
const SENTINELA = 'A12-DIAGNOSTICO-INTERROMPIDO-ANTES-DE-QUALQUER-CONTEUDO';

/**
 * ⚠ **Dependências SUBSTITUÍDAS e PONTO DE INTERRUPÇÃO, declarados.**
 *
 * - `@anthropic-ai/sdk`: duplo que captura `system` e `messages` e **lança** o
 *   sentinela. **Ponto de interrupção: dentro de `messages.create`, depois de
 *   capturar e antes de qualquer retorno.**
 * - `voyageai` e `@upstash/vector`: duplos que nunca são chamados com
 *   `USE_RAG_SEMANTIC` ausente, e que não fazem rede quando o são.
 */
async function executar(payload: Record<string, unknown>) {
  jest.resetModules();
  const anterior: Record<string, string | undefined> = {};
  for (const n of NOMES_ENV) anterior[n] = process.env[n];
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  delete process.env.USE_RAG_SEMANTIC;

  const capturado = { system: '', messages: '' };
  let chamouModelo = false;
  let interrompidoAntesDeConteudo = false;
  let chamouVoyage = 0;
  let chamouIndice = 0;

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class { async embed() { chamouVoyage += 1; return { data: [{ embedding: new Array(1024).fill(0.1) }] }; } },
  }));
  jest.doMock('@upstash/vector', () => ({
    Index: class { async query() { chamouIndice += 1; return []; } },
  }));
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (a: { system: string; messages: Array<{ content: string }> }) => {
          chamouModelo = true;
          capturado.system = a.system ?? '';
          capturado.messages = (a.messages ?? []).map((m) => m.content).join('\n');
          interrompidoAntesDeConteudo = true;
          throw new Error(SENTINELA);
        },
      };
    },
  }));

  const silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
  let statusDaResposta: number | null = null;
  let corpoDaResposta: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
    statusDaResposta = res.status;
    corpoDaResposta = await res.json();
  } catch (e: any) {
    if (!String(e && e.message).includes(SENTINELA)) throw e;
    corpoDaResposta = { lancouOSentinela: true };
  } finally {
    silencios.forEach((s) => s.mockRestore());
    for (const n of NOMES_ENV) { if (anterior[n] === undefined) delete process.env[n]; else process.env[n] = anterior[n]!; }
  }
  return { capturado, chamouModelo, interrompidoAntesDeConteudo, chamouVoyage, chamouIndice, statusDaResposta, corpoDaResposta };
}

// ============================================================
// MEDIÇÃO
// ============================================================

let M: any;

beforeAll(async () => {
  const req = ler(REQUISICAO).requisicao;
  const proj = ler(PROJETO);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const contrato = require('@/lib/ai-reviewer/avaliacao-qualidade');

  const fontes = CANDIDATAS.map((c) => ({ ...c, valorHoje: valorDe(c.chave, req, proj) }));

  const numericas = fontes.filter((f) => typeof f.valorHoje === 'number');
  const valoresDistintos = Array.from(new Set(numericas.map((f) => f.valorHoje as number))).sort((a, b) => a - b);

  const listaReq = Array.isArray(req?.qualityAnalysis?.respondents) ? req.qualityAnalysis.respondents : [];
  const ids = identificadoresDe(listaReq);
  const cr = crPorRespondente(listaReq);

  // classificação da requisição de referência, pelo contrato real
  const classificacaoDaReferencia = contrato.classificarAvaliacaoRecebida(req);

  // os quatro casos
  const casos: any[] = [];
  for (const c of CASOS) {
    const payload = c.montar();
    const r = await executar(payload);
    const classificacao = contrato.classificarAvaliacaoRecebida(payload);
    casos.push({
      nome: c.nome,
      condicaoPreparada: c.condicaoPreparada,
      // ⚠ registrado À PARTE da condição preparada
      classificacaoDevolvida: classificacao,
      executadoAntesDaInterrupcao: {
        chamouOModelo: r.chamouModelo,
        interrompidoAntesDeConteudo: r.interrompidoAntesDeConteudo,
        chamadasAVoyage: r.chamouVoyage,
        chamadasAoIndice: r.chamouIndice,
        contextoTrazAvisoDeSuspensao: r.capturado.messages.includes(MARCA_SUSPENSAO),
        contextoTrazPercentualDeQualidade: MARCADORES_DE_PERCENTUAL.some((m) => r.capturado.messages.includes(m)),
        marcadoresDePercentualEncontrados: MARCADORES_DE_PERCENTUAL.filter((m) => r.capturado.messages.includes(m)),
        ramoDoResumoDeQualidade: ramoDoResumo(r.capturado.messages),
        blocoDeQualidadeNoContexto: blocoDeQualidade(r.capturado.messages),
        bytesDoContexto: Buffer.byteLength(r.capturado.messages, 'utf8'),
      },
      respostaDecorrenteDaInterrupcao: {
        nota: 'NAO e a resposta normal do handler: o duplo lancou o sentinela dentro de messages.create',
        status: r.statusDaResposta,
        chavesDoCorpo: r.corpoDaResposta ? Object.keys(r.corpoDaResposta) : null,
        notaSuspensaPresente: r.corpoDaResposta ? 'notaSuspensa' in r.corpoDaResposta : null,
      },
    });
  }

  M = {
    rodada: 'A.12 bloqueios, DIAGNOSTICO',
    natureza: 'LEVANTA E MEDE. Nao escolhe fonte de universo, nao corrige dado, nao altera producao. Nenhum parecer produzido, real ou simulado.',
    identificacao: {
      commitDaBase: 'f964049b3f6639b874111356d8f84b5463793a34',
      artefatos: Object.fromEntries([REQUISICAO, PROJETO].map((f) => [f, shaArquivo(f)])),
      codigo: Object.fromEntries([CONTRATO, ROTA, TELA, COMPONENTE].map((f) => [f, shaArquivo(f)])),
    },
    universo: {
      fontesCandidatas: fontes,
      divergencia: {
        criterio: 'valores NUMERICOS das fontes candidatas, na requisicao de referencia e nos dados do projeto',
        valoresDistintos,
        porValor: Object.fromEntries(valoresDistintos.map((v) => [String(v), numericas.filter((f) => f.valorHoje === v).map((f) => f.chave)])),
        naoSeConcilia: 'Os valores ficam registrados com a fonte de cada um. Esta rodada NAO escolhe nem concilia.',
      },
      exclusoes: {
        alcanceConsultado: 'app/, lib/, components/, scripts/, docs/dados/ e docs/calculations-13jul2026.json',
        existeRegistro: {
          resposta: 'SIM, em dois lugares',
          onde: [
            `${PROJETO}: metadata.excludedRespondentIds`,
            'lib/ai-reviewer/review-request.ts:63-68: exclusionInfo, com totalCollected, activeCount, excludedCount e reason',
          ],
          valorHoje: {
            'metadata.excludedRespondentIds': proj?.metadata?.excludedRespondentIds,
            'requisicao.exclusionInfo': req?.exclusionInfo === undefined ? 'AUSENTE' : req.exclusionInfo,
          },
        },
        existeMotivo: {
          resposta: 'PARCIAL, e nao por respondente',
          onde: 'app/api/ai-reviewer/route.ts:831-832 escreve o criterio e a justificativa como TEXTO FIXO no contexto; lib/ai-reviewer/review-request.ts traz um campo reason, textual e unico',
          oQueNaoExiste: 'motivo POR RESPONDENTE: metadata.excludedRespondentIds guarda so identificadores',
        },
        legitimidade: {
          resposta: 'NAO AVALIADA nesta rodada',
          porque: 'legitimidade e juizo sobre o contrato, e esta rodada levanta e mede; ⚠ nenhum criterio de exclusao foi inventado',
        },
      },
    },
    cobertura: {
      listados: listaReq.length,
      presencaDeCR: cr.presencaDeCR,
      valorFinitoPeloContrato: cr.valorFinitoPeloContrato,
      distincaoDeclarada: 'presenca de CR e a contagem que medicaoPorRespondente faz; valor VALIDO pelo contrato e numero finito aceito por crDoRespondente. Nesta requisicao as duas coincidem porque a lista esta vazia.',
      porIdentificador: {
        estado: ids.campoUsado === null ? 'NAO DETERMINADA' : 'determinada',
        porque: ids.campoUsado === null
          ? 'a lista de respondentes da requisicao de referencia esta VAZIA, e os dados do projeto nao trazem array de respondentes com identificador; sem identificador nao ha comparacao'
          : `campo usado: ${ids.campoUsado}`,
        campoUsado: ids.campoUsado,
        idsDistintos: Array.from(new Set(ids.comId)).length,
        idsDuplicados: ids.comId.length - Array.from(new Set(ids.comId)).length,
        semIdentificador: ids.semId,
        contraCadaFonte: 'NAO DETERMINADA: as demais fontes sao TOTAIS, sem identidade, entao nao ha conjunto para interseccao',
        avisoDeEscopo: '⚠ Contagens iguais NAO demonstram cobertura.',
      },
    },
    coerencia: {
      criterio: 'so se comparam agregados COMPATIVEIS: mesma populacao declarada, mesma grandeza e mesma regra de contagem. Tolerancia: igualdade exata de inteiros, porque sao contagens.',
      denominador: req?.overallStats?.total,
      comparacoes: [
        {
          par: 'qualityAnalysis.statistics.total  x  overallStats.total',
          compativel: true, porque: 'ambos declaram o total de respondentes',
          esquerda: req?.qualityAnalysis?.statistics?.total, direita: req?.overallStats?.total,
          confere: req?.qualityAnalysis?.statistics?.total === req?.overallStats?.total,
        },
        {
          par: 'qualityAnalysis.summary.total  x  overallStats.total',
          compativel: true, porque: 'ambos declaram o total de respondentes',
          esquerda: req?.qualityAnalysis?.summary?.total, direita: req?.overallStats?.total,
          confere: req?.qualityAnalysis?.summary?.total === req?.overallStats?.total,
        },
        {
          par: 'qualityAnalysis.summary.ok  x  overallStats.valid',
          compativel: true, porque: 'ambos contam respondentes sem problema de consistencia, sobre o mesmo total declarado',
          esquerda: req?.qualityAnalysis?.summary?.ok, direita: req?.overallStats?.valid,
          confere: req?.qualityAnalysis?.summary?.ok === req?.overallStats?.valid,
        },
        {
          par: 'qualityAnalysis.respondents.length  x  qualityAnalysis.statistics.total',
          compativel: true, porque: 'a lista deveria compor o total que a mesma secao declara',
          esquerda: listaReq.length, direita: req?.qualityAnalysis?.statistics?.total,
          confere: listaReq.length === req?.qualityAnalysis?.statistics?.total,
        },
        {
          par: 'demographicsSummary.total  x  overallStats.total',
          compativel: false,
          porque: '⚠ NAO COMPARADOS: o resumo demografico nao declara a mesma populacao nem a mesma regra; comparar seria inventar equivalencia',
          esquerda: req?.demographicsSummary?.total, direita: req?.overallStats?.total, confere: null,
        },
      ],
      contradicoesConservadas: 'Os dois valores de cada par ficam registrados com a fonte. ⚠ Nenhum dado foi corrigido.',
    },
    caminhoAteOGestor: {
      classificacao: [
        { onde: `${CONTRATO}:61`, o_que: 'classificarAvaliacaoRecebida, o contrato do lado da rota' },
        { onde: `${CONTRATO}:100`, o_que: 'classificarAvaliacaoDaTela, o contrato do lado da tela' },
        { onde: `${TELA}:1180`, o_que: 'a tela classifica antes de montar a requisicao' },
        { onde: `${ROTA}:544`, o_que: 'normalizeRequest classifica a requisicao recebida' },
      ],
      contextoDoModelo: [
        { onde: `${ROTA}:680`, o_que: 'avaliada = qualidadeDisponivel(...), que decide se percentuais entram' },
        { onde: `${ROTA}:687`, o_que: 'so com avaliada verdadeiro o byStatus vira texto' },
        { onde: `${ROTA}:771-778`, o_que: 'sem avaliacao, entra o aviso de suspensao e NENHUM percentual' },
      ],
      notaEVeredicto: [
        { onde: `${ROTA}:333`, o_que: 'calculateGrade' },
        { onde: `${ROTA}:337-341`, o_que: 'SUSPENSAO: sem qualidade disponivel devolve suspensa com motivo, e nota, veredicto e score nulos' },
        { onde: `${ROTA}:1507-1508`, o_que: 'notaSuspensa entra na resposta com rotulo, motivo e a avaliacao' },
        { onde: `${ROTA}:1519`, o_que: 'gradeSource vira suspensa' },
      ],
      tela: [
        { onde: `${TELA}:1309`, o_que: 'a tela recebe notaSuspensa da resposta' },
        { onde: `${COMPONENTE}:213-216`, o_que: 'quando suspensa, exibe rotulo e motivo' },
        { onde: `${COMPONENTE}:225`, o_que: 'com suspensa, nota e veredicto NAO sao exibidos' },
      ],
      estadoDeSuspensaoAtual: {
        implementado: true,
        oQueAciona: 'qualidadeDisponivel(avaliacao) falso, isto e, estado diferente de disponivel',
        oQueNaoAciona: '⚠ contradicao entre individuais e agregados NAO aciona: o contrato nao a examina',
      },
      avisoDeAlcance: '⚠ As linhas da tela e do componente foram LIDAS no codigo. A apresentacao efetiva ao gestor NAO foi exercitada nesta rodada.',
    },
    classificacaoDaRequisicaoDeReferencia: classificacaoDaReferencia,
    quatroCasos: casos,
    oQueIstoNaoDemonstra: [
      'NAO escolhe a fonte do universo: e decisao de produto, do autor',
      'NAO demonstra recepcao pelo modelo: o duplo interrompe antes de qualquer conteudo',
      'NAO exercita a apresentacao ao gestor: as linhas da interface foram lidas, nao executadas',
      'NAO julga a legitimidade das exclusoes',
      'NAO corrige nenhum dado',
    ],
  };

  if (GRAVAR) {
    fs.mkdirSync(path.dirname(ARTEFATO), { recursive: true });
    fs.writeFileSync(ARTEFATO, JSON.stringify(M, null, 2) + '\n');
  }
});

// ------------------------------------------------------------ 3.1
test('3.1: as fontes candidatas estao levantadas, com onde, o que afirmam e o que nao podem', () => {
  expect(M.universo.fontesCandidatas.length).toBe(CANDIDATAS.length);
  for (const f of M.universo.fontesCandidatas) {
    expect(f.ondeEsta.artefato).toBeTruthy();
    expect(f.ondeEsta.caminho).toBeTruthy();
    expect(f.ondeEsta.contrato).toBeTruthy();
    expect(f.oQueAfirma).toBeTruthy();
    expect(f.podeResponder).toBeTruthy();
    expect(f.naoPodeResponder).toBeTruthy();
    expect(f).toHaveProperty('valorHoje');
  }
});

test('3.1: a divergencia esta registrada com os valores, sem escolha e sem conciliacao', () => {
  // ⚠ Há mais de um valor numérico entre as fontes: é a divergência medida.
  expect(M.universo.divergencia.valoresDistintos.length).toBeGreaterThan(1);
  for (const v of M.universo.divergencia.valoresDistintos) {
    expect(M.universo.divergencia.porValor[String(v)].length).toBeGreaterThan(0);
  }
  expect(M.universo.divergencia.naoSeConcilia).toMatch(/NAO escolhe nem concilia/);
  expect(JSON.stringify(M.universo)).not.toMatch(/fonte escolhida|adotamos|decidimos usar/i);
});

test('3.1: exclusoes tratam registro, motivo e legitimidade como verificacoes DISTINTAS', () => {
  const e = M.universo.exclusoes;
  expect(e.alcanceConsultado).toBeTruthy();
  expect(e.existeRegistro.resposta).toBeTruthy();
  expect(e.existeMotivo.resposta).toBeTruthy();
  expect(e.legitimidade.resposta).toBe('NAO AVALIADA nesta rodada');
  expect(e.legitimidade.porque).toMatch(/nenhum criterio de exclusao foi inventado/);
  // As três são chaves separadas, e não uma derivada da outra.
  expect(Object.keys(e)).toEqual(['alcanceConsultado', 'existeRegistro', 'existeMotivo', 'legitimidade']);
});

// ------------------------------------------------------------ 3.2
test('3.2: a cobertura por IDENTIFICADOR fica NAO DETERMINADA, e contagem nao a substitui', () => {
  const p = M.cobertura.porIdentificador;
  expect(p.estado).toBe('NAO DETERMINADA');
  expect(p.campoUsado).toBeNull();
  expect(p.contraCadaFonte).toMatch(/^NAO DETERMINADA/);
  expect(p.avisoDeEscopo).toMatch(/Contagens iguais NAO demonstram cobertura/);
});

test('3.2: presenca de CR e valor valido sao campos distintos', () => {
  expect(M.cobertura).toHaveProperty('presencaDeCR');
  expect(M.cobertura).toHaveProperty('valorFinitoPeloContrato');
  expect(M.cobertura.distincaoDeclarada).toBeTruthy();
});

test('3.2: a coerencia compara SO agregados compativeis, com denominador e tolerancia', () => {
  expect(M.coerencia.criterio).toMatch(/Tolerancia/);
  expect(M.coerencia).toHaveProperty('denominador');
  const incompativeis = M.coerencia.comparacoes.filter((c: any) => !c.compativel);
  expect(incompativeis.length).toBeGreaterThan(0);
  for (const c of incompativeis) expect(c.confere).toBeNull();
  for (const c of M.coerencia.comparacoes) {
    expect(c).toHaveProperty('esquerda');
    expect(c).toHaveProperty('direita');
    expect(c.porque).toBeTruthy();
  }
  expect(M.coerencia.contradicoesConservadas).toMatch(/Nenhum dado foi corrigido/);
});

// ------------------------------------------------------------ 3.3
test('3.3: o caminho ate o gestor esta mapeado por arquivo e linha', () => {
  const c = M.caminhoAteOGestor;
  for (const grupo of ['classificacao', 'contextoDoModelo', 'notaEVeredicto', 'tela']) {
    expect(c[grupo].length).toBeGreaterThan(0);
    for (const item of c[grupo]) {
      expect(item.onde).toMatch(/:\d+/);
      expect(item.o_que).toBeTruthy();
    }
  }
  expect(c.estadoDeSuspensaoAtual.implementado).toBe(true);
  expect(c.estadoDeSuspensaoAtual.oQueNaoAciona).toMatch(/contradicao .* NAO aciona/);
  expect(c.avisoDeAlcance).toMatch(/NAO foi exercitada/);
});

test('3.3: os quatro casos trazem condicao preparada e classificacao devolvida SEPARADAS', () => {
  expect(M.quatroCasos.length).toBe(4);
  for (const c of M.quatroCasos) {
    expect(c.condicaoPreparada.campos).toBeTruthy();
    expect(c.condicaoPreparada.valores).toBeTruthy();
    expect(c.condicaoPreparada.relacoes).toBeTruthy();
    expect(c.classificacaoDevolvida).toHaveProperty('estado');
    expect(c.classificacaoDevolvida).toHaveProperty('motivo');
    expect(c.classificacaoDevolvida).toHaveProperty('fonte');
  }
});

test('3.3: nenhum parecer produzido, e a interrupcao precede qualquer conteudo', () => {
  for (const c of M.quatroCasos) {
    expect(c.executadoAntesDaInterrupcao.chamouOModelo).toBe(true);
    expect(c.executadoAntesDaInterrupcao.interrompidoAntesDeConteudo).toBe(true);
  }
  // ⚠ Nenhum texto de parecer existe no artefato.
  expect(JSON.stringify(M)).not.toMatch(/DECIS[AÃ]O EDITORIAL|PARECER DE ENSAIO/);
});

test('3.3: nenhuma chamada externa de recuperacao nem de embedding', () => {
  for (const c of M.quatroCasos) {
    expect(c.executadoAntesDaInterrupcao.chamadasAVoyage).toBe(0);
    expect(c.executadoAntesDaInterrupcao.chamadasAoIndice).toBe(0);
  }
});

test('3.3: a resposta da interrupcao NAO e apresentada como resposta normal', () => {
  for (const c of M.quatroCasos) {
    expect(c.respostaDecorrenteDaInterrupcao.nota).toMatch(/NAO e a resposta normal do handler/);
  }
});

/**
 * ⚠ **O QUARTO CASO é o achado da rodada.** O contrato atual vê `disponivel` e a
 * classificação global NÃO é suspensa, embora individuais e agregados se
 * contradigam em três pontos preparados.
 */
test('3.3: o quarto caso mostra o que o contrato ATUAL nao distingue', () => {
  const c4 = M.quatroCasos.find((c: any) => c.nome === 'C-contradicao');
  expect(c4.condicaoPreparada.relacoes).toMatch(/contradicao 1.*contradicao 2.*contradicao 3/s);
  // A condição preparada e a classificação devolvida são registradas à parte.
  expect(c4.condicaoPreparada.oQueOContratoAtualVE).toMatch(/NENHUMA das tres contradicoes e examinada/);
  expect(c4.classificacaoDevolvida.estado).toBe('disponivel');
  // E o contexto entregue traz percentuais, como se a avaliação fosse íntegra.
  const e4 = c4.executadoAntesDaInterrupcao;
  expect(e4.contextoTrazAvisoDeSuspensao).toBe(false);
  expect(e4.contextoTrazPercentualDeQualidade).toBe(true);
  // ⚠ O contexto leva a CONTRADIÇÃO adiante, e com percentual: o bloco declara
  // nove especialistas e cem por cento críticos, enquanto a lista traz quatro
  // respondentes, todos com CR 0.05, e foi ela que produziu `disponivel`.
  const bloco4 = e4.blocoDeQualidadeNoContexto.join('\n');
  expect(e4.ramoDoResumoDeQualidade).toMatch(/^P1:/);
  expect(bloco4).toContain('Total: 9 especialistas');
  expect(bloco4).toContain('- Respostas CRÍTICAS (CR > 0.20): 9 (100.0%)');
  expect(bloco4).toContain('- Respostas CONFIÁVEIS (CR ≤ 0.10): 0 (0.0%)');
});

test('3.3: os tres primeiros casos se comportam como o contrato declara', () => {
  const por = (n: string) => M.quatroCasos.find((c: any) => c.nome === n);
  expect(por('C-disponivel').classificacaoDevolvida.estado).toBe('disponivel');
  expect(por('C-ausente').classificacaoDevolvida.estado).toBe('ausente');
  expect(por('C-incompleta').classificacaoDevolvida.estado).toBe('incompleta');
  // Nos dois sem disponibilidade, o contexto traz o aviso e nenhum percentual.
  for (const n of ['C-ausente', 'C-incompleta']) {
    expect(por(n).executadoAntesDaInterrupcao.contextoTrazAvisoDeSuspensao).toBe(true);
    expect(por(n).executadoAntesDaInterrupcao.contextoTrazPercentualDeQualidade).toBe(false);
  }
});

/**
 * ⚠ **Assertiva que faltava na primeira execução.** Sem ela, o falso negativo do
 * regex passava: nada exigia `true` onde o contexto traz percentual.
 */
test('3.3: nos dois casos com avaliacao disponivel o contexto TRAZ percentual', () => {
  const por = (n: string) => M.quatroCasos.find((c: any) => c.nome === n);
  for (const n of ['C-disponivel', 'C-contradicao']) {
    const e = por(n).executadoAntesDaInterrupcao;
    expect(e.contextoTrazAvisoDeSuspensao).toBe(false);
    expect(e.contextoTrazPercentualDeQualidade).toBe(true);
    expect(e.marcadoresDePercentualEncontrados.length).toBeGreaterThan(0);
    expect(e.ramoDoResumoDeQualidade).toMatch(/^P[123]:/);
    expect(e.blocoDeQualidadeNoContexto.length).toBeGreaterThan(1);
  }
  // E nos dois sem disponibilidade o ramo é o da suspensão, sem nenhum marcador.
  for (const n of ['C-ausente', 'C-incompleta']) {
    const e = por(n).executadoAntesDaInterrupcao;
    expect(e.ramoDoResumoDeQualidade).toMatch(/^suspensao:/);
    expect(e.marcadoresDePercentualEncontrados).toEqual([]);
  }
});

/**
 * Amarra os marcadores ao texto de produção: se a rota mudar a redação, este teste
 * reprova, em vez de o detector devolver `false` em silêncio.
 */
test('os marcadores do contexto coincidem com o texto de producao', () => {
  const fonte = fs.readFileSync(path.join(RAIZ, ROTA), 'utf8');
  const todos = [MARCA_SUSPENSAO, MARCA_NOTA_SAATY_P1, CABECALHO_P12, CABECALHO_P3, CABECALHO_SUSPENSAO, ...MARCADORES_DE_PERCENTUAL];
  for (const m of todos) expect({ marcador: m, presente: fonte.includes(m) }).toEqual({ marcador: m, presente: true });
  // ⚠ Contra-exemplo: a string que o regex defeituoso procurava NÃO existe ali.
  expect(fonte.includes(MARCADOR_INEXISTENTE)).toBe(false);
  // ⚠ Contra-exemplo do detector: texto sem nenhum marcador não pode dar ramo.
  expect(ramoDoResumo('texto qualquer sem bloco de qualidade')).toBe('nenhum dos quatro ramos reconhecido');
  expect(blocoDeQualidade('texto qualquer sem bloco de qualidade')).toEqual([]);
  expect(MARCADORES_DE_PERCENTUAL.some((m) => 'texto qualquer'.includes(m))).toBe(false);
});

test('os casos sinteticos ficam FORA das contagens dos dados reais', () => {
  expect(JSON.stringify(M.universo)).not.toMatch(/resp-\d|sintético|C-contradicao/);
  expect(JSON.stringify(M.cobertura)).not.toMatch(/resp-\d/);
  expect(JSON.stringify(M.coerencia)).not.toMatch(/resp-\d/);
});

test('o registro diz o que NAO demonstra', () => {
  const s = JSON.stringify(M.oQueIstoNaoDemonstra);
  expect(s).toMatch(/NAO escolhe a fonte do universo/);
  expect(s).toMatch(/NAO exercita a apresentacao ao gestor/);
  expect(s).toMatch(/NAO julga a legitimidade/);
  expect(M.natureza).toMatch(/Nenhum parecer produzido/);
});

test('o artefato gravado coincide com a medicao atual', () => {
  expect(fs.existsSync(ARTEFATO)).toBe(true);
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  for (const chave of ['universo', 'cobertura', 'coerencia', 'caminhoAteOGestor', 'classificacaoDaRequisicaoDeReferencia', 'quatroCasos']) {
    expect(gravado[chave]).toEqual(M[chave]);
  }
  expect(gravado.identificacao.artefatos).toEqual(M.identificacao.artefatos);
  expect(gravado.identificacao.codigo).toEqual(M.identificacao.codigo);
});
