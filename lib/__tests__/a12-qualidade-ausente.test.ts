/**
 * A.12: ausência de avaliação de qualidade não produz resultado.
 *
 * ⚠ **Sem geração real.** O cliente do modelo é simulado e devolve textos
 * CONTROLADOS; nada aqui observa a saída de um modelo.
 *
 * ⚠ **Três superfícies, medidas em separado:** o contexto que vai ao modelo, a
 * resposta da API e o que a apresentação mostra ao gestor.
 *
 * ⚠ **Isto não é a validação do parecer, de A.27**, que julga o TEXTO gerado e
 * permanece distinta: o bloco final mede as duas juntas para mostrar que não se
 * confundem.
 */
export {};
const fs = require('node:fs');
const path = require('node:path');
import {
  classificarAvaliacaoRecebida,
  classificarAvaliacaoDaTela,
  medicaoPorRespondente,
  qualidadeDisponivel,
  ROTULO_NOTA_SUSPENSA,
  MOTIVO_AUSENTE,
} from '@/lib/ai-reviewer/avaliacao-qualidade';

const CHAVE = 'chave-anthropic-falsa-do-processo-de-teste';
const SEM_VEREDICTO = 'Parecer de ensaio, sem decisão editorial declarada no texto. '.repeat(3);
const COM_ACEITO = '## 🎯 DECISÃO EDITORIAL\nACEITO\n\nTexto de ensaio com veredicto explícito, usado como controle.';

const respondente = (i: number, cr: number | null) => ({
  id: `resp-${i}`,
  name: `Respondente ${i}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
});

const balde = (total: number, valid: number, warning = 0, critical = 0) => ({ total, valid, warning, critical, avgCR: 0.05 });

/** Payload mínimo, sem nada de qualidade. */
function base() {
  return {
    projectName: 'Projeto de ensaio A.12',
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    finalScores: [
      { code: 'A1', name: 'Alternativa 1', score: 0.62 },
      { code: 'A2', name: 'Alternativa 2', score: 0.38 },
    ],
  } as Record<string, unknown>;
}

/** Caminho A, o da tela antiga: `byStatus` fabricado, sem respondente algum. */
function comByStatusFabricado() {
  return {
    ...base(),
    qualityAnalysis: {
      respondents: [],
      statistics: { byStatus: { 'CONFIÁVEL': 12, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 12, avgCR: 0 },
      summary: { total: 12, ok: 12, suspicious: 0, critical: 0 },
    },
    overallStats: { total: 12, valid: 0, warning: 0, critical: 0 },
  };
}

function comAvaliacao(crs: Array<number | null>) {
  const respondents = crs.map((cr, i) => respondente(i + 1, cr));
  const validos = crs.filter((cr) => cr !== null && cr <= 0.1).length;
  const criticos = crs.filter((cr) => cr !== null && cr > 0.2).length;
  const suspeitos = crs.filter((cr) => cr !== null && cr > 0.1 && cr <= 0.2).length;
  return {
    ...base(),
    qualityAnalysis: {
      respondents,
      statistics: {
        byStatus: { 'CONFIÁVEL': validos, 'REVISAR': 0, 'SUSPEITO': suspeitos, 'CRÍTICO': criticos },
        total: crs.length,
        avgCR: 0.05,
      },
      summary: { total: crs.length, ok: validos, suspicious: suspeitos, critical: criticos },
    },
    overallStats: { total: crs.length, valid: validos, warning: suspeitos, critical: criticos },
    individualStats: {
      Benefits: balde(crs.length, validos, suspeitos, criticos),
      Opportunities: balde(crs.length, validos, suspeitos, criticos),
      Costs: balde(crs.length, validos, suspeitos, criticos),
      Risks: balde(crs.length, validos, suspeitos, criticos),
    },
  };
}

type Captura = {
  contextoAoModelo: string;
  respostaDaApi: any;
  apresentacaoAoGestor: { estado: string | null; mostraNotaEVeredicto: boolean; rotuloExibido: string | null; motivoExibido: string | null };
};

/** Executa o handler real com o cliente do modelo simulado, e captura as três superfícies. */
async function executar(payload: Record<string, unknown>, textoDoModelo: string): Promise<Captura> {
  jest.resetModules();
  const anterior = { chave: process.env.ANTHROPIC_API_KEY, flag: process.env.USE_RAG_SEMANTIC };
  process.env.ANTHROPIC_API_KEY = CHAVE;
  delete process.env.USE_RAG_SEMANTIC;
  let contexto = '';
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (a: { messages: Array<{ content: string }> }) => {
          contexto = a.messages.map((m) => m.content).join('\n');
          return { content: [{ type: 'text', text: textoDoModelo }] };
        },
      };
    },
  }));
  const silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
    const corpo = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { decideReviewPresentation } = require('@/lib/ai-reviewer/review-validation-contract');
    const apresentacao = decideReviewPresentation(corpo.validation);
    const suspensa = corpo.notaSuspensa?.suspensa === true;
    return {
      contextoAoModelo: contexto,
      respostaDaApi: { ...corpo, status: res.status },
      apresentacaoAoGestor: {
        estado: apresentacao?.estado ?? null,
        // A mesma condição do componente: com a nota suspensa, os selos não saem.
        mostraNotaEVeredicto: !suspensa && apresentacao?.estado === 'aprovado' && Boolean(corpo.nota || corpo.veredicto),
        rotuloExibido: suspensa ? corpo.notaSuspensa.rotulo : null,
        motivoExibido: suspensa ? corpo.notaSuspensa.motivo : null,
      },
    };
  } finally {
    silencios.forEach((s) => s.mockRestore());
    if (anterior.chave === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = anterior.chave;
    if (anterior.flag === undefined) delete process.env.USE_RAG_SEMANTIC; else process.env.USE_RAG_SEMANTIC = anterior.flag;
  }
}

const PERCENTUAIS = /\(\d+\.\d%\)|Taxa de Validade Geral:\*\* \d/;

describe('A.12: o contrato distingue avaliação disponível de valor de fallback', () => {
  test('a presença de byStatus NÃO é critério: sem respondente com CR, a avaliação está ausente', () => {
    const a = classificarAvaliacaoRecebida(comByStatusFabricado());
    expect(a.estado).toBe('ausente');
    expect(a.motivo).toBe(MOTIVO_AUSENTE);
    expect(a.fonte).toContain('byStatus sozinho não é avaliação');
    expect(qualidadeDisponivel(a)).toBe(false);
  });

  test('CR por respondente torna a avaliação disponível; CR faltando a torna incompleta', () => {
    expect(classificarAvaliacaoRecebida(comAvaliacao([0.05, 0.08])).estado).toBe('disponivel');
    const incompleta = classificarAvaliacaoRecebida(comAvaliacao([0.05, null]));
    expect(incompleta.estado).toBe('incompleta');
    expect(incompleta.motivo).toContain('Medido: 1 de 2');
  });

  test('a declaração do cliente vale, e é conferida', () => {
    const declaradaAusente = classificarAvaliacaoRecebida({ ...comAvaliacao([0.05]), avaliacaoDeQualidade: { estado: 'ausente', motivo: 'sem análise', fonte: 'tela' } });
    expect([declaradaAusente.estado, declaradaAusente.motivo]).toEqual(['ausente', 'sem análise']);
    const semDados = classificarAvaliacaoRecebida({ ...comByStatusFabricado(), avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'tela' } });
    expect(semDados.estado).toBe('incompleta');
    expect(semDados.motivo).toContain('não traz CR por respondente');
  });

  test('a tela classifica antes de montar: respondentes, respostas ou nada', () => {
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [respondente(1, 0.05)], respostasAtivas: [] }).estado).toBe('disponivel');
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [], respostasAtivas: [{ consistency: { cr: 0.07 } }] }).estado).toBe('disponivel');
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [], respostasAtivas: [{ id: 'sem-cr' }] }).estado).toBe('ausente');
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [], respostasAtivas: [] }).estado).toBe('ausente');
  });
});

describe('A.12: as quatro situações, pelo handler real', () => {
  jest.setTimeout(30000);

  test('avaliação AUSENTE: sem percentual, sem nota, sem veredicto e SEM penalização', async () => {
    const c = await executar(base(), SEM_VEREDICTO);
    // Contexto ao modelo.
    expect(c.contextoAoModelo).toContain('AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL');
    expect(c.contextoAoModelo).toContain('Taxa de Validade Geral:** não calculada');
    expect(c.contextoAoModelo).toContain('Pontuação automática: não calculada');
    expect(c.contextoAoModelo).not.toMatch(PERCENTUAIS);
    expect(c.contextoAoModelo).not.toContain('Distribuição de Qualidade');
    // Resposta da API.
    expect(c.respostaDaApi.nota).toBeNull();
    expect(c.respostaDaApi.veredicto).toBeNull();
    expect(c.respostaDaApi.metadata.automaticGrade).toBeNull();
    expect(c.respostaDaApi.metadata.gradeSource).toBe('suspensa');
    expect(c.respostaDaApi.notaSuspensa).toMatchObject({ suspensa: true, rotulo: ROTULO_NOTA_SUSPENSA, motivo: MOTIVO_AUSENTE });
    expect(c.respostaDaApi.metadata.avaliacaoDeQualidade.estado).toBe('ausente');
    // Apresentação ao gestor.
    expect(c.apresentacaoAoGestor.mostraNotaEVeredicto).toBe(false);
    expect(c.apresentacaoAoGestor.rotuloExibido).toBe(ROTULO_NOTA_SUSPENSA);
    expect(c.apresentacaoAoGestor.motivoExibido).toBe(MOTIVO_AUSENTE);
    // ⚠ Os cálculos AHP-BOCR seguem no contexto e na resposta.
    expect(c.contextoAoModelo).toContain('A1 — Alternativa 1: Score = 0.620000');
    expect(c.contextoAoModelo).toContain('**Benefits (Benefícios):** 37.0%');
    expect(c.respostaDaApi.review.length).toBeGreaterThan(0);
  });

  test('byStatus fabricado pela tela antiga também NÃO vale como avaliação', async () => {
    const c = await executar(comByStatusFabricado(), SEM_VEREDICTO);
    expect(c.contextoAoModelo).not.toContain('CONFIÁVEIS (CR ≤ 0.10): 12');
    expect(c.respostaDaApi.nota).toBeNull();
    expect(c.respostaDaApi.notaSuspensa.suspensa).toBe(true);
  });

  test('avaliação VÁLIDA com confiáveis: comportamento existente preservado', async () => {
    const c = await executar(comAvaliacao([0.05, 0.06, 0.04, 0.07]), SEM_VEREDICTO);
    expect(c.respostaDaApi.notaSuspensa).toBeNull();
    expect(c.respostaDaApi.metadata.gradeSource).toBe('automatic');
    expect(c.respostaDaApi.metadata.automaticGrade).toEqual({ nota: 'A', veredicto: 'ACEITO', score: 100 });
    expect([c.respostaDaApi.nota, c.respostaDaApi.veredicto]).toEqual(['A', 'ACEITO']);
    expect(c.contextoAoModelo).toContain('CONFIÁVEIS (CR ≤ 0.10): 4 (100.0%)');
    expect(c.contextoAoModelo).toContain('Taxa de Validade Geral:** 100.0%');
    expect(c.apresentacaoAoGestor.mostraNotaEVeredicto).toBe(true);
  });

  test('avaliação VÁLIDA com ZERO confiáveis: zero é observado, e a regra existente vale', async () => {
    const c = await executar(comAvaliacao([0.30, 0.35, 0.40, 0.25]), SEM_VEREDICTO);
    expect(c.respostaDaApi.notaSuspensa).toBeNull();
    // 100 − 40 (validPercent 0) − 15 (criticalPercent 100) = 45, a regra de antes.
    expect(c.respostaDaApi.metadata.automaticGrade).toEqual({ nota: 'F', veredicto: 'REJEITAR', score: 45 });
    expect(c.contextoAoModelo).toContain('CONFIÁVEIS (CR ≤ 0.10): 0 (0.0%)');
    expect(c.contextoAoModelo).toContain('Taxa de Validade Geral:** 0.0%');
    expect(c.apresentacaoAoGestor.mostraNotaEVeredicto).toBe(true);
  });

  test('avaliação INCOMPLETA: insuficiência explícita e classificação global suspensa', async () => {
    const c = await executar(comAvaliacao([0.05, 0.06, null, null]), SEM_VEREDICTO);
    expect(c.respostaDaApi.nota).toBeNull();
    expect(c.respostaDaApi.notaSuspensa.suspensa).toBe(true);
    expect(c.respostaDaApi.notaSuspensa.motivo).toContain('incompleta');
    expect(c.respostaDaApi.notaSuspensa.motivo).toContain('Medido: 2 de 4');
    expect(c.respostaDaApi.metadata.avaliacaoDeQualidade.estado).toBe('incompleta');
    expect(c.contextoAoModelo).toContain('AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL');
    expect(c.contextoAoModelo).not.toMatch(PERCENTUAIS);
    expect(c.apresentacaoAoGestor.mostraNotaEVeredicto).toBe(false);
  });
});

describe('A.12: a nota extraída do texto NÃO restabelece nota suspensa', () => {
  jest.setTimeout(30000);

  test('com ACEITO na DECISÃO EDITORIAL e avaliação ausente, a nota permanece suspensa', async () => {
    const c = await executar(base(), COM_ACEITO);
    expect(c.respostaDaApi.review).toContain('ACEITO');
    expect(c.respostaDaApi.nota).toBeNull();
    expect(c.respostaDaApi.veredicto).toBeNull();
    expect(c.respostaDaApi.metadata.gradeSource).toBe('suspensa');
    expect(c.apresentacaoAoGestor.rotuloExibido).toBe(ROTULO_NOTA_SUSPENSA);
    expect(c.apresentacaoAoGestor.motivoExibido).toBe(MOTIVO_AUSENTE);
  });

  test('CONTROLE: com avaliação disponível, o mesmo texto continua governando a nota', async () => {
    const c = await executar(comAvaliacao([0.30, 0.35, 0.40, 0.25]), COM_ACEITO);
    expect(c.respostaDaApi.metadata.gradeSource).toBe('ai');
    expect([c.respostaDaApi.nota, c.respostaDaApi.veredicto]).toEqual(['A', 'ACEITO']);
    expect(c.respostaDaApi.metadata.automaticGrade.score).toBe(45);
  });
});

describe('A.12: a origem, e o que A.27 continua sendo', () => {
  const ler = (rel: string) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');

  test('a tela classifica antes de montar, e não fabrica mais a distribuição', () => {
    const tela = ler('app/decisor/resultados/[projectId]/page.tsx');
    expect(tela).toContain("import { classificarAvaliacaoDaTela } from '@/lib/ai-reviewer/avaliacao-qualidade';");
    expect(tela).toContain('const qualidadeAvaliada = avaliacaoDeQualidade.estado === \'disponivel\';');
    expect(tela).toContain('qualityAnalysis: qualidadeAvaliada ? {');
    expect(tela).toContain('overallStats: qualidadeAvaliada ? {');
    // ⚠ As três fabricações de antes saíram.
    expect(tela).not.toContain("'CONFIÁVEL': individualStats.valid || calculation.responseCount || 0");
    expect(tela).not.toContain('ok: individualStats.valid || calculation.responseCount || 0');
    expect(tela).not.toContain('total: individualStats.total || calculation.responseCount || activeProjectResponses.length || 0');
  });

  test('a apresentação mostra o motivo no lugar da nota, e os selos ficam condicionados', () => {
    const componente = ler('components/ParecerAISection.tsx');
    // ⚠ A chave de abertura faz parte da âncora **de propósito**: sem ela, um
    // contraexemplo que prefixasse a condição com `false &&` continuava passando.
    expect(componente).toContain('{aiReview.notaSuspensa?.suspensa && (');
    expect(componente).toContain('{aiReview.notaSuspensa.rotulo}');
    expect(componente).toContain('{aiReview.notaSuspensa.motivo}');
    expect(componente).toContain("{!aiReview.notaSuspensa?.suspensa && presentation?.estado === 'aprovado'");
  });

  test('o ramo de declaração sem dados é DEFENSIVO: o contrato não o alcança, e ele não penaliza', () => {
    // ⚠ Medição de um contraexemplo que NÃO reprovou: trocar esse ramo pela
    // penalização antiga (`score -= 15`) não derrubou teste nenhum. A razão está
    // abaixo, e não é fraqueza da suíte: `disponivel` só sai da classificação com
    // CR para TODOS os respondentes, e aí `calculateGrade` já parou numa
    // prioridade anterior. O ramo fica como defesa se o contrato mudar.
    const amostras: any[] = [
      {},
      { qualityAnalysis: { statistics: { byStatus: { 'CONFIÁVEL': 12 }, total: 12 } } },
      { qualityAnalysis: { respondents: [] } },
      { qualityAnalysis: { respondents: [{ cr: 0.05 }, { name: 'sem CR' }] } },
      { qualityAnalysis: { respondents: [{ cr: 0.05 }, { metrics: { avgCR: 0.4 } }] } },
      { overallStats: balde(12, 12), qualityAnalysis: { summary: { total: 12, ok: 12 } } },
      { avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada' } },
      {
        avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada' },
        qualityAnalysis: { statistics: { byStatus: { 'CONFIÁVEL': 3 } }, summary: { total: 3, ok: 3 } },
      },
      {
        avaliacaoDeQualidade: { estado: 'ausente', motivo: MOTIVO_AUSENTE, fonte: 'declarada' },
        qualityAnalysis: { respondents: [{ cr: 0.05 }] },
      },
    ];
    let disponiveis = 0;
    for (const raw of amostras) {
      const avaliacao = classificarAvaliacaoRecebida(raw);
      if (!qualidadeDisponivel(avaliacao)) continue;
      disponiveis += 1;
      const m = medicaoPorRespondente(raw?.qualityAnalysis?.respondents);
      // Se chegou a `disponivel`, há respondentes medidos — então há PRIORIDADE 2.
      expect([avaliacao.fonte, m.total > 0 && m.comCR === m.total]).toEqual([avaliacao.fonte, true]);
    }
    expect(disponiveis).toBe(1);

    // E, se for alcançado, o ramo SUSPENDE; não penaliza.
    const rota = ler('app/api/ai-reviewer/route.ts');
    const inicio = rota.indexOf('Avaliação declarada disponível, mas a requisição não traz distribuição');
    expect(inicio).toBeGreaterThan(-1);
    const ramo = rota.slice(inicio, inicio + 320);
    expect(ramo).toContain('return { suspensa: true, nota: null, veredicto: null, score: null, motivo };');
    expect(ramo).not.toContain('score -=');
  });

  test('A.27 permanece distinta: a validação do parecer não muda com a suspensão', async () => {
    const ausente = await executar(base(), SEM_VEREDICTO);
    const avaliada = await executar(comAvaliacao([0.05, 0.06]), SEM_VEREDICTO);
    for (const c of [ausente, avaliada]) {
      expect(c.respostaDaApi.validation.estado).toBe('aprovado');
      expect(c.apresentacaoAoGestor.estado).toBe('aprovado');
    }
    // A suspensão é da classificação de qualidade dos DADOS, não do texto.
    expect(ausente.respostaDaApi.notaSuspensa.suspensa).toBe(true);
    expect(avaliada.respostaDaApi.notaSuspensa).toBeNull();
    expect(ausente.respostaDaApi.validation).toEqual(avaliada.respostaDaApi.validation);
  });
});
