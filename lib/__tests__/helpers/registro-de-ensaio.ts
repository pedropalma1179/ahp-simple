/**
 * lib/__tests__/helpers/registro-de-ensaio.ts
 *
 * Uma entrada COMPLETA e FRESCA para o montador do registro de execução do Parecer IA
 * (`lib/ai-reviewer/registro-da-execucao.ts`), com dados fictícios. Fresca a cada chamada, porque os testes de snapshot
 * mutam os objetos de origem.
 *
 * ⚠ Nada aqui chama provedor algum: a "resposta do provedor" é um objeto de mão.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { toReviewValidationContract } = require('@/lib/ai-reviewer/review-validation-contract');
/* eslint-enable @typescript-eslint/no-var-requires */

export const ESTATISTICAS_VAZIAS = {
  contractVersion: 2, enabled: false, queriesRan: 0, withResults: 0, emptyOk: 0, errored: 0, rawChunks: 0, uniqueChunks: 0,
  finalChunks: 0, uniqueArticles: 0, topScore: null, failedQueries: 0, httpAttempts: 0, queries: [],
};

export function validacaoDeEnsaio(estado: 'aprovado' | 'reprovado' | 'inconclusivo') {
  return toReviewValidationContract({
    isValid: estado === 'aprovado',
    estado,
    issues: estado === 'reprovado' ? ['achado de ensaio'] : [],
    warnings: ['aviso de ensaio'],
    inconclusivos: estado === 'inconclusivo' ? ['motivo de ensaio'] : [],
  });
}

export function mensagemDoProvedorDeEnsaio(sobrescrever: Record<string, unknown> = {}) {
  return {
    id: 'msg_ENSAIO_01', type: 'message', role: 'assistant', model: 'claude-opus-4-6-ensaio',
    content: [
      { type: 'thinking', thinking: 'RACIOCINIO-INTERNO-QUE-NAO-PODE-SER-REGISTRADO', signature: 'assinatura' },
      { type: 'text', text: 'TEXTO DO PARECER DE ENSAIO' },
    ],
    stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 200 },
    ...sobrescrever,
  };
}

export function entradaDeEnsaio(sobrescrever: Record<string, any> = {}) {
  const texto = 'TEXTO DO PARECER DE ENSAIO';
  const corpo = {
    success: true, nota: 'B', veredicto: 'ACEITO', notaSuspensa: null, mensagemDaExtracao: null, estadoDoVinculo: 'vinculado',
    review: texto, validation: validacaoDeEnsaio('aprovado'), metadata: { estadoDaExtracao: 'padrao_reconhecido' },
  };
  return {
    idDaGeracao: '11111111-2222-4333-8444-555555555555',
    versaoDaApi: '7.3.2',
    ambiente: { commit: 'a'.repeat(40), idDaImplantacao: 'dpl_ENSAIO', ambienteDaImplantacao: 'production' },
    entradaRecebida: { projectId: 'proj-ensaio', projectName: 'Projeto', vinculoDaExecucao: { executionId: 'exec-ensaio-01' }, lista: [1, 2, 3] },
    entradaNormalizada: { projectName: 'Projeto', bocrWeights: { Benefits: 0.4 } },
    chamada: {
      provedor: 'anthropic',
      inicio: new Date('2026-10-26T12:00:00.000Z'),
      termino: new Date('2026-10-26T12:01:30.250Z'),
      parametros: {
        model: 'claude-opus-4-6', max_tokens: 16000, thinking: { type: 'enabled', budget_tokens: 5000 },
        system: 'SYSTEM DE ENSAIO', messages: [{ role: 'user', content: 'MENSAGEM DE ENSAIO' }],
      },
      resposta: mensagemDoProvedorDeEnsaio(),
    },
    contexto: {
      estatico: {
        consistencia: [{ id: 'c1', citation: 'Saaty (1977)', topic: 'CR', rule: 'regra', context: 'ctx' }],
        bocr: [], sensibilidade: [], criticasAdicionais: [],
        limiaresPublicados: 'limiares', formulasBocr: 'formulas', benchmarks: 'benchmarks',
      },
      semantico: {
        consultasConfiguradas: ['consulta 0', 'consulta 1'],
        parametros: { topKPorConsulta: 5, maximoPorArtigo: 3, totalFinal: 20 },
        estatisticas: { ...ESTATISTICAS_VAZIAS },
        trechos: [],
        textoInjetadoNoPrompt: '_(nenhum chunk semântico recuperado nesta execução)_',
      },
    },
    respostaDaRota: corpo,
    montadoEm: new Date('2026-10-26T12:01:31.000Z'),
    ...sobrescrever,
  };
}
