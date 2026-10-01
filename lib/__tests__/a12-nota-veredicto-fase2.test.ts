export {};

/**
 * Nota e veredicto do Parecer IA, Fase 2: o que o modelo RECEBE, o que a API DEVOLVE e o que a tela APRESENTA.
 *
 * ⚠ **Instrumento, declarado.** Estes ensaios passam pelo TRATADOR REAL de `POST /api/ai-reviewer`, com o cliente do modelo
 * SIMULADO (chave falsa, texto controlado, sem rede: um `fetch` simulado que lança e conta termina em 0 chamadas), e pelo
 * COMPONENTE REAL `ParecerAISection`, por `renderToStaticMarkup` (renderização do componente, NÃO é a página no navegador). O
 * manipulador de cópia é o REAL, invocado diretamente com `navigator.clipboard.writeText` SIMULADO (NÃO é clique). Nenhum
 * parecer é gerado, e a redação do modelo NÃO é testada.
 *
 * ⚠ **As procedências, distinguidas em cada ensaio:**
 *   - as quatro condições de suspensão ALCANÇÁVEIS (três causas) e as duas elegíveis: o tratador real;
 *   - a quinta condição de suspensão, correspondente à quarta causa, `coerencia_nao_avaliada`: CONSTRUÍDA, por um simulado de
 *     `avaliarCoerencia` que devolve `null` (o tratador real NÃO a produz: `normalizeRequest` sempre calcula a coerência); a
 *     produção NÃO foi alterada para torná-la alcançável;
 *   - o estado de A.27 `nao_confirmado`: CONSTRUÍDO a partir de uma resposta REAL sem padrão reconhecido, com `validation`
 *     retirada ou invalidada SÓ no instrumento (o tratador real SEMPRE devolve `validation`).
 *
 * ⚠ **Os literais vêm do PEDIDO e da PREDIÇÃO registrada ANTES do código** (commit 848d5a4, `docs/dados/a12-nota-veredicto-fase2/`),
 * e NÃO do que o código imprime: os quatro rótulos, as quatro descrições, o prefixo, a frase da mensagem, os três valores do
 * estado, e o sha256 de cada contexto previsto. Nenhum teste foi adaptado ao que o código imprime.
 *
 * ⚠ **A FRONTEIRA.** R1 governa os CAMPOS e o DESTAQUE. Não impede, por si, que o CORPO e a CÓPIA contenham uma decisão: eles
 * seguem exibindo e copiando o texto integral, e este arquivo CARACTERIZA isso (e não o aprova): se o corpo ou a cópia mudarem,
 * os ensaios de fronteira reprovam e forçam uma decisão consciente. Nenhum texto desta rodada promete que o veredito deixe de ser
 * apresentado enquanto só o destaque está bloqueado.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ParecerAISection from '@/components/ParecerAISection';

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const lerJson = (rel: string): any => JSON.parse(ler(rel));
const sha256 = (t: string): string => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;

// ---------------------------------------------------------------------------------------------------------------------------
// OS LITERAIS DO PEDIDO (seções 1, 2.2, 2.3 e 2.4)
// ---------------------------------------------------------------------------------------------------------------------------
const MENSAGEM = 'Veredito não identificado no texto do parecer simulado.';
const PREFIXO = 'Destaque de nota e veredito suspenso: ';
const DESCRICAO = {
  disponibilidade: 'qualidade individual não avaliada',
  contradicao: 'contradição interna não resolvida na avaliação de qualidade',
  coerencia_nao_concluida: 'verificação de coerência não concluída',
  coerencia_nao_avaliada: 'coerência interna não avaliada nesta requisição',
} as const;
const ROTULO = {
  disponibilidade: 'Destaque de nota e veredito suspenso: qualidade individual não avaliada',
  contradicao: 'Destaque de nota e veredito suspenso: contradição interna não resolvida na avaliação de qualidade',
  coerencia_nao_concluida: 'Destaque de nota e veredito suspenso: verificação de coerência não concluída',
  coerencia_nao_avaliada: 'Destaque de nota e veredito suspenso: coerência interna não avaliada nesta requisição',
} as const;
const ESTADOS = ['padrao_reconhecido', 'nenhum_padrao_reconhecido', 'nao_executada_por_suspensao'] as const;
const SHA_SYSTEM = 'f3f2410c65c2919a477a5b2ee2c9b1628315effa85c906a71468ecf53eb36f98';

// ---------------------------------------------------------------------------------------------------------------------------
// Cliente do modelo SIMULADO, e o simulado DECLARADO de `avaliarCoerencia` (só para a causa construída)
// ---------------------------------------------------------------------------------------------------------------------------
const CHAVE = 'chave-anthropic-falsa-do-processo-de-teste';
const ENV_ANTES = { chave: process.env.ANTHROPIC_API_KEY, flag: process.env.USE_RAG_SEMANTIC };
process.env.ANTHROPIC_API_KEY = CHAVE;
delete process.env.USE_RAG_SEMANTIC;

const estado: { texto: string; contexto: string; system: string; chamadas: number; coerenciaNula: boolean } = {
  texto: '',
  contexto: '',
  system: '',
  chamadas: 0,
  coerenciaNula: false,
};

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = {
      create: async (a: { system?: unknown; messages: Array<{ content: string }> }) => {
        estado.chamadas += 1;
        estado.contexto = a.messages.map((m) => m.content).join('\n');
        estado.system = typeof a.system === 'string' ? a.system : JSON.stringify(a.system ?? '');
        return { content: [{ type: 'text', text: estado.texto }] };
      },
    };
  },
}));

// ⚠ Construção DECLARADA: só para a causa `coerencia_nao_avaliada`, que o tratador real não produz. Não altera produção.
jest.mock('@/lib/ai-reviewer/avaliacao-qualidade', () => {
  const real = jest.requireActual('@/lib/ai-reviewer/avaliacao-qualidade');
  return { ...real, avaliarCoerencia: (raw: any) => (estado.coerenciaNula ? null : real.avaliarCoerencia(raw)) };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/ai-reviewer/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const real = jest.requireActual('@/lib/ai-reviewer/avaliacao-qualidade');

let logs: string[] = [];
let silencios: jest.SpyInstance[] = [];
let espiaoFetch: jest.SpyInstance;
beforeAll(() => {
  espiaoFetch = jest.spyOn(globalThis as any, 'fetch').mockImplementation((() => { throw new Error('fetch proibido neste ensaio'); }) as any);
  silencios = [
    jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
    }),
    jest.spyOn(console, 'warn').mockImplementation(() => undefined),
    jest.spyOn(console, 'error').mockImplementation(() => undefined),
  ];
});
afterAll(() => {
  expect(espiaoFetch.mock.calls.length).toBe(0); // nenhuma chamada de rede, em nenhum ensaio
  espiaoFetch.mockRestore();
  silencios.forEach((s) => s.mockRestore());
  if (ENV_ANTES.chave === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ENV_ANTES.chave;
  if (ENV_ANTES.flag === undefined) delete process.env.USE_RAG_SEMANTIC; else process.env.USE_RAG_SEMANTIC = ENV_ANTES.flag;
});
jest.setTimeout(120000);

// ---------------------------------------------------------------------------------------------------------------------------
// As REQUISIÇÕES. ⚠ COPIA LITERAL de `lib/__tests__/a12-coerencia.test.ts` e da sonda da Fase 1 (as mesmas sete requisições:
// o sha256 de cada uma é conferido contra o da Fase 1 em `captura.json`).
// ---------------------------------------------------------------------------------------------------------------------------
const respondente = (i: number, cr: number | null, status?: string) => ({
  id: `resp-${i}`,
  name: `Respondente ${i}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  ...(status === undefined
    ? { status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO' }
    : { status }),
});

/** Requisição COERENTE: quatro respondentes com CR 0.05, e os agregados de acordo. */
function coerente(): any {
  const rs = [1, 2, 3, 4].map((i) => respondente(i, 0.05));
  return {
    projectName: 'Projeto do controle de coerencia',
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    finalScores: [{ code: 'A1', name: 'Alternativa 1', score: 0.62 }],
    responseCount: 4,
    qualityAnalysis: {
      respondents: rs,
      statistics: { byStatus: { 'CONFIÁVEL': 4, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 4, avgCR: 0.05 },
      summary: { total: 4, ok: 4, suspicious: 0, critical: 0 },
    },
    overallStats: { total: 4, valid: 4, warning: 0, critical: 0 },
    individualStats: {
      Benefits: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
      Opportunities: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
      Costs: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
      Risks: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
    },
  };
}

/** Requisição COERENTE e ELEGÍVEL com qualidade ruim: quatro CR 0.25, todos críticos. */
function ruim(): any {
  const rs = [1, 2, 3, 4].map((i) => respondente(i, 0.25));
  return {
    ...coerente(),
    qualityAnalysis: {
      respondents: rs,
      statistics: { byStatus: { 'CONFIÁVEL': 0, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 4 }, total: 4, avgCR: 0.25 },
      summary: { total: 4, ok: 0, suspicious: 0, critical: 4 },
    },
    overallStats: { total: 4, valid: 0, warning: 0, critical: 4 },
    individualStats: {
      Benefits: { total: 4, valid: 0, warning: 0, critical: 4, avgCR: 0.25 },
      Opportunities: { total: 4, valid: 0, warning: 0, critical: 4, avgCR: 0.25 },
      Costs: { total: 4, valid: 0, warning: 0, critical: 4, avgCR: 0.25 },
      Risks: { total: 4, valid: 0, warning: 0, critical: 4, avgCR: 0.25 },
    },
  };
}

type Causa = keyof typeof DESCRICAO;
type Condicao = {
  id: string;
  suspensa: boolean;
  causa: Causa | null;
  /** ⚠ CONSTRUÍDA: o tratador real não produz esta causa. */
  construida: boolean;
  fazer: () => any;
};

const CONDICOES: Condicao[] = [
  { id: 'elegivel-auto-A', suspensa: false, causa: null, construida: false, fazer: () => coerente() },
  { id: 'elegivel-auto-F', suspensa: false, causa: null, construida: false, fazer: () => ruim() },
  {
    id: 'disponibilidade-ausente',
    suspensa: true,
    causa: 'disponibilidade',
    construida: false,
    fazer: () => { const r = coerente(); delete r.qualityAnalysis.respondents; return r; },
  },
  {
    id: 'disponibilidade-incompleta',
    suspensa: true,
    causa: 'disponibilidade',
    construida: false,
    fazer: () => { const r = coerente(); r.qualityAnalysis.respondents = [respondente(1, 0.05), respondente(2, null)]; return r; },
  },
  {
    id: 'contradicao',
    suspensa: true,
    causa: 'contradicao',
    construida: false,
    fazer: () => { const r = coerente(); r.qualityAnalysis.summary.critical = 4; return r; },
  },
  {
    id: 'coerencia-nao-concluida',
    suspensa: true,
    causa: 'coerencia_nao_concluida',
    construida: false,
    fazer: () => { const r = coerente(); delete r.qualityAnalysis.statistics.total; return r; },
  },
  { id: 'coerencia-nao-avaliada-CONSTRUIDA', suspensa: true, causa: 'coerencia_nao_avaliada', construida: true, fazer: () => coerente() },
];
const SUSPENSAS = CONDICOES.filter((c) => c.suspensa);
const ALCANCAVEIS = SUSPENSAS.filter((c) => !c.construida);
const ELEGIVEIS = CONDICOES.filter((c) => !c.suspensa);
const doId = (id: string): Condicao => CONDICOES.find((c) => c.id === id)!;

// ---------------------------------------------------------------------------------------------------------------------------
// Os TEXTOS FIXADOS (do instrumento da Fase 1). ⚠ O corpo neutro não traz nenhum termo que o extrator reconheça.
// ---------------------------------------------------------------------------------------------------------------------------
const CORPO_NEUTRO = [
  '## 📋 RESUMO EXECUTIVO',
  'Texto de ensaio do instrumento de medição, escrito apenas para ter extensão suficiente e nenhum termo de resultado.',
  '',
  '## 🔍 ANÁLISE',
  'Parágrafo de preenchimento, sem números, sem referências e sem qualquer termo que o extrator reconheça.',
  '',
  '',
].join('\n');

/** Com padrão reconhecido: a seção editorial traz REVISÕES MAIORES (nota C). */
const T1 = `${CORPO_NEUTRO}## 🎯 DECISÃO EDITORIAL\nREVISÕES MAIORES\n\nTexto final de ensaio, sem outros termos de resultado.\n`;
/** Com padrão reconhecido, sem seção: REJEITAR (nota F), pelo texto inteiro. */
const T3A = `${CORPO_NEUTRO}Conclusão de ensaio: REJEITAR, com convite para nova submissão.\n`;
/** SEM padrão: nenhum termo de resultado e nenhuma seção. */
const T2A = `${CORPO_NEUTRO}Conclusão de ensaio: o texto não declara categoria de resultado alguma.\n`;
/** SEM padrão: a seção existe, mas nenhum padrão casa. */
const T2B = `${CORPO_NEUTRO}## 🎯 DECISÃO EDITORIAL\nA categoria fica a critério do comitê, sem rótulo declarado.\n`;
/** SEM padrão POR CAUSA DA GUARDA de 50 caracteres: uma pessoa lê a decisão, e nenhum padrão a reconhece. */
const AD1 = 'Nota B. ACEITO COM REVISÕES MENORES';

const COM_PADRAO: Array<[string, string, string, string]> = [
  ['T1', T1, 'C', 'REVISÕES MAIORES'],
  ['T3a', T3A, 'F', 'REJEITAR'],
];
const SEM_PADRAO: Array<[string, string]> = [['T2a', T2A], ['T2b', T2B], ['AD1 (guarda de 50)', AD1]];

/** As duas apresentações de A.27 que o tratador real produz além da aprovada, induzidas por um SUFIXO do texto (a extração não muda). */
const SUFIXO_REPROVADA = '\nObservação final: a ferramenta ChatGPT foi consultada na redação deste trecho.\n';
const SUFIXO_INCONCLUSIVA = '\nObservação final: o Score = 0.5 foi mencionado sem referência.\n';

// ---------------------------------------------------------------------------------------------------------------------------
// A EXECUÇÃO do tratador real
// ---------------------------------------------------------------------------------------------------------------------------
type Execucao = { corpo: any; status: number; contexto: string; system: string; logs: string[] };

async function executar(payload: any, texto: string, coerenciaNula = false): Promise<Execucao> {
  estado.texto = texto;
  estado.contexto = '';
  estado.system = '';
  estado.coerenciaNula = coerenciaNula;
  logs = [];
  const antes = estado.chamadas;
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  const corpo = await res.json();
  estado.coerenciaNula = false;
  // ⚠ CONTROLE de captura NÃO VAZIA: sem isto, toda ausência passaria por vacuidade.
  expect(estado.chamadas).toBe(antes + 1);
  expect(estado.contexto).toContain('## Pesos Finais da Hierarquia de Controle');
  return { corpo, status: res.status ?? 200, contexto: estado.contexto, system: estado.system, logs: [...logs] };
}
const executarCondicao = (c: Condicao, texto: string, ajustar: (r: any) => any = (r) => r) => executar(ajustar(c.fazer()), texto, c.construida);

/** O `aiReview` que a PÁGINA monta (`page.tsx`, `setAiReview`): os mesmos campos, `mensagemDaExtracao` do nível principal. */
const aiReviewDaPagina = (c: any) => ({
  nota: c.nota,
  veredicto: c.veredicto,
  notaSuspensa: c.notaSuspensa ?? null,
  mensagemDaExtracao: c.mensagemDaExtracao ?? null,
  review: c.review,
  validation: c.validation,
  metadata: c.metadata,
});

// ---------------------------------------------------------------------------------------------------------------------------
// A APRESENTAÇÃO: componente REAL. HTML (renderToStaticMarkup) e árvore de elementos (função chamada com `useState` simulado).
// ---------------------------------------------------------------------------------------------------------------------------
type No = any;
const filhos = (no: No): No[] => {
  const c = no?.props?.children;
  return c === undefined || c === null ? [] : Array.isArray(c) ? (c as any[]).flat(Infinity) : [c];
};
function achar(no: No, pred: (n: No) => boolean, acc: No[] = []): No[] {
  if (no && typeof no === 'object' && !Array.isArray(no)) {
    if (pred(no)) acc.push(no);
    for (const f of filhos(no)) achar(f, pred, acc);
  } else if (Array.isArray(no)) {
    for (const f of (no as any[]).flat(Infinity)) achar(f, pred, acc);
  }
  return acc;
}
function textoDe(no: No): string {
  if (no === null || no === undefined || typeof no === 'boolean') return '';
  if (typeof no === 'string' || typeof no === 'number') return String(no);
  if (Array.isArray(no)) return (no as any[]).map(textoDe).join('');
  return filhos(no).map(textoDe).join('');
}
const normalizar = (s: string) => s.replace(/[#*]/g, '').replace(/\s+/g, ' ').trim();

const renderizar = (aiReview: any): string =>
  renderToStaticMarkup(React.createElement(ParecerAISection as any, { aiReview, loading: false, onExecute: () => undefined }));

function arvoreDoComponente(aiReview: any): { arvore: No; setCopied: jest.Mock } {
  const setCopied = jest.fn();
  const espiao = jest.spyOn(React, 'useState').mockReturnValue([false, setCopied] as any);
  try {
    return { arvore: (ParecerAISection as any)({ aiReview, loading: false, onExecute: () => undefined }), setCopied };
  } finally {
    espiao.mockRestore();
  }
}

/** ⚠ O manipulador REAL de cópia, invocado diretamente, com `writeText` SIMULADO. NÃO é clique, e NÃO é a área de transferência. */
async function conteudoCopiado(aiReview: any): Promise<string | null> {
  const { arvore } = arvoreDoComponente(aiReview);
  const botoes = achar(arvore, (n) => n.type === 'button' && n.props?.title === 'Copiar parecer em markdown');
  if (botoes.length === 0) return null;
  const chamadas: string[] = [];
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: async (t: string) => { chamadas.push(t); } } },
    configurable: true,
    writable: true,
  });
  const espiaoTimeout = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any) => 0 as any) as any);
  try {
    await botoes[0].props.onClick();
  } finally {
    espiaoTimeout.mockRestore();
    if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete (globalThis as any).navigator;
  }
  expect(chamadas.length).toBe(1);
  return chamadas[0];
}

/** O que a renderização mostra, medido sobre a ÁRVORE do componente e conferido contra o HTML. */
function superficies(aiReview: any) {
  const { arvore } = arvoreDoComponente(aiReview);
  const html = renderizar(aiReview);
  const alertas = achar(arvore, (n) => n.props?.role === 'alert');
  const status = achar(arvore, (n) => n.props?.role === 'status');
  const cartao = status.find((n) => textoDe(achar(n, (m) => m.type === 'h4')[0]).startsWith('📊'));
  const blocoMsg = status.filter((n) => achar(n, (m) => m.type === 'h4').length === 0 && achar(n, (m) => m.type === 'p').some((p) => textoDe(p) === MENSAGEM));
  const caixaDestaque = achar(arvore, (n) => typeof n?.props?.className === 'string' && n.props.className.includes('flex gap-3 mb-6 flex-wrap'));
  const recipiente = achar(arvore, (n) => typeof n?.props?.className === 'string' && n.props.className.includes('whitespace-pre-wrap'));
  const textoExibido = recipiente.length ? filhos(recipiente[0]).map((l) => textoDe(l)).join('\n') : '';
  const ordem = ([
    ['aviso-A27', html.indexOf('role="alert"')],
    ['cartao-de-suspensao', html.indexOf('📊 Destaque')],
    ['mensagem', html.indexOf(MENSAGEM)],
    ['destaque', html.indexOf('Nota Científica')],
    ['corpo', html.indexOf('whitespace-pre-wrap')],
  ] as Array<[string, number]>).filter(([, p]) => p >= 0).sort((a, b) => a[1] - b[1]).map(([n]) => n);
  const s = {
    html,
    avisoDeA27: { exibido: alertas.length > 0, titulo: alertas.length ? textoDe(achar(alertas[0], (n) => n.type === 'h4')[0]) : null },
    cartao: {
      exibido: !!cartao,
      titulo: cartao ? textoDe(achar(cartao, (n) => n.type === 'h4')[0]) : null,
      motivo: cartao ? textoDe(achar(cartao, (n) => n.type === 'p')[0]) : null,
    },
    mensagem: { blocos: blocoMsg.length, ocorrenciasNoHtml: ocorrencias(html, MENSAGEM) },
    destaque: caixaDestaque.length > 0,
    corpo: { exibido: recipiente.length > 0, igualAoTextoRecebido: recipiente.length > 0 && normalizar(textoExibido) === normalizar(aiReview?.review ?? ''), textoExibido },
    ordem,
  };
  // ⚠ Conferência cruzada árvore × HTML: sem ela, uma asserção sobre a árvore poderia passar sobre algo que o HTML não traz.
  expect([html.includes('role="alert"'), html.includes('📊 '), html.includes('Nota Científica'), html.includes(MENSAGEM)]).toEqual([
    s.avisoDeA27.exibido,
    s.cartao.exibido,
    s.destaque,
    s.mensagem.blocos > 0,
  ]);
  return s;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Os DADOS REGISTRADOS ANTES do código (commit 848d5a4) e o texto histórico da Fase 1 (intacto)
// ---------------------------------------------------------------------------------------------------------------------------
const PREDICAO = Object.fromEntries(lerJson('docs/dados/a12-nota-veredicto-fase2/predicao-contextos.json').map((x: any) => [x.condicao, x]));
const CAPTURA_FASE1 = Object.fromEntries(lerJson('docs/dados/a12-nota-veredicto-fase1/captura.json').capturas.map((x: any) => [x.condicao, x]));
const antigoDaFase1 = (id: string): string => ler(`docs/dados/a12-nota-veredicto-fase1/contextos-capturados/ctx-${id}.txt`);

const TITULO_DO_BLOCO = '**Referência Automatizada (apenas contexto — NÃO use como sua decisão):**\n';
const ULTIMA_DO_BLOCO = '- IMPORTANTE: Sua DECISÃO EDITORIAL na seção 🎯 deve ser baseada na SUA análise dos dados, NÃO nesta referência automática.\n';
const PREFIXO_ANTIGO = 'SUSPENSA: Nota não calculada: ';

/**
 * O contexto ESPERADO, recomposto a partir do contexto ANTIGO da Fase 1 por EXATAMENTE duas trocas, CONTADAS:
 * (T1) saem as quatro linhas de saída do bloco; (T2) nas suspensas, `SUSPENSA: Nota não calculada: ` vira `SUSPENSA: `, uma vez.
 */
function esperadoDoAntigo(antigo: string, suspensa: boolean): { texto: string; blocosRetirados: number; prefixosTrocados: number } {
  expect(ocorrencias(antigo, TITULO_DO_BLOCO)).toBe(1);
  expect(ocorrencias(antigo, ULTIMA_DO_BLOCO)).toBe(1);
  const i = antigo.indexOf(TITULO_DO_BLOCO);
  const fim = antigo.indexOf(ULTIMA_DO_BLOCO, i) + ULTIMA_DO_BLOCO.length;
  let texto = antigo.slice(0, i) + antigo.slice(fim);
  const n = ocorrencias(texto, PREFIXO_ANTIGO);
  expect(n).toBe(suspensa ? 1 : 0);
  if (suspensa) texto = texto.replace(PREFIXO_ANTIGO, 'SUSPENSA: ');
  return { texto, blocosRetirados: 1, prefixosTrocados: n };
}

// ===========================================================================================================================
describe('A. O que o modelo RECEBE: os sete contextos (P1 a P4), contra a predição registrada ANTES do código', () => {
  test('os contextos históricos da Fase 1 estão INTACTOS (o sha256 de cada um é o registrado na predição), e as requisições são as da Fase 1', async () => {
    for (const c of CONDICOES) {
      expect([c.id, sha256(antigoDaFase1(c.id))]).toEqual([c.id, PREDICAO[c.id].antigo.sha256]);
      expect([c.id, sha256(JSON.stringify(c.fazer()))]).toEqual([c.id, CAPTURA_FASE1[c.id].sha256Requisicao]); // a MESMA requisição
    }
  });

  test.each(CONDICOES.map((c) => [c.id] as [string]))(
    '%s: o contexto novo é o ANTIGO menos as quatro linhas do bloco e, nas suspensas, menos o prefixo: byte a byte, e com o sha256 PREVISTO',
    async (id) => {
      const c = doId(id);
      const r = await executarCondicao(c, T1);
      const { texto: esperado, blocosRetirados, prefixosTrocados } = esperadoDoAntigo(antigoDaFase1(id), c.suspensa);
      expect([blocosRetirados, prefixosTrocados]).toEqual([1, c.suspensa ? 1 : 0]); // as duas trocas, contadas
      expect(r.contexto === esperado).toBe(true); // ⚠ o contexto COMPLETO, byte a byte: qualquer outro byte diferente reprova
      // ⚠ e contra o que foi PREVISTO antes do código, e não só contra o que se recompõe agora
      expect(Buffer.byteLength(r.contexto, 'utf8')).toBe(PREDICAO[id].previsto.bytes);
      expect(sha256(r.contexto)).toBe(PREDICAO[id].previsto.sha256);
      expect(sha256(r.system)).toBe(SHA_SYSTEM); // o `system` não muda
      expect(r.contexto).not.toBe(antigoDaFase1(id)); // CONTRAEXEMPLO: o contexto MUDOU em relação ao da Fase 1 (a reversão não é vacuosa)
    }
  );

  test.each(CONDICOES.map((c) => [c.id] as [string]))('%s: o bloco inteiro saiu, e nenhum termo dele nem o rótulo antigo nem o prefixo da tela chegam ao contexto', async (id) => {
    const r = await executarCondicao(doId(id), T1);
    for (const termo of ['Referência Automatizada', 'Pontuação automática', 'Sugestão automática', 'referência automática', 'Nota não calculada', 'Destaque de nota e veredito suspenso']) {
      expect([id, termo, ocorrencias(r.contexto, termo)]).toEqual([id, termo, 0]);
    }
    // as linhas em branco vizinhas FICAM: três linhas em branco seguidas antes do `---` (não são "palavra" do contexto)
    expect(r.contexto).toContain('\n\n\n\n---\n\n# DADOS METODOLÓGICOS COLETADOS');
  });

  test.each(SUSPENSAS.map((c) => [c.id] as [string]))('%s: o MOTIVO continua chegando ao contexto, UMA vez (duas no antigo), na linha prevista (P3: critério de bloqueio)', async (id) => {
    const c = doId(id);
    const r = await executarCondicao(c, T1);
    const motivo = PREDICAO[id].motivo; // o texto do motivo, REGISTRADO na base
    expect(typeof motivo.texto).toBe('string');
    expect(ocorrencias(antigoDaFase1(id), motivo.texto)).toBe(motivo.ocorrenciasNoAntigo); // o antigo: no bloco E no bloco de qualidade
    expect(motivo.ocorrenciasNoAntigo).toBe(2);
    expect(ocorrencias(r.contexto, motivo.texto)).toBe(1); // ⚠ nenhum motivo se perdeu
    const linhas = r.contexto.split('\n').map((l, i) => (l.includes(motivo.texto) ? i + 1 : null)).filter(Boolean);
    expect(linhas).toEqual(motivo.linhasNoPrevisto);
    // e o motivo é o MESMO que a resposta devolve em `notaSuspensa.motivo`
    expect(r.corpo.notaSuspensa.motivo).toBe(motivo.texto);
  });

  test('os elegíveis não têm motivo, nem a frase de suspensão: o ranking das alternativas e as linhas do vínculo e da cobertura ficam', async () => {
    for (const c of ELEGIVEIS) {
      const r = await executarCondicao(c, T1);
      expect([c.id, r.contexto.includes('a classificação global está SUSPENSA')]).toEqual([c.id, false]);
      expect(r.contexto).toContain('1º A1 — Alternativa 1: Score = 0.620000');
    }
  });
});

describe('B. Os quatro rótulos: a DESCRIÇÃO no contexto, o PREFIXO mais a mesma descrição na tela (seção 2.4)', () => {
  test('os quatro rótulos têm a redação do pedido, são distintos entre si, e as quatro descrições também', () => {
    expect(real.ROTULO_NOTA_SUSPENSA).toBe(ROTULO.disponibilidade);
    expect(real.ROTULO_NOTA_SUSPENSA_POR_CONTRADICAO).toBe(ROTULO.contradicao);
    expect(real.ROTULO_NOTA_SUSPENSA_POR_VERIFICACAO_NAO_CONCLUIDA).toBe(ROTULO.coerencia_nao_concluida);
    expect(real.ROTULO_NOTA_SUSPENSA_POR_COERENCIA_NAO_AVALIADA).toBe(ROTULO.coerencia_nao_avaliada);
    expect(new Set(Object.values(ROTULO)).size).toBe(4);
    expect(new Set(Object.values(DESCRICAO)).size).toBe(4);
    // os textos COMPARTILHADOS: o prefixo, as quatro descrições, e o mapa por causa declarada
    expect(real.PREFIXO_DESTAQUE_SUSPENSO).toBe(PREFIXO);
    expect(real.DESCRICAO_DA_SUSPENSAO).toEqual(DESCRICAO);
    for (const causa of Object.keys(DESCRICAO) as Causa[]) expect(ROTULO[causa]).toBe(`${PREFIXO}${DESCRICAO[causa]}`);
    // ⚠ "veredito do sistema" não é usado: o projeto distingue o reconhecimento textual de uma classificação própria
    for (const t of Object.values(ROTULO)) expect(t).not.toMatch(/sistema/i);
  });

  test.each(SUSPENSAS.map((c) => [c.id] as [string]))('%s: o contexto traz só a DESCRIÇÃO da causa DECLARADA, e a resposta traz o prefixo mais a mesma descrição', async (id) => {
    const c = doId(id);
    const r = await executarCondicao(c, T1);
    const frase = `Nenhum percentual de qualidade é apresentado, e a classificação global está SUSPENSA: ${DESCRICAO[c.causa as Causa]}.`;
    expect(ocorrencias(r.contexto, frase)).toBe(1);
    expect(ocorrencias(r.contexto, 'a classificação global está SUSPENSA')).toBe(1); // uma só frase de suspensão no contexto
    expect(r.contexto).not.toContain(PREFIXO);
    // ⚠ a descrição é o TEXTO da causa, e NÃO o valor do campo `causa` (um identificador)
    expect(r.contexto).not.toContain('coerencia_nao_avaliada');
    expect(r.contexto).not.toContain('coerencia_nao_concluida');
    // a causa NÃO mudou, e o rótulo da resposta é o prefixo mais a MESMA descrição
    expect(r.corpo.notaSuspensa.causa).toBe(c.causa);
    expect(r.corpo.notaSuspensa.rotulo).toBe(`${PREFIXO}${DESCRICAO[c.causa as Causa]}`);
    expect(r.corpo.notaSuspensa.rotulo).toBe(ROTULO[c.causa as Causa]);
  });

  test('a composição é a partir de TEXTOS COMPARTILHADOS: nenhum sufixo sai de um rótulo cortado por posição ou por expressão regular (leitura do fonte)', () => {
    const arquivos = ['lib/ai-reviewer/avaliacao-qualidade.ts', 'app/api/ai-reviewer/route.ts', 'components/ParecerAISection.tsx', 'app/decisor/resultados/[projectId]/page.tsx'];
    // o detector: uma chamada de método de corte, de busca ou de expressão regular sobre um rótulo
    const cortaRotulo = /(ROTULO_[A-Z_]+|\.rotulo|\brotulo)\s*\)?\s*\.(slice|substring|substr|split|match|matchAll|replace|replaceAll|indexOf|lastIndexOf|search|startsWith|endsWith|at|charAt)\(/;
    for (const a of arquivos) expect([a, cortaRotulo.test(ler(a))]).toEqual([a, false]);
    // CONTRAEXEMPLOS: o detector pega o corte por posição e o corte por expressão regular
    expect(cortaRotulo.test('const d = ROTULO_NOTA_SUSPENSA.slice(PREFIXO_DESTAQUE_SUSPENSO.length);')).toBe(true);
    expect(cortaRotulo.test("const d = elegivel.rotulo.replace(/^Destaque de nota e veredito suspenso: /, '');")).toBe(true);
    // os quatro rótulos são TEMPLATES do prefixo mais a descrição, e nada mais
    const fonte = ler('lib/ai-reviewer/avaliacao-qualidade.ts');
    const par: Array<[string, string]> = [
      ['ROTULO_NOTA_SUSPENSA', 'DESCRICAO_SUSPENSAO_POR_DISPONIBILIDADE'],
      ['ROTULO_NOTA_SUSPENSA_POR_CONTRADICAO', 'DESCRICAO_SUSPENSAO_POR_CONTRADICAO'],
      ['ROTULO_NOTA_SUSPENSA_POR_VERIFICACAO_NAO_CONCLUIDA', 'DESCRICAO_SUSPENSAO_POR_VERIFICACAO_NAO_CONCLUIDA'],
      ['ROTULO_NOTA_SUSPENSA_POR_COERENCIA_NAO_AVALIADA', 'DESCRICAO_SUSPENSAO_POR_COERENCIA_NAO_AVALIADA'],
    ];
    for (const [rotulo, descricao] of par) {
      const re = new RegExp(`export const ${rotulo} =\\s*\`\\$\\{PREFIXO_DESTAQUE_SUSPENSO\\}\\$\\{${descricao}\\}\`;`);
      expect([rotulo, re.test(fonte)]).toEqual([rotulo, true]);
    }
  });

  test('a rota monta as TRÊS frases do contexto a partir das descrições, e nunca do rótulo (leitura do fonte)', () => {
    const rota = ler('app/api/ai-reviewer/route.ts');
    const linhas = rota.split('\n').filter((l) => l.includes('a classificação global está SUSPENSA:'));
    expect(linhas.length).toBe(3); // `:765`, `:778` (dinâmico) e `:791`, depois da reancoragem
    for (const l of linhas) {
      expect(l).toContain('${DESCRICAO_');
      expect(l).not.toMatch(/ROTULO|rotulo/);
    }
    // o ponto dinâmico acompanha a CAUSA DECLARADA, e a descrição é o texto da causa
    expect(rota).toContain('${DESCRICAO_DA_SUSPENSAO[elegivel.causa]}');
  });
});

describe('C. A resposta: o estado da extração, a mensagem, R1 e a ausência dos campos que saíram', () => {
  test('os três valores do estado (lidos do TIPO em route.ts) e o nome do campo da mensagem NÃO afirmam identificação semântica, e a constante da mensagem é a frase do pedido', () => {
    expect([...ESTADOS]).toEqual(['padrao_reconhecido', 'nenhum_padrao_reconhecido', 'nao_executada_por_suspensao']);
    // ⚠ lidos do CÓDIGO, e não só dos literais deste arquivo: o tipo do estado e a constante da mensagem
    const rota = ler('app/api/ai-reviewer/route.ts');
    const tipo = /type EstadoDaExtracao =([^;]+);/.exec(rota);
    expect(tipo).not.toBeNull();
    expect((tipo as RegExpExecArray)[1].match(/'[a-z_]+'/g)?.map((x) => x.slice(1, -1))).toEqual([...ESTADOS]);
    expect(rota).toContain(`const MENSAGEM_DA_EXTRACAO_SEM_PADRAO = '${MENSAGEM}';`);
    for (const v of [...ESTADOS, 'estadoDaExtracao', 'mensagemDaExtracao']) expect(v).not.toMatch(/identific|extra[ií]d|extrac.*ok/i);
    // CONTRAEXEMPLO: o detector pega as formas vedadas
    expect(/identific|extra[ií]d/i.test('veredito_identificado')).toBe(true);
    expect(/identific|extra[ií]d/i.test('grade_extraida')).toBe(true);
  });

  test.each(CONDICOES.map((c) => [c.id] as [string]))('%s: a resposta traz estadoDaExtracao em metadata e mensagemDaExtracao no NÍVEL PRINCIPAL; automaticGrade e gradeSource saíram', async (id) => {
    const r = await executarCondicao(doId(id), T2A);
    const corpo = r.corpo;
    expect(corpo.success).toBe(true);
    expect(ESTADOS).toContain(corpo.metadata.estadoDaExtracao);
    expect('mensagemDaExtracao' in corpo).toBe(true); // nível principal
    expect('mensagemDaExtracao' in corpo.metadata).toBe(false); // e NÃO dentro de `metadata`
    expect('automaticGrade' in corpo.metadata).toBe(false);
    expect('gradeSource' in corpo.metadata).toBe(false);
    expect(Object.keys(corpo.metadata)).toContain('estadoDaExtracao');
  });

  describe.each(CONDICOES.map((c) => [c.id] as [string]))('%s', (id) => {
    const c = doId(id);

    test.each(COM_PADRAO)('texto COM padrão (%s): ' + (c.suspensa ? 'R1: sob suspensão nota e veredicto são NULOS e a extração NÃO corre' : 'estado padrao_reconhecido, com os valores extraídos'), async (_n, texto, nota, veredicto) => {
      const r = await executarCondicao(c, texto);
      const corpo = r.corpo;
      if (c.suspensa) {
        expect([corpo.nota, corpo.veredicto]).toEqual([null, null]);
        expect(corpo.metadata.estadoDaExtracao).toBe('nao_executada_por_suspensao');
        expect(corpo.mensagemDaExtracao).toBeNull();
        expect(corpo.notaSuspensa.suspensa).toBe(true);
        // ⚠ a extração NÃO CORREU: nenhum dos logs do extrator, que existem quando ele reconhece um padrão
        expect(r.logs.filter((l) => /Grade extraída/.test(l))).toEqual([]);
        expect(corpo.review).toBe(texto); // e o texto chegou inteiro, com o padrão que o extrator reconheceria
      } else {
        expect(corpo.metadata.estadoDaExtracao).toBe('padrao_reconhecido');
        expect([corpo.nota, corpo.veredicto]).toEqual([nota, veredicto]);
        expect(corpo.mensagemDaExtracao).toBeNull();
        expect(corpo.notaSuspensa).toBeNull();
        expect(r.logs.some((l) => /Grade extraída/.test(l))).toBe(true); // a extração CORREU
        expect(r.logs.some((l) => /Nenhum padrão de nota ou veredicto reconhecido|Fallback para nota automática/.test(l))).toBe(false);
      }
    });

    test.each(SEM_PADRAO)('texto SEM padrão (%s): ' + (c.suspensa ? 'estado nao_executada_por_suspensao e mensagem nula' : 'nota e veredicto NULOS (sem valor automático), estado nenhum_padrao_reconhecido e a mensagem do pedido'), async (_n, texto) => {
      const r = await executarCondicao(c, texto);
      const corpo = r.corpo;
      expect([corpo.nota, corpo.veredicto]).toEqual([null, null]);
      if (c.suspensa) {
        expect(corpo.metadata.estadoDaExtracao).toBe('nao_executada_por_suspensao');
        expect(corpo.mensagemDaExtracao).toBeNull();
      } else {
        expect(corpo.metadata.estadoDaExtracao).toBe('nenhum_padrao_reconhecido');
        // ⚠ O log de `:1451` ("Fallback para nota automática") seria FALSO: não há mais fallback. Foi substituído por um log sobre a
        //   ausência de padrão reconhecido, e nenhum log do handler promete o valor automático.
        expect(r.logs.some((l) => /Nenhum padrão de nota ou veredicto reconhecido/.test(l))).toBe(true);
        expect(r.logs.some((l) => /Fallback para nota automática/.test(l))).toBe(false);
        expect(corpo.mensagemDaExtracao).toBe(MENSAGEM); // exatamente a frase do pedido, sem letra
        expect(corpo.mensagemDaExtracao).not.toMatch(/\b[A-F]\b\s*[-–:]/); // sem letra e sem veredito substituto
        expect(corpo.notaSuspensa).toBeNull(); // a mensagem NÃO é a suspensão: a causa é outra
        // ⚠ e o valor automático NÃO reaparece em lugar nenhum da resposta
        expect(JSON.stringify(corpo)).not.toMatch(/"score"\s*:\s*(100|45)/);
      }
    });
  });

  test('o MESMO texto: sob suspensão a extração não corre (R1), e sem suspensão é reconhecido (a diferença é a suspensão, e não o texto)', async () => {
    const suspensa = await executarCondicao(doId('disponibilidade-ausente'), T1);
    const livre = await executarCondicao(doId('elegivel-auto-A'), T1);
    expect([suspensa.corpo.nota, suspensa.corpo.veredicto, suspensa.corpo.metadata.estadoDaExtracao]).toEqual([null, null, 'nao_executada_por_suspensao']);
    expect([livre.corpo.nota, livre.corpo.veredicto, livre.corpo.metadata.estadoDaExtracao]).toEqual(['C', 'REVISÕES MAIORES', 'padrao_reconhecido']);
  });

  test('o valor da mensagem depende SÓ do estado da extração, e independe do estado de A.27 (tratador real: aprovado, reprovado, inconclusivo)', async () => {
    const A = doId('elegivel-auto-A');
    const casos: Array<[string, string, (r: any) => any]> = [
      ['aprovado', '', (r) => r],
      ['reprovado', SUFIXO_REPROVADA, (r) => r],
      ['inconclusivo', SUFIXO_INCONCLUSIVA, (r) => ({ ...r, finalScores: [] })],
    ];
    for (const [esperado, sufixo, ajustar] of casos) {
      const r = await executarCondicao(A, T2A + sufixo, ajustar);
      expect([esperado, r.corpo.validation.estado]).toEqual([esperado, esperado]); // o estado de A.27 é o induzido
      expect([esperado, r.corpo.metadata.estadoDaExtracao]).toEqual([esperado, 'nenhum_padrao_reconhecido']); // o sufixo NÃO muda a extração
      expect([esperado, r.corpo.mensagemDaExtracao]).toEqual([esperado, MENSAGEM]);
      expect([esperado, r.corpo.nota, r.corpo.veredicto]).toEqual([esperado, null, null]);
    }
    // CONTRAEXEMPLO: com padrão reconhecido, o MESMO estado de A.27 não traz mensagem
    const reprovadaComPadrao = await executarCondicao(A, T1 + SUFIXO_REPROVADA);
    expect([reprovadaComPadrao.corpo.validation.estado, reprovadaComPadrao.corpo.mensagemDaExtracao]).toEqual(['reprovado', null]);
  });

  test('a fonte: automaticGrade e gradeSource saíram de route.ts, da página e do componente; mensagemDaExtracao tem o MESMO nome nos três pontos', () => {
    const rota = ler('app/api/ai-reviewer/route.ts');
    const pagina = ler('app/decisor/resultados/[projectId]/page.tsx');
    const componente = ler('components/ParecerAISection.tsx');
    for (const [nome, fonte] of [['route', rota], ['page', pagina], ['component', componente]] as Array<[string, string]>) {
      expect([nome, /automaticGrade|gradeSource/.test(fonte)]).toEqual([nome, false]);
      expect([nome, fonte.includes('mensagemDaExtracao')]).toEqual([nome, true]);
    }
    expect(rota).toContain('estadoDaExtracao');
    expect(pagina).toContain('mensagemDaExtracao: data.mensagemDaExtracao ?? null');
    expect(componente).toContain('mensagemDaExtracao?: string | null;');
    // `calculateGrade` NÃO foi removida (a remoção continua condicionada à separação do sinal de suspensão e dos logs)
    expect(rota).toContain('function calculateGrade(');
    expect(rota).toContain('const classification = calculateGrade(data);');
  });
});

describe('D. A apresentação: a mensagem é aviso DIAGNÓSTICO, coexiste com A.27 e não autoriza o destaque', () => {
  /** Uma resposta REAL, elegível e sem padrão reconhecido, no estado de A.27 induzido pelo sufixo. */
  async function respostaSemPadrao(sufixo: string, ajustar: (r: any) => any = (r) => r) {
    const r = await executarCondicao(doId('elegivel-auto-A'), T2A + sufixo, ajustar);
    expect(r.corpo.metadata.estadoDaExtracao).toBe('nenhum_padrao_reconhecido');
    return r.corpo;
  }

  test('aprovado: a mensagem aparece UMA vez, com role="status", sem aviso de A.27 e SEM destaque; o corpo e a cópia são o texto integral', async () => {
    const corpo = await respostaSemPadrao('');
    const aiReview = aiReviewDaPagina(corpo);
    const s = superficies(aiReview);
    expect(s.mensagem).toEqual({ blocos: 1, ocorrenciasNoHtml: 1 });
    expect(s.html).toMatch(/role="status"[^>]*><p[^>]*>Veredito não identificado no texto do parecer simulado\.<\/p>/);
    expect(s.avisoDeA27.exibido).toBe(false);
    expect(s.destaque).toBe(false); // nota e veredicto nulos: o portão não abre
    expect(s.ordem).toEqual(['mensagem', 'corpo']);
    expect(s.corpo.igualAoTextoRecebido).toBe(true);
    expect(await conteudoCopiado(aiReview)).toBe(corpo.review);
  });

  const QUARENTENAS: Array<[string, string, (r: any) => any, string]> = [
    ['reprovado', SUFIXO_REPROVADA, (r: any) => r, 'Parecer reprovado na verificação'],
    ['inconclusivo', SUFIXO_INCONCLUSIVA, (r: any) => ({ ...r, finalScores: [] }), 'Verificação inconclusiva'],
  ];
  test.each(QUARENTENAS)('%s (tratador real): a mensagem COEXISTE com a quarentena de A.27, não a substitui, e não autoriza destaque', async (estadoA27, sufixo, ajustar, tituloDoAviso) => {
    const corpo = await respostaSemPadrao(sufixo, ajustar);
    expect(corpo.validation.estado).toBe(estadoA27);
    const s = superficies(aiReviewDaPagina(corpo));
    expect(s.avisoDeA27.exibido).toBe(true);
    expect(s.avisoDeA27.titulo).toBe(`⚠️ ${tituloDoAviso}`); // o aviso de A.27 continua, com o próprio título
    expect(s.mensagem).toEqual({ blocos: 1, ocorrenciasNoHtml: 1 });
    expect(s.destaque).toBe(false);
    expect(s.ordem).toEqual(['aviso-A27', 'mensagem', 'corpo']); // a mensagem vem DEPOIS do aviso de A.27
    expect(s.corpo.igualAoTextoRecebido).toBe(true);
  });

  const CONSTRUCOES: Array<[string, (v: any) => any]> = [
    ['validation-retirada', () => undefined],
    ['validation-invalidada', (v: any) => ({ ...v, version: 'versao-invalida-do-instrumento' })],
  ];
  test.each(CONSTRUCOES)('nao_confirmado, CONSTRUÍDO (%s): a partir de uma resposta REAL sem padrão, com validation alterada SÓ no instrumento, os dois avisos coexistem e não há destaque', async (_variante, alterar) => {
    const corpo = await respostaSemPadrao('');
    expect(corpo.validation.estado).toBe('aprovado'); // a resposta REAL é aprovada: o nao_confirmado NÃO é produzido pelo tratador
    const aiReview = { ...aiReviewDaPagina(corpo), validation: alterar(corpo.validation) };
    const s = superficies(aiReview);
    expect(s.avisoDeA27.exibido).toBe(true);
    expect(s.avisoDeA27.titulo).toBe('⚠️ Verificação não confirmada');
    expect(s.mensagem).toEqual({ blocos: 1, ocorrenciasNoHtml: 1 });
    expect(s.destaque).toBe(false);
    expect(s.ordem).toEqual(['aviso-A27', 'mensagem', 'corpo']);
  });

  test('sem mensagem (null): nenhum bloco de mensagem, e o destaque segue condicionado ao portão de sempre (controle de que a asserção discrimina)', async () => {
    const livre = await executarCondicao(doId('elegivel-auto-A'), T1);
    expect(livre.corpo.mensagemDaExtracao).toBeNull();
    const s = superficies(aiReviewDaPagina(livre.corpo));
    expect(s.mensagem).toEqual({ blocos: 0, ocorrenciasNoHtml: 0 });
    expect(s.destaque).toBe(true); // COM padrão reconhecido, nota e veredicto e A.27 aprovado: o destaque sai (o portão NÃO mudou)
    // CONTROLE: a mensagem NÃO abre o portão, e o valor nulo da nota o mantém fechado, mesmo com o resto igual
    const semNota = { ...aiReviewDaPagina(livre.corpo), nota: null, veredicto: null, mensagemDaExtracao: MENSAGEM };
    expect(superficies(semNota).destaque).toBe(false);
  });

  test('o aviso de A.27 e o portão do destaque NÃO foram alterados (o hash do trecho é o pré-registrado; ver o ensaio E)', () => {
    const componente = ler('components/ParecerAISection.tsx');
    expect(componente).toContain("{!aiReview.notaSuspensa?.suspensa && presentation?.estado === 'aprovado' && (aiReview.nota || aiReview.veredicto) && (");
  });
});

describe('E. A FRONTEIRA (caracterização): campos e destaque mudaram; o corpo e a cópia seguem com o texto integral', () => {
  test.each(SUSPENSAS.map((c) => [c.id] as [string]))('%s: o cartão traz o prefixo da tela mais a descrição, e o corpo traz o texto integral, com a decisão que o extrator reconheceria (par medido, e não escondido)', async (id) => {
    const c = doId(id);
    const r = await executarCondicao(c, T1);
    const aiReview = aiReviewDaPagina(r.corpo);
    const s = superficies(aiReview);
    // o CARTÃO: o prefixo da tela mais a descrição, e o motivo
    expect(s.cartao.exibido).toBe(true);
    expect(s.cartao.titulo).toBe(`📊 ${PREFIXO}${DESCRICAO[c.causa as Causa]}`);
    expect(s.cartao.motivo).toBe(r.corpo.notaSuspensa.motivo);
    expect(s.destaque).toBe(false);
    expect(s.mensagem.blocos).toBe(0); // a mensagem exige classificação NÃO suspensa: nunca junto do cartão
    // o CORPO e a CÓPIA: o texto integral, INCLUSIVE a decisão (o que R1 não alcança, por decisão do autor)
    expect(s.corpo.exibido).toBe(true);
    expect(s.corpo.igualAoTextoRecebido).toBe(true);
    expect(s.corpo.textoExibido).toContain('REVISÕES MAIORES');
    expect(await conteudoCopiado(aiReview)).toBe(T1);
    expect(s.ordem).toEqual(['cartao-de-suspensao', 'corpo']);
  });

  test('os pares existem para as CINCO condições, e a quinta está marcada CONSTRUÍDA (o tratador real não a produz)', () => {
    expect(SUSPENSAS.length).toBe(5);
    expect(ALCANCAVEIS.map((c) => c.id)).toEqual(['disponibilidade-ausente', 'disponibilidade-incompleta', 'contradicao', 'coerencia-nao-concluida']);
    expect(new Set(ALCANCAVEIS.map((c) => c.causa)).size).toBe(3); // quatro condições, TRÊS causas
    expect(SUSPENSAS.filter((c) => c.construida).map((c) => [c.id, c.causa])).toEqual([['coerencia-nao-avaliada-CONSTRUIDA', 'coerencia_nao_avaliada']]);
  });

  test('os trechos que o pedido manda NÃO mudar têm o sha256 PRÉ-REGISTRADO no commit da predição', () => {
    const { trechos } = lerJson('docs/dados/a12-nota-veredicto-fase2/trechos-que-nao-mudam.json');
    expect(trechos.length).toBe(9);
    for (const t of trechos) {
      const texto = ler(t.arquivo);
      expect([t.id, ocorrencias(texto, t.ancoraDeInicio)]).toEqual([t.id, 1]); // a âncora de início ocorre UMA vez
      const i = texto.indexOf(t.ancoraDeInicio);
      const apos = t.fimDepoisDe ? texto.indexOf(t.fimDepoisDe, i) : i;
      expect([t.id, apos >= 0]).toEqual([t.id, true]);
      const j = texto.indexOf(t.ancoraDeFim, apos);
      expect([t.id, j >= 0]).toEqual([t.id, true]);
      const trecho = texto.slice(i, j + t.incluirNoFimNCaracteres);
      expect([t.id, sha256(trecho)]).toEqual([t.id, t.sha256]);
    }
    // CONTRAEXEMPLO: uma alteração de um byte num desses trechos é pega pelo mesmo hash
    const um = ler('components/ParecerAISection.tsx');
    const copia = um.slice(um.indexOf('  const handleCopy = async () => {'), um.indexOf('\n  };\n', um.indexOf('  const handleCopy = async () => {')) + 4);
    expect(sha256(copia.replace('writeText', 'writeTexto'))).not.toBe(trechos.find((t: any) => t.id === 'handleCopy').sha256);
  });
});

describe('F. Guardas de redação: nenhum texto promete que o veredito deixe de ser apresentado, e nenhum nome ou valor novo afirma identificação semântica', () => {
  const ARQUIVOS = [
    'app/api/ai-reviewer/route.ts',
    'components/ParecerAISection.tsx',
    'app/decisor/resultados/[projectId]/page.tsx',
    'lib/ai-reviewer/avaliacao-qualidade.ts',
    'docs/contratos-de-dados.md',
    'docs/imprecisoes-parecer-ia.md',
  ];
  // a promessa vedada: "veredito (ou veredicto) não apresentado", e as variantes de omissão do veredito ao gestor
  const PROMESSA = /veredit[oa]s?\s+(n[ãa]o\s+(?:[ée]\s+)?apresentad|(?:deixa|deixam|deixou)\s+de\s+ser\s+apresentad|(?:fica|ficam)\s+oculto)/i;

  test.each(ARQUIVOS.map((a) => [a] as [string]))('%s: nenhuma promessa de "veredito não apresentado"', (arquivo) => {
    expect([arquivo, PROMESSA.test(ler(arquivo))]).toEqual([arquivo, false]);
  });

  test('CONTRAEXEMPLOS: o detector pega a promessa nas formas vedadas, e não pega a frase do pedido', () => {
    expect(PROMESSA.test('o veredito não apresentado ao gestor')).toBe(true);
    expect(PROMESSA.test('o veredito deixa de ser apresentado')).toBe(true);
    expect(PROMESSA.test('o veredito fica oculto')).toBe(true);
    expect(PROMESSA.test(MENSAGEM)).toBe(false); // "Veredito não identificado no texto do parecer simulado."
  });

  test('os novos rótulos, a mensagem e os valores do estado não afirmam identificação ("Veredito identificado", "grade extraída")', () => {
    const vedado = /\bveredito\s+identificad|\bgrade\s+extra[ií]d|\bnota\s+extra[ií]d|\bveredito\s+extra[ií]d/i;
    for (const t of [...Object.values(ROTULO), ...Object.values(DESCRICAO), PREFIXO, ...ESTADOS, 'estadoDaExtracao', 'mensagemDaExtracao']) expect([t, vedado.test(t)]).toEqual([t, false]);
    // a MENSAGEM é uma NEGAÇÃO ("não identificado"), que o detector não confunde com a afirmação
    expect(vedado.test(MENSAGEM)).toBe(false);
    expect(vedado.test('Veredito identificado no texto')).toBe(true);
    expect(vedado.test('Grade extraída da DECISÃO EDITORIAL')).toBe(true); // a redação HISTÓRICA do extrator: limite conhecido, função intacta
  });
});
