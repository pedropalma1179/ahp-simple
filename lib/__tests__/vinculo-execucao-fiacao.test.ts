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
  LIMITE_DO_VINCULO,
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
    const listaExaustiva = contexto.indexOf('## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)');
    expect(amostra).toBeGreaterThan(-1);
    expect(marcador).toBeGreaterThan(amostra);
    expect(listaExaustiva).toBeGreaterThan(marcador);
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

  test.each(ESTADOS.map((e) => [e] as const))('R1: em %s a ÚNICA diferença para o contexto sem o campo é o bloco inserido', async (estado) => {
    const lista = elegivel();
    const sem = await executar(payloadDaTela(lista));
    const com = await executar(payloadDaTela(lista, vinculoDoEstado(estado, lista)));
    const bloco = blocoDe(com.contexto);
    expect(bloco.length).toBeGreaterThan(200);
    // ⚠ retirado o bloco (com as quebras que o cercam), o resto é BYTE A BYTE o contexto anterior
    expect(com.contexto.replace(`\n${bloco}\n`, '')).toBe(sem.contexto);
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

  test('a rota não lê o vínculo para decidir: a função de elegibilidade não o recebe', () => {
    const contrato = ler('lib/ai-reviewer/avaliacao-qualidade.ts');
    expect(contrato).not.toMatch(/vinculo/i);
    const rota = ler(ROTA);
    // a única referência do vínculo na rota: o import, a cópia, o texto do bloco
    const linhas = rota.split('\n').filter((l) => /vinculo/i.test(l) && !l.trim().startsWith('//'));
    expect(linhas.map((l) => l.trim())).toEqual([
      "import { descreverVinculoParaContexto } from '@/lib/ai-reviewer/vinculo-execucao';",
      'vinculoDaExecucao: rawData.vinculoDaExecucao,',
      'const textoDoVinculo = descreverVinculoParaContexto(data.vinculoDaExecucao);',
      "const blocoDoVinculo = textoDoVinculo === '' ? '' : `\\n${textoDoVinculo}\\n`;",
      '${blocoDoVinculo}',
    ]);
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
    expect(contexto).toContain('**TOTAL: 4 respondentes (esta lista é COMPLETA — não existem outros)**');
    expect(contexto).not.toContain('**TOTAL: 5 respondentes');
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
});
