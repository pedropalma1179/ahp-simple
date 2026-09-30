/**
 * lib/__tests__/vinculo-execucao-fiacao.test.ts
 *
 * **A.12 etapa 3, estágio 1: a FIAÇÃO do vínculo — rota do Parecer IA, tipos, tela e docs.**
 *
 * ⚠ **O que roda de verdade aqui.** A rota real `app/api/ai-reviewer/route.ts`, com o
 * cliente do modelo SIMULADO (chave falsa, texto controlado): `normalizeRequest`, o bloco
 * do contexto, a classificação e a elegibilidade. Nenhuma chamada externa de inferência.
 *
 * ⚠ **O que NÃO roda: a tela.** `page.tsx` é `'use client'`, o repositório não tem `jsdom`
 * nem `@testing-library`, e o parecer é disparado por clique. A fiação na tela é verificada
 * aqui por LEITURA da fonte — âncoras de texto com contagem —, e por `tsc` e `next build`.
 * ⚠ **Isso é um limite declarado, e não equivalência com execução da tela.** Âncora de
 * texto prova a PRESENÇA do fragmento escolhido, e nada além dele.
 *
 * ⚠ **Numeração** dos ensaios da seção 10 da especificação: 9, 10, 11, 12, a parte de
 * fiação de 8 e a de 13. Os demais estão em `vinculo-execucao.test.ts` e
 * `vinculo-execucao-calculo.test.ts`.
 *
 * ⚠ **O contraexemplo do ensaio 9 é uma MUTAÇÃO da fonte**, executada à mão e registrada no
 * commit e no registro datado: retirar a linha que COPIA o campo em `normalizeRequest`
 * reprova este arquivo. Retirar a declaração de `ReviewRequest` NÃO serve: interface
 * TypeScript não remove campo em execução, e o descarte vem da construção explícita.
 */

export {};

const fs = require('node:fs');
const path = require('node:path');

import {
  frasesDaListaComVinculo,
  identificarParaApresentacao,
  lerVinculoParaTexto,
  LIMITE_DO_VINCULO,
  linhasDeExclusaoComVinculo,
  MARCADOR_DO_BLOCO_DO_VINCULO,
  prepararVinculoDaTela,
} from '@/lib/ai-reviewer/vinculo-execucao';

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const normalizar = (t: string) => t.replace(/\s+/g, ' ').trim();
const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;

const TELA = 'app/decisor/resultados/[projectId]/page.tsx';
const ROTA = 'app/api/ai-reviewer/route.ts';
const CONTRATO = 'docs/contratos-de-dados.md';
const REGISTRO = 'docs/imprecisoes-parecer-ia.md';
const ANCORA = 'docs/objetivo-estados-caminho.md';

// ---------------------------------------------------------------------------
// Cliente do modelo SIMULADO. ⚠ Chave falsa, texto controlado, e nada de rede.
// ---------------------------------------------------------------------------

const CHAVE = 'chave-anthropic-falsa-do-processo-de-teste';
const SEM_VEREDICTO = 'Parecer de ensaio, sem decisão editorial declarada no texto. '.repeat(3);
process.env.ANTHROPIC_API_KEY = CHAVE;
delete process.env.USE_RAG_SEMANTIC;

const captura: { contexto: string } = { contexto: '' };

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = {
      create: async (a: { messages: Array<{ content: string }> }) => {
        captura.contexto = a.messages.map((m) => m.content).join('\n');
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
afterAll(() => silencios.forEach((s) => s.mockRestore()));
jest.setTimeout(60000);

type Resposta = { contexto: string; corpo: any; status: number };

/** Executa o handler REAL com o cliente simulado, e captura o contexto e a resposta. */
async function executar(payload: Record<string, unknown>): Promise<Resposta> {
  captura.contexto = '';
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  const corpo = await res.json();
  return { contexto: captura.contexto, corpo, status: res.status ?? 200 };
}

// ---------------------------------------------------------------------------
// Payloads com a forma que a tela monta. ⚠ São duplos de TESTE.
// ---------------------------------------------------------------------------

const respondente = (id: string, cr: number | null) => ({
  respondentId: id,
  id,
  name: `Respondente ${id}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
});

const balde = (total: number, valid: number, warning = 0, critical = 0) => ({ total, valid, warning, critical, avgCR: 0.05 });

/** O payload da tela para os `respondentes` dados, com `overall` opcional. */
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
          statistics: {
            byStatus: { 'CONFIÁVEL': validos, 'REVISAR': 0, 'SUSPEITO': n - validos, 'CRÍTICO': 0 },
            total: n,
            avgCR: 0.05,
          },
          ...(comOverall ? { overall: { status: 'CONFIÁVEL', qualityScore: 91, recommendation: 'ok' } } : {}),
          summary: { total: n, ok: validos, suspicious: n - validos, critical: 0 },
        }
      : { respondents: respondentes },
    overallStats: todosComCR ? { total: n, valid: validos, warning: n - validos, critical: 0 } : undefined,
    individualStats: todosComCR
      ? {
          Benefits: balde(n, validos, n - validos),
          Opportunities: balde(n, validos, n - validos),
          Costs: balde(n, validos, n - validos),
          Risks: balde(n, validos, n - validos),
        }
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
  return { executionId: 'exec-fiacao-0001', metadata, ...sobre };
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

const blocoDe = (contexto: string): string => {
  const inicio = contexto.indexOf(MARCADOR_DO_BLOCO_DO_VINCULO);
  if (inicio < 0) return '';
  const fimDoLimite = contexto.indexOf(LIMITE_DO_VINCULO, inicio);
  return contexto.slice(inicio, fimDoLimite + LIMITE_DO_VINCULO.length);
};

// ============================================================ 9
describe('ensaio 9: vinculoDaExecucao sobrevive a normalizeRequest e aparece no contexto nos QUATRO estados', () => {
  test.each(ESTADOS.map((e) => [e] as const))('%s: UM bloco, com o estado literal, o executionId e os campos do resumo', async (estado) => {
    const lista = elegivel();
    const v = vinculoDoEstado(estado, lista);
    const { contexto, status } = await executar(payloadDaTela(lista, v));
    expect(status).toBe(200);

    expect(ocorrencias(contexto, MARCADOR_DO_BLOCO_DO_VINCULO)).toBe(1);
    const bloco = blocoDe(contexto);
    expect(bloco).toContain(`Estado do vínculo: **${estado}**`);
    expect(bloco).toContain('Execução do cálculo (identificador opaco): exec-fiacao-0001');
    expect(bloco).toContain('Origem da lista de respondentes avaliados: analiseDeQualidade');
    // o resumo do painel viaja em todos os estados, exceto indisponivel (nenhum resumo viaja)
    if (estado === 'indisponivel') {
      expect(bloco).toContain('Resumo do painel: não informado');
      expect(bloco).not.toContain(HEX_PAINEL);
    } else {
      expect(bloco).toContain(`Resumo do painel (algoritmo sha256, serialização a12-julgamentos-v1): ${HEX_PAINEL}`);
    }
    // o mapa por incluído viaja só onde a comparação existiu
    if (estado === 'vinculado' || estado === 'divergente') {
      expect(bloco).toMatch(/Resumos individuais transportados: \d+ de \d+ entradas com resumo\./);
    } else {
      expect(bloco).toContain('Resumos individuais: não viajam neste estado');
    }
    // ⚠ CONTRAEXEMPLO: nenhum dos outros três estados aparece como o declarado
    for (const outro of ESTADOS.filter((e) => e !== estado)) {
      expect(bloco).not.toContain(`Estado do vínculo: **${outro}**`);
    }
  });

  test('o bloco fica depois de "Amostra e Qualidade Geral" e antes da lista de respondentes', async () => {
    const lista = elegivel();
    const { contexto } = await executar(payloadDaTela(lista, vinculoDoEstado('vinculado', lista)));
    const amostra = contexto.indexOf('## Amostra e Qualidade Geral');
    const marcador = contexto.indexOf(MARCADOR_DO_BLOCO_DO_VINCULO);
    // ⚠ COM o campo o cabeçalho da lista nomeia a população enviada (R1); o antigo deixa de existir
    const listaExaustiva = contexto.indexOf('## DADOS DO SISTEMA — RESPONDENTES ENVIADOS A VOCÊ (lista EXAUSTIVA do conjunto enviado)');
    expect(amostra).toBeGreaterThan(-1);
    expect(marcador).toBeGreaterThan(amostra);
    expect(listaExaustiva).toBeGreaterThan(marcador);
    expect(contexto).not.toContain('## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)');
  });

  test('R1: requisição SEM o campo não ganha bloco, e `undefined` explícito é o mesmo que ausente', async () => {
    const lista = elegivel();
    const sem = await executar(payloadDaTela(lista));
    const explicito = await executar({ ...payloadDaTela(lista), vinculoDaExecucao: undefined });
    const nulo = await executar({ ...payloadDaTela(lista), vinculoDaExecucao: null });
    for (const r of [sem, explicito, nulo]) {
      expect(ocorrencias(r.contexto, MARCADOR_DO_BLOCO_DO_VINCULO)).toBe(0);
      expect(r.contexto).not.toContain('VÍNCULO DA AVALIAÇÃO DE QUALIDADE COM A EXECUÇÃO');
    }
    expect(explicito.contexto).toBe(sem.contexto);
    expect(nulo.contexto).toBe(sem.contexto);
    expect(sem.contexto.length).toBeGreaterThan(1000);
    // ⚠ ÂNCORA ABSOLUTA, derivada do gabarito ANTERIOR ao estágio, e não da saída de agora:
    //   `## Amostra e Qualidade Geral\n\n${exclusionContext}\n\n${fullRespondentList}`, com
    //   `exclusionContext` vazio e `fullRespondentList` começando por quebra de linha, dá CINCO
    //   quebras entre o título e a lista. Uma quebra a mais ou a menos no ponto de inserção mudaria
    //   o contexto de TODA requisição sem o campo, e a comparação relativa acima não a veria.
    expect(sem.contexto).toContain('## Amostra e Qualidade Geral\n\n\n\n\n## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)');
  });

  test.each(ESTADOS.map((e) => [e] as const))('R1: em %s a diferença para o contexto sem o campo é o bloco e as CINCO frases da lista trocadas, e nada mais', async (estado) => {
    const lista = elegivel();
    const sem = await executar(payloadDaTela(lista));
    const v = vinculoDoEstado(estado, lista);
    const com = await executar(payloadDaTela(lista, v));
    const bloco = blocoDe(com.contexto);
    expect(bloco.length).toBeGreaterThan(200);
    // ⚠ Retirado o bloco (com as quebras que o cercam) e devolvidas as cinco frases da lista à redação de
    //   `a973c8f` (as âncoras ABSOLUTAS de R7), o resto é BYTE A BYTE o contexto sem o campo. A cláusula
    //   "a única diferença é o bloco" DEIXOU DE VALER por decisão da rodada, e esta é a que a substitui.
    // ⚠ R4: as frases são as da conferência com a lista APRESENTADA, como a rota as monta (a regra de menção ganha uma
    //   frase quando a lista apresentada não corresponde aos três conjuntos, e em `divergente` os incluídos têm a sobra).
    const apresentada = lista.map((r, i) => identificarParaApresentacao(r, i));
    const f = frasesDaListaComVinculo(lerVinculoParaTexto(v, apresentada), lista.length);
    let reconstruido = com.contexto.replace(`\n${bloco}\n`, '');
    const devolver = (nova: string, antiga: string) => {
      expect(ocorrencias(reconstruido, nova)).toBe(1);
      reconstruido = reconstruido.replace(nova, () => antiga);
    };
    devolver(f.cabecalho, ANTIGA.cabecalho);
    devolver(f.total, ANTIGA.total);
    devolver(f.agregacao, ANTIGA.agregacao);
    devolver(f.cabecalhoDasContagens, '');
    devolver(f.regraDeMencao, ANTIGA.regra);
    expect(reconstruido).toBe(sem.contexto);
    expect(com.contexto).not.toBe(sem.contexto);
  });

  test('o campo é COPIADO por nome: outro nome ou campo desconhecido não chega ao contexto', async () => {
    const lista = elegivel();
    const v = vinculoDoEstado('vinculado', lista);
    const outroNome = await executar({ ...payloadDaTela(lista), vinculoDaExecucaoX: v, campoDesconhecido: { marca: 'MARCA-QUE-NAO-DEVE-CHEGAR' } });
    expect(ocorrencias(outroNome.contexto, MARCADOR_DO_BLOCO_DO_VINCULO)).toBe(0);
    expect(outroNome.contexto).not.toContain('MARCA-QUE-NAO-DEVE-CHEGAR');
  });

  test('a cópia está em normalizeRequest, uma vez, e a declaração está em ReviewRequest', () => {
    const rota = ler(ROTA);
    const inicio = rota.indexOf('function normalizeRequest(');
    expect(inicio).toBeGreaterThan(-1);
    const fim = rota.indexOf('\n}\n', inicio);
    const corpo = rota.slice(inicio, fim);
    expect(ocorrencias(corpo, 'vinculoDaExecucao: rawData.vinculoDaExecucao,')).toBe(1);
    expect(ocorrencias(rota, 'vinculoDaExecucao: rawData.vinculoDaExecucao,')).toBe(1);
    const tipos = ler('lib/ai-reviewer/review-request.ts');
    expect(ocorrencias(tipos, 'vinculoDaExecucao?: VinculoDaExecucao;')).toBe(1);
    expect(tipos).toContain("import type { VinculoDaExecucao } from './vinculo-execucao';");
  });

  test('formato inválido do campo ainda produz UM bloco, que declara não usar nada dele', async () => {
    const lista = elegivel();
    const { contexto, status } = await executar(payloadDaTela(lista, { estado: 'inventado' }));
    expect(status).toBe(200);
    expect(ocorrencias(contexto, MARCADOR_DO_BLOCO_DO_VINCULO)).toBe(1);
    expect(contexto).toContain('Vínculo recebido em formato NÃO reconhecido: nada dele foi usado.');
  });
});

// ---------------------------------------------------------------------------
// A redação de `a973c8f`, copiada da saída do handler ANTES de qualquer edição da rota, e não da
// saída de agora. ⚠ São ÂNCORAS ABSOLUTAS: passam no código anterior e sem o campo seguem passando.
// ---------------------------------------------------------------------------
const LISTA_ANTERIOR = [
  "## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)",
  "",
  "- ID: r1 | Email: Respondente r1 | CR: 5.0% | Status: CONFIÁVEL",
  "- ID: r2 | Email: Respondente r2 | CR: 5.0% | Status: CONFIÁVEL",
  "- ID: r3 | Email: Respondente r3 | CR: 5.0% | Status: CONFIÁVEL",
  "- ID: r4 | Email: Respondente r4 | CR: 5.0% | Status: CONFIÁVEL",
  "",
  "**TOTAL: 4 respondentes (esta lista é COMPLETA — não existem outros)**",
  "",
  "**AGREGAÇÃO POR MATRIZ: todos os 4 respondentes responderam à TOTALIDADE das comparações pareadas. Portanto N = 4 em TODAS as matrizes agregadas: BOCR, MAGNITUDE e as quatro de subcritérios (Benefícios, Oportunidades, Custos, Riscos).**",
  "⚠ NÃO existe divisão de respondentes por mérito, dimensão ou subcritério. Cada matriz agregada resulta dos 4 julgamentos, sem particionamento.",
  "",
  "- CONFIÁVEIS (CR ≤ 10%): 4",
  "- REVISAR (10–15%): 0",
  "- SUSPEITOS (15–20%): 0",
  "- CRÍTICOS (>20%): 0",
  "",
  "",
  "⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista. Se precisar referenciá-los, use o ID hash fornecido.",
].join('\n');
const EXCLUSAO_ANTERIOR = [
  "**⚠️ FILTRAGEM DE RESPONDENTES APLICADA:**",
  "- Amostra original coletada: 6 especialistas",
  "- Respondentes incluídos na análise: 5 especialistas",
  "- Respondentes excluídos: 1 (16.7% da amostra original)",
  "- Critério de exclusão: CR > 0.10 (Saaty, 1977)",
  "- Justificativa: A revisão individual dos julgamentos (Saaty, 2003) não foi viável após encerramento da coleta. Na AIJ por média geométrica, julgamentos individuais inconsistentes afetam a agregação do grupo (Forman & Peniwati, 1998). A exclusão foi aplicada ANTES da agregação.",
  "- Os dados de qualidade abaixo referem-se APENAS aos 5 respondentes incluídos.",
  "",
  "**INSTRUÇÃO PARA O REVISOR:** Você DEVE mencionar esta filtragem no RESUMO DA SUBMISSÃO e na seção de CONSISTÊNCIA, usando a cadeia de justificação: limiar (Saaty, 1977) + impossibilidade de revisão (Saaty, 2003) + impacto na agregação (Forman & Peniwati, 1998).",
].join('\n');
const EXCLUSAO = { totalCollected: 6, activeCount: 5, excludedCount: 1, reason: 'Filtragem por consistencia' };

/** As cinco frases da lista, uma a uma, na redação anterior (quatro respondentes). */
const ANTIGA = {
  cabecalho: '## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)',
  total: '**TOTAL: 4 respondentes (esta lista é COMPLETA — não existem outros)**',
  agregacao:
    '**AGREGAÇÃO POR MATRIZ: todos os 4 respondentes responderam à TOTALIDADE das comparações pareadas. Portanto N = 4 em TODAS as matrizes agregadas: BOCR, MAGNITUDE e as quatro de subcritérios (Benefícios, Oportunidades, Custos, Riscos).**\n' +
    '⚠ NÃO existe divisão de respondentes por mérito, dimensão ou subcritério. Cada matriz agregada resulta dos 4 julgamentos, sem particionamento.',
  regra: '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista. Se precisar referenciá-los, use o ID hash fornecido.',
};

// ============================================================ R7 (âncoras absolutas do texto ANTERIOR)
describe('R7: sem o campo a redação anterior fica byte a byte — âncoras ABSOLUTAS, escritas contra o texto de a973c8f', () => {
  // ⚠ As constantes estão acima, no escopo do módulo: a lista e a exclusão de `a973c8f`.
  test('a lista de respondentes, sem o campo, traz as frases antigas exatamente', async () => {
    const { contexto } = await executar(payloadDaTela(elegivel()));
    expect(contexto).toContain(LISTA_ANTERIOR);
  });

  test('o bloco de exclusão, sem o campo, traz as frases antigas exatamente', async () => {
    const { contexto } = await executar({ ...payloadDaTela(elegivel()), exclusionInfo: EXCLUSAO });
    expect(contexto).toContain(EXCLUSAO_ANTERIOR);
  });

  test('CONTRAEXEMPLO: as âncoras discriminam — um caractere a menos em qualquer frase reprova', async () => {
    const { contexto } = await executar({ ...payloadDaTela(elegivel()), exclusionInfo: EXCLUSAO });
    expect(contexto).toContain(LISTA_ANTERIOR);
    expect(contexto).toContain(EXCLUSAO_ANTERIOR);
    expect(contexto).not.toContain(LISTA_ANTERIOR.replace('não existem outros', 'nao existem outros'));
    expect(contexto).not.toContain(EXCLUSAO_ANTERIOR.replace('incluídos na análise', 'incluídos na analise'));
    expect(contexto).not.toContain(EXCLUSAO_ANTERIOR.replace('APENAS aos 5', 'APENAS aos 4'));
  });
});

// ============================================================ R1 e R2 (o CONTEXTO COMPLETO, com as frases antigas)
describe('R1 e R2: o contexto COMPLETO conferido, com as frases antigas, nos controles 5 / 4 / 4 e 3 / 4 / 3, nos estados sem comparação e nas linhas de exclusão', () => {
  /**
   * ⚠ Fragmentos da redação de `a973c8f` que NÃO podem sobreviver no contexto COM o campo. Cada um
   * ocorre UMA vez na redação anterior e nenhuma no resto do contexto (medido nas capturas de base,
   * antes de editar), então a ausência é conferida no contexto COMPLETO, e não no trecho da lista.
   */
  const FRASES_ANTIGAS = [
    'esta lista é COMPLETA — não existem outros',
    'responderam à TOTALIDADE das comparações pareadas',
    'Portanto N =',
    'em TODAS as matrizes agregadas',
    'NÃO existe divisão de respondentes por mérito',
    'sem particionamento',
    'Se precisar referenciá-los',
    '## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)',
    '**TOTAL: ',
  ];
  const frasesAntigasPresentes = (contexto: string) => FRASES_ANTIGAS.filter((f) => contexto.includes(f));

  const ids = (n: number) => Array.from({ length: n }, (_, i) => `r${i + 1}`);
  /** O preparo REAL da tela: `avaliados` no conjunto avaliado, `documento` em `includedRespondents`. */
  function cenario(avaliados: string[], documento: string[]) {
    return prepararVinculoDaTela({
      calculo: calculo(documento),
      respondentesAtivos: avaliados.map((id) => respondente(id, 0.05)),
      respostasAtivas: [],
    });
  }
  const executarCenario = (p: ReturnType<typeof cenario>, extra: Record<string, unknown> = {}) =>
    executar({ ...payloadDaTela(p.respondentesEnviados, p.vinculo, !p.omitirOverall), ...extra });

  // ---- as âncoras ABSOLUTAS da redação nova, escritas por leitura do que a rota deve dizer
  const TOTAL_COINCIDE_4 =
    '**TOTAL ENVIADO A VOCÊ: 4 respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado e COINCIDE, um a um, com os 4 incluídos no documento de cálculo.**';
  const TOTAL_DIFERE_3_4 =
    '**TOTAL ENVIADO A VOCÊ: 3 respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado, mas DIFERE dos 4 incluídos no documento de cálculo: 1 incluído(s) no documento e ausente(s) desta lista, 0 enviado(s) ausente(s) do documento (identificadores no bloco do vínculo, acima).**';
  const TOTAL_NAO_COMPARADO_4 =
    '**TOTAL ENVIADO A VOCÊ: 4 respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado; a relação entre ele e o conjunto incluído no cálculo NÃO foi comparada.**';
  const CALCULO_NOMEADO = (k: number) =>
    `**CÁLCULO — contagem registrada no documento de cálculo: ${k} respondentes INCLUÍDOS (tamanho do conjunto incluído; etapa: cálculo).** ` +
    '⚠ Esta contagem NÃO é medição da participação em cada célula das matrizes agregadas (BOCR, MAGNITUDE e as quatro de subcritérios): não a apresente como o N de matriz alguma.\n' +
    '⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N diferente a cada matriz. ' +
    'O portão de completude de A.21 é propriedade do percurso de cálculo examinado (ver o bloco do vínculo, acima), e não conferência desta execução.';
  const CALCULO_NAO_DISPONIVEL =
    '**CÁLCULO — a contagem de incluídos no documento de cálculo NÃO está disponível nesta requisição.** ' +
    'Nada se afirma aqui sobre quantos respondentes entraram no cálculo, nem sobre a participação em cada célula das matrizes agregadas.\n' +
    '⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N a nenhuma matriz.';
  const CALCULO_DECLARADO_SEM_LISTA =
    '**CÁLCULO — o vínculo declara 4 incluídos no documento de cálculo (contagem transportada; etapa: cálculo), mas SEM lista de incluídos utilizável para compará-la com os enviados.** ' +
    '⚠ Esta contagem NÃO é medição da participação em cada célula das matrizes agregadas: não a apresente como o N de matriz alguma.\n' +
    '⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N a nenhuma matriz.';
  const PORTAO =
    '- Portão de completude de A.21, propriedade do PERCURSO DE CÁLCULO EXAMINADO (o código da rota de cálculo), e não conferência desta execução: ' +
    'esse código rejeita a resposta que tem algum par de alguma matriz sem julgamento válido, e agrega cada célula só com julgamento existente, não pulado e com valor. ' +
    'Este vínculo de identificadores NÃO verificou os julgamentos daquela execução.';
  const REGRA_NOVA =
    '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista COMO PARTICIPANTES DA AVALIAÇÃO ENVIADA: nenhum deles contribuiu para os dados de qualidade acima, e para cada respondente da lista você usa o ID hash fornecido. ' +
    'Único caso permitido fora da lista: um identificador registrado no bloco do vínculo como DIVERGÊNCIA REGISTRADA (na avaliação e fora do documento, no documento e fora da avaliação, ou repetido) pode ser nomeado SOMENTE nesse papel, e nunca como quem contribuiu para os dados de qualidade.';

  test('as âncoras antigas são consistentes: cada frase antiga ocorre UMA vez na lista de a973c8f, e ANTIGA é feita delas', () => {
    for (const f of FRASES_ANTIGAS) expect(ocorrencias(LISTA_ANTERIOR, f)).toBe(1);
    for (const f of Object.values(ANTIGA)) expect(ocorrencias(LISTA_ANTERIOR, f)).toBe(1);
  });

  test('CONTROLE 5 / 4 / 4: enviados = incluídos e o estado é divergente — declara a COINCIDÊNCIA e CONSERVA a divergência anterior à restrição', async () => {
    const p = cenario(ids(5), ids(4));
    expect(p.vinculo.estado).toBe('divergente');
    expect(p.respondentesEnviados.map((r: any) => r.respondentId)).toEqual(ids(4));
    const { contexto, status } = await executarCenario(p);
    expect(status).toBe(200);

    expect(contexto).toContain(TOTAL_COINCIDE_4);
    expect(contexto).toContain('COINCIDEM, um a um (4 enviados, 4 incluídos). A divergência anterior à restrição, acima, permanece registrada.');
    // a divergência anterior à restrição está LÁ: 5 avaliados, e r5 na sobra da avaliação
    expect(contexto).toContain('- Contagens: incluídos no documento de cálculo: 4; avaliados antes de qualquer restrição: 5; enviados a você: 4');
    expect(contexto).toContain('- Na avaliação e NÃO no documento de cálculo: "r5" [fora-do-documento; campo respondentId]');
    // e o contexto NÃO diz que a lista enviada difere do cálculo
    expect(contexto).not.toContain('mas DIFERE dos');
    expect(contexto).not.toContain('DIFEREM (');
    expect(contexto).toContain(CALCULO_NOMEADO(4));
    // as contagens por status nomeiam a população e a etapa, e a primeira vem logo depois do cabeçalho
    expect(contexto).toContain(
      'Contagens por status, sobre os ENVIADOS a você (etapa: envio):\n- CONFIÁVEIS (CR ≤ 10%): 4\n- REVISAR (10–15%): 0\n- SUSPEITOS (15–20%): 0\n- CRÍTICOS (>20%): 0'
    );
    expect(contexto).toContain('## DADOS DO SISTEMA — RESPONDENTES ENVIADOS A VOCÊ (lista EXAUSTIVA do conjunto enviado)');
    expect(frasesAntigasPresentes(contexto)).toEqual([]);
  });

  test('CONTROLE 3 / 4 / 3: enviados DIFEREM dos incluídos — e o MESMO estado divergente dá a afirmação OPOSTA à do 5 / 4 / 4', async () => {
    const p534 = cenario(ids(5), ids(4));
    const p343 = cenario(ids(3), ids(4));
    expect(p343.vinculo.estado).toBe('divergente');
    expect(p343.vinculo.estado).toBe(p534.vinculo.estado); // ⚠ o estado NÃO distingue os dois cenários
    expect(p343.respondentesEnviados.map((r: any) => r.respondentId)).toEqual(ids(3));

    const c343 = (await executarCenario(p343)).contexto;
    expect(c343).toContain(TOTAL_DIFERE_3_4);
    expect(c343).toContain('DIFEREM (3 enviados, 4 incluídos): 1 incluído(s) no documento e ausente(s) dos enviados; 0 enviado(s) ausente(s) do documento; 0 identificador(es) repetido(s) nos enviados.');
    expect(c343).toContain('- No documento de cálculo e NÃO na avaliação: "r4"');
    expect(c343).toContain(CALCULO_NOMEADO(4));
    // ⚠ o defeito medido em M7: a lista enviada (3) apresentada como o N das matrizes
    expect(c343).not.toMatch(/\bN = \d/);
    expect(c343).not.toContain('COINCIDE');
    expect(frasesAntigasPresentes(c343)).toEqual([]);

    // as afirmações OPOSTAS, do mesmo estado
    const c534 = (await executarCenario(p534)).contexto;
    expect(c534).toContain('COINCIDE, um a um');
    expect(c343).not.toContain('COINCIDE, um a um');
    expect(c343).toContain('DIFERE dos');
    expect(c534).not.toContain('DIFERE dos');
  });

  test('CONTRAEXEMPLO do controle: deduzir a relação do ESTADO afirmaria DIFERE no 5 / 4 / 4, e o detector do teste enxerga isso', async () => {
    const real = (await executarCenario(cenario(ids(5), ids(4)))).contexto;
    // o texto que um "divergente ⇒ diferem" geraria no 5 / 4 / 4
    const doEstado = real.replace(TOTAL_COINCIDE_4, TOTAL_DIFERE_3_4.replace('3 respondentes', '4 respondentes'));
    expect(doEstado).not.toBe(real);
    const afirmaDiferenca = (c: string) => c.includes('mas DIFERE dos');
    expect(afirmaDiferenca(real)).toBe(false);
    expect(afirmaDiferenca(doEstado)).toBe(true);
  });

  test.each([
    ['indisponivel', (l: any[]) => vinculoDoEstado('indisponivel', l)],
    ['invalido', (l: any[]) => vinculoDoEstado('invalido', l)],
    ['formato não reconhecido', () => ({ estado: 'inventado' })],
  ] as const)('%s: NENHUMA contagem de incluídos, nenhuma participação por célula, e o contexto diz que a contagem não está disponível', async (_nome, montar) => {
    const lista = elegivel();
    const { contexto, status } = await executar(payloadDaTela(lista, montar(lista)));
    expect(status).toBe(200);

    expect(contexto).toContain(TOTAL_NAO_COMPARADO_4);
    expect(contexto).toContain(CALCULO_NAO_DISPONIVEL);
    // o que NÃO pode haver: contagem de incluídos, coincidência ou diferença afirmadas, o portão como propriedade do percurso
    const afirmaIncluidos = (c: string) => /\d+ respondentes INCLUÍDOS|COINCIDE|DIFERE|INCLUÍDOS \(tamanho/.test(c);
    expect(afirmaIncluidos(contexto)).toBe(false);
    expect(contexto).not.toContain('Portão de completude de A.21');
    expect(frasesAntigasPresentes(contexto)).toEqual([]);

    // CONTRAEXEMPLO: afirmar a partir da contagem ENVIADA (o defeito de M7) seria flagrado pelo mesmo detector
    const mutante = contexto.replace(CALCULO_NAO_DISPONIVEL, CALCULO_NOMEADO(4));
    expect(mutante).not.toBe(contexto);
    expect(afirmaIncluidos(mutante)).toBe(true);
    // e a redação de a973c8f, sem o campo, é a que afirmava "N = 4 em TODAS as matrizes" mesmo aqui
    const legado = (await executar(payloadDaTela(lista))).contexto;
    expect(legado).toContain('Portanto N = 4 em TODAS as matrizes agregadas');
  });

  test('vinculado com a lista de incluídos MALFORMADA: a contagem é a DECLARADA no bloco, sem lista para compará-la — nem "não disponível", nem coincidência', async () => {
    const lista = elegivel();
    const v = { ...vinculoDoEstado('vinculado', lista), incluidosNoDocumento: 'nao-e-lista' };
    const { contexto, status } = await executar(payloadDaTela(lista, v));
    expect(status).toBe(200);
    expect(contexto).toContain('incluídos no documento de cálculo: 4;'); // o bloco a imprime
    expect(contexto).toContain(TOTAL_NAO_COMPARADO_4);
    expect(contexto).toContain(CALCULO_DECLARADO_SEM_LISTA);
    expect(contexto).toContain('comparação NÃO realizada (não há lista de incluídos utilizável nesta requisição)');
    expect(contexto).toContain('contagem declarada no vínculo, SEM lista de incluídos utilizável para compará-la');
    // CONTRAEXEMPLO: "não disponível" contradiria o "4" impresso pelo próprio bloco
    expect(contexto).not.toContain('NÃO está disponível nesta requisição');
    expect(contexto).not.toContain('contagem NÃO disponível nesta requisição');
    expect(contexto).not.toMatch(/COINCIDE|DIFERE|\d+ respondentes INCLUÍDOS/);
    expect(contexto).not.toContain('Portão de completude de A.21');
    expect(frasesAntigasPresentes(contexto)).toEqual([]);
  });

  test.each([['vinculado'], ['divergente']] as const)(
    '%s: a contagem de incluídos é NOMEADA, não é promovida a participação por célula, e o portão de A.21 é propriedade do PERCURSO, e não conclusão do vínculo',
    async (estado) => {
      const lista = elegivel();
      const v = vinculoDoEstado(estado, lista);
      const { contexto } = await executar(payloadDaTela(lista, v));
      const k = estado === 'vinculado' ? 4 : 5; // divergente: r1..r4 + a sobra do documento
      expect(contexto).toContain(CALCULO_NOMEADO(k));
      expect(contexto).toContain(PORTAO);
      expect(ocorrencias(contexto, PORTAO)).toBe(1);
      // a contagem NÃO vira o N de célula: nenhum "N = " e nenhuma participação plena afirmada
      expect(contexto).not.toMatch(/\bN = \d/);
      expect(contexto).not.toContain('TOTALIDADE das comparações');
      // toda menção a "verificou" está NEGADA: o vínculo de identificadores não verificou os julgamentos
      expect(contexto.match(/(NÃO )?verificou/g)).toEqual(['NÃO verificou']);
      // CONTRAEXEMPLO: o detector flagra o portão apresentado como conclusão do vínculo
      const comoConclusao = contexto.replace('Este vínculo de identificadores NÃO verificou', 'Este vínculo de identificadores verificou');
      expect(comoConclusao.match(/(NÃO )?verificou/g)).toEqual(['verificou']);
      // o lembrete da divergência anterior à restrição só acompanha a COINCIDÊNCIA em `divergente` (o 5 / 4 / 4);
      // aqui, sem restrição, os enviados são os avaliados e não há lembrete em nenhum dos dois
      expect(contexto).not.toContain('A divergência anterior à restrição');
      expect(frasesAntigasPresentes(contexto)).toEqual([]);
    }
  );

  test('a contradição entre o que o vínculo declara e o que a lista traz é CONSERVADA no contexto, sem escolher um em silêncio', async () => {
    const lista = elegivel();
    const v = vinculoDoEstado('vinculado', lista) as any;
    const { contexto } = await executar(payloadDaTela(lista, { ...v, enviados: [...v.enviados, 'r9'] }));
    expect(contexto).toContain('⚠ O vínculo declara 5 enviados, e esta lista traz 4: os dois valores se conservam.');
    const comIncluidos = await executar(payloadDaTela(lista, { ...v, cobertura: { ...v.cobertura, incluidosNoDocumento: 7 } }));
    expect(comIncluidos.contexto).toContain('⚠ O bloco declara 7 incluídos em "Contagens", e a lista de incluídos do vínculo traz 4: os dois valores se conservam.');
  });

  // ---- :875 e :879
  describe('as linhas de exclusão (`route.ts:875` e `:879`): cada contagem nomeia população e etapa, e a última usa a população ENVIADA', () => {
    const AMOSTRA =
      '- Amostra original coletada (população: respostas carregadas pela tela, finalizadas, de respondentes cadastrados e uma por respondente; etapa: coleta): 6 especialistas';
    const RESTANTES =
      '- Restantes após a exclusão do gestor (população: respondentes não excluídos; etapa: exclusão do gestor, anterior a qualquer restrição do vínculo): 5 especialistas';
    const EXCLUIDOS = '- Respondentes excluídos pelo gestor (população: excluídos; etapa: exclusão do gestor): 1 (16.7% da amostra original)';
    const QUALIDADE =
      '- Os dados de qualidade abaixo referem-se APENAS aos 4 respondentes ENVIADOS a você (população: enviados; etapa: envio; contagem da lista de respondentes abaixo).';

    test('5 / 4 / 4 com exclusão: 5 restantes (antes da restrição) e 4 enviados, e `:879` fala dos 4', async () => {
      const { contexto } = await executarCenario(cenario(ids(5), ids(4)), { exclusionInfo: EXCLUSAO });
      expect(contexto).toContain(AMOSTRA);
      expect(contexto).toContain(RESTANTES);
      expect(contexto).toContain(EXCLUIDOS);
      expect(contexto).toContain(QUALIDADE);
      // a redação antiga, com o mesmo cenário, dizia "APENAS aos 5" sobre dados calculados sobre 4
      expect(contexto).not.toContain('referem-se APENAS aos 5');
      expect(contexto).not.toContain('Respondentes incluídos na análise');
      expect(contexto).not.toContain('- Respondentes excluídos: 1');
      expect(contexto).toContain('**TOTAL ENVIADO A VOCÊ: 4 respondentes');
      expect(frasesAntigasPresentes(contexto)).toEqual([]);
    });

    test('CONTRAEXEMPLO: usar `activeCount` em `:879` produz outra linha, que o contexto NÃO contém', async () => {
      const { contexto } = await executarCenario(cenario(ids(5), ids(4)), { exclusionInfo: EXCLUSAO });
      const comActiveCount = linhasDeExclusaoComVinculo(EXCLUSAO, '16.7', EXCLUSAO.activeCount).qualidade;
      expect(comActiveCount).toContain('APENAS aos 5 respondentes ENVIADOS');
      expect(contexto).not.toContain(comActiveCount);
      // e a linha CERTA é a da população enviada, calculada pelo módulo com a lista
      expect(linhasDeExclusaoComVinculo(EXCLUSAO, '16.7', 4).qualidade).toBe(QUALIDADE);
    });

    test('nos estados sem comparação a exclusão também nomeia população e etapa, e `:879` usa a lista enviada', async () => {
      const lista = elegivel();
      for (const v of [vinculoDoEstado('indisponivel', lista), vinculoDoEstado('invalido', lista), { estado: 'inventado' }]) {
        const { contexto } = await executar({ ...payloadDaTela(lista, v), exclusionInfo: EXCLUSAO });
        expect(contexto).toContain(RESTANTES);
        expect(contexto).toContain(QUALIDADE);
        expect(contexto).not.toContain('referem-se APENAS aos 5');
      }
    });

    test('a restrição ESVAZIA a lista enviada: a linha não afirma lista abaixo, e a seção da lista segue a do prompt sem lista', async () => {
      const p = cenario(['r1', 'r2'], ['r7', 'r8']); // nenhum avaliado está no documento
      expect(p.respondentesEnviados).toEqual([]);
      const { contexto, status } = await executarCenario(p, { exclusionInfo: EXCLUSAO });
      expect(status).toBe(200);
      expect(contexto).toContain('- Nenhum respondente foi ENVIADO a você (população: enviados; etapa: envio; contagem: 0): a lista de respondentes abaixo não existe.');
      expect(contexto).not.toContain('referem-se APENAS aos 0');
      expect(contexto).toContain('⚠️ Lista individual de respondentes não disponível.');
      expect(contexto).toContain(RESTANTES);
    });

    test('sem o campo, a exclusão fica com a redação anterior, byte a byte (âncora absoluta de R7)', async () => {
      const { contexto } = await executar({ ...payloadDaTela(elegivel()), exclusionInfo: EXCLUSAO });
      expect(contexto).toContain(EXCLUSAO_ANTERIOR);
      expect(contexto).not.toContain('(população: ');
    });
  });

  // ---- :953
  describe('a regra de menção (`route.ts:953`): distingue o PARTICIPANTE da avaliação enviada da DIVERGÊNCIA REGISTRADA', () => {
    /** A regra antiga proíbe, sem exceção, citar quem está fora da lista, e o bloco NOMEIA quem está fora. */
    const contradiz = (c: string) =>
      c.includes(ANTIGA.regra) && /(Na avaliação e NÃO no documento de cálculo|No documento de cálculo e NÃO na avaliação): "[^"]+"/.test(c);

    test('CAPTURA do contexto 5 / 4 / 4: o bloco nomeia r5 como divergência, e a regra permite nomeá-lo SOMENTE nesse papel', async () => {
      const { contexto } = await executarCenario(cenario(ids(5), ids(4)));
      expect(contexto).toContain('- Na avaliação e NÃO no documento de cálculo: "r5" [fora-do-documento; campo respondentId]');
      expect(contexto).toContain(REGRA_NOVA);
      // ⚠ o prompt tem outras linhas "⚠️ REGRA:"; a da LISTA é a que começa por esta frase, e é uma só
      expect(ocorrencias(contexto, '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista')).toBe(1);
      expect(contexto).not.toContain(ANTIGA.regra);
      expect(contexto).not.toContain('Se precisar referenciá-los');
      // os dois papéis, distintos
      expect(contexto).toContain('COMO PARTICIPANTES DA AVALIAÇÃO ENVIADA');
      expect(contexto).toContain('DIVERGÊNCIA REGISTRADA');
      expect(contexto).toContain('SOMENTE nesse papel');
      expect(contradiz(contexto)).toBe(false);
    });

    test('CONTRAEXEMPLO: a regra ANTIGA com o bloco presente é a contradição de M9, e o detector a enxerga', async () => {
      const { contexto } = await executarCenario(cenario(ids(5), ids(4)));
      const comRegraAntiga = contexto.replace(REGRA_NOVA, ANTIGA.regra);
      expect(comRegraAntiga).not.toBe(contexto);
      expect(contradiz(comRegraAntiga)).toBe(true);
      expect(contradiz(contexto)).toBe(false);
      // sem o campo não há bloco que nomeie ninguém, então a regra antiga sozinha não contradiz
      const semCampo = (await executar(payloadDaTela(elegivel()))).contexto;
      expect(semCampo).toContain(ANTIGA.regra);
      expect(contradiz(semCampo)).toBe(false);
    });

    test('nos quatro estados e no formato não reconhecido a regra é a NOVA, e a antiga não sobrevive', async () => {
      const lista = elegivel();
      for (const v of [...ESTADOS.map((e) => vinculoDoEstado(e, lista)), { estado: 'inventado' }]) {
        const { contexto } = await executar(payloadDaTela(lista, v));
        expect(contexto).toContain(REGRA_NOVA);
        expect(contexto).not.toContain(ANTIGA.regra);
        expect(contradiz(contexto)).toBe(false);
      }
    });
  });

  // ---- o inventário das contagens do contexto
  describe('o inventário das contagens de respondentes do contexto completo: cada uma nomeia a população, ou está entre as cobertas pela chave, que é declarada', () => {
    const CANDIDATA = /respondentes|especialistas|enviados|Enviados|avaliados|incluídos|INCLUÍDOS|Respostas|respostas|N = |Restantes|Amostra original|excluídos/;
    const temNumero = (l: string) => /\d/.test(l.replace(/\bA\.\d+\b/g, '')); // "A.21" é nome de tarefa, e não contagem
    const candidatas = (contexto: string) => contexto.split('\n').filter((l) => !l.startsWith('- ID:') && temNumero(l) && CANDIDATA.test(l));

    /** Nomeiam a população NO PRÓPRIO TEXTO: rótulo `etapa:` ou os nomes dos conjuntos do vínculo. */
    const rotulada = (l: string) =>
      /etapa:/.test(l) ||
      /^- (Estado do vínculo|Contagens: incluídos no documento de cálculo|Cobertura enviada|Relação entre os ENVIADOS)/.test(l);
    /** ⚠ Cobertas SÓ pela chave de leitura, e declaradas: nenhuma reescrita neste estágio. */
    const coberta = (l: string) =>
      /^- Total: \d+ especialistas$/.test(l) ||
      /^- Respostas (CONFIÁVEIS|para REVISAR|SUSPEITAS|CRÍTICAS)/.test(l) ||
      /^\*\*Taxa de Validade Geral:\*\*/.test(l) ||
      /^- Respostas totais: \d+$/.test(l);

    test('COM o campo, 5 / 4 / 4 com exclusão: nenhuma contagem fica sem população, e as cobertas só pela chave são exatamente dez', async () => {
      const { contexto } = await executarCenario(cenario(ids(5), ids(4)), { exclusionInfo: EXCLUSAO });
      const todas = candidatas(contexto);
      const semRotulo = todas.filter((l) => !rotulada(l) && !coberta(l));
      expect(semRotulo).toEqual([]);
      const soChave = todas.filter((l) => !rotulada(l) && coberta(l));
      expect(soChave.length).toBe(10); // Total + 4 status + Taxa + 4 "Respostas totais" por dimensão
      expect(todas.length - soChave.length).toBe(11); // e onze nomeiam a população no próprio texto: a décima primeira é a linha da lista APRESENTADA (R4)
      expect(ocorrencias(contexto, '- Lista de respondentes APRESENTADA a você (4 identificador(es)')).toBe(1);
      // a chave existe, UMA vez, e diz a que população cada uma dessas contagens se refere
      expect(ocorrencias(contexto, '- Chave de leitura das contagens deste contexto')).toBe(1);
      expect(contexto).toContain('a lista de respondentes, as contagens por status e as distribuições e taxas de qualidade deste contexto referem-se a eles');
      expect(contexto).toContain('os totais por dimensão BOCR de "Estatísticas por Dimensão" NÃO medem a participação por dimensão e NÃO são o N de matriz alguma');
    });

    test('CONTRAEXEMPLO: SEM o campo, o mesmo inventário acha as contagens da redação anterior SEM população e SEM chave', async () => {
      const { contexto } = await executar({ ...payloadDaTela(elegivel()), exclusionInfo: EXCLUSAO });
      const todas = candidatas(contexto);
      const semRotulo = todas.filter((l) => !rotulada(l) && !coberta(l));
      expect(semRotulo.length).toBe(7);
      expect(semRotulo.join('\n')).toContain('Portanto N = 4 em TODAS as matrizes agregadas');
      expect(semRotulo.join('\n')).toContain('APENAS aos 5 respondentes incluídos');
      expect(contexto).not.toContain('Chave de leitura das contagens');
    });
  });
});

// ============================================================ R4 (a lista APRESENTADA, pelo tratador REAL)
describe('R4: o contexto compara a lista APRESENTADA com as duas declaradas, e a coincidência só sai quando os TRÊS conjuntos correspondem um a um', () => {
  // ---- os elementos da lista apresentada, como a tela os monta
  /** SEM `respondentId` nem `id`: o `displayId` da rota é GERADO pela posição (`hash_NNN`). */
  const semId = () => ({ name: 'sem identificador', cr: 0.05, metrics: { avgCR: 0.05 }, status: 'CONFIÁVEL' });
  /** O identificador em UM só dos dois campos. */
  const soEm = (campo: 'respondentId' | 'id', id: string) => ({
    [campo]: id,
    name: `Respondente ${id}`,
    cr: 0.05,
    metrics: { avgCR: 0.05 },
    status: 'CONFIÁVEL',
  });
  const apresentar = (...ids: string[]) => ids.map((id) => respondente(id, 0.05));
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `r${i + 1}`);

  /** O preparo REAL da tela: `avaliados` no conjunto avaliado, `documento` em `includedRespondents`. */
  const preparo = (avaliados: string[], documento: string[]) =>
    prepararVinculoDaTela({
      calculo: calculo(documento),
      respondentesAtivos: avaliados.map((id) => respondente(id, 0.05)),
      respostasAtivas: [],
    });

  /** O vínculo REAL de `vinculado` sobre r1..r4, com as duas listas DECLARADAS trocadas e as contagens coerentes com elas. */
  function vinculoCom(enviados: string[], incluidos: string[]): any {
    const base: any = vinculoDoEstado('vinculado', elegivel());
    return {
      ...base,
      estado: enviados.join('|') === incluidos.join('|') ? 'vinculado' : 'divergente',
      enviados,
      incluidosNoDocumento: incluidos,
      cobertura: { ...base.cobertura, enviados: enviados.length, incluidosNoDocumento: incluidos.length },
    };
  }

  // ---- a região: o bloco do vínculo e TODAS as frases ao redor dele
  /** Da abertura da seção até o fim da regra de menção da lista. */
  const regiao = (contexto: string): string => {
    const inicio = contexto.indexOf('## Amostra e Qualidade Geral');
    const regra = contexto.indexOf('⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista');
    expect(inicio).toBeGreaterThan(-1);
    expect(regra).toBeGreaterThan(inicio);
    return contexto.slice(inicio, contexto.indexOf('\n', regra));
  };
  const coincidencias = (t: string): number => (t.match(/coincid/gi) ?? []).length;
  const trocar = (texto: string, de: string, para: string): string => {
    expect(ocorrencias(texto, de)).toBe(1);
    return texto.replace(de, () => para);
  };

  /** Executa o tratador REAL e devolve o contexto COMPLETO e a região. */
  async function executarR4(elementos: any[], vinculo: unknown) {
    const { contexto, status } = await executar(payloadDaTela(elementos, vinculo));
    expect(status).toBe(200);
    return { contexto, r: regiao(contexto) };
  }

  // ---- o que o MODELO lê, e os atalhos que uma comparação ERRADA usaria
  /** O `displayId` que o modelo LÊ, pela expressão da rota: o valor, sem a origem. */
  const oModeloLe = (elementos: any[]): string[] =>
    elementos.map((r, i) => String(r.respondentId || r.id || `hash_${i.toString().padStart(3, '0')}`));
  const chave = (xs: string[]) => [...xs].sort().join('|');
  const conjunto = (xs: string[]) => [...new Set(xs)].sort().join('|');
  type Atalho = (P: string[], E: string[], I: string[]) => boolean;
  const ATALHOS: Record<string, Atalho> = {
    soContagem: (P, E, I) => P.length === E.length && E.length === I.length,
    soEnviados: (P, E) => chave(P) === chave(E),
    soIncluidos: (P, _E, I) => chave(P) === chave(I),
    porConjunto: (P, E, I) => conjunto(P) === conjunto(E) && conjunto(E) === conjunto(I),
    /** Compara o TEXTO dos identificadores exibidos, com multiplicidade: não sabe de onde cada um veio. */
    porTexto: (P, E, I) => chave(P) === chave(E) && chave(E) === chave(I),
    /** Infere a origem PELA GRAFIA: trata todo `hash_NNN` como gerado. */
    porRegex: (P, E, I) => !P.some((t) => /^hash_\d{3}$/.test(t)) && chave(P) === chave(E) && chave(E) === chave(I),
  };

  // ---- a redação, escrita à mão
  const LINHA_RELACAO =
    '- Relação entre os ENVIADOS e os INCLUÍDOS no documento de cálculo (comparação dos dois conjuntos, com multiplicidade; não deduzida do estado): ';
  const REL_COINCIDEM_4 = `${LINHA_RELACAO}COINCIDEM, um a um (4 enviados, 4 incluídos).`;
  const REL_DECLARADOS = (n: number) =>
    `${LINHA_RELACAO}os dois conjuntos DECLARADOS têm os mesmos identificadores, um a um (${n} enviados declarados, ${n} incluídos); a correspondência da lista APRESENTADA a você está na linha seguinte.`;
  const REL_DIFEREM_3_4 =
    `${LINHA_RELACAO}DIFEREM (3 enviados, 4 incluídos): 1 incluído(s) no documento e ausente(s) dos enviados; 0 enviado(s) ausente(s) do documento; 0 identificador(es) repetido(s) nos enviados.`;
  const SUFIXO_DECLARADOS = ' Este é o confronto dos dois conjuntos DECLARADOS; a lista APRESENTADA a você está na linha seguinte.';

  const PAINEL = '  - Cobre o conjunto do DOCUMENTO de cálculo; identifica, e não verifica.';
  const PAINEL_COINCIDE = `${PAINEL} O conjunto enviado coincide com o do documento.`;
  const PAINEL_DIFERE = `${PAINEL} ⚠ NÃO descreve o conjunto enviado a você, que difere do conjunto do documento.`;
  const PAINEL_NAO_CONFIRMA = `${PAINEL} Não se pode afirmar que descreve o conjunto enviado a você: a lista apresentada tem os identificadores dos incluídos, mas difere dos enviados declarados (ver a linha da lista APRESENTADA, acima).`;

  const COBERTURA = '- Cobertura enviada: o conjunto avaliado foi RESTRINGIDO aos identificadores presentes no documento de cálculo, e ';
  const COBERTURA_CONFERE = (n: number) => `${COBERTURA}a lista de respondentes que segue é a dos ${n} enviados.`;
  const COBERTURA_DIFERE = (n: number) =>
    `${COBERTURA}o vínculo declara que a lista de respondentes que segue é a dos ${n} enviados (a linha da lista APRESENTADA, abaixo, compara essa declaração com a lista).`;

  const ABERTURA = (n: number) =>
    `**TOTAL ENVIADO A VOCÊ: ${n} respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado`;
  const TOTAL_COINCIDE_4 = `${ABERTURA(4)} e COINCIDE, um a um, com os 4 incluídos no documento de cálculo.**`;
  const DIFERE_DOS_INCLUIDOS = (k: number, faltam: number, sobram: number) =>
    `, mas DIFERE dos ${k} incluídos no documento de cálculo: ${faltam} incluído(s) no documento e ausente(s) desta lista, ${sobram} enviado(s) ausente(s) do documento (identificadores no bloco do vínculo, acima).**`;
  const TAMBEM_DIFERE_DOS_ENVIADOS = (k: number, faltam: number, sobram: number) =>
    `\n⚠ A lista também DIFERE dos ${k} enviados declarados no vínculo: ${faltam} enviado(s) declarado(s) ausente(s) desta lista, ${sobram} apresentado(s) ausente(s) dos enviados declarados (identificadores no bloco do vínculo, acima).`;
  const RESSALVA = (declarados: number, n: number) =>
    `\n⚠ O vínculo declara ${declarados} enviados, e esta lista traz ${n}: os dois valores se conservam.`;
  const TOTAL_2 = ABERTURA(3) + DIFERE_DOS_INCLUIDOS(4, 1, 0) + TAMBEM_DIFERE_DOS_ENVIADOS(4, 1, 0) + RESSALVA(4, 3);
  const TOTAL_3 = ABERTURA(4) + DIFERE_DOS_INCLUIDOS(4, 1, 1) + TAMBEM_DIFERE_DOS_ENVIADOS(4, 1, 1);
  const TOTAL_5 = ABERTURA(3) + DIFERE_DOS_INCLUIDOS(4, 1, 0);
  const TOTAL_6 =
    `${ABERTURA(4)}; ela tem os mesmos identificadores dos 4 incluídos no documento de cálculo, mas DIFERE dos 3 enviados declarados no vínculo: 0 enviado(s) declarado(s) ausente(s) desta lista, 1 apresentado(s) ausente(s) dos enviados declarados (identificadores no bloco do vínculo, acima).**` +
    RESSALVA(3, 4);
  const TOTAL_7 = ABERTURA(3) + DIFERE_DOS_INCLUIDOS(3, 1, 1) + TAMBEM_DIFERE_DOS_ENVIADOS(3, 1, 1);

  const REGRA_R2 =
    '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista COMO PARTICIPANTES DA AVALIAÇÃO ENVIADA: nenhum deles contribuiu para os dados de qualidade acima, e para cada respondente da lista você usa o ID hash fornecido. ' +
    'Único caso permitido fora da lista: um identificador registrado no bloco do vínculo como DIVERGÊNCIA REGISTRADA (na avaliação e fora do documento, no documento e fora da avaliação, ou repetido) pode ser nomeado SOMENTE nesse papel, e nunca como quem contribuiu para os dados de qualidade.';
  const ACRESCIMO_R4 =
    ' Também pode ser nomeado, SOMENTE nesse papel, um identificador que o vínculo declara (nos enviados declarados ou nos incluídos) e que está ausente da lista apresentada, como registrado na linha "Lista de respondentes APRESENTADA" do bloco do vínculo.';

  /** Os TRÊS conjuntos, cada um com a origem: escritos aqui, à mão, e não tirados do módulo. */
  const TRES_CONJUNTOS = (apresentada: string, nApresentada: number, enviados: string[], incluidos: string[]): string[] => {
    const citar = (xs: string[]) => `[${xs.map((x) => `"${x}"`).join(', ')}]`;
    return [
      `apresentada ${apresentada} (${nApresentada}; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio)`,
      `enviados declarados ${citar(enviados)} (${enviados.length}; vinculoDaExecucao.enviados; etapa: envio)`,
      `incluídos ${citar(incluidos)} (${incluidos.length}; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo)`,
    ];
  };

  /** ⚠ As linhas da lista APRESENTADA, capturadas do tratador REAL nos sete pedidos (o pedido 4b e o 4c dão a mesma do 1). */
  const APRESENTADA = {
    c1:
      '- Lista de respondentes APRESENTADA a você (4 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): COINCIDE, um a um, com os 4 enviados declarados (etapa: envio) e com os 4 incluídos no documento de cálculo (etapa: cálculo).',
    c2:
      '- Lista de respondentes APRESENTADA a você (3 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: apresentada ["r1", "r2", "r3"] (3; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); enviados declarados ["r1", "r2", "r3", "r4"] (4; vinculoDaExecucao.enviados; etapa: envio); incluídos ["r1", "r2", "r3", "r4"] (4; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r4"]; 0 ocorrência(s) só na lista apresentada (nenhuma). Contra os enviados declarados: 1 ocorrência(s) só nos enviados declarados ["r4"]; 0 ocorrência(s) só na lista apresentada (nenhuma). Repetidos na lista apresentada: nenhum. Identidade por posição na lista apresentada: nenhuma. Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: nenhum.',
    c3:
      '- Lista de respondentes APRESENTADA a você (4 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: apresentada ["r1", "r2", "r3", "r9"] (4; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); enviados declarados ["r1", "r2", "r3", "r4"] (4; vinculoDaExecucao.enviados; etapa: envio); incluídos ["r1", "r2", "r3", "r4"] (4; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r4"]; 1 ocorrência(s) só na lista apresentada ["r9"]. Contra os enviados declarados: 1 ocorrência(s) só nos enviados declarados ["r4"]; 1 ocorrência(s) só na lista apresentada ["r9"]. Repetidos na lista apresentada: nenhum. Identidade por posição na lista apresentada: nenhuma. Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: ["r9"].',
    c4a:
      '- Lista de respondentes APRESENTADA a você (4 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: apresentada ["hash_000" (gerado por posição), "r2", "r3", "r4"] (4; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); enviados declarados ["hash_000", "r2", "r3", "r4"] (4; vinculoDaExecucao.enviados; etapa: envio); incluídos ["hash_000", "r2", "r3", "r4"] (4; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). Contra os incluídos: 1 ocorrência(s) só nos incluídos ["hash_000"]; 0 ocorrência(s) só na lista apresentada (nenhuma). Contra os enviados declarados: 1 ocorrência(s) só nos enviados declarados ["hash_000"]; 0 ocorrência(s) só na lista apresentada (nenhuma). Repetidos na lista apresentada: nenhum. Identidade por posição na lista apresentada: "hash_000" (posição 0 da lista, contada a partir de 0), GERADA pelo fallback posicional: não corresponde a ninguém, mesmo que o mesmo texto conste dos conjuntos declarados. Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: nenhum.',
    c5:
      '- Lista de respondentes APRESENTADA a você (3 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: apresentada ["r1", "r2", "r3"] (3; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); enviados declarados ["r1", "r2", "r3"] (3; vinculoDaExecucao.enviados; etapa: envio); incluídos ["r1", "r2", "r3", "r4"] (4; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r4"]; 0 ocorrência(s) só na lista apresentada (nenhuma). Contra os enviados declarados: 0 ocorrência(s) só nos enviados declarados (nenhuma); 0 ocorrência(s) só na lista apresentada (nenhuma). Repetidos na lista apresentada: nenhum. Identidade por posição na lista apresentada: nenhuma. Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: nenhum.',
    c6:
      '- Lista de respondentes APRESENTADA a você (4 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: apresentada ["r1", "r2", "r3", "r4"] (4; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); enviados declarados ["r1", "r2", "r3"] (3; vinculoDaExecucao.enviados; etapa: envio); incluídos ["r1", "r2", "r3", "r4"] (4; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). Contra os incluídos: 0 ocorrência(s) só nos incluídos (nenhuma); 0 ocorrência(s) só na lista apresentada (nenhuma). Contra os enviados declarados: 0 ocorrência(s) só nos enviados declarados (nenhuma); 1 ocorrência(s) só na lista apresentada ["r4"]. Repetidos na lista apresentada: nenhum. Identidade por posição na lista apresentada: nenhuma. Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: nenhum.',
    c7:
      '- Lista de respondentes APRESENTADA a você (3 identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: apresentada ["r1", "r1", "r2"] (3; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); enviados declarados ["r1", "r2", "r2"] (3; vinculoDaExecucao.enviados; etapa: envio); incluídos ["r1", "r2", "r2"] (3; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r2"]; 1 ocorrência(s) só na lista apresentada ["r1"]. Contra os enviados declarados: 1 ocorrência(s) só nos enviados declarados ["r2"]; 1 ocorrência(s) só na lista apresentada ["r1"]. Repetidos na lista apresentada: "r1" (2 ocorrências). Identidade por posição na lista apresentada: nenhuma. Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: nenhum.',
  };

  // ============================================================ os sete pedidos
  test('1. apresentada r1..r4, declarados r1..r4: a coincidência é afirmada, nos QUATRO sítios, e só neles', async () => {
    const { contexto, r } = await executarR4(apresentar(...IDS), vinculoCom(IDS, IDS));
    expect(r).toContain(REL_COINCIDEM_4);
    expect(r).toContain(APRESENTADA.c1);
    expect(r).toContain(PAINEL_COINCIDE);
    expect(r).toContain(TOTAL_COINCIDE_4);
    expect(r).toContain(COBERTURA_CONFERE(4));
    expect(coincidencias(r)).toBe(4); // relação, linha da lista apresentada, resumo do painel e TOTAL: e mais nenhum
    expect(coincidencias(contexto)).toBe(4); // medido: nenhum sítio do contexto fora da região tem o radical
    // nada da discrepância, e a regra de menção é a de R2, sem acréscimo
    expect(r).not.toContain('DIFERE');
    expect(r).not.toContain('Os três conjuntos se conservam');
    expect(r).toContain(REGRA_R2);
    expect(r).not.toContain('Também pode ser nomeado');
    // a lista que o modelo LÊ
    for (const id of IDS) expect(r).toContain(`- ID: ${id} | Email: Respondente ${id} | CR: 5.0% | Status: CONFIÁVEL`);
    // CONTRAEXEMPLO: o detector discrimina — o mesmo pedido, com r4 fora da lista apresentada, não tem nenhum dos quatro sítios
    const sem = await executarR4(apresentar('r1', 'r2', 'r3'), vinculoCom(IDS, IDS));
    expect(coincidencias(sem.r)).toBe(0);
  });

  test('2. apresentada r1..r3, declarados r1..r4: NENHUMA coincidência em sítio algum, e os TRÊS conjuntos se conservam, cada um com a origem', async () => {
    const elementos = apresentar('r1', 'r2', 'r3');
    const { contexto, r } = await executarR4(elementos, vinculoCom(IDS, IDS));
    expect(coincidencias(r)).toBe(0);
    expect(coincidencias(contexto)).toBe(0);
    // os três conjuntos, cada um com a origem: uma vez cada
    for (const s of TRES_CONJUNTOS('["r1", "r2", "r3"]', 3, IDS, IDS)) expect(ocorrencias(r, s)).toBe(1);
    expect(r).toContain(APRESENTADA.c2);
    // a discrepância é NOMEADA: r4 só nos declarados, nos dois confrontos
    expect(r).toContain('Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r4"]; 0 ocorrência(s) só na lista apresentada (nenhuma).');
    expect(r).toContain('Contra os enviados declarados: 1 ocorrência(s) só nos enviados declarados ["r4"]; 0 ocorrência(s) só na lista apresentada (nenhuma).');
    // as frases ao redor: a relação dos DECLARADOS sem o radical, o resumo do painel, a cobertura, o TOTAL e a regra
    expect(r).toContain(REL_DECLARADOS(4));
    expect(r).toContain(PAINEL_DIFERE);
    expect(r).toContain(COBERTURA_DIFERE(4));
    expect(r).toContain(TOTAL_2);
    expect(r).toContain(REGRA_R2 + ACRESCIMO_R4);
    // a lista mostra TRÊS
    expect(ocorrencias(r, '- ID: ')).toBe(3);

    // CONTRAEXEMPLO: o texto de bfa7e81, capturado do tratador real ANTES de editar, para este mesmo pedido, afirma a
    // coincidência nos TRÊS sítios em que o texto novo não afirma; o critério deste teste (nenhum "coincid") o reprova.
    const relacaoAtual = REL_COINCIDEM_4;
    const painelAtual = PAINEL_COINCIDE;
    const totalAtual = `${ABERTURA(3)} e COINCIDE, um a um, com os 4 incluídos no documento de cálculo.**${RESSALVA(4, 3)}`;
    let doTextoAtual = trocar(r, REL_DECLARADOS(4), relacaoAtual);
    doTextoAtual = trocar(doTextoAtual, PAINEL_DIFERE, painelAtual);
    doTextoAtual = trocar(doTextoAtual, TOTAL_2, totalAtual);
    expect(coincidencias(doTextoAtual)).toBe(3);
    expect(coincidencias(r)).toBe(0);
    // e a ressalva do texto atual NÃO corrigia a afirmação: ela convive com "COINCIDE, um a um" na mesma frase
    expect(totalAtual).toContain('COINCIDE, um a um');
    expect(totalAtual).toContain('os dois valores se conservam');
  });

  test('3. apresentada r1,r2,r3,r9, declarados r1..r4: NENHUMA coincidência, e r9 é nomeado como PRESENTE na lista apresentada e AUSENTE dos dois conjuntos declarados', async () => {
    const P = ['r1', 'r2', 'r3', 'r9'];
    const { contexto, r } = await executarR4(apresentar(...P), vinculoCom(IDS, IDS));
    expect(coincidencias(r)).toBe(0);
    expect(coincidencias(contexto)).toBe(0);
    for (const s of TRES_CONJUNTOS('["r1", "r2", "r3", "r9"]', 4, IDS, IDS)) expect(ocorrencias(r, s)).toBe(1);
    expect(r).toContain(APRESENTADA.c3);
    // r9: presente na lista apresentada, ausente dos DOIS declarados — nomeado como tal, em cada confronto e no resumo
    expect(r).toContain('Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: ["r9"].');
    expect(ocorrencias(r, '1 ocorrência(s) só na lista apresentada ["r9"]')).toBe(2);
    expect(ocorrencias(r, '"r9"')).toBe(4); // a lista apresentada, os dois confrontos e o resumo; e a linha `- ID: r9` da lista não tem aspas
    expect(r).toContain('- ID: r9 | Email: Respondente r9 | CR: 5.0% | Status: CONFIÁVEL');
    // r4: declarado nos dois, ausente da apresentada
    expect(r).toContain('só nos incluídos ["r4"]');
    expect(r).toContain('só nos enviados declarados ["r4"]');
    expect(r).toContain(REL_DECLARADOS(4));
    expect(r).toContain(PAINEL_DIFERE);
    expect(r).toContain(COBERTURA_DIFERE(4));
    expect(r).toContain(TOTAL_3);
    expect(r).not.toContain('os dois valores se conservam'); // as contagens (4 e 4) NÃO diferem: a discrepância é de IDENTIDADE
    expect(r).toContain(REGRA_R2 + ACRESCIMO_R4);

    // CONTRAEXEMPLO: a comparação por CONTAGEM (4 = 4 = 4) passa — afirmaria a coincidência — e este teste a reprova
    expect(ATALHOS.soContagem(oModeloLe(apresentar(...P)), IDS, IDS)).toBe(true);
    expect(ATALHOS.porConjunto(oModeloLe(apresentar(...P)), IDS, IDS)).toBe(false);
    // e o texto de bfa7e81 (que olhava só o tamanho) afirmava nos três sítios, sem ressalva e SEM r9 em discrepância
    let doTextoAtual = trocar(r, REL_DECLARADOS(4), REL_COINCIDEM_4);
    doTextoAtual = trocar(doTextoAtual, PAINEL_DIFERE, PAINEL_COINCIDE);
    doTextoAtual = trocar(doTextoAtual, TOTAL_3, TOTAL_COINCIDE_4);
    expect(coincidencias(doTextoAtual)).toBe(3);
  });

  describe('4. a origem decide, e a grafia não: hash_000 GERADO pela posição não corresponde; hash_000 RECEBIDO em respondentId ou em id corresponde', () => {
    const DECLARADOS = ['hash_000', 'r2', 'r3', 'r4'];

    test('4a. hash_000 GERADO (elemento sem identificador) e o texto hash_000 nos dois conjuntos declarados: NÃO corresponde, com motivo próprio', async () => {
      const elementos = [semId(), ...apresentar('r2', 'r3', 'r4')];
      const { contexto, r } = await executarR4(elementos, vinculoCom(DECLARADOS, DECLARADOS));
      // o modelo LÊ hash_000 na lista, e o texto é o mesmo dos declarados
      expect(r).toContain('- ID: hash_000 | Email: sem identificador | CR: 5.0% | Status: CONFIÁVEL');
      expect(coincidencias(r)).toBe(0);
      expect(coincidencias(contexto)).toBe(0);
      for (const s of TRES_CONJUNTOS('["hash_000" (gerado por posição), "r2", "r3", "r4"]', 4, DECLARADOS, DECLARADOS)) {
        expect(ocorrencias(r, s)).toBe(1);
      }
      expect(r).toContain(APRESENTADA.c4a);
      // o MOTIVO PRÓPRIO: a origem posicional, a posição, e que não corresponde a ninguém mesmo com o mesmo texto
      expect(r).toContain(
        'Identidade por posição na lista apresentada: "hash_000" (posição 0 da lista, contada a partir de 0), GERADA pelo fallback posicional: não corresponde a ninguém, mesmo que o mesmo texto conste dos conjuntos declarados.'
      );
      expect(r).toContain(REL_DECLARADOS(4));
      expect(r).toContain(PAINEL_DIFERE);
      expect(r).toContain(TOTAL_3);
      expect(r).toContain(REGRA_R2 + ACRESCIMO_R4);
      // CONTRAEXEMPLO: comparar o TEXTO exibido afirmaria a coincidência (hash_000 = hash_000), e todos os atalhos de contagem e de texto também
      const P = oModeloLe(elementos);
      expect(P).toEqual(DECLARADOS);
      for (const nome of ['soContagem', 'soEnviados', 'soIncluidos', 'porConjunto', 'porTexto']) {
        expect([nome, ATALHOS[nome](P, DECLARADOS, DECLARADOS)]).toEqual([nome, true]);
      }
    });

    test.each([
      ['respondentId', (id: string) => soEm('respondentId', id)],
      ['id', (id: string) => soEm('id', id)],
      ['respondentId e id', (id: string) => respondente(id, 0.05)],
    ] as const)('4b. hash_000 RECEBIDO em %s, com a mesma grafia do gerado: CORRESPONDE, e a coincidência é afirmada nos quatro sítios', async (_campo, montar) => {
      const elementos = [montar('hash_000'), ...apresentar('r2', 'r3', 'r4')];
      const { contexto, r } = await executarR4(elementos, vinculoCom(DECLARADOS, DECLARADOS));
      expect(r).toContain('- ID: hash_000 | Email: Respondente hash_000 | CR: 5.0% | Status: CONFIÁVEL');
      expect(r).toContain(REL_COINCIDEM_4);
      expect(r).toContain(APRESENTADA.c1);
      expect(r).toContain(PAINEL_COINCIDE);
      expect(r).toContain(TOTAL_COINCIDE_4);
      expect(coincidencias(r)).toBe(4);
      expect(coincidencias(contexto)).toBe(4);
      // nenhuma identidade por posição: o hash_000 desta lista NÃO foi gerado
      expect(r).not.toContain('GERADA pelo fallback posicional');
      expect(r).not.toContain('(gerado por posição)');
      expect(r).toContain(REGRA_R2);
      expect(r).not.toContain('Também pode ser nomeado');
      // CONTRAEXEMPLO: inferir a origem por REGEX sobre a grafia trata este hash_000 RECEBIDO como gerado (e o reprovaria)
      const P = oModeloLe(elementos);
      expect(P).toEqual(DECLARADOS);
      expect(ATALHOS.porRegex(P, DECLARADOS, DECLARADOS)).toBe(false); // a regex diria "não corresponde"
      expect(ATALHOS.porTexto(P, DECLARADOS, DECLARADOS)).toBe(true); // e o texto, "corresponde": só a ORIGEM separa 4a de 4b
    });

    test('a MESMA grafia, duas origens, dois resultados: a diferença entre 4a e 4b está na origem, e em mais nada do pedido', async () => {
      const gerado = await executarR4([semId(), ...apresentar('r2', 'r3', 'r4')], vinculoCom(DECLARADOS, DECLARADOS));
      const recebido = await executarR4([soEm('id', 'hash_000'), ...apresentar('r2', 'r3', 'r4')], vinculoCom(DECLARADOS, DECLARADOS));
      // o modelo lê o MESMO identificador nos dois...
      expect(gerado.r).toContain('- ID: hash_000 | Email: ');
      expect(recebido.r).toContain('- ID: hash_000 | Email: ');
      // ...e a conferência dá resultados OPOSTOS
      expect(coincidencias(gerado.r)).toBe(0);
      expect(coincidencias(recebido.r)).toBe(4);
    });
  });

  test('controle 5. apresentada = enviados declarados (r1..r3), diferente dos incluídos (r1..r4): NENHUMA coincidência, e o texto conferido de R1 fica byte a byte', async () => {
    const p = preparo(ids(3), ids(4)); // o preparo REAL: enviados r1..r3, incluídos r1..r4, estado divergente
    expect(p.vinculo.estado).toBe('divergente');
    const { contexto, r } = await executarR4(p.respondentesEnviados, p.vinculo);
    expect(coincidencias(r)).toBe(0);
    expect(coincidencias(contexto)).toBe(0);
    // R1, sem uma letra a mais: a relação, o TOTAL e o que vem logo depois (nenhuma frase acrescentada)
    expect(r).toContain(REL_DIFEREM_3_4);
    expect(r).not.toContain(SUFIXO_DECLARADOS); // apresentada = enviados: a relação dos declarados não precisa de desambiguação
    expect(r).toContain(`${TOTAL_5}\n\n**CÁLCULO — contagem registrada no documento de cálculo: 4 respondentes INCLUÍDOS`);
    expect(r).toContain(COBERTURA_CONFERE(3)); // apresentada = enviados: a cobertura segue o texto de sempre
    expect(r).toContain(PAINEL_DIFERE);
    // o que a linha da lista apresentada conserva: os três conjuntos, e que a apresentada CONFERE com os enviados declarados
    for (const s of TRES_CONJUNTOS('["r1", "r2", "r3"]', 3, ids(3), ids(4))) expect(ocorrencias(r, s)).toBe(1);
    expect(r).toContain(APRESENTADA.c5);
    expect(r).toContain('Contra os enviados declarados: 0 ocorrência(s) só nos enviados declarados (nenhuma); 0 ocorrência(s) só na lista apresentada (nenhuma).');
    expect(r).toContain('Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r4"]; 0 ocorrência(s) só na lista apresentada (nenhuma).');
    expect(r).toContain(REGRA_R2 + ACRESCIMO_R4);
    // CONTRAEXEMPLO: comparar SÓ com os enviados declarados afirmaria a coincidência (r1..r3 = r1..r3), e ignoraria os incluídos
    const P = oModeloLe(p.respondentesEnviados);
    expect(ATALHOS.soEnviados(P, ids(3), ids(4))).toBe(true);
    expect(ATALHOS.porTexto(P, ids(3), ids(4))).toBe(false);
  });

  test('controle 6. apresentada = incluídos (r1..r4), diferente dos enviados declarados (r1..r3): NENHUMA coincidência, e a lista apresentada NÃO é dada como ausente do documento', async () => {
    const p = preparo(ids(3), ids(4)); // o mesmo vínculo do controle 5: enviados r1..r3, incluídos r1..r4
    const { contexto, r } = await executarR4(apresentar(...IDS), p.vinculo);
    expect(coincidencias(r)).toBe(0);
    expect(coincidencias(contexto)).toBe(0);
    expect(r).toContain(REL_DIFEREM_3_4 + SUFIXO_DECLARADOS); // o confronto dos DECLARADOS, desambiguado: a apresentada está na linha seguinte
    expect(r).toContain(COBERTURA_DIFERE(3));
    expect(r).toContain(PAINEL_NAO_CONFIRMA); // tem os identificadores dos incluídos: NÃO se diz que "difere do documento", e NÃO se afirma que descreve os enviados
    expect(r).not.toContain('NÃO descreve o conjunto enviado');
    expect(r).toContain(TOTAL_6);
    for (const s of TRES_CONJUNTOS('["r1", "r2", "r3", "r4"]', 4, ids(3), ids(4))) expect(ocorrencias(r, s)).toBe(1);
    expect(r).toContain(APRESENTADA.c6);
    expect(r).toContain('Contra os incluídos: 0 ocorrência(s) só nos incluídos (nenhuma); 0 ocorrência(s) só na lista apresentada (nenhuma).');
    expect(r).toContain('Contra os enviados declarados: 0 ocorrência(s) só nos enviados declarados (nenhuma); 1 ocorrência(s) só na lista apresentada ["r4"].');
    expect(r).toContain(REGRA_R2 + ACRESCIMO_R4);
    // o texto de bfa7e81 dizia, para esta lista, "1 incluído(s) ausente(s) desta lista" — o que é FALSO: r4 ESTÁ na lista
    const falso = '1 incluído(s) no documento e ausente(s) desta lista';
    expect(r).not.toContain(falso);
    // CONTRAEXEMPLO: comparar SÓ com os incluídos afirmaria a coincidência (r1..r4 = r1..r4), e ignoraria os enviados declarados
    const P = oModeloLe(apresentar(...IDS));
    expect(ATALHOS.soIncluidos(P, ids(3), ids(4))).toBe(true);
    expect(ATALHOS.porTexto(P, ids(3), ids(4))).toBe(false);
  });

  test('controle 7. apresentada r1,r1,r2 contra declarados r1,r2,r2: NENHUMA coincidência — a multiplicidade separa o que o conjunto e o tamanho juntam', async () => {
    const D = ['r1', 'r2', 'r2'];
    const elementos = apresentar('r1', 'r1', 'r2');
    const { contexto, r } = await executarR4(elementos, vinculoCom(D, D));
    expect(coincidencias(r)).toBe(0);
    expect(coincidencias(contexto)).toBe(0);
    for (const s of TRES_CONJUNTOS('["r1", "r1", "r2"]', 3, D, D)) expect(ocorrencias(r, s)).toBe(1);
    expect(r).toContain(APRESENTADA.c7);
    expect(r).toContain('Repetidos na lista apresentada: "r1" (2 ocorrências).');
    expect(r).toContain('Contra os incluídos: 1 ocorrência(s) só nos incluídos ["r2"]; 1 ocorrência(s) só na lista apresentada ["r1"].');
    expect(r).toContain(REL_DECLARADOS(3));
    expect(r).toContain(PAINEL_DIFERE);
    expect(r).toContain(TOTAL_7);
    expect(r).toContain(REGRA_R2 + ACRESCIMO_R4);
    // CONTRAEXEMPLO: converter em CONJUNTO ({r1, r2} = {r1, r2}) e comparar só o TAMANHO (3 = 3 = 3) afirmariam a coincidência; a multiplicidade não
    const P = oModeloLe(elementos);
    expect(ATALHOS.porConjunto(P, D, D)).toBe(true);
    expect(ATALHOS.soContagem(P, D, D)).toBe(true);
    expect(ATALHOS.porTexto(P, D, D)).toBe(false);
  });

  test('lista apresentada VAZIA (a restrição a esvaziou): o bloco compara a lista vazia, não afirma coincidência, e diz que a lista apresentada tem 0 identificadores', async () => {
    const p = preparo(['r1', 'r2'], ['r7', 'r8']); // nenhum avaliado está no documento
    expect(p.respondentesEnviados).toEqual([]);
    const { contexto, status } = await executar(payloadDaTela(p.respondentesEnviados, p.vinculo, !p.omitirOverall));
    expect(status).toBe(200);
    expect(contexto).toContain('⚠️ Lista individual de respondentes não disponível.');
    expect(coincidencias(contexto)).toBe(0);
    expect(ocorrencias(contexto, '- Lista de respondentes APRESENTADA a você (0 identificador(es)')).toBe(1);
    expect(contexto).toContain('apresentada [] (0; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio)');
    expect(contexto).toContain('incluídos ["r7", "r8"] (2;');
  });

  // ============================================================ a fonte
  test('fonte: a rota registra a origem UMA vez, onde constrói o displayId da lista; as outras duas expressões de identificador não foram tocadas; o módulo não infere a origem pela grafia', () => {
    const rota = ler(ROTA);
    expect(ocorrencias(rota, 'identificarParaApresentacao(')).toBe(1);
    expect(ocorrencias(rota, 'displayId = `hash_')).toBe(0);
    // as outras duas expressões de identificador da rota, medidas e NÃO alteradas por R4
    expect(ocorrencias(rota, 'let displayId = r.respondentId || r.id;')).toBe(1); // a lista dos respondentes críticos
    expect(ocorrencias(rota, "r.respondentId || r.id || `hash_${idx.toString().padStart(3, '0')}`")).toBe(1); // a validação posterior à geração

    const modulo = ler('lib/ai-reviewer/vinculo-execucao.ts');
    const codigo = modulo.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
    // o único ponto do CÓDIGO que escreve "hash_" é o que GERA o identificador; nenhum outro o lê
    expect(codigo.filter((l) => l.includes('hash_')).map((l) => l.trim())).toEqual(["bruto = `hash_${indice.toString().padStart(3, '0')}`;"]);
    // a função que constrói a identidade não tem regex, teste de padrão nem prefixo
    const inicio = modulo.indexOf('export function identificarParaApresentacao(');
    const corpo = modulo.slice(inicio, modulo.indexOf('\n}\n', inicio));
    expect(corpo.length).toBeGreaterThan(200);
    expect(corpo).not.toMatch(/RegExp|\.test\(|\.match\(|startsWith|endsWith|\.search\(/);
    // CONTRAEXEMPLO: o detector enxerga uma inferência pela grafia
    expect('if (/^hash_\\d{3}$/.test(valor)) origem = "posicional";').toMatch(/RegExp|\.test\(|\.match\(|startsWith|endsWith|\.search\(/);
  });
});

// ============================================================ 10
describe('ensaio 10: com o MESMO conjunto avaliado, mudar só o estado do vínculo NÃO muda elegibilidade nem rótulo', () => {
  /** Tudo que a resposta da API diz sobre nota, veredicto, suspensão e rótulo, sem o que é do instante. */
  const decisao = (r: Resposta) => ({
    status: r.status,
    nota: r.corpo.nota,
    veredicto: r.corpo.veredicto,
    notaSuspensa: r.corpo.notaSuspensa,
    gradeSource: r.corpo.metadata.gradeSource,
    automaticGrade: r.corpo.metadata.automaticGrade,
    avaliacaoDeQualidade: r.corpo.metadata.avaliacaoDeQualidade,
    validacao: r.corpo.validation?.estado ?? null,
  });

  test('conjunto ELEGÍVEL: os quatro estados e a ausência do campo dão a mesma decisão', async () => {
    const lista = elegivel();
    const referencia = decisao(await executar(payloadDaTela(lista)));
    expect(referencia.status).toBe(200);
    expect(referencia.notaSuspensa).toBeNull(); // elegível: não há suspensão
    for (const estado of ESTADOS) {
      const r = await executar(payloadDaTela(lista, vinculoDoEstado(estado, lista)));
      expect(decisao(r)).toEqual(referencia);
    }
  });

  test('conjunto NÃO elegível: a causa e o rótulo da etapa 1 são os mesmos nos quatro estados', async () => {
    const lista = naoElegivel();
    const referencia = decisao(await executar(payloadDaTela(lista)));
    expect(referencia.notaSuspensa).toMatchObject({ suspensa: true, causa: 'disponibilidade' });
    for (const estado of ESTADOS) {
      const r = await executar(payloadDaTela(lista, vinculoDoEstado(estado, lista)));
      const d = decisao(r);
      expect(d).toEqual(referencia);
      expect(d.notaSuspensa.causa).toBe('disponibilidade');
      expect(d.notaSuspensa.rotulo).toBe(referencia.notaSuspensa.rotulo);
    }
  });

  test('CONTRAEXEMPLO: o NOVO conjunto muda a elegibilidade pela regra da etapa 1, e a causa é nomeada', async () => {
    // avaliação {r1 com CR, r2 sem CR}; o documento só tem {r1}: a restrição retira r2
    const lista = [respondente('r1', 0.05), respondente('r2', null)];
    const semRestricao = await executar(payloadDaTela(lista, prepararVinculoDaTela({ calculo: calculo(undefined), respondentesAtivos: lista, respostasAtivas: [] }).vinculo));
    const preparo = prepararVinculoDaTela({ calculo: calculo(['r1']), respondentesAtivos: lista, respostasAtivas: [] });
    expect(preparo.vinculo.estado).toBe('divergente');
    const comRestricao = await executar(payloadDaTela(preparo.respondentesEnviados, preparo.vinculo));

    expect(semRestricao.corpo.notaSuspensa).toMatchObject({ suspensa: true, causa: 'disponibilidade' });
    expect(comRestricao.corpo.notaSuspensa).toBeNull(); // o conjunto mudou, e a etapa 1 decidiu
    // ⚠ e a causa NÃO é o vínculo: o mesmo vínculo `divergente` sobre o conjunto original suspende igual
    const mesmoVinculoMesmoConjunto = await executar(payloadDaTela(lista, preparo.vinculo));
    expect(mesmoVinculoMesmoConjunto.corpo.notaSuspensa).toMatchObject({ suspensa: true, causa: 'disponibilidade' });
  });

  test('o bloco não empresta critério de nota: o texto do contexto não contém rótulo de suspensão do vínculo', async () => {
    const lista = elegivel();
    for (const estado of ESTADOS) {
      const { contexto } = await executar(payloadDaTela(lista, vinculoDoEstado(estado, lista)));
      const bloco = blocoDe(contexto);
      expect(bloco).not.toMatch(/Nota não calculada/);
      expect(bloco).not.toMatch(/suspens(?!a a classificação)/i); // só a negação do limite: "não suspende a classificação"
    }
  });

  test('a rota lê o vínculo só para montar TEXTO, e nunca para decidir: a elegibilidade e a nota não o recebem', () => {
    const contrato = ler('lib/ai-reviewer/avaliacao-qualidade.ts');
    expect(contrato).not.toMatch(/vinculo/i);
    const rota = ler(ROTA);
    // toda referência do vínculo na rota, em ordem: o import, a cópia, a leitura para o TEXTO (a das frases da lista já recebe a lista APRESENTADA, R4) e o bloco, montado depois da lista
    const linhas = rota.split('\n').filter((l) => /vinculo/i.test(l) && !l.trim().startsWith('//'));
    expect(linhas.map((l) => l.trim())).toEqual([
      'descreverVinculoParaContexto,',
      'frasesDaListaComVinculo,',
      'lerVinculoParaTexto,',
      'linhasDeExclusaoComVinculo,',
      "} from '@/lib/ai-reviewer/vinculo-execucao';",
      'vinculoDaExecucao: rawData.vinculoDaExecucao,',
      "const comVinculo = lerVinculoParaTexto(data.vinculoDaExecucao).modo !== 'ausente';",
      'const linhasDaExclusao = comVinculo',
      '? linhasDeExclusaoComVinculo(data.exclusionInfo, exclusionRate, nEnviados)',
      'const frases: FrasesDaLista = comVinculo',
      '? frasesDaListaComVinculo(lerVinculoParaTexto(data.vinculoDaExecucao, identidadesApresentadas), respondents.length)',
      'const textoDoVinculo = descreverVinculoParaContexto(data.vinculoDaExecucao, identidadesApresentadas);',
      "const blocoDoVinculo = textoDoVinculo === '' ? '' : `\\n${textoDoVinculo}\\n`;",
      '${blocoDoVinculo}',
    ]);
    // ⚠ e nenhuma dessas leituras chega à decisão: as três chamadas da elegibilidade recebem só a avaliação e a coerência
    const chamadas = rota.match(/elegivelParaClassificacao\([^)]*\)/g) ?? [];
    expect(chamadas.length).toBe(3);
    for (const c of chamadas) expect(c).toBe('elegivelParaClassificacao(data.avaliacaoDeQualidade, data.coerenciaDaQualidade)');
    const inicio = rota.indexOf('function calculateGrade(');
    const nota = rota.slice(inicio, rota.indexOf('\n}\n', inicio));
    expect(nota.length).toBeGreaterThan(100);
    expect(nota).not.toMatch(/vinculo/i);
  });
});

// ============================================================ 8 (parte de fiação), R6
describe('ensaio 8 e R6: o conjunto restringido é o que o contexto lista e conta, e `overall` não vai quando o conjunto muda', () => {
  const avaliados = () => ['r1', 'r2', 'r3', 'r4', 'r5'].map((id) => respondente(id, 0.05));

  test('divergente com restrição: a lista e o N do contexto são os de `enviados`, e o bloco declara a cobertura', async () => {
    const preparo = prepararVinculoDaTela({ calculo: calculo(['r1', 'r2', 'r3', 'r4']), respondentesAtivos: avaliados(), respostasAtivas: [] });
    expect(preparo.vinculo.estado).toBe('divergente');
    expect(preparo.vinculo.enviados).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(preparo.omitirOverall).toBe(true);

    const payload = payloadDaTela(preparo.respondentesEnviados, preparo.vinculo, !preparo.omitirOverall);
    const { contexto } = await executar(payload);
    // ⚠ 5 avaliados, 4 incluídos, 4 enviados: a lista é a de `enviados`, e COINCIDE com os incluídos
    expect(contexto).toContain('**TOTAL ENVIADO A VOCÊ: 4 respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado e COINCIDE, um a um, com os 4 incluídos no documento de cálculo.**');
    expect(contexto).not.toContain('**TOTAL: 4 respondentes (esta lista é COMPLETA — não existem outros)**');
    expect(contexto).not.toContain('**TOTAL ENVIADO A VOCÊ: 5 respondentes');
    expect(contexto).toContain('ID: r4 |');
    expect(contexto).not.toContain('ID: r5 |');
    const bloco = blocoDe(contexto);
    expect(bloco).toContain('o conjunto avaliado foi RESTRINGIDO aos identificadores presentes no documento de cálculo');
    expect(bloco).toContain('avaliados antes de qualquer restrição: 5; enviados a você: 4');
    // o rejeitado aparece na divergência, mesmo tendo saído da lista
    expect(bloco).toMatch(/Na avaliação e NÃO no documento de cálculo: "r5" \[fora-do-documento; campo respondentId\]/);
    // e, como o conjunto enviado é o do documento, o bloco diz que o resumo do painel o descreve
    expect(bloco).toContain('O conjunto enviado coincide com o do documento');
  });

  test('sobra só no documento: o bloco declara que o resumo do painel NÃO descreve o conjunto enviado', async () => {
    const lista = ['r1', 'r2', 'r3'].map((id) => respondente(id, 0.05));
    const preparo = prepararVinculoDaTela({ calculo: calculo(['r1', 'r2', 'r3', 'r4']), respondentesAtivos: lista, respostasAtivas: [] });
    const { contexto } = await executar(payloadDaTela(preparo.respondentesEnviados, preparo.vinculo));
    expect(blocoDe(contexto)).toContain('NÃO descreve o conjunto enviado a você, que difere do conjunto do documento');
  });

  test('`overall` ausente do payload não chega ao contexto, e presente também não: NENHUM efeito sobre o texto (M1)', async () => {
    const lista = elegivel();
    const com = await executar(payloadDaTela(lista, undefined, true));
    const sem = await executar(payloadDaTela(lista, undefined, false));
    // ⚠ `qualityAnalysis.overall` não tem consumidor: o contexto é byte a byte o mesmo
    expect(sem.contexto).toBe(com.contexto);
    expect(sem.contexto).not.toContain('qualityScore');
  });
});

// ============================================================ 11
describe('ensaio 11: nenhuma redação afirma conferência de conteúdo, e o contrato e o registro trazem a redação literal', () => {
  const AFIRMA = /conferid|verificad|validad|íntegr|integr|auditáv|comprovad|autentic/i;

  test('na rota real, o bloco dos quatro estados não afirma conferência (fora a frase de limite, que nega)', async () => {
    const lista = elegivel();
    for (const estado of ESTADOS) {
      const { contexto } = await executar(payloadDaTela(lista, vinculoDoEstado(estado, lista)));
      const bloco = blocoDe(contexto).replace(LIMITE_DO_VINCULO, '').replace('identifica, e não verifica', '');
      expect(bloco.length).toBeGreaterThan(200);
      expect(bloco).not.toMatch(AFIRMA);
    }
    // CONTRAEXEMPLO: o detector discrimina
    expect('- Conteúdo verificado.').toMatch(AFIRMA);
  });

  const REDACAO_OBRIGATORIA =
    'O módulo atual não pode ser importado diretamente pelo navegador, pois depende de APIs do Node. ' +
    'Este estágio não implementa verificação de conteúdo no navegador nem no servidor.';

  test.each([[CONTRATO], [REGISTRO]])('%s traz a redação literal da seção 5', (arquivo) => {
    expect(normalizar(ler(arquivo))).toContain(REDACAO_OBRIGATORIA);
    // CONTRAEXEMPLO: a redação corrompida não seria encontrada
    expect(normalizar(ler(arquivo))).not.toContain(REDACAO_OBRIGATORIA.replace('não pode', 'pode'));
  });

  test('nenhum arquivo rastreado sustenta a frase que a seção 5 proíbe (montada de pedaços, para não se conter)', () => {
    // ⚠ A frase proibida é montada de pedaços, para que este arquivo não a contenha
    const proibida = ['verificar conteúdo', 'exigiria o servidor'].join(' ');
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (['node_modules', '.next', '.git'].includes(e.name)) continue;
          varrer(rel);
        } else if (/\.(ts|tsx|md|json|cjs|js|mjs)$/.test(e.name)) {
          if (normalizar(ler(rel)).toLowerCase().includes(proibida)) achados.push(rel);
        }
      }
    };
    for (const dir of ['app', 'lib', 'docs', 'components', 'scripts']) varrer(dir);
    expect(achados).toEqual([]);
    // CONTRAEXEMPLO: o varredor acharia a frase, se ela existisse
    expect(normalizar(`x ${proibida} y`).toLowerCase().includes(proibida)).toBe(true);
  });

  test('a regra da seção 7 está no contrato e no registro, literal', () => {
    const REGRA =
      'O estado do vínculo, isoladamente, não acrescenta causa de suspensão nem altera a elegibilidade. ' +
      'Alterações decorrentes do novo conjunto avaliado continuam sujeitas às regras existentes da etapa 1 ' +
      'e devem ter seus efeitos previstos e testados.';
    for (const arquivo of [CONTRATO, REGISTRO]) expect(normalizar(ler(arquivo))).toContain(REGRA);
  });

  test('`vinculado` está delimitado no contrato: correspondência de identificadores, e não prova de que os CRs saíram das versões registradas', () => {
    const contrato = normalizar(ler(CONTRATO));
    expect(contrato).toContain('correspondência de identificadores');
    expect(contrato).toMatch(/não comprova que os CRs foram calculados sobre as versões registradas/);
  });
});

// ============================================================ 12
describe('ensaio 12: julgamentos-resumo.ts não é importado pela tela, e não existe segunda implementação da serialização', () => {
  /**
   * ⚠ Os ESPECIFICADORES importados, e não as linhas que começam por `import`: um import de várias
   * linhas termina em `} from '...'`, que uma leitura por linha não veria — e foi o contraexemplo
   * deste ensaio, a rota de cálculo, que mostrou o defeito do primeiro detector.
   */
  const especificadoresDe = (fonte: string): string[] => {
    const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const achados: string[] = [];
    for (const re of [
      /\bfrom\s+['"]([^'"]+)['"]/g,
      /\bimport\s+['"]([^'"]+)['"]/g,
      /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
      /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    ]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(semComentarios)) !== null) achados.push(m[1]);
    }
    return achados;
  };

  test('o detector enxerga import de várias linhas (a rota de cálculo é o caso conhecido)', () => {
    const daRota = especificadoresDe(ler('app/api/calculate/route.ts'));
    expect(daRota).toContain('@/lib/julgamentos-resumo');
    expect(especificadoresDe("import {\n  a,\n  b,\n} from '@/lib/x';\nimport y from 'z';")).toEqual(['@/lib/x', 'z']);
  });

  test('a tela e o módulo do vínculo não importam o módulo de resumo nem APIs do Node', () => {
    for (const arquivo of [TELA, 'lib/ai-reviewer/vinculo-execucao.ts']) {
      const especificadores = especificadoresDe(ler(arquivo));
      if (arquivo === TELA) expect(especificadores.length).toBeGreaterThan(10); // o detector leu os imports da tela
      for (const e of especificadores) {
        expect([arquivo, e, /julgamentos-resumo/.test(e)]).toEqual([arquivo, e, false]);
        expect([arquivo, e, /^node:/.test(e) || e === 'crypto']).toEqual([arquivo, e, false]);
      }
    }
    // a tela importa o módulo do vínculo, e SÓ ele, deste assunto
    expect(especificadoresDe(ler(TELA))).toContain('@/lib/ai-reviewer/vinculo-execucao');
    // o módulo do vínculo não importa NADA
    expect(especificadoresDe(ler('lib/ai-reviewer/vinculo-execucao.ts'))).toEqual([]);
  });

  test('a tela e o módulo do vínculo não calculam resumo: sem createHash, subtle, Buffer nem TextEncoder', () => {
    for (const arquivo of [TELA, 'lib/ai-reviewer/vinculo-execucao.ts']) {
      const fonte = ler(arquivo);
      for (const proibido of ['createHash(', 'crypto.subtle', 'subtle.digest', 'Buffer.from(', 'new TextEncoder']) {
        expect([arquivo, proibido, ocorrencias(fonte, proibido)]).toEqual([arquivo, proibido, 0]);
      }
    }
  });

  test('a serialização versionada existe em UM só arquivo de fonte: lib/julgamentos-resumo.ts', () => {
    const definem: Record<string, string[]> = { hash: [], versao: [], funcao: [] };
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (['node_modules', '.next', '__tests__'].includes(e.name)) continue;
          varrer(rel);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          const f = ler(rel);
          if (f.includes('createHash(')) definem.hash.push(rel);
          if (f.includes("SERIALIZACAO_JULGAMENTOS = 'a12-julgamentos-v1'")) definem.versao.push(rel);
          if (/export function (serializarJulgamentos|resumirJulgamentos|resumirPainel)\b/.test(f)) definem.funcao.push(rel);
        }
      }
    };
    for (const dir of ['app', 'lib', 'components']) varrer(dir);
    expect(definem).toEqual({
      hash: ['lib/julgamentos-resumo.ts'],
      versao: ['lib/julgamentos-resumo.ts'],
      funcao: ['lib/julgamentos-resumo.ts'],
    });
  });

  test('o vínculo TRANSPORTA os resumos: cópia de texto, sem recalcular', () => {
    const lista = elegivel();
    const v = vinculoDoEstado('vinculado', lista);
    expect(v.resumoDoConteudo.verificado).toBe(false);
    expect(v.resumoDoConteudo.painel?.panel).toBe(HEX_PAINEL);
    const mapa = v.resumoDoConteudo.mapaPorRespondentId as Record<string, any>;
    expect(mapa.r1.judgmentsSha256).toBe(shaDe('r1')); // exatamente o que o documento trazia
  });
});

// ============================================================ 8 e 13 (fiação na tela, por LEITURA)
describe('fiação na tela, por LEITURA (a tela não é executada por teste algum)', () => {
  const tela = ler(TELA);
  const inicio = tela.indexOf('const runAiReview = async () => {');
  const fimDaChamada = tela.indexOf("const response = await fetch('/api/ai-reviewer', {", inicio);
  const corpo = tela.slice(inicio, fimDaChamada);

  test('a região existe e é delimitada: da função até o fetch', () => {
    expect(inicio).toBeGreaterThan(-1);
    expect(fimDaChamada).toBeGreaterThan(inicio);
    expect(corpo.length).toBeGreaterThan(5000);
  });

  test('o preparo do vínculo é chamado UMA vez, depois das exclusões e antes de toda estatística', () => {
    expect(ocorrencias(corpo, 'prepararVinculoDaTela(')).toBe(1);
    const posExcluidos = corpo.indexOf('const activeProjectResponses = projectResponses.filter(');
    const posPreparo = corpo.indexOf('const preparoDoVinculo = prepararVinculoDaTela({');
    const posEstatistica = corpo.indexOf('let individualStats = ');
    const posClassificador = corpo.indexOf('const avaliacaoDeQualidade = classificarAvaliacaoDaTela({');
    expect(posExcluidos).toBeGreaterThan(-1);
    expect(posPreparo).toBeGreaterThan(posExcluidos);
    expect(posEstatistica).toBeGreaterThan(posPreparo);
    expect(posClassificador).toBeGreaterThan(posEstatistica);
    // os argumentos são as listas JÁ excluídas, e o documento de cálculo carregado
    const chamada = corpo.slice(posPreparo, corpo.indexOf('});', posPreparo));
    expect(normalizar(chamada)).toContain(
      'calculo: calculation, respondentesAtivos: activeRespondents, respostasAtivas: activeProjectResponses,'
    );
  });

  test('da estatística ao classificador, SÓ as listas enviadas são lidas: as antigas não reaparecem (individualStats conta os enviados)', () => {
    const ini = corpo.indexOf('// CORREÇÃO CRÍTICA: CÁLCULO DE QUALIDADE ROBUSTO');
    const fim = corpo.indexOf('respostasAtivas: respostasEnviadas,');
    expect(ini).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(ini);
    const regiao = corpo.slice(ini, fim);
    expect(ocorrencias(regiao, 'activeRespondents')).toBe(0);
    expect(ocorrencias(regiao, 'activeProjectResponses')).toBe(0);
    expect(ocorrencias(regiao, 'respondentesEnviados')).toBeGreaterThanOrEqual(5);
    expect(ocorrencias(regiao, 'respostasEnviadas')).toBeGreaterThanOrEqual(14);
    // o classificador da etapa 1 recebe os ENVIADOS
    expect(normalizar(corpo)).toContain(
      'classificarAvaliacaoDaTela({ respondentesAvaliados: respondentesEnviados, respostasAtivas: respostasEnviadas, });'
    );
  });

  test('responseCount e exclusionInfo seguem descrevendo o conjunto ANTES da restrição', () => {
    expect(ocorrencias(tela, 'responseCount: calculation.responseCount || activeProjectResponses.length || 0,')).toBe(1);
    expect(ocorrencias(tela, 'activeCount: activeProjectResponses.length,')).toBe(1);
  });

  test('o payload leva o vínculo, separado de avaliacaoDeQualidade, e `overall` sai quando o conjunto muda', () => {
    expect(normalizar(tela)).toContain('const payload = { avaliacaoDeQualidade, // A.12 etapa 3, estágio 1: separado de `avaliacaoDeQualidade`, que é contrato da etapa 1. vinculoDaExecucao, projectName:');
    expect(ocorrencias(tela, 'overall: preparoDoVinculo.omitirOverall ? undefined : (currentQualityAnalysis?.overall || {}),')).toBe(1);
    // e a versão antiga do `overall` não sobrou
    expect(ocorrencias(tela, 'overall: currentQualityAnalysis?.overall || {},')).toBe(0);
  });

  test('NENHUM estado bloqueia o parecer: o preparo só alimenta listas, payload e `overall`', () => {
    // ⚠ Lista COMPLETA das linhas da tela que citam o preparo ou o vínculo, fora comentário.
    //   Qualquer `if`, `return`, `throw` ou `setAiReview` que ramificasse pelo estado seria uma linha a mais.
    const linhas = tela
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /preparoDoVinculo|vinculoDaExecucao|prepararVinculoDaTela/.test(l) && !l.startsWith('//'));
    expect(linhas).toEqual([
      "import { idDoElementoNoFallback, prepararVinculoDaTela } from '@/lib/ai-reviewer/vinculo-execucao';",
      'const preparoDoVinculo = prepararVinculoDaTela({',
      'const vinculoDaExecucao = preparoDoVinculo.vinculo;',
      'const respondentesEnviados = preparoDoVinculo.respondentesEnviados;',
      'const respostasEnviadas = preparoDoVinculo.respostasEnviadas;',
      "'🔗 [AI-REVIEW] Vínculo com a execução:', vinculoDaExecucao.estado,",
      "'| origem:', vinculoDaExecucao.origemDaListaAvaliada,",
      "'| avaliados:', vinculoDaExecucao.cobertura.avaliadosAntesDaRestricao,",
      "'| enviados:', vinculoDaExecucao.cobertura.enviados",
      'vinculoDaExecucao,',
      'overall: preparoDoVinculo.omitirOverall ? undefined : (currentQualityAnalysis?.overall || {}),',
    ]);
  });

  test('as cadeias de identificador da tela NÃO foram unificadas', () => {
    // a cadeia do ramo de análise: a do filtro de excluídos, duas vezes, dentro de runAiReview
    expect(ocorrencias(corpo, "const id = r.respondentId || r.id || r.visitorId || '';")).toBe(2);
    // a do fallback: a expressão vive no módulo, com visitorId ANTES de id, e a tela a chama
    expect(ocorrencias(corpo, 'id: idDoElementoNoFallback(response, idx),')).toBe(1);
    const modulo = ler('lib/ai-reviewer/vinculo-execucao.ts');
    expect(modulo).toContain('return resposta.visitorId || resposta.id || `resp-${indice + 1}`;');
    expect(modulo).toContain("return elemento.respondentId || elemento.id || elemento.visitorId || '';");
    // e a expressão antiga, inline, saiu do ramo (a chamada a substitui)
    expect(ocorrencias(corpo, 'id: response.visitorId || response.id ||')).toBe(0);
  });

  test('CalculationResult declara executionId, includedRespondents e judgmentsDigest com as formas do contrato', () => {
    const ini = tela.indexOf('interface CalculationResult {');
    const fim = tela.indexOf('\n}\n', ini);
    const tipo = normalizar(tela.slice(ini, fim));
    expect(tipo).toContain('executionId?: string;');
    expect(tipo).toContain(
      'includedRespondents?: { respondentId: string; responseDocId: string; identifierSource: FonteDoIdentificador; judgmentsSha256: string | null; judgmentsUnavailableReason: string | null; }[];'
    );
    expect(tipo).toContain(
      "judgmentsDigest?: { algorithm: 'sha256'; serialization: string; panel: string | null; unavailableReason: string | null; };"
    );
    // a fatia é mesmo a interface, e não um trecho vazio que passaria por acaso
    expect(tipo.length).toBeGreaterThan(800);
  });
});

// ============================================================ o registro e o âncora
describe('o contrato, o registro datado e o âncora dizem o mesmo', () => {
  const contrato = () => normalizar(ler(CONTRATO));
  const registro = () => normalizar(ler(REGISTRO));
  const ancora = () => normalizar(ler(ANCORA));

  test('o contrato traz os quatro estados, a regra de valor e a restrição', () => {
    const c = contrato();
    expect(c).toContain('A.12 etapa 3, estágio 1');
    for (const estado of ESTADOS) expect(c).toContain(`\`${estado}\``);
    expect(c).toMatch(/`null`[^.]*comparação não realizada/i);
    expect(c).toMatch(/`\[\]`[^.]*sem ocorrência/i);
    expect(c).toContain('vinculoDaExecucao');
    expect(c).toContain('mapaPorRespondentId');
  });

  test('o registro traz a medição, a decisão sobre P1 em aberto e os achados, com a predição preservada', () => {
    const r = registro();
    expect(r).toContain('A.12 etapa 3, estágio 1: predição datada');
    expect(r).toContain('A.12 etapa 3, estágio 1: o que foi implementado e o que foi medido');
    expect(r).toContain('P1');
    expect(r).toContain('fallbackSobreRespostas');
    expect(r).toContain('A predição acima NÃO foi reescrita');
  });

  test('o âncora aponta a etapa 3, estágio 1', () => {
    expect(ancora()).toContain('etapa 3, estágio 1');
  });

  test('R3: o achado do fallback está DELIMITADO às condições observadas, com as três condições não demonstradas e o efeito medido explícito', () => {
    // ⚠ A frase generalizada é montada de pedaços, para que este arquivo não a contenha
    const generalizada = ['diverge', 'por', 'construção'].join(' ');
    for (const texto of [contrato(), registro(), ancora()]) expect(texto).not.toContain(generalizada);

    // ⚠ As asserções valem para o PARÁGRAFO do Achado 1, e não para o registro inteiro: a mesma frase
    //   aparece também na seção que descreve este teste, e uma busca no arquivo todo a acharia lá.
    const registroInteiro = registro();
    const inicio = registroInteiro.indexOf('**Achado 1 (delimitado');
    const fim = registroInteiro.indexOf('**Achado 2:', inicio);
    expect(inicio).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(inicio);
    const r = registroInteiro.slice(inicio, fim);
    // as três condições, que a medição por execução NÃO demonstra para os documentos existentes
    expect(r).toContain('O id do documento pode coincidir com o `respondentId`');
    expect(r).toContain('`{ id: doc.id, ...data }` deixa um `id` gravado no dado sobrescrever o id do documento');
    expect(r).toContain('A ausência de gravação de `visitorId` no caminho examinado não prova a ausência em todos os documentos');
    // o efeito medido segue explícito, com a causa da etapa 1 nomeada
    expect(r).toContain('a restrição esvazia a lista');
    expect(r).toContain('passa de `disponivel` para `ausente`');
    expect(r).toContain('com a causa `disponibilidade`');
    // e o registro diz QUANDO o achado foi identificado, e que o enunciado anterior o generalizava
    expect(r).toContain('identificado DEPOIS da predição');
    expect(r).toContain('generalizava ao ramo inteiro');
    // o contrato e o âncora carregam o mesmo limite
    expect(contrato()).toContain('Três condições não estão demonstradas');
    expect(ancora()).toContain('nas condições observadas');

    // CONTRAEXEMPLO: a frase generalizada seria achada, se estivesse em algum dos três
    expect(normalizar(`o vínculo ${generalizada}, medido`)).toContain(generalizada);
  });

  test('R4: o contrato, o âncora e o registro trazem a lista APRESENTADA, a origem registrada na construção, o invariante de vocabulário e o que NÃO foi alterado', () => {
    const c = contrato();
    expect(c).toContain('A lista APRESENTADA, e a comparação com as duas declaradas (R4)');
    // as regras
    expect(c).toContain('Três conjuntos, cada um com a sua origem');
    expect(c).toContain('comparada, um a um e com multiplicidade, com os DOIS');
    expect(c).toContain('`r1,r1,r2` contra `r1,r2,r2` **não** coincidem');
    expect(c).toContain('"Coincide" só sai quando os TRÊS correspondem um a um');
    expect(c).toContain('o radical "coincid" (sem distinção de caixa) ocorre **se e somente se** os três correspondem um a um');
    // a origem: registrada na construção, e nunca inferida pela grafia
    expect(c).toContain('A origem da identidade é registrada na CONSTRUÇÃO do `displayId`, e nunca inferida pela grafia');
    expect(c).toContain('mesmo que o mesmo texto conste dos conjuntos declarados');
    expect(c).toContain('Um `hash_000` **recebido** em `respondentId` ou `id` tem essa origem e **corresponde normalmente**');
    expect(c).toContain('Nenhum ponto do módulo lê a grafia `hash_NNN`');
    // o que NÃO foi alterado
    expect(c).toContain('a rota tem **outras duas** expressões de identificador para o mesmo tipo de lista');
    expect(c).toContain('redistribuição por dimensão de `normalizeRequest` (`route.ts:565-593` em `bfa7e81`) **não foi corrigida**');

    const a = ancora();
    expect(a).toContain('R4, em 30/09/2026');
    expect(a).toContain('nunca inferida pela grafia');
    expect(a).toContain('a redistribuição por dimensão de `normalizeRequest` **não foi corrigida**');

    // ⚠ As asserções do registro valem para a SEÇÃO de R4, e não para o arquivo inteiro
    const registroInteiro = registro();
    const inicio = registroInteiro.indexOf('### Implementado e medido: R4');
    const fim = registroInteiro.indexOf('## Anexo 3', inicio);
    expect(inicio).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(inicio);
    const r = registroInteiro.slice(inicio, fim);
    expect(r).toContain('NÃO é predição');
    expect(r).toContain('Nenhum teste novo ou atualizado reprovou na primeira execução');
    expect(r).toContain('Um erro meu foi achado por LEITURA, antes de qualquer execução, e corrigido antes de rodar');
    expect(r).toContain('Vinte e seis');
    expect(r).toContain('nenhum reprova por erro de compilação');
    expect(r).toContain('reprovaram **sete asserções, e só elas**');
    expect(r).toContain('T10 a T12');
    expect(r).toContain('NÃO TESTADAS');
    expect(r).toContain('não foram alteradas nem unificadas');
    expect(r).toContain('não foi corrigida');
    // e o complemento datado, que é a predição, segue no registro com a regra corrigida e os desvios da rodada anterior
    expect(registroInteiro).toContain('A.12, etapa 3, estágio 1: complemento datado da predição, R4');
    expect(registroInteiro).toContain('Os desvios de previsão da rodada anterior (R1 e R2), classificados');

    // a frase generalizada de R3 não voltou em nenhum dos três
    const generalizada = ['diverge', 'por', 'construção'].join(' ');
    for (const texto of [c, a, r]) expect(texto).not.toContain(generalizada);
    // CONTRAEXEMPLO: o detector de seção enxerga um texto sem a seção de R4
    expect(registroInteiro.slice(0, inicio)).not.toContain('Nenhum teste novo ou atualizado reprovou na primeira execução');
  });
});
