export {};

/**
 * Parecer IA, rodada 2 da decisão sobre a ausência de `vinculoDaExecucao`: o CAMPO da resposta (`estadoDoVinculo`), o MAPEAMENTO da tela, o AVISO ao
 * gestor e a CÓPIA.
 *
 * ⚠ **Instrumento, declarado.** Estes ensaios passam pelo TRATADOR REAL de `POST /api/ai-reviewer`, com o cliente do modelo SIMULADO (chave falsa,
 * texto fixado, sem rede: um `fetch` simulado que lança e conta termina em 0 chamadas); pelo COMPONENTE REAL `ParecerAISection`, por
 * `renderToStaticMarkup` e pela árvore de elementos (função chamada com `useState` simulado); pelo MANIPULADOR DE CÓPIA REAL, invocado diretamente, com
 * `navigator.clipboard.writeText` SIMULADO e o argumento capturado (NÃO é clique de DOM e NÃO é a área de transferência); e pelo MAPEAMENTO REAL da tela:
 * o objeto de `setAiReview({` do caminho de sucesso é LIDO do código de `page.tsx` e EXECUTADO em contexto isolado (`vm`), sobre o corpo real da resposta.
 *
 * ⚠ **O que NÃO é exercitado:** a página em execução (é `'use client'`, e o repositório não tem `jsdom` nem `@testing-library`), o `fetch`, o clique do
 * usuário e a área de transferência. ⚠ **A combinação "resposta real → mapeamento real → componente real" NÃO é ensaio ponta a ponta.** O modelo é
 * simulado: igualdade de valores com o modelo FIXADO não é igualdade com o modelo real, que não foi medido.
 *
 * ⚠ **Procedência dos literais.** Os textos (c) e (d), o parecer de ensaio P0, os `sha256` e os tamanhos vêm da PREDIÇÃO registrada ANTES do código
 * (`docs/imprecisoes-parecer-ia.md`, bloco da predição datada da rodada 2, commit `c81424b`), e NÃO do que o código imprime: o aviso (c) é a linha única de
 * 17158 do registro (301 bytes), e o texto (d) é o bloco de 17167-17170 (254 bytes com as linhas unidas por LF, e o PREFIXO entregue, de 255 bytes, com cada
 * linha terminada por LF). O corpo da resposta da BASE (`b55efec`) está nos `sha256` de `BASE_SHA256`, capturados com o relógio e o modelo fixados.
 *
 * ⚠ **Duas coisas distintas na igualdade do corpo.** (i) IGUALDADE DE VALORES: o corpo novo SEM `estadoDoVinculo` tem os valores (e a ordem das chaves) do
 * corpo da base. (ii) A conferência ADICIONAL, declarada à parte, da SERIALIZAÇÃO: o texto bruto do corpo novo é o do corpo da base com o par
 * `"estadoDoVinculo":"<valor>"` inserido na posição declarada, depois de `mensagemDaExtracao` e antes de `review`.
 *
 * ⚠ **Os rótulos B1 a B10** dos blocos abaixo são os dos «comportamentos que precisam passar na rodada 2», definidos na predição ANTES do código (seção 7 do
 * bloco datado), e K5 e K6 são as condições da seção 8 (a decisão não recebe o campo; a rota segue gerando parecer). A trava das nove âncoras e o confinamento da
 * edição de `handleCopy` (B7) estão em `a12-nota-veredicto-fase2.test.ts`, ao lado da trava.
 *
 * ⚠ **Divergência de localizador, relatada.** O pedido de implementação cita a linha 17157 para (c) e 17166-17169 para (d); **medido** neste arquivo do registro, a linha
 * única de (c) é a 17158 (a 17157 é a cerca de código) e as quatro linhas de (d) são 17167-17170. Os bytes e os `sha256` são os mesmos nos dois modos de citar.
 *
 * ⚠ **O golden `BASE_SHA256`** guarda os valores da base `b55efec`. Se um campo anterior da resposta mudar por tarefa PRÓPRIA (o conhecimento do RAG, por
 * exemplo), o golden se recaptura nessa tarefa, com o código ANTERIOR: não se ajusta para coincidir.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ParecerAISection from '@/components/ParecerAISection';
import { decideReviewPresentation } from '@/lib/ai-reviewer/review-validation-contract';
import {
  ESTADOS_DO_VINCULO_NA_RESPOSTA,
  estadoDoVinculoNaResposta,
  lerVinculoParaTexto,
  prepararVinculoDaTela,
  vinculoAusenteNaEntrada,
} from '@/lib/ai-reviewer/vinculo-execucao';

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sha256 = (t: string): string => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const nBytes = (t: string): number => Buffer.byteLength(t, 'utf8');
const ocorrencias = (texto: string, agulha: string): number => texto.split(agulha).length - 1;

// ---------------------------------------------------------------------------------------------------------------------------
// OS LITERAIS DA PREDIÇÃO (registro, 17158 e 17167-17170, e o bloco da predição datada da rodada 2)
// ---------------------------------------------------------------------------------------------------------------------------
/** (c) O aviso ao gestor: 301 bytes. */
const AVISO =
  'Vínculo com a execução do cálculo ausente nesta requisição. A relação entre os respondentes apresentados e os incluídos no cálculo não foi comparada nesta requisição. A ausência do vínculo, por si só, não acrescenta causa de suspensão nem altera a elegibilidade para classificação.';
const AVISO_ID = { bytes: 301, sha256: '8cc0007234566e2a911f0a61b4617df02f77e911cb9a695f4cb7199eadceeb99' };
/** (d), as quatro linhas do bloco de código: a primeira, uma linha em branco, o separador e uma linha em branco. */
const D_PRIMEIRA_LINHA =
  '[Informação do sistema — não integra o texto gerado do parecer] Vínculo com a execução do cálculo ausente nesta requisição. A relação entre os respondentes apresentados e os incluídos no cálculo não foi comparada nesta requisição.';
const D_LINHAS = [D_PRIMEIRA_LINHA, '', '---', ''];
/** A identidade DOCUMENTAL de (d): as quatro linhas unidas por LF, SEM o LF final (254 bytes). NÃO é o que a cópia entrega. */
const D_UNIDAS = D_LINHAS.join('\n');
const D_UNIDAS_ID = { bytes: 254, sha256: 'b59c9f9f27830853d70b297a2246e53e3f673ce9ec5d6587bce8d98d2237cd25' };
/** O PREFIXO que a cópia entrega: cada uma das quatro linhas terminada por LF (255 bytes). O LF adicional entra EXPLICITAMENTE. */
const PREFIXO = D_LINHAS.map((l) => `${l}\n`).join('');
const PREFIXO_ID = { bytes: 255, sha256: '29a881e7f6388e3801d199bc46c96e1909a669dbfad8cce3c31cd4b035c56181' };
/** O parecer de ensaio P0: 169 bytes, linhas unidas por LF, sem LF final. */
const P0 = [
  '## Parecer de ensaio',
  '',
  'Texto fixado para compor a cópia, com acentuação (avaliação, vínculo) e um travessão — como o prefixo.',
  'Segunda linha do parecer de ensaio.',
].join('\n');
const P0_ID = { bytes: 169, sha256: 'e27ddb8193b9eedfa68174852b5576dd2db29c84e1e8e9b605c98c90e6cd70cd' };
const P0_COMPOSTO_ID = { bytes: 424, sha256: '24c94c389dfe6600c2117e806afba055bfe879bf737e36d6928bd093256a7d02' };
/** A forma ERRADA (254 + parecer): 423 bytes, e perde a linha em branco depois do separador. Só os 16 primeiros hexadecimais constam da predição. */
const P0_COMPOSTO_ERRADO = { bytes: 423, sha256Inicio: 'e93cdc86517893b3' };

const SETE_VALORES = ['ausente_no_payload', 'nulo_explicito', 'indisponivel', 'invalido', 'vinculado', 'divergente', 'formato_nao_reconhecido'];
const CLASSE_A = ['ausente_no_payload', 'nulo_explicito'];
const CINCO_FORA_DA_CLASSE_A = ['indisponivel', 'invalido', 'vinculado', 'divergente', 'formato_nao_reconhecido'];
/** Valores DESCONHECIDOS: fora dos sete, inclusive os que quase os escrevem. */
const DESCONHECIDOS = ['inventado', '', 'Ausente_no_payload', 'ausente_no_payload ', ' nulo_explicito', 'NULO_EXPLICITO', 'ausente', 'nulo', 'true', '0'];

const CHAVES_DO_CORPO_ANTERIORES = ['success', 'nota', 'veredicto', 'notaSuspensa', 'mensagemDaExtracao', 'review', 'validation', 'metadata'];
const CHAVES_DO_CORPO_NOVO = ['success', 'nota', 'veredicto', 'notaSuspensa', 'mensagemDaExtracao', 'estadoDoVinculo', 'review', 'validation', 'metadata'];
const CHAVES_DA_METADATA = ['version', 'model', 'timestamp', 'estadoDaExtracao', 'avaliacaoDeQualidade', 'knowledgeBase', 'debug'];

// ---------------------------------------------------------------------------------------------------------------------------
// Cliente do modelo SIMULADO
// ---------------------------------------------------------------------------------------------------------------------------
const CHAVE = 'chave-anthropic-falsa-do-processo-de-teste';
const ENV_ANTES = { chave: process.env.ANTHROPIC_API_KEY, flag: process.env.USE_RAG_SEMANTIC };
process.env.ANTHROPIC_API_KEY = CHAVE;
delete process.env.USE_RAG_SEMANTIC;

const estado: { texto: string; chamadas: number; contexto: string; lancar: string | null } = { texto: '', chamadas: 0, contexto: '', lancar: null };

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = {
      create: async (a: { messages: Array<{ content: string }> }) => {
        estado.chamadas += 1;
        estado.contexto = a.messages.map((m) => m.content).join('\n');
        if (estado.lancar !== null) throw new Error(estado.lancar);
        return { content: [{ type: 'text', text: estado.texto }] };
      },
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/ai-reviewer/route');

let silencios: jest.SpyInstance[] = [];
let espiaoFetch: jest.SpyInstance;
beforeAll(() => {
  espiaoFetch = jest.spyOn(globalThis as any, 'fetch').mockImplementation((() => { throw new Error('fetch proibido neste ensaio'); }) as any);
  silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
});
afterAll(() => {
  expect(espiaoFetch.mock.calls.length).toBe(0); // nenhuma chamada de rede, em nenhum ensaio
  espiaoFetch.mockRestore();
  silencios.forEach((s) => s.mockRestore());
  if (ENV_ANTES.chave === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ENV_ANTES.chave;
  if (ENV_ANTES.flag === undefined) delete process.env.USE_RAG_SEMANTIC; else process.env.USE_RAG_SEMANTIC = ENV_ANTES.flag;
});
jest.setTimeout(300000);

type Execucao = { status: number; bruto: string; corpo: any };

/** O tratador real, com o texto do modelo FIXADO. ⚠ Controle de captura NÃO VAZIA: o modelo simulado foi chamado UMA vez, com o contexto montado. */
async function executar(payload: unknown, texto: string): Promise<Execucao> {
  estado.texto = texto;
  estado.lancar = null;
  estado.contexto = '';
  const antes = estado.chamadas;
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  const bruto = await res.text();
  expect(estado.chamadas).toBe(antes + 1);
  expect(estado.contexto).toContain('## Pesos Finais da Hierarquia de Controle');
  return { status: res.status ?? 200, bruto, corpo: JSON.parse(bruto) };
}

// ---------------------------------------------------------------------------------------------------------------------------
// As REQUISIÇÕES. ⚠ COPIA LITERAL dos auxiliares de `vinculo-execucao-fiacao.test.ts` (as mesmas dos 21 cenários da rodada 1) e de `a12-nota-veredicto-fase2.test.ts`
// ---------------------------------------------------------------------------------------------------------------------------
const respondente = (id: string, cr: number | null) => ({
  respondentId: id,
  id,
  name: `Respondente ${id}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
});
const balde = (total: number, valid: number, warning = 0, critical = 0) => ({ total, valid, warning, critical, avgCR: 0.05 });
function payloadDaTela(respondentes: any[], vinculo?: unknown, comOverall = true): Record<string, unknown> {
  const n = respondentes.length;
  const validos = respondentes.filter((r) => typeof r.cr === 'number' && r.cr <= 0.1).length;
  const todosComCR = respondentes.length > 0 && respondentes.every((r) => typeof r.cr === 'number');
  const p: Record<string, unknown> = {
    avaliacaoDeQualidade: todosComCR
      ? { estado: 'disponivel', motivo: null, fonte: 'análise de qualidade dos respondentes ativos' }
      : n === 0
        ? { estado: 'ausente', motivo: 'sem análise individual', fonte: 'tela' }
        : { estado: 'incompleta', motivo: 'CR faltando', fonte: 'tela' },
    projectName: 'Projeto do vinculo',
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    responseCount: n,
    finalScores: [
      { code: 'A1', name: 'Alternativa 1', score: 0.62 },
      { code: 'A2', name: 'Alternativa 2', score: 0.38 },
    ],
    qualityAnalysis: todosComCR
      ? {
          respondents: respondentes,
          statistics: { byStatus: { 'CONFIÁVEL': validos, 'REVISAR': 0, 'SUSPEITO': n - validos, 'CRÍTICO': 0 }, total: n, avgCR: 0.05 },
          ...(comOverall ? { overall: { status: 'CONFIÁVEL', qualityScore: 91, recommendation: 'ok' } } : {}),
          summary: { total: n, ok: validos, suspicious: n - validos, critical: 0 },
        }
      : { respondents: respondentes },
    overallStats: todosComCR ? { total: n, valid: validos, warning: n - validos, critical: 0 } : undefined,
    individualStats: todosComCR
      ? { Benefits: balde(n, validos, n - validos), Opportunities: balde(n, validos, n - validos), Costs: balde(n, validos, n - validos), Risks: balde(n, validos, n - validos) }
      : undefined,
  };
  if (vinculo !== undefined) p.vinculoDaExecucao = vinculo;
  return p;
}
const IDS = ['r1', 'r2', 'r3', 'r4'];
const elegivel = () => IDS.map((id) => respondente(id, 0.05));
const naoElegivel = () => [respondente('r1', 0.05), respondente('r2', null), respondente('r3', 0.05), respondente('r4', 0.05)];
const HEX_PAINEL = 'b'.repeat(64);
const shaDe = (id: string) => id.padEnd(64, '0').replace(/[^0-9a-f]/g, 'c');
function calculo(ids: string[] | undefined, sobre: Record<string, unknown> = {}): any {
  const metadata: any = { judgmentsDigest: { algorithm: 'sha256', serialization: 'a12-julgamentos-v1', panel: HEX_PAINEL, unavailableReason: null } };
  if (ids !== undefined) {
    metadata.includedRespondents = ids.map((id) => ({ respondentId: id, responseDocId: `doc-${id}`, identifierSource: 'respondentId', judgmentsSha256: shaDe(id), judgmentsUnavailableReason: null }));
  }
  return { executionId: 'exec-fiacao-0001', metadata, ...sobre };
}
const ESTADOS_DO_VINCULO = ['indisponivel', 'invalido', 'vinculado', 'divergente'] as const;
function vinculoDoEstado(est: (typeof ESTADOS_DO_VINCULO)[number], lista: any[]) {
  const ids = lista.map((r) => r.respondentId);
  const doc = est === 'indisponivel' ? calculo(undefined) : est === 'invalido' ? calculo([]) : est === 'vinculado' ? calculo(ids) : calculo([...ids, 'z-so-no-documento']);
  const preparo = prepararVinculoDaTela({ calculo: doc, respondentesAtivos: lista, respostasAtivas: [] });
  if (preparo.vinculo.estado !== est) throw new Error(`estado inesperado: ${est}`);
  return preparo.vinculo;
}
const EXCLUSAO = { totalCollected: 6, activeCount: 5, excludedCount: 1, reason: 'Filtragem por consistencia' };
const ids5 = (n: number) => Array.from({ length: n }, (_, i) => `r${i + 1}`);
function cenario(avaliados: string[], documento: string[]) {
  return prepararVinculoDaTela({ calculo: calculo(documento), respondentesAtivos: avaliados.map((id) => respondente(id, 0.05)), respostasAtivas: [] });
}

/**
 * Os 35 CENÁRIOS da comparação, em dois grupos DISJUNTOS: G1, os 21 da rodada 1 (classes A 9, B 7, C 5), e G2, as 14 formas da tabela 2.4 que NÃO estão em G1
 * (B 5, C 9). As outras 8 formas da tabela (A-sem, A-undefined, A-null, C-estado-inventado, C-texto, C-objeto-vazio, C-zero, C-array) já são cenários de G1.
 */
const CENARIOS: Record<string, () => Record<string, unknown>> = {
  // ---- G1, classe A
  'A-sem': () => payloadDaTela(elegivel()),
  'A-undefined': () => ({ ...payloadDaTela(elegivel()), vinculoDaExecucao: undefined }),
  'A-null': () => ({ ...payloadDaTela(elegivel()), vinculoDaExecucao: null }),
  'A-outro-nome': () => ({ ...payloadDaTela(elegivel()), vinculoDaExecucaoX: vinculoDoEstado('vinculado', elegivel()), campoDesconhecido: { marca: 'MARCA-QUE-NAO-DEVE-CHEGAR' } }),
  'A-sem-exclusao-ativa': () => ({ ...payloadDaTela(elegivel()), exclusionInfo: EXCLUSAO }),
  'A-sem-lista': () => payloadDaTela([]),
  'A-sem-lista-exclusao-ativa': () => ({ ...payloadDaTela([]), exclusionInfo: EXCLUSAO }),
  'A-nao-elegivel': () => payloadDaTela(naoElegivel()),
  'A-contradicao': () => { const p: any = payloadDaTela(elegivel()); p.qualityAnalysis.summary.critical = 4; return p; },
  // ---- G1, classe B
  'B-indisponivel': () => payloadDaTela(elegivel(), vinculoDoEstado('indisponivel', elegivel())),
  'B-invalido': () => payloadDaTela(elegivel(), vinculoDoEstado('invalido', elegivel())),
  'B-vinculado': () => payloadDaTela(elegivel(), vinculoDoEstado('vinculado', elegivel())),
  'B-divergente': () => payloadDaTela(elegivel(), vinculoDoEstado('divergente', elegivel())),
  'B-vinculado-exclusao-5-4-4': () => { const p = cenario(ids5(5), ids5(4)); return { ...payloadDaTela(p.respondentesEnviados, p.vinculo, !p.omitirOverall), exclusionInfo: EXCLUSAO }; },
  'B-restricao-esvazia-a-lista': () => { const p = cenario(['r1', 'r2'], ['r7', 'r8']); return { ...payloadDaTela(p.respondentesEnviados, p.vinculo, !p.omitirOverall), exclusionInfo: EXCLUSAO }; },
  'B-nao-elegivel-vinculado': () => payloadDaTela(naoElegivel(), vinculoDoEstado('vinculado', naoElegivel())),
  // ---- G1, classe C
  'C-estado-inventado': () => payloadDaTela(elegivel(), { estado: 'inventado' }),
  'C-texto': () => payloadDaTela(elegivel(), 'texto'),
  'C-objeto-vazio': () => payloadDaTela(elegivel(), {}),
  'C-zero': () => payloadDaTela(elegivel(), 0),
  'C-array': () => payloadDaTela(elegivel(), []),
  // ---- G2, as 14 formas da tabela 2.4 que não estão acima
  'F22-B-indisponivel-cru': () => payloadDaTela(elegivel(), { estado: 'indisponivel' }),
  'F22-B-invalido-cru': () => payloadDaTela(elegivel(), { estado: 'invalido' }),
  'F22-B-vinculado-sem-listas': () => payloadDaTela(elegivel(), { estado: 'vinculado' }),
  'F22-B-divergente-sem-listas': () => payloadDaTela(elegivel(), { estado: 'divergente' }),
  'F22-B-vinculado-listas-bem-formadas': () => payloadDaTela(elegivel(), { estado: 'vinculado', incluidosNoDocumento: ['r1'], enviados: ['r1'] }),
  'F22-C-false': () => payloadDaTela(elegivel(), false),
  'F22-C-texto-vazio': () => payloadDaTela(elegivel(), ''),
  'F22-C-true': () => payloadDaTela(elegivel(), true),
  'F22-C-um': () => payloadDaTela(elegivel(), 1),
  'F22-C-estado-numero': () => payloadDaTela(elegivel(), { estado: 5 }),
  'F22-C-estado-caixa': () => payloadDaTela(elegivel(), { estado: 'Vinculado' }),
  'F22-C-estado-espaco': () => payloadDaTela(elegivel(), { estado: 'vinculado ' }),
  'F22-C-estado-nulo': () => payloadDaTela(elegivel(), { estado: null }),
  'F22-C-lista-com-um-registro': () => payloadDaTela(elegivel(), [{ estado: 'vinculado' }]),
};

// ---------------------------------------------------------------------------------------------------------------------------
// Os TEXTOS FIXADOS DO MODELO (copia literal de `a12-nota-veredicto-fase2.test.ts`). ⚠ O corpo neutro não traz nenhum termo que o extrator reconheça.
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
const T1 = `${CORPO_NEUTRO}## 🎯 DECISÃO EDITORIAL\nREVISÕES MAIORES\n\nTexto final de ensaio, sem outros termos de resultado.\n`;
const T3A = `${CORPO_NEUTRO}Conclusão de ensaio: REJEITAR, com convite para nova submissão.\n`;
const T2A = `${CORPO_NEUTRO}Conclusão de ensaio: o texto não declara categoria de resultado alguma.\n`;
const T2B = `${CORPO_NEUTRO}## 🎯 DECISÃO EDITORIAL\nA categoria fica a critério do comitê, sem rótulo declarado.\n`;
const AD1 = 'Nota B. ACEITO COM REVISÕES MENORES';
const SEM_VEREDICTO = 'Parecer de ensaio, sem decisão editorial declarada no texto. '.repeat(3);
const SUFIXO_REPROVADA = '\nObservação final: a ferramenta ChatGPT foi consultada na redação deste trecho.\n';
const SUFIXO_INCONCLUSIVA = '\nObservação final: o Score = 0.5 foi mencionado sem referência.\n';
/** A ORDEM dos oito textos é a das listas de `BASE_SHA256`. */
const TEXTOS: Array<[string, string]> = [
  ['T1-reconhecido-C', T1],
  ['T3a-reconhecido-F', T3A],
  ['T2a-sem-padrao', T2A],
  ['T2b-sem-padrao-com-secao', T2B],
  ['AD1-guarda-de-50', AD1],
  ['T1-mais-reprovada', T1 + SUFIXO_REPROVADA],
  ['T1-mais-inconclusiva', T1 + SUFIXO_INCONCLUSIVA],
  ['sem-veredicto', SEM_VEREDICTO],
];

// ---------------------------------------------------------------------------------------------------------------------------
// O GOLDEN da BASE (`b55efec`): `sha256` do TEXTO BRUTO do corpo HTTP de cada cenário e de cada texto, capturado com o relógio fixado em
// 2026-10-05T12:00:00.000Z e o modelo simulado, pelo código ANTERIOR à rodada 2. A ordem de cada lista é a de `TEXTOS`.
// ---------------------------------------------------------------------------------------------------------------------------
const BASE_SHA256: Record<string, string[]> = {
  'A-sem': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'A-undefined': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'A-null': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'A-outro-nome': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'A-sem-exclusao-ativa': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'A-sem-lista': ['255402f629de85b6fe0bad4725da9f79428a4fb618871d08bbe0d02039eb2857', '21ba452318dfc2461f8e12140892f32b6c953ae023cd0e341aab47ec459e0ee7', '4d09eaab14f19a4b24bddc145e5e01968d54cf816f5f76c177f0b1492ac45af1', '361731f1fd5e4beffa48dd767e9ce86b810db6dff82607f5738dc5f5c45db4f8', 'bec48ea74121387e22be9e6c8f9700566d01b25ccfb2f33e9af276c262a2f91d', '87faae2586bb04802653d1c3bb911fd3f24f4d19de010c13df45e450fb5a7d95', '07d6dadd9ac3a157306f564dd841dbb0cbe184133f999fcfd4f0f9ee572cee17', '33258a5d1ce13bbd2a1916d274bb3aa6676b8ddfeb1aada4e80fe5f685e59247'],
  'A-sem-lista-exclusao-ativa': ['255402f629de85b6fe0bad4725da9f79428a4fb618871d08bbe0d02039eb2857', '21ba452318dfc2461f8e12140892f32b6c953ae023cd0e341aab47ec459e0ee7', '4d09eaab14f19a4b24bddc145e5e01968d54cf816f5f76c177f0b1492ac45af1', '361731f1fd5e4beffa48dd767e9ce86b810db6dff82607f5738dc5f5c45db4f8', 'bec48ea74121387e22be9e6c8f9700566d01b25ccfb2f33e9af276c262a2f91d', '87faae2586bb04802653d1c3bb911fd3f24f4d19de010c13df45e450fb5a7d95', '07d6dadd9ac3a157306f564dd841dbb0cbe184133f999fcfd4f0f9ee572cee17', '33258a5d1ce13bbd2a1916d274bb3aa6676b8ddfeb1aada4e80fe5f685e59247'],
  'A-nao-elegivel': ['1919a353b49699696d93faa3d24657750b7bdcfc4f8153336e1199d40bd0c819', '0241e0e40d96d46638e45e2a8a532751f6baa5fed3ff62accc679aea1bed7e77', '155adda86f52a86cb0df95aec839ffd24d1d790566c8a25ca972eb6ab655bbfc', '59a0b0307e784367d014107e4e397d4049c01d414ae299bb24902cf05207d6f4', 'ac0cb0385077b7e50cd649f827b9033c7207be319d9c202355021ed30bb66642', 'a50d5f8c157a47d63c6fabf803ca1eaff2a0d36bd7fa9709f57d314f0c465613', '0a6fd7ca30f1ae120f1ac160646b6e362215c443082ca8fc8338baeee306befb', '7c9a1fe38a1a3536285ade2d3aebabfeca3a5a22d15f78ef07339b39d1e861e0'],
  'A-contradicao': ['aadf69ff3966fd2a7b299a9363d13a7f9644dd6c02a86627b0c2d7c2baf00ef1', 'aa37141aad13915be777463dceaf65d46d535ea965944f1876cc7e31f8fd5bc4', '9913a2dc1ad8593f8fcd9f15b985bee7050af9b6252194cc6e9bb0d88076a2df', 'b3644c499fd692a985a8d74bb4d3ae5cbdd067aaae9298c986b965fe161269d3', 'b6e5ebbf48b6453792b785143be5d33f13708dd4886cabef87a69ba7453547c0', '6fe8c8fbef6ca578a9df27fd875be14e43a664e758bf12b1c3bc8926bccce728', '27fd82ebb1322a0196bd5693a1b2293c17c7045032110bb72e1495a3f228eb57', '25fbf94d8d01d198e6d0017a5561225d40ff11c08a284ac046c6b77d2f38e3ad'],
  'B-indisponivel': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'B-invalido': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'B-vinculado': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'B-divergente': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'B-vinculado-exclusao-5-4-4': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'B-restricao-esvazia-a-lista': ['255402f629de85b6fe0bad4725da9f79428a4fb618871d08bbe0d02039eb2857', '21ba452318dfc2461f8e12140892f32b6c953ae023cd0e341aab47ec459e0ee7', '4d09eaab14f19a4b24bddc145e5e01968d54cf816f5f76c177f0b1492ac45af1', '361731f1fd5e4beffa48dd767e9ce86b810db6dff82607f5738dc5f5c45db4f8', 'bec48ea74121387e22be9e6c8f9700566d01b25ccfb2f33e9af276c262a2f91d', '87faae2586bb04802653d1c3bb911fd3f24f4d19de010c13df45e450fb5a7d95', '07d6dadd9ac3a157306f564dd841dbb0cbe184133f999fcfd4f0f9ee572cee17', '33258a5d1ce13bbd2a1916d274bb3aa6676b8ddfeb1aada4e80fe5f685e59247'],
  'B-nao-elegivel-vinculado': ['1919a353b49699696d93faa3d24657750b7bdcfc4f8153336e1199d40bd0c819', '0241e0e40d96d46638e45e2a8a532751f6baa5fed3ff62accc679aea1bed7e77', '155adda86f52a86cb0df95aec839ffd24d1d790566c8a25ca972eb6ab655bbfc', '59a0b0307e784367d014107e4e397d4049c01d414ae299bb24902cf05207d6f4', 'ac0cb0385077b7e50cd649f827b9033c7207be319d9c202355021ed30bb66642', 'a50d5f8c157a47d63c6fabf803ca1eaff2a0d36bd7fa9709f57d314f0c465613', '0a6fd7ca30f1ae120f1ac160646b6e362215c443082ca8fc8338baeee306befb', '7c9a1fe38a1a3536285ade2d3aebabfeca3a5a22d15f78ef07339b39d1e861e0'],
  'C-estado-inventado': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'C-texto': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'C-objeto-vazio': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'C-zero': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'C-array': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-B-indisponivel-cru': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-B-invalido-cru': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-B-vinculado-sem-listas': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-B-divergente-sem-listas': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-B-vinculado-listas-bem-formadas': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-false': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-texto-vazio': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-true': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-um': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-estado-numero': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-estado-caixa': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-estado-espaco': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-estado-nulo': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
  'F22-C-lista-com-um-registro': ['d739b9710f094d1bd85a8efdf3edd73c044c0e2efd2167e3241952dbf763d0c4', 'f1d5a2814ec9382c6793bc9b80e8d3b47436d4f7de76a85c8a71c6d8dee0bcc3', '17b9c0029efce03571e24bcba0ecfc59756f05915c9b3e9ba0714026e4ea3989', 'd06836cc430c8c05ce7973079428efba30fa1e037362801670149a0ec8b68712', 'c9a833f8ae18146d647c0beae2c7b0a66449b3928f0b9fa8060946b46b30a2f9', 'ccc7f35ca88b79c5859c17a7d49e31b9d9af64f600405815f1df534afd4cedb7', 'a5c301d816bb861e9ddd227f938c623ab7cfea3d0e86c4cf724a9b43e3d43a36', '67d06c1bfee47b7d8cce655ad2bef4b3912ed54edbc3b808596fef1c42142670'],
};

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

/** O HTML do bloco do aviso: um `role="status"` da família dos existentes, com o texto (c) num parágrafo. */
const BLOCO_DO_AVISO_HTML = `<div class="mb-6 rounded-lg border border-slate-300 bg-slate-50 p-4" role="status"><p class="text-sm text-slate-800">${AVISO}</p></div>`;

type ResultadoDaCopia = { botoes: number; chamadas: string[]; setCopied: jest.Mock; atrasos: unknown[] };
/**
 * ⚠ O manipulador REAL de cópia (o `onClick` do botão real), invocado diretamente, com `navigator.clipboard.writeText` SIMULADO e o argumento capturado.
 * NÃO é clique de DOM, NÃO passa por `disabled={loading}` e NÃO é a área de transferência. Com `esvaziarAntes`, o `review` do MESMO objeto é trocado depois de
 * obter o `onClick` e antes de chamá-lo (o manipulador lê `aiReview?.review` no momento da chamada), o que exercita o retorno antecipado.
 */
async function copiar(aiReview: any, esvaziarAntes?: { valor: unknown }): Promise<ResultadoDaCopia> {
  const { arvore, setCopied } = arvoreDoComponente(aiReview);
  const botoes = achar(arvore, (n) => n.type === 'button' && n.props?.title === 'Copiar parecer em markdown');
  const chamadas: string[] = [];
  const atrasos: unknown[] = [];
  if (botoes.length === 0) return { botoes: 0, chamadas, setCopied, atrasos };
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: async (t: string) => { chamadas.push(t); } } },
    configurable: true,
    writable: true,
  });
  const espiaoTimeout = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((_fn: any, ms?: number) => { atrasos.push(ms); return 0 as any; }) as any);
  try {
    if (esvaziarAntes) aiReview.review = esvaziarAntes.valor;
    await botoes[0].props.onClick();
  } finally {
    espiaoTimeout.mockRestore();
    if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete (globalThis as any).navigator;
  }
  return { botoes: botoes.length, chamadas, setCopied, atrasos };
}

// ---------------------------------------------------------------------------------------------------------------------------
// O MAPEAMENTO REAL da tela: lido do código de `page.tsx` e executado em contexto isolado
// ---------------------------------------------------------------------------------------------------------------------------
/** Os objetos literais de cada `setAiReview({`, em ordem: do `{` ao `}` que o fecha, pulando textos, modelos e comentários. */
function objetosDeSetAiReview(fonte: string): string[] {
  const achados: string[] = [];
  const marca = 'setAiReview({';
  let desde = 0;
  for (;;) {
    const i = fonte.indexOf(marca, desde);
    if (i < 0) break;
    const ini = i + marca.length - 1;
    let prof = 0;
    let k = ini;
    for (; k < fonte.length; k += 1) {
      const c = fonte[k];
      const d = fonte[k + 1];
      if (c === '/' && d === '/') { k = fonte.indexOf('\n', k); if (k < 0) k = fonte.length; continue; }
      if (c === '/' && d === '*') { k = fonte.indexOf('*/', k + 2) + 1; continue; }
      if (c === "'" || c === '"' || c === '`') {
        const aspa = c;
        for (k += 1; k < fonte.length && fonte[k] !== aspa; k += 1) if (fonte[k] === '\\') k += 1;
        continue;
      }
      if (c === '{') prof += 1;
      if (c === '}') { prof -= 1; if (prof === 0) break; }
    }
    achados.push(fonte.slice(ini, k + 1));
    desde = k + 1;
  }
  return achados;
}
/** Executa um objeto literal da tela (expressão) sobre `data`, em contexto isolado: só `data` e `e` existem lá. */
const avaliarObjeto = (literal: string, data: unknown): any => vm.runInNewContext(`(${literal})`, { data, e: { message: 'erro simulado' } });

/**
 * O que a conferência do mapeamento exige do código de `page.tsx`: TRÊS `setAiReview({`; só o de sucesso traz a chave, com o MESMO nome, lida do nível principal
 * da resposta e sem valor padrão que converta a ausência em `ausente_no_payload`; os dois de erro ficam como estão. Devolve as violações.
 */
function violacoesDoMapeamento(fonte: string): string[] {
  const v: string[] = [];
  const objetos = objetosDeSetAiReview(fonte);
  if (objetos.length !== 3) { v.push(`setAiReview({ ocorre ${objetos.length} vez(es), e a conferência exige 3`); return v; }
  const [sucesso, erroDaResposta, erroDeConexao] = objetos;
  const linhasDoCampo = sucesso.split('\n').filter((l) => /^\s*estadoDoVinculo\s*:/.test(l));
  if (linhasDoCampo.length !== 1) v.push(`o objeto de sucesso tem ${linhasDoCampo.length} linhas da chave`);
  else if (linhasDoCampo[0].trim() !== 'estadoDoVinculo: data.estadoDoVinculo ?? null,') v.push(`a linha da chave não é a esperada: ${linhasDoCampo[0].trim()}`);
  if (/estadoDoVinculo\s*:[^\n]*(ausente_no_payload|nulo_explicito)/.test(sucesso)) v.push('o mapeamento converte a ausência em valor da classe A');
  if (/estadoDoVinculo\s*:[^\n]*metadata/.test(sucesso)) v.push('o mapeamento lê o campo de metadata');
  if (/estadoDoVinculo/.test(erroDaResposta)) v.push('o objeto de erro da resposta traz a chave');
  if (/estadoDoVinculo/.test(erroDeConexao)) v.push('o objeto de erro de conexão traz a chave');
  return v;
}

/** O `aiReview` que a PÁGINA REAL monta de um corpo de resposta de sucesso: o objeto de sucesso de `page.tsx`, executado sobre `data`. */
const mapearComAPagina = (data: unknown): any => avaliarObjeto(objetosDeSetAiReview(ler('app/decisor/resultados/[projectId]/page.tsx'))[0], data);

// ---------------------------------------------------------------------------------------------------------------------------
// A REGRA DA TABELA 2.4, reimplementada AQUI (independente da produção), e as duas regras erradas que a tabela deve distinguir
// ---------------------------------------------------------------------------------------------------------------------------
const QUATRO_RECONHECIDOS = ['indisponivel', 'invalido', 'vinculado', 'divergente'];
const regraDaTabela = (valorTransportado: unknown): string =>
  valorTransportado === undefined
    ? 'ausente_no_payload'
    : valorTransportado === null
      ? 'nulo_explicito'
      : typeof valorTransportado === 'object' && !Array.isArray(valorTransportado) && QUATRO_RECONHECIDOS.includes((valorTransportado as any).estado)
        ? (valorTransportado as any).estado
        : 'formato_nao_reconhecido';
const regraPorVeracidade = (raw: unknown): string => (!raw ? 'ausente_no_payload' : regraDaTabela(raw));
const regraPorCoalescencia = (raw: unknown): string => regraDaTabela(raw ?? undefined);

type Forma = { classe: 'A' | 'B' | 'C'; rotulo: string; omitir?: boolean; valor?: unknown; esperado: string; leitor: [string, string | null, boolean] };
/** AS 22 FORMAS da tabela de entrada para valor (predição, 2.4): A 3, B 5 e C 14. As colunas do leitor são as MEDIDAS na predição (M3). */
const FORMAS: Forma[] = [
  { classe: 'A', rotulo: 'chave omitida', omitir: true, esperado: 'ausente_no_payload', leitor: ['ausente', null, false] },
  { classe: 'A', rotulo: 'undefined explícito', valor: undefined, esperado: 'ausente_no_payload', leitor: ['ausente', null, false] },
  { classe: 'A', rotulo: 'null', valor: null, esperado: 'nulo_explicito', leitor: ['ausente', null, false] },
  { classe: 'B', rotulo: "{ estado: 'indisponivel' }", valor: { estado: 'indisponivel' }, esperado: 'indisponivel', leitor: ['sem-comparacao', 'indisponivel', true] },
  { classe: 'B', rotulo: "{ estado: 'invalido' }", valor: { estado: 'invalido' }, esperado: 'invalido', leitor: ['sem-comparacao', 'invalido', true] },
  { classe: 'B', rotulo: "{ estado: 'vinculado' }, sem listas", valor: { estado: 'vinculado' }, esperado: 'vinculado', leitor: ['sem-comparacao', 'vinculado', true] },
  { classe: 'B', rotulo: "{ estado: 'divergente' }, sem listas", valor: { estado: 'divergente' }, esperado: 'divergente', leitor: ['sem-comparacao', 'divergente', true] },
  {
    classe: 'B',
    rotulo: "{ estado: 'vinculado', incluidosNoDocumento: ['r1'], enviados: ['r1'] }",
    valor: { estado: 'vinculado', incluidosNoDocumento: ['r1'], enviados: ['r1'] },
    esperado: 'vinculado',
    leitor: ['comparado', 'vinculado', true],
  },
  { classe: 'C', rotulo: "{ estado: 'inventado' }", valor: { estado: 'inventado' }, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: "'texto'", valor: 'texto', esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: '{}', valor: {}, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: '0', valor: 0, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: '[]', valor: [], esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: 'false', valor: false, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: "'' (texto vazio)", valor: '', esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: 'true', valor: true, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: '1', valor: 1, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: '{ estado: 5 }', valor: { estado: 5 }, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: "{ estado: 'Vinculado' } (caixa diferente)", valor: { estado: 'Vinculado' }, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: "{ estado: 'vinculado ' } (espaço no fim)", valor: { estado: 'vinculado ' }, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: '{ estado: null }', valor: { estado: null }, esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
  { classe: 'C', rotulo: "[{ estado: 'vinculado' }] (lista com um registro)", valor: [{ estado: 'vinculado' }], esperado: 'formato_nao_reconhecido', leitor: ['sem-comparacao', null, false] },
];
const comOCampo = (f: Forma): Record<string, unknown> => (f.omitir ? payloadDaTela(elegivel()) : { ...payloadDaTela(elegivel()), vinculoDaExecucao: f.valor });

// ===========================================================================================================================
describe('A. O campo da resposta: o tipo próprio, a regra, as 22 formas (B1)', () => {
  test('o tipo tem SETE valores, nos literais da predição, e é DISTINTO de EstadoDoVinculo, que continua com quatro e não mudou', () => {
    expect([...ESTADOS_DO_VINCULO_NA_RESPOSTA]).toEqual(SETE_VALORES);
    expect(new Set(ESTADOS_DO_VINCULO_NA_RESPOSTA).size).toBe(7);
    const fonte = ler('lib/ai-reviewer/vinculo-execucao.ts');
    // o tipo do vínculo continua com os QUATRO valores, declarado uma vez, sem nenhum dos três valores novos
    expect(ocorrencias(fonte, "export type EstadoDoVinculo = 'indisponivel' | 'invalido' | 'vinculado' | 'divergente';")).toBe(1);
    expect(ocorrencias(fonte, 'export type EstadoDoVinculoNaResposta = (typeof ESTADOS_DO_VINCULO_NA_RESPOSTA)[number];')).toBe(1);
    expect(ocorrencias(fonte, 'export type EstadoDoVinculo ')).toBe(1);
    // e o módulo do vínculo NÃO ganhou valor de estado na própria lista dos reconhecidos
    expect(ocorrencias(fonte, "const ESTADOS_RECONHECIDOS: string[] = ['indisponivel', 'invalido', 'vinculado', 'divergente'];")).toBe(1);
  });

  test('as 22 formas são A 3, B 5 e C 14, e cobrem os sete valores', () => {
    expect(FORMAS.length).toBe(22);
    expect(['A', 'B', 'C'].map((c) => FORMAS.filter((f) => f.classe === c).length)).toEqual([3, 5, 14]);
    expect(new Set(FORMAS.map((f) => f.esperado))).toEqual(new Set(['ausente_no_payload', 'nulo_explicito', 'indisponivel', 'invalido', 'vinculado', 'divergente', 'formato_nao_reconhecido']));
  });

  test.each(FORMAS.map((f, i) => [i + 1, f.classe, f.rotulo, f] as [number, string, string, Forma]))(
    'forma %i (%s, %s): a função dá o valor da tabela, e concorda com o leitor atual (0 divergências), mais a distinção entre undefined e null que o leitor não faz',
    (_n, _c, _r, f) => {
      const raw = f.omitir ? undefined : f.valor;
      expect(estadoDoVinculoNaResposta(raw)).toBe(f.esperado);
      expect(regraDaTabela(raw)).toBe(f.esperado); // a regra reimplementada aqui, independente da produção
      // o leitor atual: as colunas MEDIDAS na predição (M3)
      const l = lerVinculoParaTexto(raw);
      expect([l.modo, l.estado, l.reconhecido]).toEqual(f.leitor);
      // derivar do leitor (modo, estado, reconhecido) e da distinção que ele NÃO faz: 0 divergências com a tabela
      const derivado = l.modo === 'ausente' ? (raw === null ? 'nulo_explicito' : 'ausente_no_payload') : l.reconhecido ? l.estado : 'formato_nao_reconhecido';
      expect(derivado).toBe(f.esperado);
      // o predicado da classe A: verdadeiro SÓ nos dois valores da classe A
      expect(vinculoAusenteNaEntrada(f.esperado)).toBe(f.classe === 'A');
    }
  );

  test.each(FORMAS.map((f, i) => [i + 1, f.classe, f.rotulo, f] as [number, string, string, Forma]))(
    'forma %i (%s, %s): o TRATADOR REAL devolve estadoDoVinculo no nível principal, com UMA chave nova, e o parecer é gerado (K6)',
    async (_n, _c, _r, f) => {
      const r = await executar(comOCampo(f), T1);
      expect(r.status).toBe(200);
      expect(r.corpo.success).toBe(true);
      expect(r.corpo.estadoDoVinculo).toBe(f.esperado);
      expect(Object.keys(r.corpo)).toEqual(CHAVES_DO_CORPO_NOVO); // nove chaves: as oito de antes e UMA nova, no nível principal
      expect(Object.keys(r.corpo.metadata)).toEqual(CHAVES_DA_METADATA); // `metadata` segue com as sete, e sem o campo
      expect('estadoDoVinculo' in r.corpo.metadata).toBe(false);
      expect(r.corpo.review).toBe(T1); // o parecer é gerado, inteiro, em toda forma de entrada
    }
  );

  test('a ausência do campo na entrada NÃO se confunde com a chave de nome incorreto: o campo com outro nome também é ausente_no_payload', async () => {
    const r = await executar({ ...payloadDaTela(elegivel()), vinculoDaExecucaoX: vinculoDoEstado('vinculado', elegivel()) }, T1);
    expect(r.corpo.estadoDoVinculo).toBe('ausente_no_payload');
  });

  test('CONTRAEXEMPLOS: as duas regras ERRADAS divergem da tabela nas formas previstas (a tabela discrimina), e a regra certa não diverge em nenhuma', () => {
    const divergem = (regra: (raw: unknown) => string) => FORMAS.filter((f) => regra(f.omitir ? undefined : f.valor) !== f.esperado).map((f) => f.rotulo);
    // por veracidade (`!raw`): null, 0, false e '' passam a ausência, e a tabela os distingue
    expect(divergem(regraPorVeracidade)).toEqual(['null', '0', 'false', "'' (texto vazio)"]);
    // por coalescência (`raw ?? undefined`): o null passa a ser ausente_no_payload
    expect(divergem(regraPorCoalescencia)).toEqual(['null']);
    expect(divergem(regraDaTabela)).toEqual([]);
    expect(divergem((raw) => estadoDoVinculoNaResposta(raw))).toEqual([]);
  });

  test('o predicado da classe A é verdadeiro SÓ nos dois valores: campo ausente, null, texto vazio, valores desconhecidos e os cinco válidos fora da classe dão falso', () => {
    for (const v of CLASSE_A) expect([v, vinculoAusenteNaEntrada(v)]).toEqual([v, true]);
    for (const v of [...CINCO_FORA_DA_CLASSE_A, ...DESCONHECIDOS, undefined, null, 0, false, {}, []]) expect([String(v), vinculoAusenteNaEntrada(v)]).toEqual([String(v), false]);
  });
});

// ===========================================================================================================================
describe('B. A resposta: com o modelo e o relógio fixados, o corpo SEM o campo é igual ao da base (B2), e o parecer é gerado onde era gerado (K6)', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: new Date('2026-10-05T12:00:00.000Z'),
      doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  test('o denominador: 35 cenários em dois grupos disjuntos (G1 21: A 9, B 7, C 5; G2 14: B 5, C 9), oito textos cada, 280 respostas', () => {
    const nomes = Object.keys(CENARIOS);
    expect(nomes.length).toBe(35);
    expect(Object.keys(BASE_SHA256)).toEqual(nomes);
    for (const n of nomes) expect([n, BASE_SHA256[n].length]).toEqual([n, TEXTOS.length]);
    const g1 = nomes.filter((n) => !n.startsWith('F22-'));
    const g2 = nomes.filter((n) => n.startsWith('F22-'));
    expect([g1.length, g2.length]).toEqual([21, 14]);
    expect(['A', 'B', 'C'].map((c) => g1.filter((n) => n.startsWith(`${c}-`)).length)).toEqual([9, 7, 5]);
    expect(['B', 'C'].map((c) => g2.filter((n) => n.startsWith(`F22-${c}-`)).length)).toEqual([5, 9]);
    expect(nomes.length * TEXTOS.length).toBe(280);
    expect(TEXTOS.map(([n]) => n)).toEqual(['T1-reconhecido-C', 'T3a-reconhecido-F', 'T2a-sem-padrao', 'T2b-sem-padrao-com-secao', 'AD1-guarda-de-50', 'T1-mais-reprovada', 'T1-mais-inconclusiva', 'sem-veredicto']);
  });

  test.each(Object.keys(CENARIOS).map((n) => [n] as [string]))(
    '%s: nos oito textos, o corpo novo sem estadoDoVinculo é IGUAL ao da base (valores e ordem das chaves, pela serialização), e o corpo novo é o da base com o par inserido depois de mensagemDaExtracao',
    async (nome) => {
      for (let i = 0; i < TEXTOS.length; i += 1) {
        const [tnome, texto] = TEXTOS[i];
        const payload = CENARIOS[nome]();
        const transportado = JSON.parse(JSON.stringify(payload));
        const r = await executar(payload, texto);
        // K6: o parecer é gerado (status 200, success e review), como na base
        expect([nome, tnome, r.status, r.corpo.success, typeof r.corpo.review === 'string' && r.corpo.review.length > 0]).toEqual([nome, tnome, 200, true, true]);
        // o valor da chave, pela regra da tabela aplicada à forma TRANSPORTADA (a chave omitida lê undefined)
        expect([nome, tnome, r.corpo.estadoDoVinculo]).toEqual([nome, tnome, regraDaTabela(transportado.vinculoDaExecucao)]);
        // (i) IGUALDADE DE VALORES, com a ordem das chaves: o corpo sem a chave tem o `sha256` do texto bruto da BASE
        const sem = { ...r.corpo };
        delete sem.estadoDoVinculo;
        expect([nome, tnome, Object.keys(sem)]).toEqual([nome, tnome, CHAVES_DO_CORPO_ANTERIORES]);
        expect([nome, tnome, sha256(JSON.stringify(sem))]).toEqual([nome, tnome, BASE_SHA256[nome][i]]);
        // (ii) a conferência ADICIONAL da serialização: o texto bruto novo é o da base com o par inserido na posição declarada
        const comPar: Record<string, unknown> = {};
        for (const k of Object.keys(sem)) {
          comPar[k] = sem[k];
          if (k === 'mensagemDaExtracao') comPar.estadoDoVinculo = r.corpo.estadoDoVinculo;
        }
        expect([nome, tnome, r.bruto]).toEqual([nome, tnome, JSON.stringify(comPar)]);
        expect(Object.keys(r.corpo)).toEqual(CHAVES_DO_CORPO_NOVO);
      }
    }
  );

  test('CONTRAEXEMPLO do detector: uma alteração de um valor, da ordem ou da posição da chave NÃO passa pelas mesmas verificações (o golden discrimina)', async () => {
    const r = await executar(CENARIOS['A-sem'](), T1);
    const sem = { ...r.corpo };
    delete sem.estadoDoVinculo;
    const golden = BASE_SHA256['A-sem'][0];
    expect(sha256(JSON.stringify(sem))).toBe(golden); // o controle: sem alteração, igual
    expect(sha256(JSON.stringify({ ...sem, nota: 'D' }))).not.toBe(golden); // um valor
    const { metadata, ...resto } = sem;
    const { version, model, ...outrasDaMetadata } = metadata;
    expect(sha256(JSON.stringify({ ...resto, metadata: { model, version, ...outrasDaMetadata } }))).not.toBe(golden); // só a ORDEM de duas chaves
    expect(sha256(JSON.stringify({ ...sem, outraChave: 1 }))).not.toBe(golden); // uma chave a mais
    // a posição: a chave no fim dá outro texto bruto que o declarado
    const noFim: Record<string, unknown> = { ...sem, estadoDoVinculo: r.corpo.estadoDoVinculo };
    expect(JSON.stringify(noFim)).not.toBe(r.bruto);
  });
});

// ===========================================================================================================================
describe('C. O caminho de erro: nenhuma resposta de erro traz o campo, e o `catch` não mudou (B3)', () => {
  const ESPERADAS = ['error', 'details', 'errorType'];

  test('erro ANTES de ler a requisição: a leitura do corpo falha, e a resposta é a de sempre, sem o campo', async () => {
    const res = await POST({ json: async () => { throw new Error('corpo ilegível do ensaio'); } } as any);
    const corpo = await res.json();
    expect(res.status).toBe(500);
    expect(Object.keys(corpo)).toEqual(ESPERADAS);
    expect(corpo.details).toBe('corpo ilegível do ensaio');
    expect('estadoDoVinculo' in corpo).toBe(false);
  });

  test.each([
    ['chave omitida (classe A)', () => payloadDaTela(elegivel())],
    ['null (classe A)', () => ({ ...payloadDaTela(elegivel()), vinculoDaExecucao: null })],
    ["{ estado: 'vinculado' } (classe B)", () => payloadDaTela(elegivel(), { estado: 'vinculado' })],
    ["{ estado: 'inventado' } (classe C)", () => payloadDaTela(elegivel(), { estado: 'inventado' })],
  ])('erro DEPOIS de normalizar a requisição (o cliente do modelo falha), com o vínculo %s: a resposta é a de sempre, sem o campo', async (_rotulo, montar) => {
    estado.lancar = 'falha simulada do cliente do modelo';
    estado.texto = T1;
    try {
      const res = await POST({ json: async () => JSON.parse(JSON.stringify(montar())) } as any);
      const corpo = await res.json();
      expect(res.status).toBe(500);
      expect(Object.keys(corpo)).toEqual(ESPERADAS);
      expect(corpo).toEqual({ error: 'Erro ao gerar revisão acadêmica', details: 'falha simulada do cliente do modelo', errorType: 'Error' });
      expect('estadoDoVinculo' in corpo).toBe(false);
    } finally {
      estado.lancar = null;
    }
  });

  test('o bloco `catch` de route.ts é o da BASE, byte a byte (425 bytes, `sha256` pré-registrado), e não cita o campo', () => {
    const rota = ler('app/api/ai-reviewer/route.ts');
    const inicio = "  } catch (error: any) {\n    const stackLines = ";
    expect(ocorrencias(rota, inicio)).toBe(1);
    const i = rota.indexOf(inicio);
    const bloco = rota.slice(i, rota.indexOf('\n}\n', i) + 3);
    expect({ bytes: nBytes(bloco), sha256: sha256(bloco) }).toEqual({ bytes: 425, sha256: 'a1b2914c5bb9e8fa235975dbc43063d698acf5774ce12546e9759a0d5cdbf204' });
    expect(bloco).not.toContain('estadoDoVinculo');
    // CONTRAEXEMPLO: uma linha acrescentada ao bloco muda o `sha256`
    expect(sha256(bloco.replace('errorType: error.name,', 'errorType: error.name,\n        estadoDoVinculo: null,'))).not.toBe('a1b2914c5bb9e8fa235975dbc43063d698acf5774ce12546e9759a0d5cdbf204');
  });
});

// ===========================================================================================================================
describe('D. A decisão NÃO recebe o campo (K5): a leitura do fonte da rota, com contraexemplos', () => {
  /** Toda violação de K5 que a leitura do fonte da rota enxerga: o identificador do campo fora das duas linhas esperadas, ou dentro de uma função da decisão. */
  function violacoesDeDecisao(rota: string): string[] {
    const v: string[] = [];
    const linhas = rota.split('\n').filter((l) => /\bestadoDoVinculo\b/.test(l) && !l.trim().startsWith('//'));
    const esperadas = ['const estadoDoVinculo = estadoDoVinculoNaResposta(data.vinculoDaExecucao);', 'estadoDoVinculo,'];
    if (JSON.stringify(linhas.map((l) => l.trim())) !== JSON.stringify(esperadas)) v.push(`linhas do identificador: ${JSON.stringify(linhas.map((l) => l.trim()))}`);
    const inicio = rota.indexOf('function calculateGrade(');
    const nota = rota.slice(inicio, rota.indexOf('\n}\n', inicio));
    if (/estadoDoVinculo/.test(nota)) v.push('calculateGrade cita o campo');
    const extrator = rota.slice(rota.indexOf('function extractGradeFromReview('), rota.indexOf('\n}\n', rota.indexOf('function extractGradeFromReview(')));
    if (/estadoDoVinculo/.test(extrator)) v.push('extractGradeFromReview cita o campo');
    for (const c of rota.match(/elegivelParaClassificacao\([^)]*\)/g) ?? []) if (/estadoDoVinculo/.test(c)) v.push(`chamada de elegibilidade: ${c}`);
    for (const c of rota.match(/classificarAvaliacaoRecebida\([^)]*\)/g) ?? []) if (/estadoDoVinculo/.test(c)) v.push(`chamada de classificação: ${c}`);
    // a posição: o valor é calculado DEPOIS do estado da extração e da mensagem, e a chave entra na resposta entre `mensagemDaExtracao,` e `review,`
    const iMsg = rota.indexOf('const mensagemDaExtracao = ');
    const iValor = rota.indexOf('const estadoDoVinculo = ');
    if (!(iMsg > 0 && iValor > iMsg)) v.push('o valor não é calculado depois da mensagem da extração');
    const iChaveMsg = rota.indexOf('      mensagemDaExtracao,\n');
    const iChave = rota.indexOf('      estadoDoVinculo,\n');
    const iReview = rota.indexOf('      review,\n', iChave);
    if (!(iChaveMsg > 0 && iChave > iChaveMsg && iReview > iChave && iReview - iChave < 600)) v.push('a chave da resposta não está entre mensagemDaExtracao e review');
    return v;
  }

  test('em route.ts o identificador do campo ocorre em DUAS linhas (o cálculo e a chave da resposta), e nenhuma função da decisão o cita', () => {
    expect(violacoesDeDecisao(ler('app/api/ai-reviewer/route.ts'))).toEqual([]);
  });

  test('CONTRAEXEMPLOS do detector: o campo passado à elegibilidade, citado em calculateGrade ou numa terceira linha é PEGO', () => {
    const rota = ler('app/api/ai-reviewer/route.ts');
    const trocar = (de: string, para: string) => { expect(ocorrencias(rota, de)).toBeGreaterThanOrEqual(1); return rota.replace(de, para); };
    expect(violacoesDeDecisao(trocar('elegivelParaClassificacao(data.avaliacaoDeQualidade, data.coerenciaDaQualidade)', 'elegivelParaClassificacao(data.avaliacaoDeQualidade, data.coerenciaDaQualidade, estadoDoVinculo)')).length).toBeGreaterThan(0);
    expect(violacoesDeDecisao(trocar('function calculateGrade(data: ReviewRequest): Classificacao {', 'function calculateGrade(data: ReviewRequest): Classificacao {\n  const estadoDoVinculo = null;')).length).toBeGreaterThan(0);
    expect(violacoesDeDecisao(trocar('    const aiGrade = classification.suspensa ? null : extractGradeFromReview(review);', '    const aiGrade = classification.suspensa || estadoDoVinculo === null ? null : extractGradeFromReview(review);')).length).toBeGreaterThan(0);
    // e a chave fora da posição declarada
    expect(violacoesDeDecisao(trocar('      estadoDoVinculo,\n      review,', '      review,\n      estadoDoVinculo,')).length).toBeGreaterThan(0);
  });

  test('a decisão é a MESMA com o campo em qualquer estado: nota, veredicto, suspensão, estado e mensagem da extração e A.27 não variam entre as 22 formas (K5, pelo tratador real)', async () => {
    const decisao = (c: any) => JSON.stringify({ nota: c.nota, veredicto: c.veredicto, notaSuspensa: c.notaSuspensa, estadoDaExtracao: c.metadata.estadoDaExtracao, mensagemDaExtracao: c.mensagemDaExtracao, validation: c.validation, avaliacaoDeQualidade: c.metadata.avaliacaoDeQualidade });
    for (const texto of [T1, T2A, T1 + SUFIXO_REPROVADA]) {
      const referencia = decisao((await executar(payloadDaTela(elegivel()), texto)).corpo);
      for (const f of FORMAS) expect([f.rotulo, decisao((await executar(comOCampo(f), texto)).corpo)]).toEqual([f.rotulo, referencia]);
    }
    // e com a classificação SUSPENSA (contradição) a decisão também é a mesma, e a causa é a da contradição
    const contraditoria = (valor: unknown) => { const p: any = payloadDaTela(elegivel(), valor); p.qualityAnalysis.summary.critical = 4; return p; };
    const ref = (await executar(contraditoria(undefined), T1)).corpo;
    expect(ref.notaSuspensa).toMatchObject({ suspensa: true, causa: 'contradicao' });
    for (const f of FORMAS) {
      const p = contraditoria(f.omitir ? undefined : f.valor);
      expect([f.rotulo, decisao((await executar(p, T1)).corpo)]).toEqual([f.rotulo, decisao(ref)]);
    }
  });
});

// ===========================================================================================================================
describe('E. O mapeamento da tela: o código real de page.tsx, e o objeto de sucesso EXECUTADO sobre o corpo real (B4)', () => {
  const PAGINA = 'app/decisor/resultados/[projectId]/page.tsx';

  test('page.tsx tem TRÊS `setAiReview({`: só o de sucesso recebe a chave, com o mesmo nome, lida do nível principal e sem valor padrão que a converta em ausência do vínculo', () => {
    const fonte = ler(PAGINA);
    expect(violacoesDoMapeamento(fonte)).toEqual([]);
    const [sucesso, erroDaResposta, erroDeConexao] = objetosDeSetAiReview(fonte);
    const aberturas = avaliarObjeto(sucesso, { nota: 1, veredicto: 2, review: 3, validation: 4, metadata: 5 });
    expect(Object.keys(aberturas)).toEqual(['nota', 'veredicto', 'notaSuspensa', 'mensagemDaExtracao', 'estadoDoVinculo', 'review', 'validation', 'metadata']);
    // os dois objetos de erro ficam como estão: duas chaves, e nenhuma é a nova
    expect(Object.keys(avaliarObjeto(erroDaResposta, { error: 'x' }))).toEqual(['error', 'message']);
    expect(Object.keys(avaliarObjeto(erroDeConexao, {}))).toEqual(['error', 'message']);
    // a chave aparece em UMA linha de código de page.tsx, fora de comentário de linha própria
    const linhas = fonte.split('\n').filter((l) => /\bestadoDoVinculo\b/.test(l) && !l.trim().startsWith('//'));
    expect(linhas.map((l) => l.trim())).toEqual(['estadoDoVinculo: data.estadoDoVinculo ?? null,']);
  });

  test('a linha nova NÃO cita preparoDoVinculo, vinculoDaExecucao nem prepararVinculoDaTela (a lista de linhas da tela que citam o preparo segue igual)', () => {
    const nova = ler(PAGINA).split('\n').filter((l) => /^\s*estadoDoVinculo:/.test(l));
    expect(nova.length).toBe(1);
    expect(/preparoDoVinculo|vinculoDaExecucao|prepararVinculoDaTela/.test(nova[0])).toBe(false);
  });

  test('CONTRAEXEMPLOS do detector do mapeamento: a chave num objeto de erro, o valor padrão que converte a ausência, a chave lida de metadata e a chave ausente do sucesso são PEGOS', () => {
    const fonte = ler(PAGINA);
    const trocar = (de: string, para: string) => { expect(ocorrencias(fonte, de)).toBe(1); return fonte.replace(de, para); };
    const LINHA = 'estadoDoVinculo: data.estadoDoVinculo ?? null,';
    expect(violacoesDoMapeamento(trocar(LINHA, "estadoDoVinculo: data.estadoDoVinculo ?? 'ausente_no_payload',")).length).toBeGreaterThan(0);
    expect(violacoesDoMapeamento(trocar(LINHA, 'estadoDoVinculo: data.metadata?.estadoDoVinculo ?? null,')).length).toBeGreaterThan(0);
    expect(violacoesDoMapeamento(trocar(`          ${LINHA}\n`, '')).length).toBeGreaterThan(0);
    expect(violacoesDoMapeamento(trocar("message: data.error || 'Erro ao executar revisão'", "message: data.error || 'Erro ao executar revisão',\n          estadoDoVinculo: null")).length).toBeGreaterThan(0);
    expect(violacoesDoMapeamento(trocar("message: 'Erro de conexão: ' + (e.message || String(e))", "message: 'Erro de conexão: ' + (e.message || String(e)),\n        estadoDoVinculo: null")).length).toBeGreaterThan(0);
    // o extrator de objetos não se confunde com chaves em texto e em comentário
    expect(objetosDeSetAiReview("setAiReview({ a: '}', /* } */ b: `}`, // }\n c: 1 }); setAiReview({ d: 2 });")).toEqual(["{ a: '}', /* } */ b: `}`, // }\n c: 1 }", '{ d: 2 }']);
  });

  test.each(FORMAS.map((f, i) => [i + 1, f.classe, f.rotulo, f] as [number, string, string, Forma]))(
    'forma %i (%s, %s): o mapeamento REAL leva o valor da resposta ao aiReview, sem convertê-lo',
    async (_n, _c, _r, f) => {
      const { corpo } = await executar(comOCampo(f), T1);
      const aiReview = mapearComAPagina(corpo);
      expect(aiReview.estadoDoVinculo).toBe(f.esperado);
      expect(aiReview.review).toBe(T1);
      expect(Object.keys(aiReview)).toEqual(['nota', 'veredicto', 'notaSuspensa', 'mensagemDaExtracao', 'estadoDoVinculo', 'review', 'validation', 'metadata']);
    }
  );

  test('NEGATIVOS do mapeamento: a resposta SEM o campo e a resposta com valor desconhecido NÃO viram ausente_no_payload (null no primeiro caso, o valor tal como veio no segundo)', async () => {
    const { corpo } = await executar(payloadDaTela(elegivel()), T1);
    const semCampo = { ...corpo };
    delete semCampo.estadoDoVinculo;
    expect(mapearComAPagina(semCampo).estadoDoVinculo).toBeNull();
    expect(mapearComAPagina({ ...corpo, estadoDoVinculo: null }).estadoDoVinculo).toBeNull();
    for (const v of DESCONHECIDOS) expect([v, mapearComAPagina({ ...corpo, estadoDoVinculo: v }).estadoDoVinculo ?? null]).toEqual([v, v]);
    // o objeto de erro da tela (o caminho que já existe) NÃO leva o campo, e o componente não mostra o aviso nem prefixa a cópia com ele
    const erro = avaliarObjeto(objetosDeSetAiReview(ler(PAGINA))[1], { error: 'falhou' });
    expect('estadoDoVinculo' in erro).toBe(false);
    expect(renderizar(erro)).not.toContain(AVISO);
  });
});

// ===========================================================================================================================
describe('F. O componente real: o aviso (c), só nas duas situações da classe A (B5)', () => {
  /** O `aiReview` que a página REAL monta de uma resposta REAL, com o campo trazido pela resposta (a chave omitida vira o caso AUSENTE). */
  async function aiReviewReal(texto: string, payload: Record<string, unknown> = payloadDaTela(elegivel())) {
    const { corpo } = await executar(payload, texto);
    return { corpo, aiReview: mapearComAPagina(corpo) };
  }
  const semOCampo = (aiReview: any) => { const o = { ...aiReview }; delete o.estadoDoVinculo; return o; };

  test('o texto (c) do ensaio é o REGISTRADO: 301 bytes e o sha256 da predição; e está UMA vez no componente, como literal', () => {
    expect({ bytes: nBytes(AVISO), sha256: sha256(AVISO) }).toEqual(AVISO_ID);
    expect(ocorrencias(ler('components/ParecerAISection.tsx'), AVISO)).toBe(1);
  });

  test.each(CLASSE_A.map((v) => [v] as [string]))('%s: o componente real exibe (c) UMA vez, literal, num elemento com role="status"; o texto é o mesmo nas duas situações', async (valor) => {
    const { aiReview } = await aiReviewReal(T1);
    const html = renderizar({ ...aiReview, estadoDoVinculo: valor });
    expect(ocorrencias(html, AVISO)).toBe(1);
    expect(ocorrencias(html, BLOCO_DO_AVISO_HTML)).toBe(1);
    const { arvore } = arvoreDoComponente({ ...aiReview, estadoDoVinculo: valor });
    const blocos = achar(arvore, (n) => n.props?.role === 'status' && textoDe(n) === AVISO);
    expect(blocos.length).toBe(1);
    expect(achar(arvore, (n) => n.props?.role === 'alert').length).toBe(0); // não é o `role="alert"` da quarentena de A.27
  });

  test('o texto exibido é IDÊNTICO nas duas situações da classe A, e o HTML novo é o HTML sem o campo mais UM bloco', async () => {
    const { aiReview } = await aiReviewReal(T1);
    const htmlAusente = renderizar({ ...aiReview, estadoDoVinculo: 'ausente_no_payload' });
    const htmlNulo = renderizar({ ...aiReview, estadoDoVinculo: 'nulo_explicito' });
    expect(htmlAusente).toBe(htmlNulo);
    expect(htmlAusente.replace(BLOCO_DO_AVISO_HTML, '')).toBe(renderizar(semOCampo(aiReview)));
  });

  const NEGATIVOS: Array<[string, unknown]> = [
    ['campo AUSENTE do aiReview', '__ausente__'],
    ['null', null],
    ...CINCO_FORA_DA_CLASSE_A.map((v) => [v, v] as [string, unknown]),
    ...DESCONHECIDOS.map((v) => [`desconhecido ${JSON.stringify(v)}`, v] as [string, unknown]),
  ];
  test.each(NEGATIVOS)('NEGATIVO (%s): zero ocorrências de (c), nenhum bloco novo, e o HTML é IGUAL ao do aiReview sem o campo', async (_rotulo, valor) => {
    const { aiReview } = await aiReviewReal(T1);
    const base = semOCampo(aiReview);
    const com = valor === '__ausente__' ? base : { ...base, estadoDoVinculo: valor };
    const html = renderizar(com);
    expect(ocorrencias(html, AVISO)).toBe(0);
    expect(ocorrencias(html, 'Vínculo com a execução do cálculo ausente')).toBe(0);
    expect(html).toBe(renderizar(base));
    expect(achar(arvoreDoComponente(com).arvore, (n) => n.props?.role === 'status' && textoDe(n) === AVISO).length).toBe(0);
  });

  /** As quatro situações de A.27, com textos FIXADOS (T2A e os sufixos), construídas como o ensaio D de `a12-nota-veredicto-fase2`. */
  const QUATRO_ESTADOS: Array<[string, string, (p: any) => any, (v: any) => any]> = [
    ['aprovado', T2A, (p) => p, (v) => v],
    ['reprovado', T2A + SUFIXO_REPROVADA, (p) => p, (v) => v],
    ['inconclusivo', T2A + SUFIXO_INCONCLUSIVA, (p) => ({ ...p, finalScores: [] }), (v) => v],
    ['nao_confirmado', T2A, (p) => p, () => undefined],
  ];
  test.each(QUATRO_ESTADOS.map(([e, t, a, v]) => [e, t, a, v] as [string, string, (p: any) => any, (v: any) => any]))(
    'A.27 %s: o aviso aparece UMA vez com a classe A e NENHUMA vez sem ela, e não substitui nem condiciona outro bloco (o HTML menos o aviso é o HTML sem o campo)',
    async (esperado, texto, ajustar, alterarValidation) => {
      const { corpo, aiReview } = await aiReviewReal(texto, ajustar(payloadDaTela(elegivel())));
      if (esperado !== 'nao_confirmado') expect(corpo.validation.estado).toBe(esperado);
      else expect(corpo.validation.estado).toBe('aprovado'); // o nao_confirmado é CONSTRUÍDO: o tratador real não o produz
      const base = { ...semOCampo(aiReview), validation: alterarValidation(aiReview.validation) };
      const semCampo = renderizar(base);
      expect(decideReviewPresentation(base.validation).estado).toBe(esperado);
      for (const v of CLASSE_A) {
        const html = renderizar({ ...base, estadoDoVinculo: v });
        expect([esperado, v, ocorrencias(html, AVISO)]).toEqual([esperado, v, 1]);
        expect([esperado, v, html.replace(BLOCO_DO_AVISO_HTML, '')]).toEqual([esperado, v, semCampo]);
        // os blocos de A.27 seguem exibidos nas mesmas condições: o role="alert" só fora do aprovado
        expect([esperado, html.includes('role="alert"')]).toEqual([esperado, esperado !== 'aprovado']);
      }
      for (const v of [...CINCO_FORA_DA_CLASSE_A, null, 'inventado']) expect([esperado, String(v), renderizar({ ...base, estadoDoVinculo: v })]).toEqual([esperado, String(v), semCampo]);
    }
  );

  test('com a classificação SUSPENSA e com a mensagem da extração o aviso também aparece, depois dessa mensagem e antes do corpo, e nenhum bloco existente é substituído', async () => {
    // suspensa: contradição na avaliação de qualidade
    const contraditoria: any = payloadDaTela(elegivel());
    contraditoria.qualityAnalysis.summary.critical = 4;
    const suspensa = await aiReviewReal(T1, contraditoria);
    expect(suspensa.aiReview.notaSuspensa).toMatchObject({ suspensa: true, causa: 'contradicao' });
    const htmlS = renderizar({ ...suspensa.aiReview, estadoDoVinculo: 'nulo_explicito' });
    expect(ocorrencias(htmlS, AVISO)).toBe(1);
    expect(htmlS.replace(BLOCO_DO_AVISO_HTML, '')).toBe(renderizar(semOCampo(suspensa.aiReview)));
    expect(htmlS.indexOf('📊')).toBeGreaterThanOrEqual(0); // o cartão de suspensão segue exibido
    // com a mensagem da extração (nenhum padrão reconhecido): o aviso vem DEPOIS dela e ANTES do corpo
    const semPadrao = await aiReviewReal(T2A);
    const msg = semPadrao.aiReview.mensagemDaExtracao;
    expect(typeof msg).toBe('string');
    const html = renderizar({ ...semPadrao.aiReview, estadoDoVinculo: 'ausente_no_payload' });
    const [iMsg, iAviso, iCorpo] = [html.indexOf(msg), html.indexOf(AVISO), html.indexOf('whitespace-pre-wrap')];
    expect([iMsg >= 0, iMsg < iAviso, iAviso < iCorpo]).toEqual([true, true, true]);
  });

  test('o portão do destaque NÃO muda: o aviso não abre o destaque, e o campo não o fecha (com nota e veredicto reconhecidos e A.27 aprovado, o destaque sai com e sem a classe A)', async () => {
    const livre = await aiReviewReal(T1);
    for (const v of [...CLASSE_A, ...CINCO_FORA_DA_CLASSE_A, '__ausente__']) {
      const aiReview = v === '__ausente__' ? semOCampo(livre.aiReview) : { ...livre.aiReview, estadoDoVinculo: v };
      expect([v, renderizar(aiReview).includes('Nota Científica')]).toEqual([v, true]);
    }
    // sem nota e sem veredicto o destaque NÃO sai, mesmo com o aviso exibido
    const semNota = { ...livre.aiReview, nota: null, veredicto: null, estadoDoVinculo: 'ausente_no_payload' };
    const html = renderizar(semNota);
    expect(ocorrencias(html, AVISO)).toBe(1);
    expect(html.includes('Nota Científica')).toBe(false);
  });

  test('a combinação resposta REAL → mapeamento REAL → componente REAL, nas quatro entradas (omitida, null, estado reconhecido, formato desconhecido)', async () => {
    const entradas: Array<[string, Record<string, unknown>, boolean]> = [
      ['chave omitida', payloadDaTela(elegivel()), true],
      ['null', { ...payloadDaTela(elegivel()), vinculoDaExecucao: null }, true],
      ['estado reconhecido', payloadDaTela(elegivel(), vinculoDoEstado('vinculado', elegivel())), false],
      ['formato desconhecido', payloadDaTela(elegivel(), { estado: 'inventado' }), false],
    ];
    for (const [rotulo, payload, comAviso] of entradas) {
      const { aiReview } = await aiReviewReal(T1, payload);
      expect([rotulo, ocorrencias(renderizar(aiReview), AVISO)]).toEqual([rotulo, comAviso ? 1 : 0]);
    }
  });
});

// ===========================================================================================================================
describe('G. A cópia: o manipulador real, com o prefixo só nas duas situações da classe A (B6)', () => {
  const comParecer = (review: string, estadoDoVinculo?: unknown, extra: Record<string, unknown> = {}): any => ({
    nota: null,
    veredicto: null,
    notaSuspensa: null,
    mensagemDaExtracao: null,
    review,
    validation: undefined,
    metadata: { model: 'modelo-do-ensaio' },
    ...(estadoDoVinculo === '__ausente__' ? {} : { estadoDoVinculo }),
    ...extra,
  });

  test('os literais do ensaio são os REGISTRADOS: (d) com 254 bytes, o PREFIXO de 255, P0 de 169, a composição de 424, e a forma errada de 423 que perde a linha em branco', () => {
    expect({ bytes: nBytes(D_UNIDAS), sha256: sha256(D_UNIDAS) }).toEqual(D_UNIDAS_ID);
    expect({ bytes: nBytes(PREFIXO), sha256: sha256(PREFIXO) }).toEqual(PREFIXO_ID);
    expect({ bytes: nBytes(P0), sha256: sha256(P0) }).toEqual(P0_ID);
    expect({ bytes: nBytes(PREFIXO + P0), sha256: sha256(PREFIXO + P0) }).toEqual(P0_COMPOSTO_ID);
    expect(nBytes(PREFIXO)).toBe(nBytes(D_UNIDAS) + 1); // a diferença é UM byte: o LF depois da quarta linha
    const errado = D_UNIDAS + P0;
    expect([nBytes(errado), sha256(errado).slice(0, 16)]).toEqual([P0_COMPOSTO_ERRADO.bytes, P0_COMPOSTO_ERRADO.sha256Inicio]);
    expect(sha256(errado)).not.toBe(P0_COMPOSTO_ID.sha256);
    expect(PREFIXO.split('\n')).toEqual([D_PRIMEIRA_LINHA, '', '---', '', '']); // quatro linhas, cada uma terminada por LF
    expect(ocorrencias(ler('components/ParecerAISection.tsx'), D_PRIMEIRA_LINHA)).toBe(1);
  });

  test('a primeira linha de (d) é o rótulo mais as DUAS primeiras frases de (c), e (d) não traz a terceira (a da causa de suspensão e da elegibilidade)', () => {
    const rotulo = '[Informação do sistema — não integra o texto gerado do parecer] ';
    const [f1, f2, f3] = AVISO.split('. ').map((f, i, a) => (i < a.length - 1 ? `${f}.` : f));
    expect(D_PRIMEIRA_LINHA).toBe(`${rotulo}${f1} ${f2}`);
    expect(D_PRIMEIRA_LINHA).not.toContain(f3);
    expect(f3).toContain('causa de suspensão');
    expect(f3).toContain('elegibilidade');
  });

  test.each(CLASSE_A.map((v) => [v] as [string]))('%s: a cópia é PREFIXO + parecer, 424 bytes para P0, o mesmo nas duas situações, e writeText é chamado UMA vez', async (valor) => {
    const r = await copiar(comParecer(P0, valor));
    expect(r.botoes).toBe(1);
    expect(r.chamadas.length).toBe(1);
    expect(r.chamadas[0]).toBe(PREFIXO + P0);
    expect({ bytes: nBytes(r.chamadas[0]), sha256: sha256(r.chamadas[0]) }).toEqual(P0_COMPOSTO_ID);
    expect(r.chamadas[0].startsWith(PREFIXO)).toBe(true);
    expect(r.chamadas[0].slice(PREFIXO.length)).toBe(P0); // o parecer, INTEIRO, depois do separador e da linha em branco
    expect(r.chamadas[0]).not.toBe(D_UNIDAS + P0); // a forma de 254 bytes (423 no total) perderia a linha em branco
    expect(r.chamadas[0].split('\n').slice(0, 5)).toEqual([D_PRIMEIRA_LINHA, '', '---', '', '## Parecer de ensaio']);
    // o resto do manipulador segue como estava: `setCopied(true)` e o `setTimeout` de 2000 ms
    expect(r.setCopied).toHaveBeenCalledWith(true);
    expect(r.atrasos).toEqual([2000]);
  });

  const FORA_DA_CLASSE_A: Array<[string, unknown]> = [
    ['campo AUSENTE', '__ausente__'],
    ['null', null],
    ...CINCO_FORA_DA_CLASSE_A.map((v) => [v, v] as [string, unknown]),
    ...DESCONHECIDOS.map((v) => [`desconhecido ${JSON.stringify(v)}`, v] as [string, unknown]),
  ];
  test.each(FORA_DA_CLASSE_A)('NEGATIVO (%s): a cópia é o parecer, BYTE A BYTE (P0: 169 bytes), sem nenhum byte de prefixo', async (_rotulo, valor) => {
    const r = await copiar(comParecer(P0, valor));
    expect(r.chamadas).toEqual([P0]);
    expect({ bytes: nBytes(r.chamadas[0]), sha256: sha256(r.chamadas[0]) }).toEqual(P0_ID);
  });

  test('o parecer chega INTEIRO na cópia: sem aparar, normalizar nem truncar (espaços e quebras nas pontas, linhas em branco repetidas e texto com marcas)', async () => {
    const dificil = '\n\n  ## Título com espaços  \n\n\n\n**negrito** e `código`\n\ttab\n  \n';
    for (const v of [...CLASSE_A, ...CINCO_FORA_DA_CLASSE_A, '__ausente__']) {
      const r = await copiar(comParecer(dificil, v));
      expect([v, r.chamadas[0]]).toEqual([v, (CLASSE_A.includes(v) ? PREFIXO : '') + dificil]);
    }
  });

  test.each([
    ['review ausente (chave inexistente)', (a: any) => { delete a.review; }],
    ['review undefined', (a: any) => { a.review = undefined; }],
    ['review null', (a: any) => { a.review = null; }],
    ["review ''", (a: any) => { a.review = ''; }],
  ])('SEM PARECER (%s): o botão não é renderizado, e nenhuma escrita no clipboard, nem só com o prefixo, mesmo com a classe A', async (_rotulo, esvaziar) => {
    for (const v of CLASSE_A) {
      const aiReview = comParecer('qualquer', v);
      esvaziar(aiReview);
      const r = await copiar(aiReview);
      expect([v, r.botoes, r.chamadas]).toEqual([v, 0, []]); // sem parecer o botão nem existe
    }
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ["''", ''],
  ])("o retorno antecipado do manipulador REAL: com o `review` esvaziado (%s) depois de obter o onClick, NENHUMA chamada a writeText, nem só com o prefixo, mesmo com a classe A", async (_rotulo, valor) => {
    for (const v of [...CLASSE_A, 'vinculado', '__ausente__']) {
      const r = await copiar(comParecer(P0, v), { valor });
      expect([String(v), r.botoes, r.chamadas, r.atrasos]).toEqual([String(v), 1, [], []]);
      expect(r.setCopied).not.toHaveBeenCalled(); // e o resto do manipulador também não corre
    }
  });

  test('CONTROLE do instrumento: com o parecer presente o MESMO caminho chama writeText, de modo que a ausência de chamada acima não é vacuidade', async () => {
    const r = await copiar(comParecer(P0, 'ausente_no_payload'));
    expect(r.chamadas.length).toBe(1);
  });

  const FIXTURES_A27: Array<{ estado: string; texto: string; ajustar: (p: any) => any; validation: (v: any) => any; parecer: { bytes: number; sha256: string }; copiaA: { bytes: number; sha256: string } }> = [
    {
      estado: 'aprovado',
      texto: T2A,
      ajustar: (p) => p,
      validation: (v) => v,
      parecer: { bytes: 345, sha256: 'aebd76a4b22da618bb8f316f66b912c17ea768074c08112a75c2448ae006d96b' },
      copiaA: { bytes: 600, sha256: '6416a5d807fc2a2c09252288e58c6711f5db2aa7bfbe0b9ac56c6045eedce7f0' },
    },
    {
      estado: 'reprovado',
      texto: T2A + SUFIXO_REPROVADA,
      ajustar: (p) => p,
      validation: (v) => v,
      parecer: { bytes: 429, sha256: 'd6e7555559bb99d935b442f80859cf8f2a2d7daf8efd73d317a877ad56728bdd' },
      copiaA: { bytes: 684, sha256: 'e8193611c49bc9b177de08ba991e0850f0064226c20575705625b5e9aa05ca24' },
    },
    {
      estado: 'inconclusivo',
      texto: T2A + SUFIXO_INCONCLUSIVA,
      ajustar: (p) => ({ ...p, finalScores: [] }),
      validation: (v) => v,
      parecer: { bytes: 412, sha256: '2453a978734c8caf18a06c9939bc41620e9c946227dfeeef6d091f5d701a42ac' },
      copiaA: { bytes: 667, sha256: '457da772ca0b2ab278d56cc1e304c841ded75bfec49657d9313df7639a9147d7' },
    },
    {
      estado: 'nao_confirmado',
      texto: T2A,
      ajustar: (p) => p,
      validation: () => undefined,
      parecer: { bytes: 345, sha256: 'aebd76a4b22da618bb8f316f66b912c17ea768074c08112a75c2448ae006d96b' },
      copiaA: { bytes: 600, sha256: '6416a5d807fc2a2c09252288e58c6711f5db2aa7bfbe0b9ac56c6045eedce7f0' },
    },
  ];

  test.each(FIXTURES_A27.map((f) => [f.estado, f] as [string, (typeof FIXTURES_A27)[number]]))(
    'A.27 %s, com texto fixado: o prefixo entra SE, e só se, a classe é A; a quarentena de A.27 NÃO entra na cópia; o parecer vai inteiro',
    async (esperado, f) => {
      expect({ bytes: nBytes(f.texto), sha256: sha256(f.texto) }).toEqual(f.parecer); // o fixture é o REGISTRADO
      const { corpo } = await executar(f.ajustar(payloadDaTela(elegivel())), f.texto);
      expect(corpo.validation.estado).toBe(esperado === 'nao_confirmado' ? 'aprovado' : esperado); // o nao_confirmado é construído no instrumento
      expect(corpo.review).toBe(f.texto);
      const aiReview = { ...mapearComAPagina(corpo), validation: f.validation(corpo.validation) };
      const presentacao = decideReviewPresentation(aiReview.validation);
      expect(presentacao.estado).toBe(esperado);
      // a classe A, vinda da RESPOSTA REAL (a requisição não traz o vínculo): prefixo + parecer, com os bytes e o sha256 registrados
      expect(aiReview.estadoDoVinculo).toBe('ausente_no_payload');
      const comPrefixo = (await copiar(aiReview)).chamadas[0];
      expect(comPrefixo).toBe(PREFIXO + f.texto);
      expect({ bytes: nBytes(comPrefixo), sha256: sha256(comPrefixo) }).toEqual(f.copiaA);
      // o `null` explícito dá o MESMO texto copiado
      expect((await copiar({ ...aiReview, estadoDoVinculo: 'nulo_explicito' })).chamadas[0]).toBe(comPrefixo);
      // fora da classe A: o parecer, byte a byte, e o sha256 é o do próprio parecer
      for (const v of [...CINCO_FORA_DA_CLASSE_A, null, 'inventado']) {
        const c = (await copiar({ ...aiReview, estadoDoVinculo: v })).chamadas[0];
        expect([esperado, String(v), c]).toEqual([esperado, String(v), f.texto]);
        expect(sha256(c)).toBe(f.parecer.sha256);
      }
      const semCampo = { ...aiReview };
      delete semCampo.estadoDoVinculo;
      expect((await copiar(semCampo)).chamadas[0]).toBe(f.texto);
      // a limitação, citada e NÃO reaberta: a cópia NÃO transporta a quarentena de A.27, em estado algum
      for (const c of [comPrefixo, f.texto]) {
        expect(c.endsWith(f.texto)).toBe(true);
        const fora = c.slice(0, c.length - f.texto.length); // a parte da cópia que NÃO é o parecer: o prefixo, ou nada
        expect(fora === '' || fora === PREFIXO).toBe(true);
        expect(fora.includes(presentacao.titulo)).toBe(false);
        for (const m of presentacao.motivos) expect(fora.includes(m)).toBe(false);
        expect(fora).not.toMatch(/quarentena/i);
      }
    }
  );

  test('o prefixo e o aviso NÃO dizem nem sugerem que o compartilhamento fica protegido (o detector tem contraexemplos)', () => {
    const sugereProtecao = /proteg|segur[oa]|garant|a\s+cópia\s+(inclui|traz|leva|carrega)\s+(todos\s+os|os)\s+avisos|integralmente|sem\s+risco/i;
    expect(sugereProtecao.test(AVISO)).toBe(false);
    expect(sugereProtecao.test(PREFIXO)).toBe(false);
    for (const frase of ['O compartilhamento está protegido.', 'A cópia é segura.', 'Conteúdo garantido pela verificação.', 'A cópia leva todos os avisos.', 'Protegida pela ressalva.']) {
      expect([frase, sugereProtecao.test(frase)]).toEqual([frase, true]);
    }
  });
});
