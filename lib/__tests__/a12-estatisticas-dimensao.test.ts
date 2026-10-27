export {};

/**
 * A.12, estatísticas por dimensão BOCR: o que o modelo RECEBE na seção «Estatísticas por Dimensão BOCR» e em volta dela.
 *
 * ⚠ **REESCRITO NO AJUSTE 1 (consistência individual, A.12 item (c)).** A versão anterior deste arquivo (1059 linhas, recuperável no
 * git, no commit anterior ao Ajuste 1) guardava a SAÍDA A: o contexto NÃO apresentava os quocientes do agregado `individualStats`
 * (repartido por quatro) como contagem por dimensão, a Taxa de Validade Geral só valia 0.0% quando o zero era MEDIDO, e o contexto novo
 * era o antigo «com EXATAMENTE as substituições declaradas», conferido byte a byte contra o sha256 de 27 cenários medidos em `35a1506`.
 *
 * O Ajuste 1 muda o que essa cadeia comparava: a seção passa a trazer o CR POR MATRIZ recalculado dos julgamentos, a Taxa de Validade
 * Geral e todas as categorias de pessoa SAÍRAM, e a rota nem lê mais `individualStats`, `statistics`, `summary` nem `overallStats`. A
 * cadeia «contexto novo, revertido por trocas declaradas, tem o sha256 da base» não tem mais como valer sem reimplementar, dentro do
 * teste, o texto inteiro do construto removido: a reversão exigiria reconstruir as linhas por respondente, as categorias e a Taxa a
 * partir de dados que o pedido atual não leva. Ela é ENCERRADA, e os 27 hashes ficam em `docs/dados/a12-estatisticas-dimensao/saida-a/`,
 * INTACTOS, como registro do que o modelo recebia em `35a1506`.
 *
 * **Mapa: cada garantia da versão anterior e o que a substitui.**
 *   - «nenhum quociente do agregado é contagem por dimensão» (ensaios 1, 2, 8): MANTIDA, com o mesmo detector e o mesmo
 *     contraexemplo (o texto anterior, reconstruído, reprova o detector). A garantia agora é mais forte: o agregado nem é lido.
 *   - «o contexto não depende do `individualStats`, em forma alguma» (ensaios 3 e 3b): MANTIDA e AMPLIADA, a todo agregado do formato
 *     anterior (`statistics`, `summary`, `overallStats`, `individualStats`), em seis combinações, byte a byte.
 *   - «zero só quando MEDIDO; ausência não vira zero» (ensaios 2 e 2b): MANTIDA no que importa agora, o CR por matriz: zero CALCULADO é
 *     valor válido e entra nas contagens; ausência (julgamentos incompletos) nunca entra e nunca vira zero.
 *   - «pedido não avaliado: a frase de indisponibilidade existente, palavra por palavra» (ensaio 4): MANTIDA para o painel sem nenhum
 *     CR recalculado; acrescida dos casos novos (incompleta com CR parcial; contradição do resumo declarado).
 *   - «Taxa de Validade Geral medida» (ensaio 5): SUBSTITUÍDA pela garantia de que a Taxa NÃO existe: é taxa de pessoas, sem lastro.
 *   - «o item da chave de leitura deixa de descrever a divisão por quatro» (ensaio 7): MANTIDA, com a redação nova do Ajuste 1.
 *   - «o restante do contexto fica byte a byte» (ensaio 9) e «controle de alcance» (ramo agregado inalcançável): ENCERRADOS. O primeiro
 *     pela razão acima, e substituído apenas em parte aqui (o `system` segue com o sha256 da base, em todos os cenários); a prova de que
 *     o resto do contexto não mudou está no registro do Ajuste 1 (comparação antes/depois medida), e NÃO é reproduzida por este arquivo.
 *     O segundo porque o ramo agregado deixou de existir.
 *
 * ⚠ **Instrumento, declarado.** Os ensaios passam pelo TRATADOR REAL de `POST /api/ai-reviewer`, com o cliente do modelo SIMULADO
 * (chave falsa, texto controlado, sem rede), e capturam o contexto COMPLETO (`system` e `messages`) antes da geração. Nenhum parecer é
 * gerado. A tela não é executada: o payload é montado aqui, no formato do pedido ATUAL, com os campos do formato anterior
 * acrescentados DE PROPÓSITO para mostrar que viajam na entrada e não chegam ao modelo. Coerência interna do pedido, sem cobertura do
 * universo real.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

import { CHAVE_DE_LEITURA_DAS_CONTAGENS, lerVinculoParaTexto, prepararVinculoDaTela } from '@/lib/ai-reviewer/vinculo-execucao';
import { classificarAvaliacaoDaTela } from '@/lib/ai-reviewer/avaliacao-qualidade';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { blocoDoMaximo, blocoComMaximo, blocoRecalculado, blocoIndisponivel } = require('./helpers/consistencia-de-ensaio');

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sha256 = (t: string): string => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;

const PASTA_SAIDA_A = 'docs/dados/a12-estatisticas-dimensao/saida-a';

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
// As redações, ABSOLUTAS: escritas aqui, e NÃO importadas da rota.
// ---------------------------------------------------------------------------

/** O bloco, no pedido SEM nenhum CR recalculado: a frase EXISTENTE de `35a1506`, palavra por palavra (preservada no Ajuste 1). */
const FRASE_DO_BLOCO_NAO_AVALIADA = '⚠️ Não disponíveis: a qualidade individual não foi avaliada. Nenhum percentual por dimensão é apresentado.';
/** O bloco, no pedido com resumo declarado que não confere com as seis matrizes (Ajuste 1). */
const FRASE_DO_BLOCO_COM_CONTRADICAO = (n: number) => `⚠️ Não apresentadas: o resumo declarado de ${n} respondente(s) não confere com as suas seis matrizes.`;
/** O item da chave de leitura (Ajuste 1) que substitui o de `35a1506`. */
const ITEM_NOVO =
  '  - "Estatísticas por Dimensão" BOCR: o CR por matriz é o recalculado dos julgamentos dos ENVIADOS; a contagem de incluídos no documento de cálculo ' +
  'NÃO é contagem por dimensão nem participação por dimensão nas matrizes, e nenhuma contagem por dimensão deve ser derivada dela.';
/** O item de `35a1506`: descreve a divisão por quatro. ⚠ Só para o CONTRAEXEMPLO. */
const ITEM_ANTIGO =
  '  - os totais por dimensão BOCR de "Estatísticas por Dimensão" NÃO medem a participação por dimensão e NÃO são o N de matriz alguma ' +
  '(quando a requisição traz o total agregado, como a da tela, a rota o reparte por quatro, arredondando para baixo).';

const CABECALHO_DO_BLOCO = '## Estatísticas por Dimensão BOCR';
const CABECALHO_SEGUINTE = '## Pesos Finais da Hierarquia de Controle';
const MATRIZES = ['BOCR', 'MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R'] as const;

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

// ---------------------------------------------------------------------------
// O TEXTO ANTERIOR, reconstruído SÓ para o CONTRAEXEMPLO dos detectores.
// ⚠ Cópia de `route.ts` em `35a1506`: a divisão por quatro e o bloco por dimensão. Não é mais comparada a hash algum.
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

// ---------------------------------------------------------------------------
// Detectores. ⚠ Cada um é CONFERIDO contra o texto anterior (CONTRAEXEMPLO).
// ---------------------------------------------------------------------------

/** O contexto apresenta contagem POR DIMENSÃO como o texto anterior (quociente do agregado). */
const apresentaContagemPorDimensao = (contexto: string) =>
  /^- Respostas totais: \d+$/m.test(contexto) ||
  /^### (Benefits|Opportunities|Costs|Risks) \(/m.test(contexto) ||
  /CR médio da dimensão/.test(contexto);
/** O contexto traz a Taxa de Validade Geral, que é taxa de pessoas e saiu. */
const trazTaxaDeValidade = (contexto: string) => /Taxa de Validade/.test(contexto);

// ---------------------------------------------------------------------------
// Payloads no formato do pedido ATUAL. ⚠ São duplos de TESTE.
// ---------------------------------------------------------------------------

/**
 * Um elemento como o produtor de qualidade o devolve HOJE: identidade e bloco `consistenciaIndividual`. Os campos do formato anterior
 * (`status`, `overallScore`, `cr`, `metrics`, `flags`, `recommendation`) vão JUNTO de propósito, e o teste 3b confere que não chegam ao
 * modelo. `cr` é o CR governante (o máximo das seis matrizes), ou `undefined` para «sem CR».
 */
function itemDoProdutor(id: string, cr: number | undefined, bloco?: unknown) {
  const semCR = cr === undefined;
  return {
    respondentId: id,
    isSimulated: false,
    status: semCR ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.15 ? 'REVISAR' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
    overallScore: 50,
    ...(semCR ? {} : { cr, metrics: { avgCR: cr } }),
    flags: [],
    recommendation: '',
    consistenciaIndividual: bloco ?? blocoDoMaximo(cr),
  };
}

const balde = (total: number, valid: number, warning = 0, critical = 0) => ({ total, valid, warning, critical, avgCR: 0.05 });

/** O agregado achatado que a tela ANTERIOR calculava (cópia da redução antiga): ruído do formato anterior, que o pedido atual não lê. */
function individualStatsAchatado(respondentes: any[]) {
  const acc = { valid: 0, warning: 0, critical: 0, total: 0, avgCR: 0 };
  let soma = 0;
  for (const r of respondentes) {
    const cr = typeof r.cr === 'number' ? r.cr : 0;
    soma += cr;
    if (cr > 0.2) acc.critical++; else if (cr > 0.1) acc.warning++; else acc.valid++;
    acc.total++;
  }
  acc.avgCR = acc.total > 0 ? soma / acc.total : 0;
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

type Legado = 'achatado' | 'ausente' | 'porDimensao';

/**
 * O payload no formato ATUAL. `legado` escolhe a forma do `individualStats` do formato anterior que ainda viaja (ruído), e
 * `agregados: false` retira também `statistics`, `summary`, `overall` e `overallStats`.
 */
function payloadAtual(respondentes: any[], opcoes: { comVinculo: boolean; legado?: Legado; agregados?: boolean }) {
  const legado = opcoes.legado ?? 'achatado';
  const comAgregados = opcoes.agregados !== false;
  const stats = individualStatsAchatado(respondentes);
  const avaliacao = classificarAvaliacaoDaTela({ respondentesAvaliados: respondentes, respostasAtivas: [] });
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
    qualityAnalysis: {
      respondents: respondentes,
      ...(comAgregados
        ? {
            statistics: {
              byStatus: { 'CONFIÁVEL': stats.valid, 'REVISAR': 0, 'SUSPEITO': stats.warning, 'CRÍTICO': stats.critical },
              total: stats.total,
              avgCR: stats.avgCR,
            },
            summary: { total: stats.total, ok: stats.valid, suspicious: stats.warning, critical: stats.critical },
            overall: {},
          }
        : {}),
    },
    ...(comAgregados ? { overallStats: { total: stats.total, valid: stats.valid, warning: stats.warning, critical: stats.critical } } : {}),
  };
  if (legado === 'achatado' && stats.total > 0) p.individualStats = stats;
  if (legado === 'porDimensao') {
    p.individualStats = { Benefits: balde(5, 5, 0, 0), Opportunities: balde(5, 4, 1, 0), Costs: balde(5, 3, 1, 1), Risks: balde(5, 2, 2, 1) };
  }
  if (opcoes.comVinculo) p.vinculoDaExecucao = vinculoDoEstado('vinculado', respondentes);
  return { payload: p, stats, avaliacao };
}

// ---------------------------------------------------------------------------
// Os CENÁRIOS. ⚠ Os nomes são os da sonda da base (`35a1506`); as construções são as do pedido ATUAL.
// ---------------------------------------------------------------------------

const CRS_DO_PAINEL_DE_12 = [0.1139, 0.3747, 1.0927, 0.5903, 0.6359, 0.461, 0.2519, 0.2344, 0.3158, 0.2634, 0.2402, 0.2525];
const CONJUNTOS: Record<string, () => any[]> = {
  'agregado-5': () => [0.05, 0.08, 0.12, 0.18, 0.25].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'agregado-3': () => [0.05, 0.12, 0.25].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'agregado-12': () => CRS_DO_PAINEL_DE_12.map((cr, i) => itemDoProdutor(`R${String(i + 1).padStart(2, '0')}`, cr)),
  'agregado-12-gravado': () => Array.from({ length: 12 }, (_, i) => itemDoProdutor(`R${String(i + 1).padStart(2, '0')}`, 0.05)),
  'todos-validos-3': () => [0.05, 0.06, 0.07].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
  'todos-acima-3': () => [0.12, 0.13, 0.14].map((cr, i) => itemDoProdutor(`r${i + 1}`, cr)),
};

/** O que o contexto deve dizer da seção, calculado AQUI e à mão (sem o módulo): n, acima do limiar, mínimo, média e máximo por matriz. */
function secaoEsperada(porMatriz: Record<(typeof MATRIZES)[number], number[]>): string {
  const n = porMatriz.BOCR.length;
  const p = (v: number) => `${(v * 100).toFixed(2)}%`;
  const linhas = MATRIZES.map((m) => {
    const v = porMatriz[m];
    const acima = v.filter((x) => x > 0.1).length;
    const media = v.reduce((a, b) => a + b, 0) / v.length;
    return `- ${m}: n = ${v.length} respondentes com CR; acima de 0.10: ${acima}; mínimo ${p(Math.min(...v))}; média entre respondentes ${p(media)}; máximo ${p(Math.max(...v))}`;
  });
  return [`CR individual por matriz, sobre os ${n} respondentes enviados com CR recalculado dos julgamentos (etapa: envio):`, ...linhas].join('\n');
}

/** Para um conjunto de CRs governantes, o CR de cada matriz: BOCR vale o governante, e as outras cinco, a metade (`blocoComMaximo`). */
const porMatrizDoMaximo = (crs: number[]) =>
  Object.fromEntries(MATRIZES.map((m) => [m, crs.map((c) => (m === 'BOCR' ? c : c / 2))])) as Record<(typeof MATRIZES)[number], number[]>;

// ============================================================ ensaio 1
describe('ensaio 1: agregado de 12, com e sem `vinculoDaExecucao`: a seção traz o CR por matriz, calculado à mão, e nenhuma contagem por dimensão', () => {
  test.each([['agregado-12'], ['agregado-12-gravado']])('%s: o bloco é o CR por matriz esperado, sem categoria e sem contagem por dimensão', async (base) => {
    for (const comVinculo of [false, true]) {
      const respondentes = CONJUNTOS[base]();
      const { payload, stats } = payloadAtual(respondentes, { comVinculo });
      expect(stats.total).toBe(12);
      const r = await executar(payload);
      expect(r.status).toBe(200);
      const crs = respondentes.map((x: any) => x.cr as number);
      const trecho = trechoDoBloco(r.contexto);
      expect(trecho).toBe(secaoEsperada(porMatrizDoMaximo(crs)));
      expect(apresentaContagemPorDimensao(r.completo)).toBe(false);
      expect(trazTaxaDeValidade(r.completo)).toBe(false);

      // CONTRAEXEMPLO: o texto anterior (`35a1506`), com «3» nas quatro dimensões, reprova o MESMO detector
      const anterior = comTrechoDoBloco(r.contexto, blocoDoTextoAnterior(payload.individualStats));
      expect(ocorrencias(trechoDoBloco(anterior), '- Respostas totais: 3')).toBe(4);
      expect(apresentaContagemPorDimensao(anterior)).toBe(true);
    }
  });

  test('o caso do painel de 12 confere à mão: BOCR de 11.39% a 109.27%, 12 acima do limiar; as outras cinco, 11 de 12', async () => {
    const respondentes = CONJUNTOS['agregado-12']();
    const { payload } = payloadAtual(respondentes, { comVinculo: false });
    const r = await executar(payload);
    const trecho = trechoDoBloco(r.contexto);
    // valores escritos À MÃO, não calculados: o mínimo e o máximo dos CRs governantes do painel de 12, e as contagens acima de 0.10
    expect(trecho).toContain('- BOCR: n = 12 respondentes com CR; acima de 0.10: 12; mínimo 11.39%;');
    expect(trecho).toContain('máximo 109.27%');
    // nas outras cinco matrizes o valor é a metade do governante: só o de 0.1139 (metade 0.0570) fica dentro do limiar
    for (const m of ['MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R']) {
      expect(trecho).toContain(`- ${m}: n = 12 respondentes com CR; acima de 0.10: 11; mínimo 5.70%;`);
    }
  });
});

// ============================================================ ensaio 2
describe('ensaio 2: zero CALCULADO é valor válido e entra nas contagens; ausência nunca vira zero', () => {
  const zeroCalculado = () => blocoRecalculado({ BOCR: 0, MAGNITUDE: 0, 'SUB-B': 0, 'SUB-O': 0, 'SUB-C': 0, 'SUB-R': 0 });

  test('dois respondentes com zero calculado e um sem CR: n = 2, mínimo 0.00%, e o terceiro não entra nem vira zero', async () => {
    const respondentes = [
      itemDoProdutor('r1', 0, zeroCalculado()),
      itemDoProdutor('r2', 0, zeroCalculado()),
      itemDoProdutor('r3', undefined, blocoIndisponivel('incompletos')),
    ];
    const { payload, avaliacao } = payloadAtual(respondentes, { comVinculo: false });
    expect(avaliacao.estado).toBe('incompleta'); // um respondente sem CR: a avaliação é incompleta e a classificação fica suspensa
    const r = await executar(payload);
    const trecho = trechoDoBloco(r.contexto);
    for (const m of MATRIZES) {
      expect(trecho).toContain(`- ${m}: n = 2 respondentes com CR; acima de 0.10: 0; mínimo 0.00%; média entre respondentes 0.00%; máximo 0.00%`);
    }
    // o terceiro está na lista COMO sem CR, nunca com valor, e a população do painel diz 2 de 3
    expect(r.contexto).toContain('CR por matriz: NÃO DISPONÍVEL — julgamentos incompletos');
    expect(r.contexto).toContain('Respondentes enviados: 3. Com CR recalculado dos julgamentos nas 6 matrizes: 2. Sem CR: 1');
    expect(r.contexto).toContain('Matrizes avaliadas: 12 (2 respondentes × 6 matrizes não triviais');
    expect(r.corpo.notaSuspensa?.suspensa).toBe(true);
  });

  test('CONTROLE: sem zero calculado em nenhum respondente, a seção NÃO traz «0.00%» (o zero não nasce da ausência)', async () => {
    const respondentes = [itemDoProdutor('r1', 0.05), itemDoProdutor('r2', 0.12), itemDoProdutor('r3', undefined, blocoIndisponivel('incompletos'))];
    const { payload } = payloadAtual(respondentes, { comVinculo: false });
    const r = await executar(payload);
    expect(trechoDoBloco(r.contexto)).not.toContain('0.00%');
    // e a linha do respondente sem CR não traz percentual algum
    const linha = r.contexto.split('\n').find((l) => l.includes('CR por matriz: NÃO DISPONÍVEL'))!;
    expect(linha).toBeDefined();
    expect(linha).not.toMatch(/\d+\.\d\d%/);
  });

  test('os pedidos de 3 respondentes com todas as matrizes dentro (ou fora) do limiar contam 0 de 18 ou 18 de 18, e o bloco não traz categoria', async () => {
    for (const [base, esperado] of [['todos-validos-3', 'acima de 0.10: 0;'], ['todos-acima-3', 'acima de 0.10: 3;']] as const) {
      for (const comVinculo of [false, true]) {
        const { payload } = payloadAtual(CONJUNTOS[base](), { comVinculo });
        const r = await executar(payload);
        expect(trechoDoBloco(r.contexto)).toContain(`- BOCR: n = 3 respondentes com CR; ${esperado}`);
        expect(r.contexto).not.toMatch(/Respostas (CONFIÁVEIS|SUSPEITAS|CRÍTICAS)/);
        expect(trazTaxaDeValidade(r.contexto)).toBe(false);
      }
    }
  });
});

// ============================================================ ensaio 3
describe('ensaio 3: o contexto NÃO depende de agregado nenhum do formato anterior, seja qual for a forma em que chega', () => {
  test('`individualStats` achatado, ausente e por dimensão, com e sem os demais agregados, sobre os MESMOS respondentes: o contexto é o MESMO, byte a byte', async () => {
    for (const comVinculo of [false, true]) {
      const variantes: Array<[string, Legado, boolean]> = [
        ['achatado + agregados', 'achatado', true],
        ['ausente + agregados', 'ausente', true],
        ['por dimensão + agregados', 'porDimensao', true],
        ['achatado, sem agregados', 'achatado', false],
        ['ausente, sem agregados', 'ausente', false],
        ['por dimensão, sem agregados', 'porDimensao', false],
      ];
      const resultados: Array<[string, Resposta]> = [];
      for (const [nome, legado, agregados] of variantes) {
        const { payload } = payloadAtual(CONJUNTOS['agregado-5'](), { comVinculo, legado, agregados });
        resultados.push([nome, await executar(payload)]);
      }
      const [, referencia] = resultados[0];
      for (const [nome, r] of resultados) {
        // ⚠ O que muda entre os seis pedidos é SÓ o formato anterior que ainda viaja, e o que o modelo recebe não muda
        expect([nome, comVinculo, r.contexto === referencia.contexto]).toEqual([nome, comVinculo, true]);
        expect([nome, comVinculo, r.system === referencia.system]).toEqual([nome, comVinculo, true]);
      }
      // CONTRAEXEMPLO: o texto anterior mudava com o `individualStats`, e o detector distingue os dois
      const achatado = comTrechoDoBloco(referencia.contexto, blocoDoTextoAnterior(individualStatsAchatado(CONJUNTOS['agregado-5']())));
      const ausente = comTrechoDoBloco(referencia.contexto, blocoDoTextoAnterior(undefined));
      expect(achatado === ausente).toBe(false);
    }
  });

  test('os campos por pessoa do formato anterior (cr em cache, status, overallScore) viajam na entrada e NÃO chegam ao modelo', async () => {
    const respondentes = [itemDoProdutor('r1', 0.05), itemDoProdutor('r2', 0.30)];
    const { payload } = payloadAtual(respondentes, { comVinculo: false });
    expect(payload.qualityAnalysis.respondents[1].status).toBe('CRÍTICO'); // o campo está na ENTRADA
    const r = await executar(payload);
    // ⚠ Sobre as MENSAGENS (o contexto), e não o `system`: a palavra «recommendation» existe no prompt de sistema, num sentido sem relação
    //   (campo dos artigos do RAG), e seria falso positivo. Cada texto abaixo existia no contexto do formato anterior.
    for (const t of ['CRÍTICO', 'CONFIÁVEL', 'overallScore', 'Status:', 'recommendation']) {
      expect({ t, presente: r.contexto.includes(t) }).toEqual({ t, presente: false });
    }
  });
});

// ============================================================ ensaio 4
describe('ensaio 4: pedido SEM avaliação disponível: a seção diz o que há, com a população, sem categoria e sem zero', () => {
  test('sem lista de respondentes (ausente): a frase de indisponibilidade EXISTENTE, palavra por palavra', async () => {
    const { payload } = payloadAtual([], { comVinculo: false, legado: 'ausente' });
    const r = await executar(payload);
    expect(r.corpo.notaSuspensa?.causa).toBe('disponibilidade');
    expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_NAO_AVALIADA);
    expect(trazTaxaDeValidade(r.contexto)).toBe(false);
  });

  test('lista no formato ANTERIOR (cr em cache, sem bloco): incompleta com 0 CR recalculado, e a MESMA frase de indisponibilidade', async () => {
    const emCache = [0.05, 0.08, 0.12].map((cr, i) => {
      const { consistenciaIndividual, ...semBloco } = itemDoProdutor(`r${i + 1}`, cr);
      void consistenciaIndividual;
      return semBloco;
    });
    const { payload, avaliacao } = payloadAtual(emCache, { comVinculo: false });
    expect(avaliacao.estado).toBe('incompleta');
    const r = await executar(payload);
    expect(r.corpo.notaSuspensa?.causa).toBe('disponibilidade');
    // o CR em cache NÃO é apresentado: nenhum dos três valores aparece como CR
    expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_NAO_AVALIADA);
    expect(r.contexto).toContain('Respondentes enviados: 3. Com CR recalculado dos julgamentos nas 6 matrizes: 0. Sem CR: 3 (bloco não recebido: 3).');
    expect(r.contexto).not.toMatch(/CR por matriz \(recalculado dos julgamentos\)/);
  });

  test('resumo declarado que NÃO confere com as seis matrizes: a seção não apresenta contagem, e diz quantos respondentes', async () => {
    const respondentes = [1, 2, 3, 4].map((i) => itemDoProdutor(`r${i}`, 0.05, { ...blocoComMaximo(0.05), media: 0.9 }));
    const { payload } = payloadAtual(respondentes, { comVinculo: true });
    const r = await executar(payload);
    expect(r.corpo.notaSuspensa?.causa).toBe('contradicao');
    expect(trechoDoBloco(r.contexto)).toBe(FRASE_DO_BLOCO_COM_CONTRADICAO(4));
    // os dois valores de cada respondente ficam CONSERVADOS na linha dele, e nenhum é escolhido
    expect(r.contexto).toContain('O RESUMO DECLARADO NÃO CONFERE com as seis matrizes');
    expect(r.contexto).toContain('declarado pelo motor 90.00%, recomputado das seis matrizes 2.92%');
  });

  test('CONTRAEXEMPLO: trocar a frase de indisponibilidade pela seção com CR por matriz é detectado', async () => {
    const { payload } = payloadAtual([], { comVinculo: false, legado: 'ausente' });
    const r = await executar(payload);
    const trocado = comTrechoDoBloco(r.contexto, secaoEsperada(porMatrizDoMaximo([0.05])));
    expect(trechoDoBloco(trocado)).not.toBe(FRASE_DO_BLOCO_NAO_AVALIADA);
    expect(trocado).not.toBe(r.contexto);
  });
});

// ============================================================ ensaio 5
describe('ensaio 5: a Taxa de Validade Geral NÃO existe mais, em nenhum cenário', () => {
  test('nos seis conjuntos, com e sem vínculo, e nos pedidos sem avaliação: o contexto completo não traz Taxa de Validade', async () => {
    for (const base of Object.keys(CONJUNTOS)) {
      for (const comVinculo of [false, true]) {
        const { payload } = payloadAtual(CONJUNTOS[base](), { comVinculo });
        const r = await executar(payload);
        expect([base, comVinculo, trazTaxaDeValidade(r.completo)]).toEqual([base, comVinculo, false]);
        expect(r.completo).not.toContain('das respostas com CR ≤ 0.10');
      }
    }
    const semAvaliacao = await executar(payloadAtual([], { comVinculo: false, legado: 'ausente' }).payload);
    expect(trazTaxaDeValidade(semAvaliacao.completo)).toBe(false);
  });
});

// ============================================================ ensaio 7
describe('ensaio 7: o item da chave de leitura deixa de descrever a divisão por quatro', () => {
  test('nos quatro estados e no formato não reconhecido, com pedido elegível e não elegível: o item novo ocorre UMA vez, e nenhum texto da divisão sobrevive', async () => {
    const lista = CONJUNTOS['agregado-5']();
    const vinculos: any[] = [...ESTADOS.map((e) => vinculoDoEstado(e, lista)), { estado: 'inventado' }];
    for (const v of vinculos) {
      for (const elegivelNoCenario of [true, false]) {
        // não elegível: um respondente sem CR (a avaliação fica incompleta)
        const respondentes = elegivelNoCenario ? lista : [...lista.slice(0, 4), itemDoProdutor('r5', undefined, blocoIndisponivel('incompletos'))];
        const { payload } = payloadAtual(respondentes, { comVinculo: false });
        payload.vinculoDaExecucao = v;
        const r = await executar(payload);
        expect([v.estado, elegivelNoCenario, r.corpo.notaSuspensa === null]).toEqual([v.estado, elegivelNoCenario, elegivelNoCenario]);
        // ⚠ O formato NÃO reconhecido ganha só o marcador, uma linha e o limite: NÃO tem a chave. Nos quatro estados a chave existe.
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
      // Ajuste 1: o item «enviados a você» diz que o CR por matriz é o dos enviados, e o item da seção diz que é recalculado
      expect(chave[5 - 0]).toContain('enviados a você (etapa: envio): a lista de respondentes, o CR por matriz de cada um e as contagens de matrizes deste contexto referem-se a eles;');
    }
  });

  test('CONTRAEXEMPLO: o item de `35a1506` descreve a divisão, e o detector o pega', () => {
    expect(ITEM_ANTIGO).toMatch(/por quatro/);
    expect(ITEM_ANTIGO).toMatch(/reparte/);
    expect(ITEM_NOVO).not.toMatch(/quatro|reparte/);
  });
});

// ============================================================ ensaio 8
describe('ensaio 8: nenhum quociente do agregado é apresentado como contagem medida por dimensão nem como participação nas matrizes', () => {
  const ELEGIVEIS = Object.keys(CONJUNTOS);

  test('em todos os pedidos elegíveis, com e sem vínculo e em cada forma do formato anterior, o contexto COMPLETO não traz contagem por dimensão', async () => {
    for (const base of ELEGIVEIS) {
      for (const comVinculo of [false, true]) {
        for (const legado of ['achatado', 'ausente', 'porDimensao'] as Legado[]) {
          const { payload } = payloadAtual(CONJUNTOS[base](), { comVinculo, legado });
          const r = await executar(payload);
          expect([base, comVinculo, legado, apresentaContagemPorDimensao(r.completo)]).toEqual([base, comVinculo, legado, false]);
          expect(r.completo).not.toContain('CR médio da dimensão');
          expect(r.completo).not.toMatch(/^### (Benefits|Opportunities|Costs|Risks) \(/m);
        }
      }
    }
  });

  test('CONTRAEXEMPLO: para cada um desses pedidos o texto anterior seria reprovado pelo MESMO detector', async () => {
    for (const base of ELEGIVEIS) {
      const { payload } = payloadAtual(CONJUNTOS[base](), { comVinculo: false });
      const r = await executar(payload);
      const anterior = comTrechoDoBloco(r.contexto, blocoDoTextoAnterior(payload.individualStats));
      expect([base, apresentaContagemPorDimensao(anterior)]).toEqual([base, true]);
    }
  });
});

// ============================================================ o system
describe('o `system` do modelo não muda com o Ajuste 1: o sha256 de cada cenário é o da base medida em `35a1506`', () => {
  test('em todos os cenários da base com respondentes, o `system` capturado tem o sha256 da base', async () => {
    const linhas = JSON.parse(ler(`${PASTA_SAIDA_A}/contextos-da-base-35a1506.json`));
    const sha256System = new Set<string>(linhas.cenarios.map((c: any) => c.sha256System));
    // O `system` não depende do payload: um só valor em todos os cenários da base, e é o que o handler atual produz.
    expect(sha256System.size).toBe(1);
    const { payload } = payloadAtual(CONJUNTOS['agregado-5'](), { comVinculo: false });
    const r = await executar(payload);
    expect(sha256(r.system)).toBe([...sha256System][0]);
  });
});
