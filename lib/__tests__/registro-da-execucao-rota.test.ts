/**
 * lib/__tests__/registro-da-execucao-rota.test.ts
 *
 * O registro de execução do Parecer IA, pelo HANDLER REAL de `app/api/ai-reviewer/route.ts`, com os três clientes externos
 * simulados (Anthropic, Voyage, Upstash).
 *
 * ⚠ **Nenhuma chamada paga e nenhuma requisição de rede:** o cliente do provedor é um duplo, as chaves são fictícias e o
 * índice vetorial é um duplo. Nada aqui diz o que um parecer REAL escreveria.
 *
 * ⚠ **O que se verifica:** (A) sem o pedido, a resposta é a de antes; (B) o objeto enviado ao provedor é o registrado;
 * (C) a entrada é preservada se o objeto de origem mudar depois; (D) os estados da recuperação semântica; (E) a associação
 * entre texto, metadados e validação da MESMA execução, inclusive de saída reprovada; (F) campos do provedor, com e sem
 * raciocínio interno; (G) nenhum segredo; (H) implantação; (I) tempos; (J) ids; (K) falha ao montar não derruba o parecer;
 * (L) exportar não gera nada; (M) a falha do provedor segue sendo erro.
 */

export {};

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DIMS = 1024;
const CHAVES_FALSAS: Record<string, string> = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_ENV'];
const envOriginal: Record<string, string | undefined> = {};

const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

type Chunk = { id: string; score: number; metadata: Record<string, unknown> };
const chunk = (id: string, artigo: string, score: number): Chunk => ({
  id, score,
  metadata: {
    article_id: artigo, article_year: 2020, article_type: 'paper', chunk_type: 'claim', chunk_index: 1,
    text: 'texto do ' + id, verbatim_quote: 'verbatim do ' + id, page: 10, locator_type: null, locator_id: 'loc-' + id, usable_as: null,
  },
});
const CINCO: Chunk[] = [chunk('k1', 'artigo_alfa', 0.95), chunk('k2', 'artigo_alfa', 0.94), chunk('k3', 'artigo_alfa', 0.93), chunk('k4', 'artigo_alfa', 0.92), chunk('k5', 'artigo_beta', 0.91)];

/* eslint-disable @typescript-eslint/no-var-requires */
function payloadDaTela(extra: Record<string, unknown> = {}) {
  const { prepararVinculoDaTela } = require('@/lib/ai-reviewer/vinculo-execucao');
  const { classificarAvaliacaoDaTela } = require('@/lib/ai-reviewer/avaliacao-qualidade');
  const respondentes = ['r1', 'r2', 'r3', 'r4'].map((id, i) => ({
    id, respondentId: id, email: `${id}@exemplo.org`, cr: 0.04 + i * 0.05, status: i < 2 ? 'CONFIÁVEL' : i === 2 ? 'SUSPEITO' : 'CRÍTICO',
    isSimulated: false, metrics: { avgCR: 0.04 + i * 0.05 },
  }));
  const calculo = { executionId: 'exec-ensaio-0001', includedRespondents: ['r1', 'r2', 'r3', 'r4'] };
  const preparo = prepararVinculoDaTela({ calculo, respondentesAtivos: respondentes, respostasAtivas: [] });
  const avaliacaoDeQualidade = classificarAvaliacaoDaTela({ respondentesAvaliados: preparo.respondentesEnviados, respostasAtivas: preparo.respostasEnviadas });
  return {
    avaliacaoDeQualidade,
    vinculoDaExecucao: preparo.vinculo,
    projectName: 'Projeto de ensaio do registro',
    projectDescription: 'Descrição do projeto de ensaio',
    alternatives: [{ code: 'A1', name: 'Alternativa 1' }, { code: 'A2', name: 'Alternativa 2' }],
    finalScores: [{ code: 'A1', name: 'Alternativa 1', score: 0.62 }, { code: 'A2', name: 'Alternativa 2', score: 0.38 }],
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    personalWeights: { Benefits: 0.3, Opportunities: 0.2, Costs: 0.25, Risks: 0.25 },
    rescalingWeights: { Benefits: 0.4, Opportunities: 0.1, Costs: 0.3, Risks: 0.2 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    sensitivityInflections: { B: null, O: 42, C: null, R: 17 },
    demographicsSummary: { total: 4, hasData: true, fields: { formacao: ['Mestrado'] } },
    exclusionInfo: { totalCollected: 6, activeCount: 4, excludedCount: 2, reason: 'CR > 0.10' },
    qualityAnalysis: {
      respondents: respondentes,
      statistics: { byStatus: { 'CONFIÁVEL': 2, 'REVISAR': 0, 'SUSPEITO': 1, 'CRÍTICO': 1 }, total: 4, avgCR: 0.1 },
      summary: { total: 4, ok: 2, suspicious: 1, critical: 1 },
    },
    ...extra,
  };
}
/* eslint-enable @typescript-eslint/no-var-requires */

const PEDIDO = { projectId: 'proj-ensaio-rota', incluirRegistroDaExecucao: true };

type Desfecho = Chunk[] | 'lanca';
interface Opcoes {
  habilitado?: string;
  embedFalha?: boolean;
  porConsulta?: Desfecho[];
  payload?: () => any;
  mensagem?: (args: any) => any;
  naChamada?: (args: any, payload: any) => Promise<void> | void;
  provedorFalha?: boolean;
  env?: Record<string, string | undefined>;
}

const TEXTO_APROVADO = 'PARECER DE ENSAIO DO REGISTRO';
const TEXTO_REPROVADO = 'Há um respondente não identificado na amostra, e ele pesa no resultado.';

function mensagemPadrao(texto: string) {
  return (_args: any) => ({
    id: 'msg_ENSAIO_ROTA', type: 'message', role: 'assistant', model: 'claude-opus-4-6-ensaio',
    content: [
      { type: 'thinking', thinking: 'RACIOCINIO-INTERNO-QUE-NAO-PODE-SER-REGISTRADO', signature: 'sig' },
      { type: 'text', text: texto },
    ],
    stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1234, output_tokens: 567 },
  });
}

async function executar(o: Opcoes = {}) {
  jest.resetModules();
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  for (const n of ['USE_RAG_SEMANTIC', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_ENV']) delete process.env[n];
  if (o.habilitado !== undefined) process.env.USE_RAG_SEMANTIC = o.habilitado;
  for (const [n, v] of Object.entries(o.env ?? {})) { if (v === undefined) delete process.env[n]; else process.env[n] = v; }

  const contagem = { embed: 0, indice: 0, modelo: 0 };
  const chamadasAoModelo: any[] = [];
  const payload = (o.payload ?? (() => payloadDaTela(PEDIDO)))();

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class {
      async embed() {
        contagem.embed += 1;
        if (o.embedFalha) throw new Error('voyage indisponivel no ensaio');
        return { data: [{ embedding: new Array(DIMS).fill(0.1) }] };
      }
    },
  }));
  jest.doMock('@upstash/vector', () => ({
    Index: class {
      async query() {
        const d = (o.porConsulta ?? [])[contagem.indice];
        contagem.indice += 1;
        if (d === 'lanca') throw new Error('indice indisponivel no ensaio');
        return d ?? [];
      }
    },
  }));
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (args: any) => {
          contagem.modelo += 1;
          chamadasAoModelo.push(JSON.parse(JSON.stringify(args)));
          if (o.naChamada) await o.naChamada(args, payload);
          if (o.provedorFalha) throw new Error('provedor indisponivel no ensaio');
          return (o.mensagem ?? mensagemPadrao(TEXTO_APROVADO))(args);
        },
      };
    },
  }));

  const erros: string[] = [];
  const l = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const e = jest.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { erros.push(a.map(String).join(' ')); });
  try {
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => payload } as any);
    const corpo = await res.json();
    return { status: res.status ?? 200, corpo, contagem, chamadasAoModelo, payload, erros, registro: corpo?.metadata?.registroDaExecucao };
  } finally {
    l.mockRestore();
    w.mockRestore();
    e.mockRestore();
  }
}

beforeAll(() => { for (const n of NOMES_ENV) envOriginal[n] = process.env[n]; });
afterAll(() => { for (const n of NOMES_ENV) { if (envOriginal[n] === undefined) delete process.env[n]; else process.env[n] = envOriginal[n]; } });

const CHAVES_DA_METADATA = ['version', 'model', 'timestamp', 'estadoDaExtracao', 'avaliacaoDeQualidade', 'knowledgeBase', 'debug'];

// ============================================================================
describe('A. sem o pedido, a resposta é a de antes; com o pedido, é a mesma mais UMA chave de metadata', () => {
  test('a requisição sem `incluirRegistroDaExecucao` não traz registro, e metadata tem as sete chaves de sempre', async () => {
    const r = await executar({ payload: () => payloadDaTela() });
    expect(r.status).toBe(200);
    expect(Object.keys(r.corpo.metadata)).toEqual(CHAVES_DA_METADATA);
    expect('registroDaExecucao' in r.corpo.metadata).toBe(false);
  });

  test.each([['false', false], ['"true" (texto)', 'true'], ['1', 1]])('só o booleano true pede o registro: %s não pede', async (_rotulo, valor) => {
    const r = await executar({ payload: () => payloadDaTela({ incluirRegistroDaExecucao: valor }) });
    expect('registroDaExecucao' in r.corpo.metadata).toBe(false);
  });

  test('com o pedido: as chaves do nível principal são as mesmas, metadata ganha SÓ `registroDaExecucao` no fim, e o resto do corpo é igual ao do mesmo pedido sem o registro', async () => {
    const sem = await executar({ payload: () => payloadDaTela() });
    const com = await executar();
    expect(Object.keys(com.corpo)).toEqual(Object.keys(sem.corpo));
    expect(Object.keys(com.corpo.metadata)).toEqual([...CHAVES_DA_METADATA, 'registroDaExecucao']);
    const semTempo = (c: any) => { const { registroDaExecucao: _r, timestamp: _t, ...m } = c.metadata; return { ...c, metadata: m }; };
    expect(semTempo(com.corpo)).toEqual(semTempo(sem.corpo));
    // e o que o modelo recebe é o MESMO com e sem o pedido
    expect(com.chamadasAoModelo[0]).toEqual(sem.chamadasAoModelo[0]);
  });
});

// ============================================================================
describe('B. o objeto enviado ao provedor é o objeto registrado', () => {
  test('system, messages e parâmetros: o argumento recebido pelo duplo do SDK === o que o registro guarda', async () => {
    const r = await executar({ habilitado: 'true', porConsulta: Array(5).fill(CINCO) });
    expect(r.contagem.modelo).toBe(1);
    const enviado = r.chamadasAoModelo[0];
    expect(Object.keys(enviado)).toEqual(['model', 'max_tokens', 'thinking', 'system', 'messages']);
    const reg = r.registro;
    expect({ ...reg.modelo.parametrosEnviados, system: reg.prompts.system, messages: reg.prompts.mensagens }).toEqual(enviado);
    expect(reg.modelo.solicitado).toBe(enviado.model);
    expect(reg.modelo.parametrosEnviados).toEqual({ model: 'claude-opus-4-6', max_tokens: 16000, thinking: { type: 'enabled', budget_tokens: 5000 } });
    // e os resumos de integridade cobrem exatamente esse texto
    const resumo = (campo: string) => reg.integridade.resumos.find((x: any) => x.campo === campo).sha256;
    expect(resumo('prompts.system')).toBe(sha(enviado.system));
    expect(resumo('saida.texto')).toBe(sha(r.corpo.review));
  });

  test('o registro NÃO é reconstruído: o prompt registrado traz o que só existe na chamada real (bloco semântico formatado, dados da requisição)', async () => {
    const r = await executar({ habilitado: 'true', porConsulta: Array(5).fill(CINCO) });
    const conteudo = r.registro.prompts.mensagens[0].content;
    expect(conteudo).toContain('Projeto de ensaio do registro');
    expect(conteudo).toContain('r1@exemplo.org');
    expect(conteudo).toContain('**1. artigo_alfa**');
    expect(conteudo).toContain(r.registro.contextoBibliografico.recuperacaoSemantica.textoInjetadoNoPrompt);
  });
});

// ============================================================================
describe('C. a entrada é preservada se o objeto de origem mudar depois (ou durante a chamada)', () => {
  test('mutações na requisição durante a chamada ao modelo NÃO alteram a entrada registrada', async () => {
    const original = payloadDaTela(PEDIDO);
    const r = await executar({
      payload: () => JSON.parse(JSON.stringify(original)),
      naChamada: (_args, payload) => {
        payload.projectName = 'ALTERADO DURANTE A CHAMADA';
        payload.finalScores[0].score = 0.0001;
        payload.qualityAnalysis.respondents[0].email = 'alterado@exemplo.org';
        payload.vinculoDaExecucao.executionId = 'exec-alterado';
      },
    });
    const { recebidaPelaApi, normalizada } = r.registro.entrada;
    expect(recebidaPelaApi).toEqual(original);
    expect(recebidaPelaApi.projectName).toBe('Projeto de ensaio do registro');
    expect(normalizada.projectName).toBe('Projeto de ensaio do registro');
    expect(normalizada.finalScores[0].score).toBe(0.62);
    expect(r.registro.identificacao.idDoCalculo).toBe('exec-ensaio-0001');
  });

  test('a entrada recebida traz também o que a normalização ignora (o pedido e o projeto), e a normalizada, só o que ela mantém', async () => {
    const r = await executar();
    expect(r.registro.entrada.recebidaPelaApi.incluirRegistroDaExecucao).toBe(true);
    expect(r.registro.entrada.recebidaPelaApi.projectId).toBe('proj-ensaio-rota');
    expect('incluirRegistroDaExecucao' in r.registro.entrada.normalizada).toBe(false);
    expect('projectId' in r.registro.entrada.normalizada).toBe(false);
    // filtros de participantes e parâmetros do cálculo que chegaram ao fluxo
    expect(r.registro.entrada.normalizada.exclusionInfo).toEqual({ totalCollected: 6, activeCount: 4, excludedCount: 2, reason: 'CR > 0.10' });
    expect(r.registro.entrada.normalizada.personalWeights).toEqual({ Benefits: 0.3, Opportunities: 0.2, Costs: 0.25, Risks: 0.25 });
    expect(r.registro.entrada.normalizada.rescalingWeights).toEqual({ Benefits: 0.4, Opportunities: 0.1, Costs: 0.3, Risks: 0.2 });
    expect(r.registro.entrada.normalizada.qualityAnalysis.respondents).toHaveLength(4);
  });
});

// ============================================================================
describe('D. a recuperação semântica: desabilitada, vazia, com resultados, com falha parcial e total', () => {
  const rag = (r: any) => r.registro.contextoBibliografico.recuperacaoSemantica;
  const doPrompt = (r: any) => r.registro.prompts.mensagens[0].content as string;
  const SECAO = '## Evidências Semânticas Recuperadas (RAG Vetorial)';

  function conferirTextoInjetado(r: any) {
    const prompt = doPrompt(r);
    const i = prompt.indexOf(SECAO);
    expect(i).toBeGreaterThan(0);
    const fim = prompt.indexOf('\n\n---\n\n# RECURSOS DO SISTEMA DISPONÍVEIS', i);
    expect(fim).toBeGreaterThan(i);
    const aposTitulo = prompt.slice(i + SECAO.length, fim);
    expect(aposTitulo.trim()).toBe(rag(r).textoInjetadoNoPrompt.trim());
  }

  test('DESABILITADA (flag ausente): nenhuma consulta saiu, nenhuma foi executada, nenhum trecho; as consultas configuradas constam', async () => {
    const r = await executar();
    expect(r.contagem.embed + r.contagem.indice).toBe(0);
    expect(rag(r)).toMatchObject({ habilitada: false, estado: 'desabilitada', consultasExecutadas: [], trechosIncorporados: [] });
    expect(rag(r).consultasConfiguradas).toHaveLength(5);
    expect(rag(r).parametros).toEqual({ topKPorConsulta: 5, maximoPorArtigo: 3, totalFinal: 20 });
    expect(rag(r).estatisticas).toEqual(r.corpo.metadata.knowledgeBase.semantic);
    conferirTextoInjetado(r);
  });

  test('a flag é comparação estrita: "TRUE" segue desabilitada', async () => {
    const r = await executar({ habilitado: 'TRUE' });
    expect(rag(r).estado).toBe('desabilitada');
    expect(r.contagem.indice).toBe(0);
  });

  test('HABILITADA, 5 consultas vazias sem erro: sem_resultados, e NÃO é falha', async () => {
    const r = await executar({ habilitado: 'true', porConsulta: Array(5).fill([]) });
    expect(rag(r)).toMatchObject({ habilitada: true, estado: 'sem_resultados', trechosIncorporados: [] });
    expect(rag(r).consultasExecutadas).toHaveLength(5);
    expect(rag(r).consultasExecutadas.every((q: any) => q.consulta === 'vazio' && q.embedding === 'concluido')).toBe(true);
    expect(rag(r).consultasExecutadas[2].texto).toBe(rag(r).consultasConfiguradas[2]);
    expect(rag(r).textoInjetadoNoPrompt).toContain('nenhum chunk semântico');
    conferirTextoInjetado(r);
  });

  test('HABILITADA com resultados: os trechos incorporados, com ids, escores e a página do indexador (só para auditoria), na ordem do prompt', async () => {
    const r = await executar({ habilitado: 'true', porConsulta: Array(5).fill(CINCO) });
    expect(rag(r).estado).toBe('com_resultados');
    // teto de 3 por artigo corta o quarto do alfa: k1, k2, k3 e k5
    expect(rag(r).trechosIncorporados.map((t: any) => [t.posicaoNoPrompt, t.id, t.score])).toEqual([[1, 'k1', 0.95], [2, 'k2', 0.94], [3, 'k3', 0.93], [4, 'k5', 0.91]]);
    expect(rag(r).trechosIncorporados[0].metadata).toMatchObject({ article_id: 'artigo_alfa', chunk_type: 'claim', locator_id: 'loc-k1', page: 10, verbatim_quote: 'verbatim do k1' });
    expect(rag(r).estatisticas).toEqual(r.corpo.metadata.knowledgeBase.semantic);
    expect(rag(r).estatisticas.finalChunks).toBe(4);
    conferirTextoInjetado(r);
    // cada trecho registrado aparece no prompt, e o que o prompt NÃO leva (a página) consta só no registro
    for (const t of rag(r).trechosIncorporados) expect(doPrompt(r)).toContain(`**${t.posicaoNoPrompt}. ${t.metadata.article_id}**`);
    expect(rag(r).textoInjetadoNoPrompt).not.toContain('p. 10');
  });

  test('HABILITADA, falha no embedding em todas as consultas: falha_em_todas_as_consultas, diagnóstico preservado, e NENHUMA referência inventada', async () => {
    const r = await executar({ habilitado: 'true', embedFalha: true });
    expect(r.status).toBe(200); // o RAG vetorial nunca derruba o parecer
    expect(rag(r).estado).toBe('falha_em_todas_as_consultas');
    expect(rag(r).trechosIncorporados).toEqual([]);
    expect(rag(r).consultasExecutadas).toHaveLength(5);
    for (const q of rag(r).consultasExecutadas) {
      expect(q).toMatchObject({ etapa: 'embed', embedding: 'erro', consulta: 'nao_executado', erro: { classificacao: expect.any(String) } });
    }
    expect(rag(r).estatisticas.errored).toBe(5);
    expect(rag(r).textoInjetadoNoPrompt).toContain('nenhum chunk semântico');
    conferirTextoInjetado(r);
    // o texto da exceção da dependência NÃO vai ao registro
    expect(JSON.stringify(r.registro)).not.toContain('voyage indisponivel no ensaio');
  });

  test('HABILITADA, falha só no índice em duas consultas: falha_parcial, e as consultas boas seguem com seus trechos', async () => {
    const r = await executar({ habilitado: 'true', porConsulta: ['lanca', CINCO, [], 'lanca', CINCO] });
    expect(rag(r).estado).toBe('falha_parcial');
    expect(rag(r).consultasExecutadas.map((q: any) => q.consulta)).toEqual(['erro', 'com_resultados', 'vazio', 'erro', 'com_resultados']);
    expect(rag(r).consultasExecutadas[0]).toMatchObject({ etapa: 'querySimilar', embedding: 'concluido' });
    expect(rag(r).trechosIncorporados).toHaveLength(4);
    expect(JSON.stringify(r.registro)).not.toContain('indice indisponivel no ensaio');
    conferirTextoInjetado(r);
  });

  test('as referências ESTÁTICAS incorporadas constam, com o conteúdo, e o texto delas está no prompt', async () => {
    const r = await executar();
    const est = r.registro.contextoBibliografico.referenciasEstaticas;
    expect(est.consistencia.length).toBeGreaterThan(0);
    expect(est.bocr.length).toBeGreaterThan(0);
    expect(est.criticasAdicionais).toHaveLength(8);
    for (const ref of [est.consistencia[0], est.bocr[0], est.criticasAdicionais[0]]) {
      expect(typeof ref.citation).toBe('string');
      expect(doPrompt(r)).toContain(`**${ref.citation}**`);
      expect(doPrompt(r)).toContain(ref.rule);
    }
    for (const bloco of [est.limiaresPublicados, est.formulasBocr, est.benchmarks]) {
      expect(bloco.length).toBeGreaterThan(0);
      expect(doPrompt(r)).toContain(bloco);
    }
  });
});

// ============================================================================
describe('E. saída, metadados e validação são os da MESMA execução, e a saída reprovada é auditável sem ser liberada', () => {
  test('texto aprovado: o registro leva o texto, a validação original, o estado de aprovação e a extração desta resposta', async () => {
    const r = await executar();
    const reg = r.registro;
    expect(reg.saida.texto).toBe(r.corpo.review);
    expect(reg.avaliacaoAutomatica.validacao).toEqual(r.corpo.validation);
    expect(reg.avaliacaoAutomatica.validacao).toMatchObject({ version: 1, estado: 'aprovado', isValid: true });
    expect(reg.avaliacaoAutomatica.sha256DoTextoValidado).toBe(sha(r.corpo.review));
    expect(reg.avaliacaoAutomatica.aprovada).toBe(true);
    expect(reg.avaliacaoAutomatica.extracaoDeNotaEVeredicto).toEqual({
      estadoDaExtracao: r.corpo.metadata.estadoDaExtracao, nota: r.corpo.nota, veredicto: r.corpo.veredicto,
      mensagemDaExtracao: r.corpo.mensagemDaExtracao, notaSuspensa: r.corpo.notaSuspensa, estadoDoVinculo: r.corpo.estadoDoVinculo,
    });
    expect(reg.modelo.idDaRespostaDoProvedor).toBe('msg_ENSAIO_ROTA');
  });

  test('texto REPROVADO: a chamada foi concluída, a validação original é preservada, e o registro diz que NÃO foi aprovado (quarentena), com o texto íntegro', async () => {
    const r = await executar({ mensagem: mensagemPadrao(TEXTO_REPROVADO) });
    const { decideReviewPresentation } = require('@/lib/ai-reviewer/review-validation-contract');
    expect(r.status).toBe(200);
    expect(r.corpo.success).toBe(true); // sucesso da chamada ≠ aprovação
    expect(r.corpo.validation.estado).toBe('reprovado');
    const reg = r.registro;
    expect(reg.modelo.chamadaConcluida).toBe(true);
    expect(reg.saida.texto).toBe(TEXTO_REPROVADO);
    expect(reg.avaliacaoAutomatica.validacao).toEqual(r.corpo.validation);
    expect(reg.avaliacaoAutomatica.aprovada).toBe(false);
    expect(reg.avaliacaoAutomatica.apresentacao).toEqual(decideReviewPresentation(r.corpo.validation));
    expect(reg.avaliacaoAutomatica.apresentacao).toMatchObject({ estado: 'reprovado', quarantined: true });
    expect(reg.avaliacaoAutomatica.apresentacao.motivos.length).toBeGreaterThan(0);
  });

  test('os bloqueios existentes não mudam: a validação, o estado e a nota de uma saída reprovada são os MESMOS com e sem o pedido', async () => {
    const com = await executar({ mensagem: mensagemPadrao(TEXTO_REPROVADO) });
    const sem = await executar({ mensagem: mensagemPadrao(TEXTO_REPROVADO), payload: () => payloadDaTela() });
    expect(com.corpo.validation).toEqual(sem.corpo.validation);
    expect([com.corpo.nota, com.corpo.veredicto, com.corpo.notaSuspensa]).toEqual([sem.corpo.nota, sem.corpo.veredicto, sem.corpo.notaSuspensa]);
    expect(com.corpo.review).toBe(sem.corpo.review);
  });

  test('o registro e a resposta saem do MESMO corpo: nenhum campo derivado diverge entre os dois', async () => {
    for (const texto of [TEXTO_APROVADO, TEXTO_REPROVADO]) {
      const r = await executar({ mensagem: mensagemPadrao(texto) });
      expect(r.registro.saida.texto).toBe(r.corpo.review);
      expect(r.registro.avaliacaoAutomatica.sha256DoTextoValidado).toBe(sha(r.corpo.review));
      expect(r.registro.avaliacaoAutomatica.validacao).toEqual(r.corpo.validation);
    }
  });
});

// ============================================================================
describe('F. campos do provedor: registrados quando vêm, ausentes declaradas quando não vêm, sem raciocínio interno', () => {
  test('id, modelo identificado, consumo e motivo de encerramento; blocos só por tipo; o raciocínio interno NÃO é registrado', async () => {
    const r = await executar({ mensagem: (a) => ({ ...mensagemPadrao(TEXTO_APROVADO)(a), stop_reason: 'max_tokens', usage: { input_tokens: 10, output_tokens: 16000, cache_read_input_tokens: 0 } }) });
    expect(r.registro.modelo).toMatchObject({
      solicitado: 'claude-opus-4-6', identificadoNaResposta: 'claude-opus-4-6-ensaio', idDaRespostaDoProvedor: 'msg_ENSAIO_ROTA',
      consumoDeTokens: { input_tokens: 10, output_tokens: 16000, cache_read_input_tokens: 0 }, motivoDeEncerramento: 'max_tokens',
    });
    expect(r.registro.saida.blocosDeConteudoRecebidos).toEqual([{ indice: 0, tipo: 'thinking' }, { indice: 1, tipo: 'text', caracteres: TEXTO_APROVADO.length }]);
    expect(r.registro.saida.indiceDoBlocoDeTextoUsado).toBe(1);
    expect(JSON.stringify(r.registro)).not.toContain('RACIOCINIO-INTERNO');
  });

  test('resposta mínima (só o bloco de texto, como nos outros ensaios): campos null + ausências declaradas, registro INCOMPLETO, e o parecer segue', async () => {
    const r = await executar({ mensagem: () => ({ content: [{ type: 'text', text: TEXTO_APROVADO }] }) });
    expect(r.status).toBe(200);
    const m = r.registro.modelo;
    expect([m.identificadoNaResposta, m.idDaRespostaDoProvedor, m.consumoDeTokens, m.motivoDeEncerramento]).toEqual([null, null, null, null]);
    expect(r.registro.completude.completo).toBe(false);
    const campos = r.registro.completude.ausencias.map((a: any) => a.campo);
    for (const c of ['modelo.identificadoNaResposta', 'modelo.idDaRespostaDoProvedor', 'modelo.consumoDeTokens', 'modelo.motivoDeEncerramento']) expect(campos).toContain(c);
  });

  test('resposta sem bloco de texto: o texto fica vazio e a ausência é declarada', async () => {
    const r = await executar({ mensagem: () => ({ content: [{ type: 'thinking', thinking: 'x', signature: 's' }], stop_reason: 'max_tokens' }) });
    expect(r.registro.saida.texto).toBe('');
    expect(r.registro.saida.indiceDoBlocoDeTextoUsado).toBeNull();
    expect(r.registro.completude.ausencias.map((a: any) => a.campo)).toContain('saida.texto');
  });
});

// ============================================================================
describe('G. nenhum segredo no registro', () => {
  test('nem as chaves do ambiente, nem tokens, nem o texto das exceções das dependências', async () => {
    const r = await executar({ habilitado: 'true', porConsulta: ['lanca', CINCO, [], 'lanca', CINCO] });
    const texto = JSON.stringify(r.registro);
    for (const valor of Object.values(CHAVES_FALSAS)) expect(texto).not.toContain(valor);
    expect(texto).not.toMatch(/api[-_]?key|authorization|bearer/i);
  });
});

// ============================================================================
describe('H. implantação: o que o ambiente informa, e null explicado quando não informa', () => {
  test('com as variáveis da Vercel: commit, id da implantação e ambiente registrados', async () => {
    const r = await executar({ env: { VERCEL_GIT_COMMIT_SHA: 'f'.repeat(40), VERCEL_DEPLOYMENT_ID: 'dpl_ENSAIO123', VERCEL_ENV: 'preview' } });
    expect(r.registro.identificacao.implantacao).toEqual({ commit: 'f'.repeat(40), idDaImplantacao: 'dpl_ENSAIO123', ambienteDaImplantacao: 'preview' });
    expect(r.registro.identificacao.versaoDaApi).toBe('7.3.2');
  });

  test('sem as variáveis: null, a ausência é explicada, e a versão da API NÃO é usada como commit', async () => {
    const r = await executar();
    expect(r.registro.identificacao.implantacao).toEqual({ commit: null, idDaImplantacao: null, ambienteDaImplantacao: null });
    const commit = r.registro.completude.ausencias.find((a: any) => a.campo === 'identificacao.implantacao.commit');
    expect(commit.motivo).toContain('VERCEL_GIT_COMMIT_SHA');
    expect(r.registro.identificacao.implantacao.commit).not.toBe('7.3.2');
    expect(r.registro.completude.completo).toBe(false);
  });

  test('com TODAS as informações disponíveis o registro fica completo', async () => {
    const r = await executar({ env: { VERCEL_GIT_COMMIT_SHA: 'f'.repeat(40), VERCEL_DEPLOYMENT_ID: 'dpl_ENSAIO123', VERCEL_ENV: 'production' } });
    expect(r.registro.completude).toEqual({ completo: true, ausencias: [] });
  });
});

// ============================================================================
describe('I. tempos da chamada ao modelo', () => {
  test('início e término em ISO 8601 UTC com Z, ordenados, a duração é a diferença, e cobre a espera real da chamada', async () => {
    const r = await executar({ naChamada: async () => { await new Promise((ok) => setTimeout(ok, 40)); } });
    const id = r.registro.identificacao;
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(id.inicioDaChamadaAoModelo).toMatch(ISO);
    expect(id.terminoDaChamadaAoModelo).toMatch(ISO);
    expect(id.registroMontadoEm).toMatch(ISO);
    const inicio = Date.parse(id.inicioDaChamadaAoModelo);
    const termino = Date.parse(id.terminoDaChamadaAoModelo);
    expect(termino).toBeGreaterThanOrEqual(inicio);
    expect(id.duracaoDaChamadaMs).toBe(termino - inicio);
    expect(id.duracaoDaChamadaMs).toBeGreaterThanOrEqual(35);
    expect(Date.parse(id.registroMontadoEm)).toBeGreaterThanOrEqual(termino);
    expect(id.fusoHorario).toContain('UTC');
  });
});

// ============================================================================
describe('J. identificadores', () => {
  test('o id da geração é um UUID v4, único por execução; projeto e cálculo vêm da requisição', async () => {
    const a = await executar();
    const b = await executar();
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(a.registro.identificacao.idDaGeracao).toMatch(UUID);
    expect(b.registro.identificacao.idDaGeracao).toMatch(UUID);
    expect(a.registro.identificacao.idDaGeracao).not.toBe(b.registro.identificacao.idDaGeracao);
    expect(a.registro.identificacao.projectId).toBe('proj-ensaio-rota');
    expect(a.registro.identificacao.idDoCalculo).toBe('exec-ensaio-0001');
  });

  test('sem projectId nem vínculo na requisição: null com a ausência declarada (nada é inventado)', async () => {
    const r = await executar({ payload: () => { const p: any = payloadDaTela({ incluirRegistroDaExecucao: true }); delete p.vinculoDaExecucao; return p; } });
    expect(r.registro.identificacao.projectId).toBeNull();
    expect(r.registro.identificacao.idDoCalculo).toBeNull();
    const campos = r.registro.completude.ausencias.map((a: any) => a.campo);
    expect(campos).toContain('identificacao.projectId');
    expect(campos).toContain('identificacao.idDoCalculo');
  });
});

// ============================================================================
describe('K. falha ao montar o registro NÃO derruba o parecer, e a indisponibilidade é dita', () => {
  test('uso não serializável na resposta do provedor: parecer 200 com o texto, registro null e o motivo; a tela lê "indisponível" com esse motivo', async () => {
    const X = require('@/lib/ai-reviewer/exportar-registro');
    const r = await executar({
      mensagem: (a) => { const m: any = mensagemPadrao(TEXTO_APROVADO)(a); m.usage = {}; m.usage.circular = m.usage; return m; },
    });
    expect(r.status).toBe(200);
    expect(r.corpo.success).toBe(true);
    expect(r.corpo.review).toBe(TEXTO_APROVADO);
    expect(r.corpo.metadata.registroDaExecucao).toBeNull();
    expect(r.corpo.metadata.registroDaExecucaoIndisponivel.motivo).toMatch(/^Falha ao montar o registro da execução [0-9a-f-]{36}: /);
    expect(r.erros.some((e) => e.includes('Falha ao montar o registro da execução'))).toBe(true);
    const s = X.situacaoDoRegistro(r.corpo.metadata);
    expect(s.situacao).toBe('indisponivel');
    expect(s.motivo).toBe(r.corpo.metadata.registroDaExecucaoIndisponivel.motivo);
    // e o parecer segue com a validação de sempre
    expect(r.corpo.validation).toMatchObject({ version: 1, estado: 'aprovado' });
  });
});

// ============================================================================
describe('L. exportar não gera nada: usa o registro daquela geração', () => {
  test('nenhuma nova chamada ao modelo, ao embedding ou ao índice; o arquivo reproduz o registro; os resumos conferem', async () => {
    const X = require('@/lib/ai-reviewer/exportar-registro');
    const R = require('@/lib/ai-reviewer/registro-da-execucao');
    const r = await executar({ habilitado: 'true', porConsulta: Array(5).fill(CINCO), env: { VERCEL_GIT_COMMIT_SHA: 'e'.repeat(40), VERCEL_DEPLOYMENT_ID: 'dpl_X', VERCEL_ENV: 'production' } });
    const antes = { ...r.contagem };
    const s = X.situacaoDoRegistro(r.corpo.metadata);
    expect(s.situacao).toBe('disponivel');
    const preparo = X.prepararDownloadDoRegistro(s.registro);
    const entregues: Array<[string, string]> = [];
    X.baixarNoNavegador(preparo, { criarUrl: (c: string) => { entregues.push(['conteudo', c]); return 'blob:x'; }, revogarUrl: () => undefined, acionar: (_u: string, n: string) => { entregues.push(['nome', n]); } });
    expect(r.contagem).toEqual(antes); // nada novo foi pedido a ninguém
    expect(r.contagem.modelo).toBe(1);
    const arquivo = JSON.parse(entregues[0][1]);
    expect(arquivo).toEqual(r.corpo.metadata.registroDaExecucao);
    expect(entregues[1][1]).toBe(`registro-parecer-ia_${arquivo.identificacao.inicioDaChamadaAoModelo.replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '')}_${arquivo.identificacao.idDaGeracao}.json`);
    expect(R.verificarIntegridadeDoRegistro(arquivo)).toEqual({ ok: true, divergencias: [] });
  });

  test('o módulo de exportação não importa nem chama API, RAG, provedor ou Firestore', () => {
    // só o CÓDIGO: os comentários do módulo citam essas palavras justamente para dizer que ele não as usa
    const fonte = fs
      .readFileSync(path.join(__dirname, '..', 'ai-reviewer', 'exportar-registro.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(fonte.length).toBeGreaterThan(1000); // CONTROLE: sobrou código para examinar
    expect(fonte).not.toMatch(/fetch\(|XMLHttpRequest|firebase|firestore|upstash|voyage|@anthropic-ai|semantic-retrieve|localStorage|sessionStorage|indexedDB/i);
    expect(fonte).not.toMatch(/from 'node:/);
  });
});

// ============================================================================
describe('M. a falha do provedor segue sendo erro, e não gera registro nem parecer', () => {
  test('o provedor lança: 500 com o erro de sempre, sem metadata nem registro', async () => {
    const r = await executar({ provedorFalha: true });
    expect(r.status).toBe(500);
    expect(r.corpo).toMatchObject({ error: 'Erro ao gerar revisão acadêmica', details: 'provedor indisponivel no ensaio' });
    expect(r.corpo.metadata).toBeUndefined();
    expect(r.corpo.review).toBeUndefined();
  });
});
