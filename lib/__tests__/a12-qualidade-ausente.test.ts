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
 *
 * ⚠ **Nota e veredicto, Fase 2:** o bloco "Referência Automatizada" saiu do contexto do modelo;
 * `metadata.automaticGrade` saiu da resposta; `metadata.gradeSource` deu lugar a
 * `metadata.estadoDaExtracao`; e a mensagem de não identificação vai em `mensagemDaExtracao`, no
 * nível principal. Sem padrão reconhecido no texto, `nota` e `veredicto` ficam NULOS: não há mais
 * valor automático substituto. A regra de `calculateGrade` segue sendo calculada (e registrada no
 * log "Resultado"), e é por esse log que esta suíte a observa.
 *
 * ⚠ **AJUSTE 1 (A.12 item (c)): o que mudou aqui, e por quê.** (1) A avaliação é DISPONÍVEL só com o bloco
 * `consistenciaIndividual` (CR por matriz recalculado dos julgamentos) em TODO respondente enviado: `cr` e `status`
 * em cache NÃO tornam disponível. (2) A pontuação automática e as categorias de pessoa (CONFIÁVEIS/REVISAR/SUSPEITOS/
 * CRÍTICOS), a "Taxa de Validade Geral" e o log "Resultado: <nota> (<score>/100)" SAÍRAM, junto com o log "Divergência"
 * (que comparava o texto do modelo com essa pontuação): são os constructos sem lastro de A.12 (c). O que o contexto traz de
 * qualidade individual agora é o CR POR MATRIZ, com a população e os denominadores escritos. (3) Os testes que
 * afirmavam a regra antiga passaram a afirmar o que a substituiu, e dizem qual afirmação trocaram.
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { blocoDoMaximo } = require('./helpers/consistencia-de-ensaio');

/** O respondente do formato ANTERIOR: `cr` e `status` em cache, SEM bloco. Desde o Ajuste 1 isso NÃO é avaliação. */
const respondente = (i: number, cr: number | null) => ({
  id: `resp-${i}`,
  name: `Respondente ${i}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
});

/** O respondente do formato ATUAL: o mesmo, com o bloco (CR governante `cr` recalculado, ou sem CR se `null`). */
const respondenteComBloco = (i: number, cr: number | null) => ({ ...respondente(i, cr), consistenciaIndividual: blocoDoMaximo(cr) });

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
  const respondents = crs.map((cr, i) => respondenteComBloco(i + 1, cr));
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
  /** Os `console.log` do handler, em ordem (o canal em que a regra de `calculateGrade` segue observável). */
  logsDoHandler: string[];
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
  const logsDoHandler: string[] = [];
  const silencios = ['log', 'warn', 'error'].map((m) =>
    jest.spyOn(console, m as 'log').mockImplementation((...a: unknown[]) => {
      if (m === 'log') logsDoHandler.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
    })
  );
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
      logsDoHandler,
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
const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;
/** O literal do PEDIDO (nota e veredicto, Fase 2): o instrumento não aprende a frase do que o código imprime. */
const MENSAGEM_DA_EXTRACAO = 'Veredito não identificado no texto do parecer simulado.';

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

  test('Ajuste 1: o CR em CACHE (cr, status, metrics) sem o bloco recalculado NAO torna a avaliacao disponivel', () => {
    // O mesmo painel do teste anterior, no formato ANTERIOR (sem bloco): antes era `disponivel`, agora é `incompleta` com 0 de 2.
    const emCache = {
      ...base(),
      qualityAnalysis: { respondents: [respondente(1, 0.05), respondente(2, 0.08)] },
    };
    const a = classificarAvaliacaoRecebida(emCache);
    expect(a.estado).toBe('incompleta');
    expect(a.motivo).toContain('Medido: 0 de 2 respondentes com CR.');
    expect(qualidadeDisponivel(a)).toBe(false);
    // e o cache que CONTRADIZ o bloco não prevalece: o estado sai do bloco
    const conflitante = { ...base(), qualityAnalysis: { respondents: [{ ...respondenteComBloco(1, 0.30), cr: 0.01, status: 'CONFIÁVEL' }] } };
    expect(classificarAvaliacaoRecebida(conflitante).estado).toBe('disponivel');
    // e um bloco inválido (formato não reconhecido) é incompleto, nunca zero
    const invalido = { ...base(), qualityAnalysis: { respondents: [{ ...respondente(1, 0.05), consistenciaIndividual: { esquema: 'outro' } }] } };
    expect(classificarAvaliacaoRecebida(invalido).estado).toBe('incompleta');
  });

  test('a declaração do cliente vale, e é conferida', () => {
    const declaradaAusente = classificarAvaliacaoRecebida({ ...comAvaliacao([0.05]), avaliacaoDeQualidade: { estado: 'ausente', motivo: 'sem análise', fonte: 'tela' } });
    expect([declaradaAusente.estado, declaradaAusente.motivo]).toEqual(['ausente', 'sem análise']);
    const semDados = classificarAvaliacaoRecebida({ ...comByStatusFabricado(), avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'tela' } });
    expect(semDados.estado).toBe('incompleta');
    // Ajuste 1: a mensagem diz o que a requisição NÃO traz agora, o CR por matriz recalculado (antes: «CR por respondente»).
    expect(semDados.motivo).toContain('não traz CR por matriz recalculado dos julgamentos para todos os respondentes enviados');
  });

  test('a tela classifica antes de montar: respondentes, respostas ou nada', () => {
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [respondenteComBloco(1, 0.05)], respostasAtivas: [] }).estado).toBe('disponivel');
    // Ajuste 1: o formato anterior (`cr` sem bloco) e o `consistency.cr` em cache da resposta NÃO tornam disponível. Antes: `disponivel`.
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [respondente(1, 0.05)], respostasAtivas: [] }).estado).toBe('incompleta');
    expect(classificarAvaliacaoDaTela({ respondentesAvaliados: [], respostasAtivas: [{ consistency: { cr: 0.07 } }] }).estado).toBe('ausente');
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
    // Ajuste 1: a «Taxa de Validade Geral» saiu do contexto (era taxa de pessoas, sem lastro). Fica a frase da seção por dimensão
    // para o painel sem nenhum CR recalculado, palavra por palavra, e a taxa NÃO volta em canal nenhum.
    expect(c.contextoAoModelo).toContain('⚠️ Não disponíveis: a qualidade individual não foi avaliada. Nenhum percentual por dimensão é apresentado.');
    expect(c.contextoAoModelo).not.toContain('Taxa de Validade');
    // ⚠ O bloco "Referência Automatizada" saiu, e o MOTIVO continua chegando ao contexto, UMA vez (no bloco de qualidade).
    expect(c.contextoAoModelo).not.toContain('Pontuação automática');
    expect(c.contextoAoModelo).not.toContain('Referência Automatizada');
    expect(ocorrencias(c.contextoAoModelo, MOTIVO_AUSENTE)).toBe(1);
    expect(c.contextoAoModelo).not.toMatch(PERCENTUAIS);
    expect(c.contextoAoModelo).not.toContain('Distribuição de Qualidade');
    // Resposta da API.
    expect(c.respostaDaApi.nota).toBeNull();
    expect(c.respostaDaApi.veredicto).toBeNull();
    expect(c.respostaDaApi.metadata).not.toHaveProperty('automaticGrade');
    expect(c.respostaDaApi.metadata).not.toHaveProperty('gradeSource');
    expect(c.respostaDaApi.metadata.estadoDaExtracao).toBe('nao_executada_por_suspensao');
    expect(c.respostaDaApi.mensagemDaExtracao).toBeNull();
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

  test('avaliação VÁLIDA, todas as matrizes dentro do limiar: elegível, contexto com o CR por matriz; sem padrão no texto, nota e veredicto NULOS', async () => {
    const c = await executar(comAvaliacao([0.05, 0.06, 0.04, 0.07]), SEM_VEREDICTO);
    expect(c.respostaDaApi.notaSuspensa).toBeNull();
    // ⚠ Sem padrão reconhecido, NÃO há valor automático substituto: nota e veredicto nulos, e a mensagem do pedido.
    expect(c.respostaDaApi.metadata.estadoDaExtracao).toBe('nenhum_padrao_reconhecido');
    expect(c.respostaDaApi.metadata).not.toHaveProperty('automaticGrade');
    expect(c.respostaDaApi.metadata).not.toHaveProperty('gradeSource');
    expect([c.respostaDaApi.nota, c.respostaDaApi.veredicto]).toEqual([null, null]);
    expect(c.respostaDaApi.mensagemDaExtracao).toBe(MENSAGEM_DA_EXTRACAO);
    // Ajuste 1: a regra automática (log «Resultado: A (100/100) - ACEITO») SAIU, e o log passa a dizer o portão e que não há valor automático.
    expect(c.logsDoHandler.some((l) => /Classificação NÃO suspensa: avaliação disponível e coerente\. Sem valor automático de nota/.test(l))).toBe(true);
    expect(c.logsDoHandler.filter((l) => /Resultado: [A-F] \(/.test(l))).toEqual([]);
    // O que o contexto traz: o CR por matriz com a POPULAÇÃO escrita (4 respondentes x 6 matrizes = 24), nenhuma acima do limiar.
    expect(c.contextoAoModelo).toContain('Respondentes enviados: 4. Com CR recalculado dos julgamentos nas 6 matrizes: 4. Sem CR: 0.');
    expect(c.contextoAoModelo).toContain('Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 0 de 24 (0.0%).');
    // e NENHUMA categoria de pessoa nem taxa: cada texto abaixo existia no contexto anterior
    for (const removido of ['CONFIÁVEIS (CR ≤ 0.10)', 'Taxa de Validade', 'Distribuição de Qualidade', 'Pontuação automática']) {
      expect({ removido, presente: c.contextoAoModelo.includes(removido) }).toEqual({ removido, presente: false });
    }
    // Sem nota nem veredicto, não há destaque.
    expect(c.apresentacaoAoGestor.mostraNotaEVeredicto).toBe(false);
  });

  test('avaliação VÁLIDA, TODAS as matrizes acima do limiar: o contagem é descritiva, sem nota automática e sem recomendação de exclusão', async () => {
    // Ajuste 1: substitui «ZERO confiáveis» (zero de PESSOAS confiáveis, regra 100 − 40 − 15 = 45 → F/REJEITAR). Não há mais categoria de
    // pessoa nem score: o CR governante de 0.25–0.40 deixa as 24 matrizes (a metade do governante é > 0.10) acima do limiar, e o
    // contexto diz isso por matriz, sem rotular nenhum respondente e sem tratar a contagem como critério de exclusão.
    const c = await executar(comAvaliacao([0.30, 0.35, 0.40, 0.25]), SEM_VEREDICTO);
    expect(c.respostaDaApi.notaSuspensa).toBeNull();
    expect(c.logsDoHandler.filter((l) => /Resultado: [A-F] \(/.test(l))).toEqual([]);
    expect(c.respostaDaApi.metadata).not.toHaveProperty('automaticGrade');
    expect([c.respostaDaApi.nota, c.respostaDaApi.veredicto]).toEqual([null, null]);
    expect(c.respostaDaApi.metadata.estadoDaExtracao).toBe('nenhum_padrao_reconhecido');
    expect(c.contextoAoModelo).toContain('Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 24 de 24 (100.0%).');
    expect(c.contextoAoModelo).toContain('Respondentes com ao menos uma matriz com CR > 0.10: 4 de 4.');
    expect(c.contextoAoModelo).toContain('não é critério de exclusão de participantes');
    for (const removido of ['CONFIÁVEIS (CR ≤ 0.10)', 'Taxa de Validade', '45/100', 'REJEITAR (', 'Respondentes críticos']) {
      expect({ removido, presente: c.contextoAoModelo.includes(removido) }).toEqual({ removido, presente: false });
    }
    expect(c.apresentacaoAoGestor.mostraNotaEVeredicto).toBe(false);
  });

  test('avaliação INCOMPLETA: insuficiência explícita e classificação global suspensa', async () => {
    const c = await executar(comAvaliacao([0.05, 0.06, null, null]), SEM_VEREDICTO);
    expect(c.respostaDaApi.nota).toBeNull();
    expect(c.respostaDaApi.notaSuspensa.suspensa).toBe(true);
    expect(c.respostaDaApi.notaSuspensa.motivo).toContain('incompleta');
    expect(c.respostaDaApi.notaSuspensa.motivo).toContain('Medido: 2 de 4');
    expect(c.respostaDaApi.metadata.avaliacaoDeQualidade.estado).toBe('incompleta');
    // Ajuste 1: com 2 de 4 respondentes COM CR, o texto é o da avaliação INCOMPLETA (não o de «NÃO DISPONÍVEL», que diria que os CRs
    // não foram avaliados — falso para os dois que os têm), e os denominadores são os de 2 respondentes × 6 matrizes = 12.
    expect(c.contextoAoModelo).toContain('AVALIAÇÃO INDIVIDUAL DE QUALIDADE INCOMPLETA');
    expect(c.contextoAoModelo).not.toContain('AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL');
    expect(c.contextoAoModelo).toContain('Respondentes enviados: 4. Com CR recalculado dos julgamentos nas 6 matrizes: 2. Sem CR: 2 (julgamentos incompletos: 2).');
    expect(c.contextoAoModelo).toContain('Matrizes avaliadas: 12 (2 respondentes × 6 matrizes não triviais');
    expect(c.contextoAoModelo).toContain('NÃO é resultado favorável nem desfavorável, e não deve ser tratada como zero.');
    // e os dois sem CR aparecem COMO sem CR, um a um, sem valor e sem zero
    expect(ocorrencias(c.contextoAoModelo, 'CR por matriz: NÃO DISPONÍVEL — julgamentos incompletos')).toBe(2);
    expect(c.contextoAoModelo).not.toContain('Taxa de Validade');
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
    // ⚠ R1: a extração NÃO corre sob suspensão, e o estado diz isso.
    expect(c.respostaDaApi.metadata.estadoDaExtracao).toBe('nao_executada_por_suspensao');
    expect(c.respostaDaApi.mensagemDaExtracao).toBeNull();
    expect(c.logsDoHandler.filter((l) => /Grade extraída/.test(l))).toEqual([]);
    expect(c.apresentacaoAoGestor.rotuloExibido).toBe(ROTULO_NOTA_SUSPENSA);
    expect(c.apresentacaoAoGestor.motivoExibido).toBe(MOTIVO_AUSENTE);
  });

  test('CONTROLE: com avaliação disponível, o mesmo texto continua governando a nota', async () => {
    const c = await executar(comAvaliacao([0.30, 0.35, 0.40, 0.25]), COM_ACEITO);
    expect(c.respostaDaApi.metadata.estadoDaExtracao).toBe('padrao_reconhecido');
    expect(c.respostaDaApi.mensagemDaExtracao).toBeNull();
    expect([c.respostaDaApi.nota, c.respostaDaApi.veredicto]).toEqual(['A', 'ACEITO']);
    // Ajuste 1: a classificação automática (F, 45/100, derivada de categorias de pessoa) e o log de «Divergência» com ela SAÍRAM. O texto
    // do modelo governa a nota sob o portão, e nenhuma comparação com um score sem lastro é feita ou registrada.
    expect(c.logsDoHandler.filter((l) => /Resultado: [A-F] \(|Divergência: IA=/.test(l))).toEqual([]);
    expect(c.logsDoHandler.some((l) => /Classificação NÃO suspensa/.test(l))).toBe(true);
  });
});

describe('A.12: a origem, e o que A.27 continua sendo', () => {
  const ler = (rel: string) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');

  test('a tela classifica antes de montar, e não fabrica mais a distribuição', () => {
    // Ajuste 1: a montagem do pedido saiu da tela para `lib/ai-reviewer/montagem-do-pedido.ts` (função pura que a tela chama).
    // As âncoras passam a ser lidas lá; a tela só chama a montagem. ⚠ É LEITURA do fonte, e não execução da tela.
    const tela = ler('app/decisor/resultados/[projectId]/page.tsx');
    const montagem = ler('lib/ai-reviewer/montagem-do-pedido.ts');
    expect(tela).toContain("import { montarPedidoDoParecer } from '@/lib/ai-reviewer/montagem-do-pedido';");
    expect(montagem).toContain("import { classificarAvaliacaoDaTela, type AvaliacaoQualidade } from './avaliacao-qualidade';");
    expect(montagem).toContain('const avaliacaoDeQualidade = classificarAvaliacaoDaTela({');
    // ⚠ O que ia ao modelo em `qualityAnalysis` agora é SÓ a lista, e `overallStats` não existe mais no payload.
    expect(montagem).toContain('qualityAnalysis: { respondents: respondentesComConsistencia },');
    // (a palavra aparece em COMENTÁRIOS da montagem, que dizem o que não viaja; o que se confere é que não há CHAVE `overallStats:`)
    expect(montagem).not.toMatch(/overallStats\s*:/);
    expect(montagem).not.toMatch(/individualStats\s*:|statistics\s*:|summary\s*:/);
    expect(tela).not.toContain('overallStats: qualidadeAvaliada');
    expect(tela).not.toContain('qualityAnalysis: qualidadeAvaliada ? {');
    // ⚠ As três fabricações de antes continuam fora, na tela E na montagem.
    for (const fonte of [tela, montagem]) {
      expect(fonte).not.toContain("'CONFIÁVEL': individualStats.valid || calculation.responseCount || 0");
      expect(fonte).not.toContain('ok: individualStats.valid || calculation.responseCount || 0');
      expect(fonte).not.toContain('total: individualStats.total || calculation.responseCount || activeProjectResponses.length || 0');
    }
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

  test('o portão de classificação não penaliza: sem avaliação disponível ele SUSPENDE, e não há mais ramo de pontuação', () => {
    // Ajuste 1: ANTES este teste media um ramo DEFENSIVO («declarada disponível, mas sem distribuição») que suspendia em vez de
    // penalizar com `score -= 15`. A distribuição saiu do pedido, e com ela o ramo e toda penalização: `calculateGrade` virou só o
    // portão. A parte do teste que continua valendo é a de que `disponivel` só sai da classificação com o CR recalculado de TODOS os
    // respondentes enviados, e é essa que se mede abaixo; a outra parte passou a ser a AUSÊNCIA de pontuação no fonte.
    const bloco = (cr: number) => ({ consistenciaIndividual: blocoDoMaximo(cr) });
    const amostras: any[] = [
      {},
      { qualityAnalysis: { statistics: { byStatus: { 'CONFIÁVEL': 12 }, total: 12 } } },
      { qualityAnalysis: { respondents: [] } },
      { qualityAnalysis: { respondents: [{ cr: 0.05 }, { name: 'sem CR' }] } },
      // o formato ANTERIOR, com CR em cache em todos os respondentes: antes era `disponivel`, e agora NÃO é
      { qualityAnalysis: { respondents: [{ cr: 0.05 }, { metrics: { avgCR: 0.4 } }] } },
      // o formato ATUAL, com o bloco recalculado em todos: a única amostra disponível
      { qualityAnalysis: { respondents: [bloco(0.05), bloco(0.4)] } },
      // bloco em um só dos dois: incompleta
      { qualityAnalysis: { respondents: [bloco(0.05), { cr: 0.05 }] } },
      { overallStats: balde(12, 12), qualityAnalysis: { summary: { total: 12, ok: 12 } } },
      { avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada' } },
      {
        avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada' },
        qualityAnalysis: { statistics: { byStatus: { 'CONFIÁVEL': 3 } }, summary: { total: 3, ok: 3 } },
      },
      {
        avaliacaoDeQualidade: { estado: 'ausente', motivo: MOTIVO_AUSENTE, fonte: 'declarada' },
        qualityAnalysis: { respondents: [bloco(0.05)] },
      },
    ];
    let disponiveis = 0;
    for (const raw of amostras) {
      const avaliacao = classificarAvaliacaoRecebida(raw);
      if (!qualidadeDisponivel(avaliacao)) continue;
      disponiveis += 1;
      const m = medicaoPorRespondente(raw?.qualityAnalysis?.respondents);
      // Se chegou a `disponivel`, há respondentes medidos, TODOS com o bloco recalculado.
      expect([avaliacao.fonte, m.total > 0 && m.comCR === m.total]).toEqual([avaliacao.fonte, true]);
    }
    expect(disponiveis).toBe(1);

    // E o fonte do portão: sem ramo de pontuação.
    const rota = ler('app/api/ai-reviewer/route.ts');
    const inicio = rota.indexOf('function calculateGrade(data: ReviewRequest): Classificacao {');
    expect(inicio).toBeGreaterThan(-1);
    const fim = rota.indexOf('\n}\n', inicio);
    const corpo = rota.slice(inicio, fim);
    expect(corpo).toContain('return { suspensa: true, nota: null, veredicto: null, score: null, motivo };');
    expect(corpo).toContain('return { suspensa: false, nota: null, veredicto: null, score: null, motivo: null };');
    expect(corpo).not.toContain('score -=');
    expect(corpo).not.toMatch(/byStatus|overallStats|validPercent|criticalPercent/);
    expect(rota).not.toContain('Avaliação declarada disponível, mas a requisição não traz distribuição');
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
