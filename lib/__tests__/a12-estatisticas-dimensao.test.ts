export {};

/**
 * A.12, estatísticas por dimensão BOCR, SAÍDA A: o que o modelo RECEBE.
 *
 * ⚠ **Instrumento, declarado.** Estes ensaios passam pelo TRATADOR REAL de `POST /api/ai-reviewer`,
 * com o cliente do modelo SIMULADO (chave falsa, texto controlado, sem rede), e capturam o contexto
 * COMPLETO (`system` e `messages`) antes da geração. Nenhum parecer é gerado, e a redação do modelo
 * sobre estas frases NÃO é testada.
 *
 * ⚠ **Limites.** A tela não é executada por teste algum: o passo dela aqui é uma CÓPIA LITERAL de
 * `page.tsx:1058-1088` (a redução do agregado) e de `:1236-1315` (o payload). Os agregados de 3 e de 5
 * e as variantes são CONSTRUÍDOS; os de 12 usam CRs de um painel real, mas o agregado é montado pela
 * cópia da tela. Coerência interna do pedido, sem cobertura do universo real.
 *
 * ⚠ **O que a saída A decide** (predição registrada ANTES do código, em `docs/imprecisoes-parecer-ia.md`,
 * seção "A.12: estatísticas por dimensão BOCR, Fase 2 (saída A): predição datada"): o contexto não
 * apresenta os quocientes do agregado como contagens medidas por dimensão nem como participação nas
 * matrizes; o bloco declara a estatística por dimensão NÃO DISPONÍVEL nesta requisição, com o motivo;
 * a frase de indisponibilidade EXISTENTE, para o pedido não avaliado, fica palavra por palavra; e a
 * Taxa de Validade Geral só é 0.0% quando o zero é MEDIDO.
 *
 * ⚠ **Este arquivo NÃO afirma que número por dimensão seja contraditório em si.** Denominadores por
 * dimensão poderiam diferir, se corretamente nomeados; isso é assunto da saída B, que não foi escolhida.
 *
 * ⚠ **A proibição de zero é sobre SUBSTITUIR DADO AUSENTE, e não sobre o literal.** Zero sustentado por
 * dado presente permanece (ensaio 2b), e um detector que proibisse o literal no contexto completo
 * reprovaria esse controle: o contraexemplo está no próprio ensaio.
 *
 * ⚠ **As linhas de base de `35a1506`** (sha256 do contexto completo de cada cenário, medido pela sonda
 * sobre o código ANTERIOR à saída A) ficam em `docs/dados/a12-estatisticas-dimensao/saida-a/`. Este
 * arquivo as usa para medir que o contexto novo é o antigo com EXATAMENTE as substituições declaradas.
 *
 * ⚠ **Reconciliação de 01/10/2026 (`cobertura.restringiu`).** Em todo cenário COM vínculo o vínculo é o `vinculado` do
 * produtor real (nada retirado), e a abertura da linha "Cobertura enviada" deixou de ser "RESTRINGIDO" para ser a do
 * vínculo sem retirada. A reversão ao texto anterior e o esperado a partir da Fase 1 passaram a admitir EXATAMENTE essa
 * troca (`ABERTURA_COBERTURA_*`), CONTADA em cada cenário, e o restante do contexto segue comparado byte a byte. Os
 * arquivos históricos (`docs/dados/a12-estatisticas-dimensao/` e `saida-a/contextos-depois/`) ficam INTACTOS. Isto
 * NÃO reabre a saída A: as decisões e as capturas dela são as mesmas.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

import { CHAVE_DE_LEITURA_DAS_CONTAGENS, lerVinculoParaTexto, prepararVinculoDaTela } from '@/lib/ai-reviewer/vinculo-execucao';
import { classificarAvaliacaoDaTela } from '@/lib/ai-reviewer/avaliacao-qualidade';

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sha256 = (t: string): string => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;

const PASTA_FASE1 = 'docs/dados/a12-estatisticas-dimensao';
const PASTA_SAIDA_A = `${PASTA_FASE1}/saida-a`;

// ---------------------------------------------------------------------------
// Cliente do modelo SIMULADO. ⚠ Chave falsa, texto controlado, e nada de rede.
// ---------------------------------------------------------------------------

const CHAVE = 'chave-anthropic-falsa-do-processo-de-teste';
const SEM_VEREDICTO = 'Parecer de ensaio, sem decisão editorial declarada no texto. '.repeat(3);
const ENV_ANTES = { chave: process.env.ANTHROPIC_API_KEY, flag: process.env.USE_RAG_SEMANTIC };
process.env.ANTHROPIC_API_KEY = CHAVE;
delete process.env.USE_RAG_SEMANTIC;

const captura: { contexto: string; system: string; chamadas: number } = { contexto: '', system: '', chamadas: 0 };

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = {
      create: async (a: { system?: unknown; messages: Array<{ content: string }> }) => {
        captura.chamadas += 1;
        captura.contexto = a.messages.map((m) => m.content).join('\n');
        captura.system = typeof a.system === 'string' ? a.system : JSON.stringify(a.system ?? '');
        return { content: [{ type: 'text', text: SEM_VEREDICTO }] };
      },
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/ai-reviewer/route');

let silencios: jest.SpyInstance[] = [];
beforeAll(() => {
  silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
});
afterAll(() => {
  silencios.forEach((s) => s.mockRestore());
  if (ENV_ANTES.chave === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ENV_ANTES.chave;
  if (ENV_ANTES.flag === undefined) delete process.env.USE_RAG_SEMANTIC; else process.env.USE_RAG_SEMANTIC = ENV_ANTES.flag;
});
jest.setTimeout(60000);

type Resposta = { contexto: string; system: string; completo: string; corpo: any; status: number };

/** Executa o tratador REAL, e devolve o contexto COMPLETO capturado e o corpo da resposta. */
async function executar(payload: Record<string, unknown>): Promise<Resposta> {
  captura.contexto = '';
  captura.system = '';
  const antes = captura.chamadas;
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  const corpo = await res.json();
  // ⚠ CONTROLE de captura NÃO VAZIA: sem isto, toda ausência passaria por vacuidade.
  expect(captura.chamadas).toBe(antes + 1);
  expect(captura.contexto).toContain('## Pesos Finais da Hierarquia de Controle');
  return { contexto: captura.contexto, system: captura.system, completo: `${captura.system}\n${captura.contexto}`, corpo, status: res.status ?? 200 };
}

// ---------------------------------------------------------------------------
// As redações, ABSOLUTAS: escritas a partir do que a predição registra, e NÃO importadas da rota.
// ---------------------------------------------------------------------------

/** O bloco, no pedido ELEGÍVEL (a frase nova da saída A). */
const FRASE_DO_BLOCO_AVALIADA =
  '⚠️ Contagem por dimensão BOCR: não disponível nesta requisição (respostas totais, válidas, warning e críticas por dimensão). ' +
  'Os totais deste contexto são agregados e não identificam a dimensão: nenhuma contagem por dimensão é apresentada, e nenhuma deve ser derivada deles.';
/** O bloco, no pedido NÃO avaliado: a frase EXISTENTE de `35a1506`, palavra por palavra. */
const FRASE_DO_BLOCO_NAO_AVALIADA = '⚠️ Não disponíveis: a qualidade individual não foi avaliada. Nenhum percentual por dimensão é apresentado.';
/** A Taxa, no pedido NÃO avaliado: a linha EXISTENTE de `35a1506`. */
const TAXA_NAO_AVALIADA = '**Taxa de Validade Geral:** não calculada — qualidade individual não avaliada.';
/** A Taxa, avaliada e SEM base (nenhuma fonte de contagem com total positivo). */
const TAXA_SEM_BASE = '**Taxa de Validade Geral:** não calculada — nenhuma das contagens agregadas recebidas nesta requisição (por status, resumo ou totais gerais) traz total positivo.';
/** O item da chave de leitura que substitui o de `35a1506`. */
const ITEM_NOVO =
  '  - "Estatísticas por Dimensão" BOCR: nenhuma contagem por dimensão é apresentada neste contexto, e nenhuma deve ser derivada dos totais agregados, ' +
  'que NÃO são contagem por dimensão nem participação por dimensão nas matrizes.';
/** O item de `35a1506`: descreve a divisão por quatro. ⚠ Só para o CONTRAEXEMPLO e para a reversão. */
const ITEM_ANTIGO =
  '  - os totais por dimensão BOCR de "Estatísticas por Dimensão" NÃO medem a participação por dimensão e NÃO são o N de matriz alguma ' +
  '(quando a requisição traz o total agregado, como a da tela, a rota o reparte por quatro, arredondando para baixo).';
/**
 * A.12, `cobertura.restringiu` (rodada de 01/10/2026): a abertura da linha "Cobertura enviada" que `8e165fb` imprimia para
 * TODO vínculo comparado, e a que a substitui no vínculo SEM retirada. Todos os vínculos com o campo, nestes cenários, são o
 * `vinculado` do produtor real (n avaliados, n enviados, nada retirado), e por isso a linha mudou neles, e SÓ nela.
 * ⚠ Isto NÃO reabre a saída A: a reconciliação admite EXATAMENTE essa troca, e o restante do contexto segue comparado.
 */
const ABERTURA_COBERTURA_ANTIGA = '- Cobertura enviada: o conjunto avaliado foi RESTRINGIDO aos identificadores presentes no documento de cálculo, e ';
const ABERTURA_COBERTURA_SEM_RETIRADA =
  '- Cobertura enviada: o filtro pelos identificadores do documento foi aplicado; nenhum elemento da lista avaliada foi retirado, e ';

const CABECALHO_DO_BLOCO = '## Estatísticas por Dimensão BOCR';
const CABECALHO_SEGUINTE = '## Pesos Finais da Hierarquia de Controle';

/** O trecho do bloco: entre o cabeçalho e o próximo `##`, sem as linhas em branco das pontas. */
function trechoDoBloco(contexto: string): string {
  expect(ocorrencias(contexto, CABECALHO_DO_BLOCO)).toBe(1);
  const i = contexto.indexOf(CABECALHO_DO_BLOCO) + CABECALHO_DO_BLOCO.length;
  const j = contexto.indexOf(CABECALHO_SEGUINTE, i);
  expect(j).toBeGreaterThan(i);
  return contexto.slice(i, j).trim();
}

/** Troca o trecho do bloco por outro, mantendo o resto do contexto. */
function comTrechoDoBloco(contexto: string, novo: string): string {
  const inicio = contexto.indexOf(CABECALHO_DO_BLOCO + '\n\n') + (CABECALHO_DO_BLOCO + '\n\n').length;
  const fim = contexto.indexOf('\n\n' + CABECALHO_SEGUINTE, inicio);
  expect(inicio).toBeGreaterThan(CABECALHO_DO_BLOCO.length);
  expect(fim).toBeGreaterThan(inicio);
  return contexto.slice(0, inicio) + novo + contexto.slice(fim);
}

const linhaDaTaxa = (contexto: string): string => {
  const linhas = contexto.split('\n').filter((l) => l.startsWith('**Taxa de Validade Geral:**'));
  expect(linhas.length).toBe(1);
  return linhas[0];
};

// ---------------------------------------------------------------------------
// O TEXTO ANTERIOR, reconstruído para o CONTRAEXEMPLO e para a reversão.
// ⚠ Cópia de `route.ts` em `35a1506`: a divisão (`:563-606`) e o bloco (`:1143-1177`). Ela é CONFERIDA,
//   nos ensaios, contra os contextos capturados na Fase 1 e contra o sha256 de cada cenário da base.
// ---------------------------------------------------------------------------

type Dimensao = { total: number; valid: number; warning: number; critical: number; avgCR?: number };

function dimensoesDoTextoAnterior(individualStats: any): Record<'Benefits' | 'Opportunities' | 'Costs' | 'Risks', Dimensao> {
  let s = individualStats;
  if (s && !s.Benefits) {
    const q = (x: number) => Math.floor(x / 4) || 0;
    const d = { total: q(s.total), valid: q(s.valid), warning: q(s.warning), critical: q(s.critical) };
    s = { Benefits: { ...d }, Opportunities: { ...d }, Costs: { ...d }, Risks: { ...d } };
  }
  if (!s) {
    const z = () => ({ total: 0, valid: 0, warning: 0, critical: 0 });
    s = { Benefits: z(), Opportunities: z(), Costs: z(), Risks: z() };
  }
  return s;
}

function blocoDoTextoAnterior(individualStats: any): string {
  const d = dimensoesDoTextoAnterior(individualStats);
  const secao = (rotulo: string, x: Dimensao) =>
    `### ${rotulo}\n` +
    `- Respostas totais: ${x.total}\n` +
    `- Válidas (CR ≤ 0.10): ${x.valid} (${x.total > 0 ? ((x.valid / x.total) * 100).toFixed(1) : '0'}%)\n` +
    `- Warning (0.10 < CR ≤ 0.20): ${x.warning}\n` +
    `- Críticas (CR > 0.20): ${x.critical}\n` +
    `${x.avgCR ? `- CR médio da dimensão: ${(x.avgCR * 100).toFixed(2)}%` : ''}`;
  return [
    secao('Benefits (Benefícios)', d.Benefits),
    secao('Opportunities (Oportunidades)', d.Opportunities),
    secao('Costs (Custos)', d.Costs),
    secao('Risks (Riscos)', d.Risks),
  ].join('\n\n');
}

/**
 * O contexto NOVO, levado de volta ao texto anterior: o bloco (se elegível), o item da chave (se houver) e, A.12
 * `cobertura.restringiu`, a abertura da linha de cobertura do vínculo sem retirada (se houver). ⚠ NADA além disso.
 */
function paraOTextoAnterior(novo: string, individualStats: any, elegivel: boolean): string {
  let c = novo;
  if (elegivel) {
    expect(trechoDoBloco(c)).toBe(FRASE_DO_BLOCO_AVALIADA);
    c = comTrechoDoBloco(c, blocoDoTextoAnterior(individualStats));
  }
  if (c.includes(ITEM_NOVO)) {
    expect(ocorrencias(c, ITEM_NOVO)).toBe(1);
    c = c.replace(ITEM_NOVO, ITEM_ANTIGO);
  }
  // ⚠ A troca é de UMA ocorrência, e SÓ dessa abertura: o resto do contexto segue comparado byte a byte. A ocorrência é
  //   CONTADA em cada ponto de chamada, para que a reversão não passe por vacuidade onde ela deveria acontecer.
  if (c.includes(ABERTURA_COBERTURA_SEM_RETIRADA)) {
    expect(ocorrencias(c, ABERTURA_COBERTURA_SEM_RETIRADA)).toBe(1);
    c = c.replace(ABERTURA_COBERTURA_SEM_RETIRADA, ABERTURA_COBERTURA_ANTIGA);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Payloads com a forma que a TELA monta. ⚠ São duplos de TESTE.
// ---------------------------------------------------------------------------

/** Um elemento como o produtor de qualidade o devolve (`app/api/response-quality/route.ts:377-402`). */
function itemDoProdutor(id: string, cr: number | undefined) {
  const status =
    cr === undefined || cr === 0 ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.15 ? 'REVISAR' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO';
  const semCR = cr === undefined;
  return {
    respondentId: id,
    isSimulated: false,
    status,
    overallScore: 50,
    ...(semCR ? {} : { cr }),
    metrics: semCR ? {} : { avgCR: cr, crBOCR: cr, crBenefits: cr, crOpportunities: cr, crCosts: cr, crRisks: cr },
    flags: [],
    recommendation: '',
  };
}

const balde = (total: number, valid: number, warning = 0, critical = 0) => ({ total, valid, warning, critical, avgCR: 0.05 });

/** COPIA LITERAL da redução de `page.tsx:1058-1088`. A tela não é executada por teste algum. */
function individualStatsDaTela(respondentesEnviados: any[]) {
  let totalCR = 0;
  const acc: any = respondentesEnviados.reduce(
    (acc: any, r: any) => {
      let crValue = 0;
      if (typeof r.cr === 'number') crValue = r.cr;
      else if (r.metrics && typeof r.metrics.avgCR === 'number') crValue = r.metrics.avgCR;
      else if (r.consistency && typeof r.consistency.cr === 'number') crValue = r.consistency.cr;
      else if (typeof r.cr_mean === 'number') crValue = r.cr_mean;
      totalCR += crValue;
      const isExplicitlyBad = r.status === 'SUSPEITO' || r.status === 'CRÍTICO';
      const isMathematicallyBad = crValue > 0.2;
      const isMathematicallySuspect = crValue > 0.1;
      if (isExplicitlyBad || isMathematicallyBad) acc.critical++;
      else if (isMathematicallySuspect) acc.warning++;
      else acc.valid++;
      acc.total++;
      return acc;
    },
    { valid: 0, warning: 0, critical: 0, total: 0 }
  );
  acc.avgCR = acc.total > 0 ? totalCR / acc.total : 0;
  return acc;
}

const HEX_PAINEL = 'b'.repeat(64);
const shaDe = (id: string) => id.padEnd(64, '0').replace(/[^0-9a-f]/g, 'c');

function calculo(ids: string[] | undefined): any {
  const metadata: any = {
    judgmentsDigest: { algorithm: 'sha256', serialization: 'a12-julgamentos-v1', panel: HEX_PAINEL, unavailableReason: null },
  };
  if (ids !== undefined) {
    metadata.includedRespondents = ids.map((id) => ({
      respondentId: id,
      responseDocId: `doc-${id}`,
      identifierSource: 'respondentId',
      judgmentsSha256: shaDe(id),
      judgmentsUnavailableReason: null,
    }));
  }
  return { executionId: 'exec-fiacao-0001', metadata };
}

const ESTADOS = ['indisponivel', 'invalido', 'vinculado', 'divergente'] as const;

/** Um vínculo de cada estado, sobre a MESMA lista avaliada `lista`. ⚠ Em `divergente` a sobra é só do documento. */
function vinculoDoEstado(estado: (typeof ESTADOS)[number], lista: any[]) {
  const ids = lista.map((r) => r.respondentId);
  const doc =
    estado === 'indisponivel' ? calculo(undefined)
    : estado === 'invalido' ? calculo([])
    : estado === 'vinculado' ? calculo(ids)
    : calculo([...ids, 'z-so-no-documento']);
  const preparo = prepararVinculoDaTela({ calculo: doc, respondentesAtivos: lista, respostasAtivas: [] });
  expect(preparo.vinculo.estado).toBe(estado);
  expect(preparo.respondentesEnviados).toEqual(lista); // ⚠ o MESMO conjunto avaliado nos quatro estados
  return preparo.vinculo;
}

/** O payload como `page.tsx:1236-1315` o monta. `comEstatisticas: false` retira byStatus, summary e overallStats. */
function payloadReal(respondentes: any[], opcoes: { comVinculo: boolean; comEstatisticas?: boolean }) {
  const stats = individualStatsDaTela(respondentes);
  const respondentesComCR = respondentes.map((r: any) => ({
    ...r,
    cr: typeof r.cr === 'number' ? r.cr : (r.metrics?.avgCR ?? r.consistency?.cr ?? r.cr_mean ?? 0),
    isSimulated: r.isSimulated === true,
  }));
  const avaliacao = classificarAvaliacaoDaTela({ respondentesAvaliados: respondentes, respostasAtivas: [] });
  const avaliada = avaliacao.estado === 'disponivel';
  const comEstatisticas = opcoes.comEstatisticas !== false;
  const p: any = {
    avaliacaoDeQualidade: avaliacao,
    projectName: 'Projeto da medicao',
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    responseCount: respondentes.length,
    finalScores: [
      { code: 'A1', name: 'Alternativa 1', score: 0.62 },
      { code: 'A2', name: 'Alternativa 2', score: 0.38 },
    ],
    qualityAnalysis: avaliada
      ? {
          respondents: respondentesComCR,
          ...(comEstatisticas
            ? {
                statistics: {
                  byStatus: { 'CONFIÁVEL': stats.valid, 'REVISAR': 0, 'SUSPEITO': stats.warning, 'CRÍTICO': stats.critical },
                  total: stats.total,
                  avgCR: stats.avgCR,
                },
                summary: { total: stats.total, ok: stats.valid, suspicious: stats.warning, critical: stats.critical },
              }
            : {}),
          overall: {},
        }
      : { respondents: respondentesComCR },
    overallStats: avaliada && comEstatisticas ? { total: stats.total, valid: stats.valid, warning: stats.warning, critical: stats.critical } : undefined,
    individualStats: avaliada && stats.total > 0 ? stats : undefined,
  };
  if (opcoes.comVinculo) p.vinculoDaExecucao = vinculoDoEstado('vinculado', respondentesComCR);
  return { payload: p, stats, avaliacao };
}

// ---------------------------------------------------------------------------
// Os CENÁRIOS. ⚠ Os nomes e as construções são os da sonda da base (`35a1506`), sem alteração: é o que
// permite comparar o sha256 do contexto de cada um contra a linha de base.
// ---------------------------------------------------------------------------

const CRS_DO_PAINEL_DE_12 = [0.1139, 0.3747, 1.0927, 0.5903, 0.6359, 0.461, 0.2519, 0.2344, 0.3158, 0.2634, 0.2402, 0.2525];
const CONJUNTOS: Record<string, () => any[]> = {
  'agregado-5': () => [0.05, 0.08, 0.12, 0.18, 0.25].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'agregado-3': () => [0.05, 0.12, 0.25].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'agregado-12': () => CRS_DO_PAINEL_DE_12.map((cr, i) => itemDoProdutor(`R${String(i + 1).padStart(2, '0')}`, cr)),
  'agregado-12-gravado': () => Array.from({ length: 12 }, (_, i) => itemDoProdutor(`R${String(i + 1).padStart(2, '0')}`, 0.05)),
  'agregado-5-com-2-desconhecidos': () => [0.05, 0.08, 0.12, 0, 0].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'todos-validos-3': () => [0.05, 0.06, 0.07].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'todos-acima-3': () => [0.12, 0.13, 0.14].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
};

type Cenario = { payload: any; elegivel: boolean; stats?: any };
const CONSTRUTORES: Record<string, (comVinculo: boolean) => Cenario> = {
  ...Object.fromEntries(
    Object.entries(CONJUNTOS).map(([nome, respondentes]) => [
      nome,
      (comVinculo: boolean): Cenario => {
        const { payload, stats } = payloadReal(respondentes(), { comVinculo });
        return { payload, elegivel: true, stats };
      },
    ])
  ),
  'elegivel-sem-individualStats': (comVinculo) => {
    const { payload, stats } = payloadReal(CONJUNTOS['agregado-5'](), { comVinculo });
    delete payload.individualStats;
    return { payload, elegivel: true, stats };
  },
  'duplo-por-dimensao': (comVinculo) => {
    const { payload, stats } = payloadReal(CONJUNTOS['agregado-5'](), { comVinculo });
    payload.individualStats = { Benefits: balde(5, 5, 0, 0), Opportunities: balde(5, 4, 1, 0), Costs: balde(5, 3, 1, 1), Risks: balde(5, 2, 2, 1) };
    return { payload, elegivel: true, stats };
  },
  'nao-avaliada-ausente': (comVinculo) => {
    const { payload } = payloadReal([], { comVinculo: false });
    if (comVinculo) payload.vinculoDaExecucao = vinculoDoEstado('indisponivel', []);
    return { payload, elegivel: false };
  },
  'nao-avaliada-incompleta': (comVinculo) => {
    const { payload } = payloadReal([itemDoProdutor('r1', 0.05), itemDoProdutor('r2', undefined), itemDoProdutor('r3', 0.06)], { comVinculo });
    return { payload, elegivel: false };
  },
  'contradicao': (comVinculo) => {
    const { payload } = payloadReal(CONJUNTOS['agregado-5'](), { comVinculo });
    payload.qualityAnalysis.summary.critical += 5;
    return { payload, elegivel: false };
  },
  'coerencia-nao-concluida': (comVinculo) => {
    const { payload } = payloadReal(CONJUNTOS['agregado-5'](), { comVinculo });
    delete payload.qualityAnalysis.statistics.total;
    return { payload, elegivel: false };
  },
  'elegivel-total-zero': () => {
    const { payload } = payloadReal(CONJUNTOS['agregado-3'](), { comVinculo: false });
    payload.qualityAnalysis = {
      respondents: [],
      statistics: { byStatus: { 'CONFIÁVEL': 0, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 0, avgCR: 0 },
      summary: { total: 0, ok: 0, suspicious: 0, critical: 0 },
      overall: {},
    };
    payload.overallStats = { total: 0, valid: 0, warning: 0, critical: 0 };
    payload.responseCount = 0;
    payload.individualStats = undefined;
    payload.avaliacaoDeQualidade = { estado: 'disponivel', motivo: null, fonte: 'declarada' };
    return { payload, elegivel: false };
  },
};

const nomeDoCenario = (base: string, comVinculo: boolean) => (base === 'elegivel-total-zero' ? `${base}-semVinculo` : `${base}-${comVinculo ? 'comVinculo' : 'semVinculo'}`);

const LINHAS_DE_BASE = JSON.parse(ler(`${PASTA_SAIDA_A}/contextos-da-base-35a1506.json`));
const daBase = (nome: string) => {
  const e = LINHAS_DE_BASE.cenarios.find((c: any) => c.nome === nome);
  expect(e).toBeDefined();
  return e;
};

/** A Taxa que a MEDIÇÃO sustenta: válidas sobre o total do agregado que a tela mede, recalculada aqui. */
const taxaMedida = (s: { valid: number; total: number }) =>
  `**Taxa de Validade Geral:** ${((s.valid / s.total) * 100).toFixed(1)}% das respostas com CR ≤ 0.10`;

// ---------------------------------------------------------------------------
// Detectores. ⚠ Cada um é CONFERIDO contra o texto anterior (CONTRAEXEMPLO).
// ---------------------------------------------------------------------------

/** O bloco traz número: qualquer dígito. */
const temDigito = (t: string) => /\d/.test(t);
/** O contexto apresenta contagem POR DIMENSÃO (o texto anterior). */
const apresentaContagemPorDimensao = (contexto: string) =>
  /^- Respostas totais: \d+$/m.test(contexto) ||
  /^### (Benefits|Opportunities|Costs|Risks) \(/m.test(contexto) ||
  /CR médio da dimensão/.test(contexto);
/** O detector INGÊNUO: proíbe o literal zero em qualquer ponto do contexto. ⚠ NÃO serve, e o ensaio 2b o mostra. */
const proibeOLiteralZero = (contexto: string) => /(?<![\d.])0(?:\.0)?%|: 0\b/.test(contexto);

// ============================================================ ensaio 1
describe('ensaio 1: agregado de 12, com e sem `vinculoDaExecucao`: nenhuma dimensão traz número, e o bloco declara não disponível, com motivo', () => {
  test.each([['agregado-12'], ['agregado-12-gravado']])('%s: o bloco é a frase nova, sem dígito, e não traz "3" nas quatro', async (base) => {
    for (const comVinculo of [false, true]) {
      const { payload, stats } = CONSTRUTORES[base](comVinculo);
      const r = await executar(payload);
      expect(r.status).toBe(200);
      const trecho = trechoDoBloco(r.contexto);
      expect(trecho).toBe(FRASE_DO_BLOCO_AVALIADA);
      expect(trecho).toContain('não disponível nesta requisição');
      expect(trecho).toContain('Os totais deste contexto são agregados e não identificam a dimensão');
      expect(temDigito(trecho)).toBe(false);
      expect(trecho).not.toMatch(/não existe/i);
      expect(apresentaContagemPorDimensao(r.completo)).toBe(false);
      // o agregado que a tela mediu é o mesmo de antes: 12 respondentes
      expect(stats.total).toBe(12);

      // CONTRAEXEMPLO: o texto atual (de `35a1506`), com "3" nas quatro dimensões, reprova o MESMO detector
      const anterior = comTrechoDoBloco(r.contexto, blocoDoTextoAnterior(payload.individualStats));
      expect(ocorrencias(trechoDoBloco(anterior), '- Respostas totais: 3')).toBe(4);
      expect(temDigito(trechoDoBloco(anterior))).toBe(true);
      expect(apresentaContagemPorDimensao(anterior)).toBe(true);
    }
  });
});

// ============================================================ ensaio 2
describe('ensaio 2: agregados de 5 e de 3, e nenhum zero ou percentual zero substitui dado ausente', () => {
  test.each([['agregado-5'], ['agregado-3'], ['agregado-5-com-2-desconhecidos']])('%s: o bloco é a frase nova, sem dígito', async (base) => {
    for (const comVinculo of [false, true]) {
      const { payload } = CONSTRUTORES[base](comVinculo);
      const r = await executar(payload);
      const trecho = trechoDoBloco(r.contexto);
      expect(trecho).toBe(FRASE_DO_BLOCO_AVALIADA);
      // nenhum dígito, e em particular nenhum "0", "0.0%" nem "(0%)" no lugar do dado ausente
      expect(temDigito(trecho)).toBe(false);
      expect(trecho).not.toMatch(/0(\.0)?%/);
      expect(apresentaContagemPorDimensao(r.completo)).toBe(false);

      // CONTRAEXEMPLO: o texto atual imprime "Respostas totais: 1" (5) ou "0" (3) nas quatro, com "(0.0%)" ou "(0%)"
      const anterior = comTrechoDoBloco(r.contexto, blocoDoTextoAnterior(payload.individualStats));
      expect(apresentaContagemPorDimensao(anterior)).toBe(true);
      expect(temDigito(trechoDoBloco(anterior))).toBe(true);
      // "0 (0.0%)" (5) e "0 (0%)" (3) no lugar do dado ausente; em "5 com dois desconhecidos" o quociente imprime "1 (100.0%)"
      if (base !== 'agregado-5-com-2-desconhecidos') expect(trechoDoBloco(anterior)).toMatch(/\(0(\.0)?%\)/);
    }
  });

  test('a Taxa dos agregados de 5 e de 3 fica a MEDIDA (40.0% e 33.3%), e não vem do bloco', async () => {
    for (const [base, esperada] of [['agregado-5', '40.0%'], ['agregado-3', '33.3%']] as const) {
      for (const comVinculo of [false, true]) {
        const { payload, stats } = CONSTRUTORES[base](comVinculo);
        const r = await executar(payload);
        expect(linhaDaTaxa(r.contexto)).toBe(taxaMedida(stats));
        expect(linhaDaTaxa(r.contexto)).toContain(esperada);
      }
    }
  });

  test('o detector do zero que SUBSTITUI ausência discrimina: pega o texto anterior, e NÃO pega o zero medido dos mesmos pedidos', async () => {
    // pega: no texto anterior, o pedido elegível sem `individualStats` imprime zeros que NÃO vêm de medição alguma
    const semEstatisticas = CONSTRUTORES['elegivel-sem-individualStats'](false);
    const s = await executar(semEstatisticas.payload);
    const anterior = comTrechoDoBloco(s.contexto, blocoDoTextoAnterior(semEstatisticas.payload.individualStats));
    expect(trechoDoBloco(anterior)).toMatch(/Respostas totais: 0/);
    expect(temDigito(trechoDoBloco(anterior))).toBe(true);
    // e no texto novo o bloco desse pedido não traz dígito
    expect(temDigito(trechoDoBloco(s.contexto))).toBe(false);
    // NÃO pega o zero MEDIDO: nos pedidos de 2b o contexto tem zeros sustentados por dado, e o bloco segue sem número
    for (const base of ['todos-validos-3', 'todos-acima-3']) {
      for (const comVinculo of [false, true]) {
        const r = await executar(CONSTRUTORES[base](comVinculo).payload);
        expect(proibeOLiteralZero(r.contexto)).toBe(true); // há zero medido no contexto (o detector do literal o pegaria)
        expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_AVALIADA);
        expect(temDigito(trechoDoBloco(r.contexto))).toBe(false); // e o zero medido NÃO está no bloco
      }
    }
  });
});

// ============================================================ ensaio 2b
describe('ensaio 2b: CONTROLE do zero legítimo: o zero SUSTENTADO por dado presente permanece, e o detector do literal reprova aqui', () => {
  test('zero críticos MEDIDOS: a linha "CRÍTICAS ... 0 (0.0%)" permanece, e o bloco continua sem número', async () => {
    for (const comVinculo of [false, true]) {
      const { payload, stats } = CONSTRUTORES['todos-validos-3'](comVinculo);
      expect(stats.critical).toBe(0); // o zero vem da MEDIÇÃO: três respondentes, todos com CR ≤ 0.10
      const r = await executar(payload);
      expect(r.contexto).toContain('- Respostas CRÍTICAS (CR > 0.20): 0 (0.0%)');
      expect(r.contexto).toContain('- Respostas SUSPEITAS (0.15 < CR ≤ 0.20): 0 (0.0%)');
      // ⚠ CONTRAEXEMPLO: um ensaio que proíba o literal zero no contexto COMPLETO reprovaria AQUI
      expect(proibeOLiteralZero(r.contexto)).toBe(true);
    }
  });

  test('Taxa MEDIDA em 0%: a linha "0.0%" permanece, e o zero não é confundido com ausência de base', async () => {
    for (const base of ['todos-acima-3', 'agregado-12']) {
      for (const comVinculo of [false, true]) {
        const { payload, stats } = CONSTRUTORES[base](comVinculo);
        expect(stats.valid).toBe(0); // nenhum respondente com CR ≤ 0.10: o zero é RESULTADO, sobre uma base positiva
        expect(stats.total).toBeGreaterThan(0);
        const r = await executar(payload);
        expect(linhaDaTaxa(r.contexto)).toBe('**Taxa de Validade Geral:** 0.0% das respostas com CR ≤ 0.10');
        expect(linhaDaTaxa(r.contexto)).not.toBe(TAXA_SEM_BASE);
        expect(proibeOLiteralZero(r.contexto)).toBe(true); // ⚠ o detector do literal reprovaria também aqui
      }
    }
  });

});

// ============================================================ ensaio 3
describe('ensaio 3: pedido elegível SEM `individualStats`: o bloco declara não disponível, com motivo, e NÃO imprime quatro blocos de zeros', () => {
  test('sem `individualStats`, com e sem vínculo', async () => {
    for (const comVinculo of [false, true]) {
      const { payload } = CONSTRUTORES['elegivel-sem-individualStats'](comVinculo);
      expect(payload.individualStats).toBeUndefined();
      const r = await executar(payload);
      expect(r.corpo.notaSuspensa?.suspensa).toBeFalsy(); // o pedido é elegível: a classificação não está suspensa
      const trecho = trechoDoBloco(r.contexto);
      expect(trecho).toBe(FRASE_DO_BLOCO_AVALIADA);
      expect(trecho).not.toMatch(/Respostas totais/);
      expect(trecho).not.toMatch(/\(0%\)/);
      expect(apresentaContagemPorDimensao(r.completo)).toBe(false);
      // a Taxa não depende do `individualStats`: continua a medida
      expect(linhaDaTaxa(r.contexto)).toContain('40.0%');
    }
  });

  test('o `individualStats` já POR DIMENSÃO também não é apresentado: a saída A não distingue a origem', async () => {
    for (const comVinculo of [false, true]) {
      const { payload } = CONSTRUTORES['duplo-por-dimensao'](comVinculo);
      expect(payload.individualStats.Benefits.total).toBe(5);
      const r = await executar(payload);
      expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_AVALIADA);
      expect(r.contexto).not.toContain('CR médio da dimensão');
      expect(apresentaContagemPorDimensao(r.completo)).toBe(false);
    }
  });
});

describe('ensaio 3b: o contexto NÃO depende mais do `individualStats`, seja qual for a forma em que ele chega', () => {
  test('achatado (o da tela), ausente e por dimensão, sobre os MESMOS respondentes: o contexto completo é o MESMO, byte a byte', async () => {
    for (const comVinculo of [false, true]) {
      const achatado = await executar(CONSTRUTORES['agregado-5'](comVinculo).payload);
      const ausente = await executar(CONSTRUTORES['elegivel-sem-individualStats'](comVinculo).payload);
      const porDimensao = await executar(CONSTRUTORES['duplo-por-dimensao'](comVinculo).payload);
      // ⚠ o que muda entre os três pedidos é SÓ o `individualStats`, e o contexto que o modelo recebe não muda
      expect(ausente.contexto === achatado.contexto).toBe(true);
      expect(porDimensao.contexto === achatado.contexto).toBe(true);
      expect(ausente.system === achatado.system).toBe(true);
      // CONTRAEXEMPLO: no texto anterior os três diferiam, e o detector as distingue
      const comoEraAchatado = comTrechoDoBloco(achatado.contexto, blocoDoTextoAnterior(CONSTRUTORES['agregado-5'](comVinculo).payload.individualStats));
      const comoEraAusente = comTrechoDoBloco(ausente.contexto, blocoDoTextoAnterior(undefined));
      expect(comoEraAchatado === comoEraAusente).toBe(false);
    }
  });
});

// ============================================================ ensaio 4
describe('ensaio 4: pedido NÃO avaliado: a frase de indisponibilidade EXISTENTE fica byte a byte, nas quatro causas', () => {
  const CAUSAS: Array<[string, string]> = [
    ['nao-avaliada-ausente', 'disponibilidade'],
    ['nao-avaliada-incompleta', 'disponibilidade'],
    ['contradicao', 'contradicao'],
    ['coerencia-nao-concluida', 'coerencia_nao_concluida'],
  ];

  test.each(CAUSAS)('%s (causa %s): o bloco e a Taxa são os de antes, com e sem vínculo', async (base, causa) => {
    for (const comVinculo of [false, true]) {
      const nome = nomeDoCenario(base, comVinculo);
      const { payload, elegivel } = CONSTRUTORES[base](comVinculo);
      expect(elegivel).toBe(false);
      expect(!!payload.vinculoDaExecucao).toBe(comVinculo); // ⚠ o cenário "com vínculo" TEM o campo
      const r = await executar(payload);
      // o controle: a causa é a esperada, e a classificação está suspensa
      expect(r.corpo.notaSuspensa?.suspensa).toBe(true);
      expect(r.corpo.notaSuspensa.causa).toBe(causa);
      expect(r.corpo.nota).toBeNull();

      expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_NAO_AVALIADA);
      expect(linhaDaTaxa(r.contexto)).toBe(TAXA_NAO_AVALIADA);
      expect(r.contexto).not.toContain(FRASE_DO_BLOCO_AVALIADA);

      // A.12, `cobertura.restringiu`: com o campo, a abertura do vínculo sem retirada ocorre UMA vez (o vínculo é o `vinculado`
      //   do produtor), exceto em `nao-avaliada-ausente`, cujo vínculo é `indisponivel` e mantém a abertura de antes
      const esperadasSemRetirada = comVinculo && base !== 'nao-avaliada-ausente' ? 1 : 0;
      expect([nome, ocorrencias(r.contexto, ABERTURA_COBERTURA_SEM_RETIRADA)]).toEqual([nome, esperadasSemRetirada]);
      // byte a byte: sem o campo, o contexto COMPLETO tem o sha256 da base; com o campo, só o item da chave e a abertura da cobertura diferem
      const base35a1506 = daBase(nome);
      const anterior = paraOTextoAnterior(r.contexto, payload.individualStats, false);
      expect(sha256(anterior)).toBe(base35a1506.sha256Contexto);
      expect(sha256(r.system)).toBe(base35a1506.sha256System);
      if (!comVinculo) expect(sha256(r.contexto)).toBe(base35a1506.sha256Contexto);
    }
  });

  test('CONTRAEXEMPLO: trocar a frase existente pela nova é detectado, e a nova NÃO diz que a qualidade não foi avaliada', async () => {
    const { payload } = CONSTRUTORES['nao-avaliada-ausente'](false);
    const r = await executar(payload);
    const trocado = comTrechoDoBloco(r.contexto, FRASE_DO_BLOCO_AVALIADA);
    expect(trechoDoBloco(trocado)).not.toBe(FRASE_DO_BLOCO_NAO_AVALIADA);
    expect(trocado).not.toBe(r.contexto);
    // a frase nova seria FALSA para o pedido não avaliado, e a existente seria FALSA para o elegível
    expect(FRASE_DO_BLOCO_AVALIADA).not.toMatch(/não foi avaliada/);
    expect(FRASE_DO_BLOCO_NAO_AVALIADA).not.toMatch(/não disponível nesta requisição/);
  });
});

// ============================================================ ensaio 5
describe('ensaio 5: a Taxa de Validade Geral: com base medida, inalterada, inclusive 0%', () => {
  test('em todos os cenários com base, a linha é a que a medição sustenta, e é a mesma da base de `35a1506`', async () => {
    const nomes = Object.keys(CONJUNTOS);
    expect(nomes.length).toBe(7);
    for (const base of nomes) {
      for (const comVinculo of [false, true]) {
        const { payload, stats } = CONSTRUTORES[base](comVinculo);
        const r = await executar(payload);
        expect(linhaDaTaxa(r.contexto)).toBe(taxaMedida(stats));
        expect(linhaDaTaxa(r.contexto)).not.toBe(TAXA_SEM_BASE);
        expect(linhaDaTaxa(r.contexto)).not.toBe(TAXA_NAO_AVALIADA);
      }
    }
  });
});

// ============================================================ ensaio 7
describe('ensaio 7: o item da chave de leitura deixa de descrever a divisão por quatro', () => {
  test('nos quatro estados e no formato não reconhecido, com pedido elegível e não elegível: o item novo ocorre UMA vez, e nenhum texto da divisão sobrevive', async () => {
    const lista = CONJUNTOS['agregado-5']();
    const vinculos: any[] = [...ESTADOS.map((e) => vinculoDoEstado(e, lista)), { estado: 'inventado' }];
    for (const v of vinculos) {
      for (const elegivelNoCenario of [true, false]) {
        const { payload } = payloadReal(lista, { comVinculo: false });
        if (!elegivelNoCenario) delete payload.qualityAnalysis.statistics.total; // V2 e V3 ficam não determinadas: pedido NÃO elegível
        payload.vinculoDaExecucao = v;
        const r = await executar(payload);
        // ⚠ O formato NÃO reconhecido ganha só o marcador, uma linha e o limite: NÃO tem a chave, nem antes nem depois
        //   (`vinculo-execucao.ts:653-659`). Nos quatro estados a chave existe, e o item ocorre UMA vez.
        expect([v.estado, ocorrencias(r.contexto, ITEM_NOVO)]).toEqual([v.estado, v.estado === 'inventado' ? 0 : 1]);
        if (v.estado === 'inventado') {
          expect(r.contexto).toContain('Vínculo recebido em formato NÃO reconhecido: nada dele foi usado.');
          expect(r.contexto).not.toContain('Chave de leitura das contagens');
        }
        expect(r.completo).not.toContain('por quatro');
        expect(r.completo).not.toContain('reparte');
        expect(r.completo).not.toContain('arredondando para baixo');
        expect(r.completo).not.toContain(ITEM_ANTIGO);
        expect(r.completo).not.toContain('os totais por dimensão BOCR de "Estatísticas por Dimensão"');
      }
    }
  });

  test('a chave, pela função do módulo: o item é UM elemento do arranjo, o último, e o arranjo mantém o tamanho', () => {
    const lista = CONJUNTOS['agregado-5']();
    for (const estado of ESTADOS) {
      const chave = CHAVE_DE_LEITURA_DAS_CONTAGENS(lerVinculoParaTexto(vinculoDoEstado(estado, lista)));
      expect(chave.length).toBe(7); // o cabeçalho e seis itens, como em `35a1506`
      expect(chave[6]).toBe(ITEM_NOVO);
      expect(chave.join('\n')).not.toMatch(/quatro|reparte/);
      // a contagem de incluídos só é "não disponível" onde não há (o item novo NÃO usa a frase dos incluídos)
      const semIncluidos = estado === 'indisponivel' || estado === 'invalido';
      expect(chave.join('\n').includes('contagem NÃO disponível nesta requisição')).toBe(semIncluidos);
    }
  });

  test('CONTRAEXEMPLO: o item de `35a1506` descreve a divisão, e o detector o pega', () => {
    expect(ITEM_ANTIGO).toMatch(/por quatro/);
    expect(ITEM_ANTIGO).toMatch(/reparte/);
    expect(ITEM_NOVO).not.toMatch(/quatro|reparte|\d/);
  });
});

// ============================================================ ensaio 8
describe('ensaio 8: nenhum quociente do agregado é apresentado como contagem medida por dimensão nem como participação nas matrizes', () => {
  const ELEGIVEIS = [
    'agregado-12', 'agregado-12-gravado', 'agregado-5', 'agregado-3', 'agregado-5-com-2-desconhecidos',
    'todos-validos-3', 'todos-acima-3', 'elegivel-sem-individualStats', 'duplo-por-dimensao',
  ];

  test('em todos os pedidos elegíveis, com e sem vínculo, o contexto COMPLETO não traz contagem por dimensão, e o bloco não traz número', async () => {
    for (const base of ELEGIVEIS) {
      for (const comVinculo of [false, true]) {
        const { payload } = CONSTRUTORES[base](comVinculo);
        const r = await executar(payload);
        expect([base, comVinculo, apresentaContagemPorDimensao(r.completo)]).toEqual([base, comVinculo, false]);
        expect([base, comVinculo, temDigito(trechoDoBloco(r.contexto))]).toEqual([base, comVinculo, false]);
        expect(r.completo).not.toContain('CR médio da dimensão');
        expect(r.completo).not.toMatch(/^### (Benefits|Opportunities|Costs|Risks) \(/m);
      }
    }
  });

  test('CONTRAEXEMPLO: para cada um desses pedidos o texto atual seria reprovado pelo MESMO detector', async () => {
    for (const base of ELEGIVEIS) {
      const { payload } = CONSTRUTORES[base](false);
      const r = await executar(payload);
      const anterior = comTrechoDoBloco(r.contexto, blocoDoTextoAnterior(payload.individualStats));
      expect([base, apresentaContagemPorDimensao(anterior), temDigito(trechoDoBloco(anterior))]).toEqual([base, true, true]);
    }
  });
});

// ============================================================ ensaio 9
describe('ensaio 9: o restante do contexto fica BYTE A BYTE, com e sem `vinculoDaExecucao`: só o bloco, o item da chave e (com o campo) a abertura da cobertura sem retirada mudam', () => {
  /** O contexto de `35a1506`, capturado na Fase 1 e versionado, com SÓ a substituição do bloco. */
  const comSoOBloco = (anterior: string): string => {
    const inicio = anterior.indexOf(CABECALHO_DO_BLOCO + '\n\n') + (CABECALHO_DO_BLOCO + '\n\n').length;
    const fim = anterior.indexOf('\n\n' + CABECALHO_SEGUINTE, inicio);
    expect(anterior.slice(inicio, inicio + 4)).toBe('### '); // o trecho antigo é o das quatro dimensões
    return anterior.slice(0, inicio) + FRASE_DO_BLOCO_AVALIADA + anterior.slice(fim);
  };
  /** E o que se ESPERA do contexto novo: o bloco substituído e, COM o campo, o item da chave substituído. */
  const esperadoAPartirDoAnterior = (anterior: string, comVinculo: boolean): string => {
    const soOBloco = comSoOBloco(anterior);
    if (!comVinculo) {
      expect(soOBloco).not.toContain(ITEM_ANTIGO);
      expect(ocorrencias(soOBloco, '- Cobertura enviada')).toBe(0); // sem o campo não há linha de cobertura
      return soOBloco;
    }
    expect(ocorrencias(soOBloco, ITEM_ANTIGO)).toBe(1);
    // A.12, `cobertura.restringiu`: com o campo, a captura da Fase 1 traz a abertura de antes UMA vez, e ela é substituída
    //   pela do vínculo sem retirada (o `vinculado` do produtor): é a ÚNICA mudança, além do bloco e do item da chave
    expect(ocorrencias(soOBloco, ABERTURA_COBERTURA_ANTIGA)).toBe(1);
    return soOBloco.replace(ITEM_ANTIGO, ITEM_NOVO).replace(ABERTURA_COBERTURA_ANTIGA, ABERTURA_COBERTURA_SEM_RETIRADA);
  };

  test.each([['agregado-5'], ['agregado-3']])('%s: contra o contexto completo da Fase 1, sem e com o campo', async (base) => {
    for (const comVinculo of [false, true]) {
      const anterior = ler(`${PASTA_FASE1}/ctx-${base}-${comVinculo ? 'comVinculo' : 'semVinculo'}.txt`);
      const { payload } = CONSTRUTORES[base](comVinculo);
      const r = await executar(payload);
      const esperado = esperadoAPartirDoAnterior(anterior, comVinculo);
      // ⚠ o contexto COMPLETO, e não só o bloco: qualquer outro byte diferente reprova
      expect(r.contexto.length).toBe(esperado.length);
      expect(r.contexto === esperado).toBe(true);
      // a diferença entre o novo e o anterior é EXATAMENTE o bloco (e o item, com o campo)
      expect(r.contexto).not.toBe(anterior);
      if (!comVinculo) {
        expect(ocorrencias(r.contexto, ITEM_NOVO)).toBe(0);
        expect(r.contexto).not.toContain('Chave de leitura das contagens');
      }
      // CONTRAEXEMPLO: sem a substituição do item da chave, o contexto COM o campo NÃO coincide
      if (comVinculo) expect(r.contexto === comSoOBloco(anterior)).toBe(false);
    }
  });

  test('os 27 cenários da sonda: o contexto novo, levado ao texto anterior, tem o sha256 da base, e o system não muda', async () => {
    const nomes: string[] = LINHAS_DE_BASE.cenarios.map((c: any) => c.nome);
    expect(nomes.length).toBe(27);
    expect(new Set(nomes).size).toBe(27);
    expect(new Set(LINHAS_DE_BASE.cenarios.map((c: any) => c.sha256Contexto)).size).toBe(27); // 27 contextos DISTINTOS na base
    let totalComAberturaNova = 0;
    for (const nome of nomes) {
      const comVinculo = nome.endsWith('-comVinculo');
      const base = nome.replace(/-(comVinculo|semVinculo)$/, '');
      const { payload, elegivel } = CONSTRUTORES[base](comVinculo);
      const r = await executar(payload);
      // o cenário é o que se pensa: a suspensão da classificação é exatamente a não elegibilidade
      expect([nome, !!r.corpo.notaSuspensa?.suspensa]).toEqual([nome, !elegivel]);
      const linha = daBase(nome);
      // A.12, `cobertura.restringiu`: a abertura do vínculo sem retirada, contada em cada cenário e somada ao fim (12 de 27)
      const esperadasSemRetirada = comVinculo && base !== 'nao-avaliada-ausente' ? 1 : 0;
      expect([nome, ocorrencias(r.contexto, ABERTURA_COBERTURA_SEM_RETIRADA)]).toEqual([nome, esperadasSemRetirada]);
      totalComAberturaNova += esperadasSemRetirada;
      const anterior = paraOTextoAnterior(r.contexto, JSON.parse(JSON.stringify(payload)).individualStats, elegivel);
      expect([nome, sha256(anterior)]).toEqual([nome, linha.sha256Contexto]);
      expect([nome, Buffer.byteLength(anterior, 'utf8')]).toEqual([nome, linha.bytesDoContexto]);
      expect([nome, sha256(r.system)]).toEqual([nome, linha.sha256System]);
      // e o pedido NÃO elegível, sem o campo, é byte a byte o de antes
      if (!elegivel && !comVinculo) expect([nome, sha256(r.contexto)]).toEqual([nome, linha.sha256Contexto]);
    }
    // ⚠ a reversão da abertura aconteceu em 12 dos 27 cenários, e em nenhum outro: não passou por vacuidade, nem a estendeu
    expect(totalComAberturaNova).toBe(12);
  });
});

// ============================================================ o alcance do consumidor latente, medido no pedido REAL
describe('controle de alcance: o pedido real com SÓ `individualStats` NÃO chega ao ramo agregado (cobertura observada)', () => {
  test.each([['agregado-5'], ['agregado-3'], ['agregado-12']])('%s: sem `byStatus`, `summary` nem `overallStats`, a requisição NÃO é elegível', async (base) => {
    const { payload } = payloadReal(CONJUNTOS[base](), { comVinculo: false, comEstatisticas: false });
    expect(payload.individualStats).toBeDefined(); // o achatado da tela está lá
    const r = await executar(payload);
    expect(r.corpo.notaSuspensa?.suspensa).toBe(true);
    expect(r.corpo.notaSuspensa.causa).toBe('coerencia_nao_concluida');
    // cai na frase EXISTENTE do pedido não avaliado, e a Taxa não é calculada: o ramo de `:855-864` não executa
    expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_NAO_AVALIADA);
    expect(linhaDaTaxa(r.contexto)).toBe(TAXA_NAO_AVALIADA);
  });

  test('o pedido elegível com total zero, nas duas construções tentadas, NÃO é elegível (não é prova de inalcançabilidade)', async () => {
    const zero = CONSTRUTORES['elegivel-total-zero'](false);
    const r = await executar(zero.payload);
    expect(r.corpo.notaSuspensa?.suspensa).toBe(true);
    expect(r.corpo.notaSuspensa.causa).toBe('disponibilidade');
    expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_NAO_AVALIADA);

    // três respondentes com `cr` 0 (DESCONHECIDO), e `byStatus` só com DESCONHECIDO: as quatro chaves somam zero
    const itens = [0, 0, 0].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr));
    const { payload } = payloadReal(itens, { comVinculo: false });
    payload.qualityAnalysis.statistics = { byStatus: { 'CONFIÁVEL': 0, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0, 'DESCONHECIDO': 3 }, total: 3, avgCR: 0 };
    payload.qualityAnalysis.summary = { total: 3, ok: 0, suspicious: 0, critical: 0 };
    payload.overallStats = { total: 3, valid: 0, warning: 0, critical: 0 };
    const d = await executar(payload);
    expect(d.corpo.notaSuspensa?.suspensa).toBe(true);
    expect(d.corpo.notaSuspensa.causa).toBe('contradicao');
    expect(linhaDaTaxa(d.contexto)).toBe(TAXA_NAO_AVALIADA);
  });
});
