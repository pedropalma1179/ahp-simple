/**
 * lib/__tests__/registro-da-execucao.test.ts
 *
 * O registro de execução do Parecer IA, no nível dos MÓDULOS (sem a rota): o montador, a serialização canônica e os
 * resumos, o estado da recuperação semântica, a leitura da situação do registro e a exportação.
 *
 * ⚠ Nenhuma chamada paga e nenhuma requisição: o provedor é um objeto de mão. A parte que exercita o handler real
 * (objeto enviado = objeto registrado, estados do RAG, associação com a validação, exportação sem nova geração) está em
 * `registro-da-execucao-rota.test.ts`; a apresentação, em `registro-da-execucao-tela.test.ts`.
 */

export {};

const crypto = require('node:crypto');

/* eslint-disable @typescript-eslint/no-var-requires */
const R = require('@/lib/ai-reviewer/registro-da-execucao');
const X = require('@/lib/ai-reviewer/exportar-registro');
const C = require('@/lib/ai-reviewer/registro-da-execucao-contrato');
/* eslint-enable @typescript-eslint/no-var-requires */

const sha = (texto: string) => crypto.createHash('sha256').update(texto, 'utf8').digest('hex');

/** Serialização canônica, escrita AQUI de outro modo (comparação de strings por unidade de código, sem `Array.sort` padrão). */
function canonicoIndependente(v: any): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(canonicoIndependente).join(',') + ']';
  if (typeof v === 'object') {
    const chaves = Object.keys(v).filter((k) => v[k] !== undefined);
    chaves.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + chaves.map((k) => JSON.stringify(k) + ':' + canonicoIndependente(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

import {
  ESTATISTICAS_VAZIAS,
  entradaDeEnsaio as entrada,
  mensagemDoProvedorDeEnsaio as mensagemDoProvedor,
  validacaoDeEnsaio as validacao,
} from './helpers/registro-de-ensaio';

// ============================================================================
describe('serialização canônica e resumos SHA-256', () => {
  test('CONTROLE: o SHA-256 de um vetor conhecido confere ("abc")', () => {
    expect(R.sha256DoTexto('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('chaves em ordem, arrays na ordem, undefined inexistente; igual à escrita independente', () => {
    const v = { b: 1, a: [2, { d: 1, c: 'é"\n' }], z: undefined, n: null, t: true };
    expect(R.serializacaoCanonica(v)).toBe('{"a":[2,{"c":"é\\"\\n","d":1}],"b":1,"n":null,"t":true}');
    expect(R.serializacaoCanonica(v)).toBe(canonicoIndependente(v));
    // a ordem de inserção não importa
    expect(R.serializacaoCanonica({ a: 1, b: 2 })).toBe(R.serializacaoCanonica({ b: 2, a: 1 }));
    // mas a ordem de um array importa
    expect(R.serializacaoCanonica([1, 2])).not.toBe(R.serializacaoCanonica([2, 1]));
  });

  test('o texto é resumido pelos bytes UTF-8 do próprio texto, sem normalização', () => {
    const composto = 'é'; // é, uma unidade
    const decomposto = 'é'; // e + acento combinante
    expect(R.sha256DoTexto(composto)).not.toBe(R.sha256DoTexto(decomposto));
    expect(R.sha256DoTexto(composto)).toBe(sha(composto));
    expect(R.sha256DoTexto('a\r\nb')).not.toBe(R.sha256DoTexto('a\nb'));
  });

  test('clonarParaRegistro lança em estrutura circular (e copiaSegura devolve o motivo no lugar da cópia)', () => {
    const circular: any = {};
    circular.eu = circular;
    expect(() => R.clonarParaRegistro(circular)).toThrow();
    const r = R.copiaSegura(circular);
    expect(r.copia).toBeNull();
    expect(typeof r.falha).toBe('string');
    expect(r.falha.length).toBeGreaterThan(0);
    expect(R.copiaSegura({ a: 1 })).toEqual({ copia: { a: 1 }, falha: null });
  });
});

// ============================================================================
describe('estado da recuperação semântica, pelas contagens', () => {
  const s = (o: Record<string, unknown>) => ({ ...ESTATISTICAS_VAZIAS, ...o });
  test.each([
    ['desabilitada', 'desabilitada', s({ enabled: false })],
    ['habilitada, 5 vazias sem erro', 'sem_resultados', s({ enabled: true, queriesRan: 5, emptyOk: 5 })],
    ['habilitada, 5 com resultados', 'com_resultados', s({ enabled: true, queriesRan: 5, withResults: 5 })],
    ['habilitada, mistura de resultados e vazias', 'com_resultados', s({ enabled: true, queriesRan: 5, withResults: 2, emptyOk: 3 })],
    ['habilitada, 5 com erro', 'falha_em_todas_as_consultas', s({ enabled: true, queriesRan: 5, errored: 5 })],
    ['habilitada, 2 com erro e 3 com resultados', 'falha_parcial', s({ enabled: true, queriesRan: 5, errored: 2, withResults: 3 })],
    ['habilitada, 1 com erro e 4 vazias (nenhum resultado)', 'falha_parcial', s({ enabled: true, queriesRan: 5, errored: 1, emptyOk: 4 })],
    ['habilitada, contagens que não fecham', 'indeterminado', s({ enabled: true, queriesRan: 5, withResults: 2, emptyOk: 1 })],
    ['habilitada, zero consultas executadas', 'indeterminado', s({ enabled: true, queriesRan: 0 })],
    ['habilitada, contagem inválida', 'indeterminado', s({ enabled: true, queriesRan: 5, withResults: 'x', emptyOk: 5 })],
  ])('%s → %s', (_rotulo, esperado, estatisticas) => {
    expect(R.estadoDaRecuperacaoSemantica(estatisticas)).toBe(esperado);
  });
});

// ============================================================================
describe('a resposta do provedor é resumida SEM o conteúdo de raciocínio', () => {
  test('guarda id, modelo, usage, motivo de encerramento e o TIPO dos blocos (tamanho só do texto)', () => {
    const r = R.resumirRespostaDoProvedor(mensagemDoProvedor());
    expect(r.id).toBe('msg_ENSAIO_01');
    expect(r.modelo).toBe('claude-opus-4-6-ensaio');
    expect(r.usage).toEqual({ input_tokens: 1000, output_tokens: 200 });
    expect(r.stopReason).toBe('end_turn');
    expect(r.blocos).toEqual([{ indice: 0, tipo: 'thinking' }, { indice: 1, tipo: 'text', caracteres: 'TEXTO DO PARECER DE ENSAIO'.length }]);
    expect(JSON.stringify(r)).not.toContain('RACIOCINIO-INTERNO');
  });

  test('campo ausente fica null (nada é preenchido) e resposta que não é objeto não lança', () => {
    const r = R.resumirRespostaDoProvedor({ content: [{ type: 'text', text: 'x' }] });
    expect([r.id, r.modelo, r.usage, r.stopReason, r.stopSequence]).toEqual([null, null, null, null, null]);
    expect(R.resumirRespostaDoProvedor(undefined)).toEqual({ id: null, modelo: null, usage: null, stopReason: null, stopSequence: null, blocos: null });
    expect(R.resumirRespostaDoProvedor('texto').blocos).toBeNull();
  });
});

// ============================================================================
describe('o montador', () => {
  test('esquema versionado, identificação e configuração do que foi enviado', () => {
    const reg = R.montarRegistroDaExecucao(entrada());
    expect(reg.esquema).toBe(C.ESQUEMA_DO_REGISTRO);
    expect(reg.versaoDoEsquema).toBe(C.VERSAO_DO_ESQUEMA_DO_REGISTRO);
    expect(reg.identificacao).toMatchObject({
      idDaGeracao: '11111111-2222-4333-8444-555555555555',
      projectId: 'proj-ensaio',
      idDoCalculo: 'exec-ensaio-01',
      inicioDaChamadaAoModelo: '2026-10-26T12:00:00.000Z',
      terminoDaChamadaAoModelo: '2026-10-26T12:01:30.250Z',
      duracaoDaChamadaMs: 90250,
      versaoDaApi: '7.3.2',
      implantacao: { commit: 'a'.repeat(40), idDaImplantacao: 'dpl_ENSAIO', ambienteDaImplantacao: 'production' },
    });
    expect(reg.modelo.parametrosEnviados).toEqual({ model: 'claude-opus-4-6', max_tokens: 16000, thinking: { type: 'enabled', budget_tokens: 5000 } });
    expect(reg.modelo).toMatchObject({
      provedor: 'anthropic', chamadaConcluida: true, solicitado: 'claude-opus-4-6', identificadoNaResposta: 'claude-opus-4-6-ensaio',
      idDaRespostaDoProvedor: 'msg_ENSAIO_01', consumoDeTokens: { input_tokens: 1000, output_tokens: 200 }, motivoDeEncerramento: 'end_turn',
    });
    expect(reg.prompts).toEqual({ system: 'SYSTEM DE ENSAIO', mensagens: [{ role: 'user', content: 'MENSAGEM DE ENSAIO' }] });
    expect(reg.saida.texto).toBe('TEXTO DO PARECER DE ENSAIO');
    expect(reg.saida.indiceDoBlocoDeTextoUsado).toBe(1);
    expect(reg.completude).toEqual({ completo: true, ausencias: [] });
    expect(JSON.stringify(reg)).not.toContain('RACIOCINIO-INTERNO');
  });

  test('ausência é null E consta em completude.ausencias, com o motivo; a versão da API NÃO substitui o commit', () => {
    const e = entrada({
      ambiente: { commit: undefined, idDaImplantacao: '', ambienteDaImplantacao: null },
      entradaRecebida: { projectName: 'sem projeto nem vinculo' },
      chamada: { ...entrada().chamada, resposta: { content: [{ type: 'text', text: 'x' }] } },
    });
    const reg = R.montarRegistroDaExecucao(e);
    expect(reg.identificacao.implantacao).toEqual({ commit: null, idDaImplantacao: null, ambienteDaImplantacao: null });
    expect(reg.identificacao.projectId).toBeNull();
    expect(reg.identificacao.idDoCalculo).toBeNull();
    expect([reg.modelo.identificadoNaResposta, reg.modelo.idDaRespostaDoProvedor, reg.modelo.consumoDeTokens, reg.modelo.motivoDeEncerramento]).toEqual([null, null, null, null]);
    expect(reg.completude.completo).toBe(false);
    const campos = reg.completude.ausencias.map((a: any) => a.campo).sort();
    expect(campos).toEqual([
      'identificacao.idDoCalculo', 'identificacao.implantacao.ambienteDaImplantacao', 'identificacao.implantacao.commit',
      'identificacao.implantacao.idDaImplantacao', 'identificacao.projectId', 'modelo.consumoDeTokens', 'modelo.idDaRespostaDoProvedor',
      'modelo.identificadoNaResposta', 'modelo.motivoDeEncerramento',
    ]);
    const commit = reg.completude.ausencias.find((a: any) => a.campo === 'identificacao.implantacao.commit');
    expect(commit.motivo).toContain('VERCEL_GIT_COMMIT_SHA');
    expect(commit.motivo).toContain('NÃO substitui o commit');
    // a versão da API segue registrada à parte
    expect(reg.identificacao.versaoDaApi).toBe('7.3.2');
  });

  test('SNAPSHOT: alterar depois os objetos de origem NÃO altera o registro concluído', () => {
    const e = entrada();
    const reg = R.montarRegistroDaExecucao(e);
    const antes = JSON.stringify(reg);
    // mutações posteriores, de toda espécie
    (e.entradaRecebida as any).lista.push(99);
    (e.entradaRecebida as any).projectName = 'ALTERADO';
    (e.entradaNormalizada as any).bocrWeights.Benefits = 0;
    e.chamada.parametros.messages[0].content = 'ALTERADA';
    e.chamada.parametros.system = 'ALTERADO';
    (e.chamada.resposta as any).usage.input_tokens = 1;
    e.respostaDaRota.review = 'OUTRO TEXTO';
    (e.respostaDaRota.validation as any).issues.push('novo');
    e.contexto.estatico.consistencia[0].citation = 'ALTERADA';
    e.contexto.semantico.estatisticas.enabled = true;
    expect(JSON.stringify(reg)).toBe(antes);
  });

  test('a validação ORIGINAL vai inalterada e ligada ao texto validado; "aprovada" só quando o estado é aprovado', () => {
    for (const estado of ['aprovado', 'reprovado', 'inconclusivo'] as const) {
      const e = entrada();
      e.respostaDaRota.validation = validacao(estado);
      const reg = R.montarRegistroDaExecucao(e);
      expect(reg.avaliacaoAutomatica.validacao).toEqual(e.respostaDaRota.validation);
      expect(reg.avaliacaoAutomatica.sha256DoTextoValidado).toBe(sha(e.respostaDaRota.review));
      expect(reg.avaliacaoAutomatica.aprovada).toBe(estado === 'aprovado');
      expect(reg.avaliacaoAutomatica.apresentacao.estado).toBe(estado);
      expect(reg.avaliacaoAutomatica.apresentacao.quarantined).toBe(estado !== 'aprovado');
      // chamada concluída NÃO é aprovação: o texto segue no registro, e o estado diz que não foi aprovado
      expect(reg.modelo.chamadaConcluida).toBe(true);
      expect(reg.saida.texto).toBe(e.respostaDaRota.review);
    }
  });

  test('validação ausente ou malformada NÃO vira aprovação (nao_confirmado, em quarentena)', () => {
    for (const ruim of [undefined, null, { estado: 'aprovado' }, { version: 1, isValid: true, estado: 'aprovado', issues: 'x', warnings: [], inconclusivos: [] }]) {
      const e = entrada();
      e.respostaDaRota.validation = ruim as any;
      const reg = R.montarRegistroDaExecucao(e);
      expect(reg.avaliacaoAutomatica.aprovada).toBe(false);
      expect(reg.avaliacaoAutomatica.apresentacao).toMatchObject({ estado: 'nao_confirmado', quarantined: true });
    }
  });

  test('a extração de nota e veredicto é copiada com o estado da extração e do vínculo', () => {
    const reg = R.montarRegistroDaExecucao(entrada());
    expect(reg.avaliacaoAutomatica.extracaoDeNotaEVeredicto).toEqual({
      estadoDaExtracao: 'padrao_reconhecido', nota: 'B', veredicto: 'ACEITO', mensagemDaExtracao: null, notaSuspensa: null, estadoDoVinculo: 'vinculado',
    });
  });

  test('texto de saída vazio é ausência declarada, e não registro "completo"', () => {
    const e = entrada();
    e.respostaDaRota.review = '';
    const reg = R.montarRegistroDaExecucao(e);
    expect(reg.completude.completo).toBe(false);
    expect(reg.completude.ausencias.map((a: any) => a.campo)).toContain('saida.texto');
    expect(reg.saida.texto).toBe('');
  });

  test('falha da cópia da entrada vira ausência declarada, com a entrada null (e não entrada inventada)', () => {
    const reg = R.montarRegistroDaExecucao(entrada({
      entradaRecebida: null,
      falhasDeSnapshot: [{ campo: 'entrada.recebidaPelaApi', motivo: 'A cópia da entrada recebida falhou: circular' }],
    }));
    expect(reg.entrada.recebidaPelaApi).toBeNull();
    expect(reg.completude.ausencias.map((a: any) => a.campo)).toContain('entrada.recebidaPelaApi');
    expect(reg.identificacao.projectId).toBeNull();
  });

  test('a recuperação semântica vem do que foi capturado: desabilitada declara as consultas configuradas e NENHUMA executada', () => {
    const reg = R.montarRegistroDaExecucao(entrada());
    const s = reg.contextoBibliografico.recuperacaoSemantica;
    expect(s).toMatchObject({ habilitada: false, estado: 'desabilitada', consultasConfiguradas: ['consulta 0', 'consulta 1'], consultasExecutadas: [], trechosIncorporados: [] });
    expect(s.textoInjetadoNoPrompt).toContain('nenhum chunk semântico');
    expect(reg.contextoBibliografico.referenciasEstaticas.consistencia[0].citation).toBe('Saaty (1977)');
  });

  test('habilitada com falha: o diagnóstico por consulta é preservado, com o texto da consulta, e nenhuma referência é inventada', () => {
    const e = entrada();
    e.contexto.semantico.estatisticas = {
      ...ESTATISTICAS_VAZIAS, enabled: true, queriesRan: 2, errored: 2, failedQueries: 2, httpAttempts: 2,
      queries: [
        { indice: 0, etapa: 'embed', embedding: 'erro', consulta: 'nao_executado', tentativasEmbed: [{ numero: 1 }], tentativasConsulta: [], erro: { mensagem: 'm', classificacao: 'transporte' } },
        { indice: 1, etapa: 'querySimilar', embedding: 'concluido', consulta: 'erro', tentativasEmbed: [{ numero: 1, status: 200 }], tentativasConsulta: [{ numero: 1, status: 503 }], erro: { mensagem: 'm2', classificacao: 'http_nao_exitoso' } },
      ],
    } as any;
    const reg = R.montarRegistroDaExecucao(e);
    const s = reg.contextoBibliografico.recuperacaoSemantica;
    expect(s.estado).toBe('falha_em_todas_as_consultas');
    expect(s.trechosIncorporados).toEqual([]);
    expect(s.consultasExecutadas.map((q: any) => [q.indice, q.texto, q.consulta])).toEqual([[0, 'consulta 0', 'nao_executado'], [1, 'consulta 1', 'erro']]);
    expect(s.consultasExecutadas[1].tentativasConsulta).toEqual([{ numero: 1, status: 503 }]);
  });
});

// ============================================================================
describe('integridade: os resumos conferem, e a alteração é detectada', () => {
  test('os sete resumos são recalculados por escrita independente, sobre o JSON LIDO do arquivo exportado', () => {
    const reg = R.montarRegistroDaExecucao(entrada());
    const lido = JSON.parse(X.prepararDownloadDoRegistro(reg).conteudo);
    const { integridade, ...semIntegridade } = lido;
    const esperado: Record<string, string> = {
      'entrada.recebidaPelaApi': sha(canonicoIndependente(lido.entrada.recebidaPelaApi)),
      'entrada.normalizada': sha(canonicoIndependente(lido.entrada.normalizada)),
      'modelo.parametrosEnviados': sha(canonicoIndependente(lido.modelo.parametrosEnviados)),
      'prompts.system': sha(lido.prompts.system),
      'prompts.mensagens': sha(canonicoIndependente(lido.prompts.mensagens)),
      'saida.texto': sha(lido.saida.texto),
      $: sha(canonicoIndependente(semIntegridade)),
    };
    expect(integridade.resumos.map((r: any) => r.campo)).toEqual(Object.keys(esperado));
    for (const r of integridade.resumos) expect([r.campo, r.sha256]).toEqual([r.campo, esperado[r.campo]]);
    expect(R.verificarIntegridadeDoRegistro(lido)).toEqual({ ok: true, divergencias: [] });
  });

  test('alterar o texto, um prompt, a entrada ou qualquer outro campo é detectado; o resumo declarado não é recalculado em silêncio', () => {
    const reg = R.montarRegistroDaExecucao(entrada());
    const texto = X.prepararDownloadDoRegistro(reg).conteudo;
    const adulterar = (f: (r: any) => void) => { const r = JSON.parse(texto); f(r); return R.verificarIntegridadeDoRegistro(r); };
    const casos: Array<[string, (r: any) => void, string]> = [
      ['texto da saída', (r) => { r.saida.texto += ' '; }, 'saida.texto'],
      ['system', (r) => { r.prompts.system = 'outro'; }, 'prompts.system'],
      ['mensagem', (r) => { r.prompts.mensagens[0].content = 'outra'; }, 'prompts.mensagens'],
      ['entrada recebida', (r) => { r.entrada.recebidaPelaApi.lista.push(4); }, 'entrada.recebidaPelaApi'],
      ['entrada normalizada', (r) => { r.entrada.normalizada.bocrWeights.Benefits = 0.41; }, 'entrada.normalizada'],
      ['parâmetros enviados', (r) => { r.modelo.parametrosEnviados.max_tokens = 1; }, 'modelo.parametrosEnviados'],
      ['validação (só a raiz)', (r) => { r.avaliacaoAutomatica.aprovada = !r.avaliacaoAutomatica.aprovada; }, '$'],
      ['RAG (só a raiz)', (r) => { r.contextoBibliografico.recuperacaoSemantica.estado = 'com_resultados'; }, '$'],
    ];
    for (const [rotulo, f, campo] of casos) {
      const v = adulterar(f);
      expect([rotulo, v.ok]).toEqual([rotulo, false]);
      expect([rotulo, v.divergencias.some((d: string) => d.startsWith(campo + ':'))]).toEqual([rotulo, true]);
    }
    // CONTROLE: sem alteração, confere
    expect(adulterar(() => undefined).ok).toBe(true);
  });

  test('a documentação da serialização viaja no registro e nomeia cada campo resumido', () => {
    const reg = R.montarRegistroDaExecucao(entrada());
    expect(reg.integridade.algoritmo).toBe('SHA-256');
    expect(reg.integridade.serializacaoCanonica).toContain('UTF-16');
    expect(reg.integridade.serializacaoCanonica).toContain('"$"');
    expect(reg.integridade.observacao).toContain('não a autenticidade');
    expect(reg.integridade.resumos.every((r: any) => /^[0-9a-f]{64}$/.test(r.sha256))).toBe(true);
    expect(reg.integridade.resumos.map((r: any) => r.tratamento)).toEqual(['objeto-canonico', 'objeto-canonico', 'objeto-canonico', 'texto', 'objeto-canonico', 'texto', 'objeto-canonico']);
  });
});

// ============================================================================
describe('situação do registro na tela, nome do arquivo e exportação', () => {
  const registro = () => R.montarRegistroDaExecucao(entrada());

  test('disponível, incompleto e indisponível (com o motivo)', () => {
    expect(X.situacaoDoRegistro({ registroDaExecucao: registro() }).situacao).toBe('disponivel');

    const incompleto = R.montarRegistroDaExecucao(entrada({ ambiente: { commit: undefined, idDaImplantacao: 'x', ambienteDaImplantacao: 'y' } }));
    const s = X.situacaoDoRegistro({ registroDaExecucao: incompleto });
    expect(s.situacao).toBe('incompleto');
    expect(s.ausencias.map((a: any) => a.campo)).toEqual(['identificacao.implantacao.commit']);

    for (const metadata of [undefined, null, 'texto', [], {}, { registroDaExecucao: null }]) {
      const r = X.situacaoDoRegistro(metadata);
      expect([JSON.stringify(metadata), r.situacao]).toEqual([JSON.stringify(metadata), 'indisponivel']);
      expect(typeof r.motivo).toBe('string');
    }
    // o motivo informado pela rota é o exibido
    expect(X.situacaoDoRegistro({ registroDaExecucao: null, registroDaExecucaoIndisponivel: { motivo: 'Falha ao montar o registro X' } }))
      .toEqual({ situacao: 'indisponivel', motivo: 'Falha ao montar o registro X' });
  });

  test('formato não reconhecido é indisponível, e nunca lido "no que der"', () => {
    const base = registro();
    const casos: Array<[string, any]> = [
      ['esquema outro', { ...base, esquema: 'outro' }],
      ['versão futura', { ...base, versaoDoEsquema: 2 }],
      ['sem idDaGeracao', { ...base, identificacao: { ...base.identificacao, idDaGeracao: '' } }],
      ['sem completude', { ...base, completude: undefined }],
      ['completude malformada', { ...base, completude: { completo: 'sim', ausencias: [] } }],
      ['não é objeto', 'registro'],
    ];
    for (const [rotulo, r] of casos) expect([rotulo, X.situacaoDoRegistro({ registroDaExecucao: r }).situacao]).toEqual([rotulo, 'indisponivel']);
  });

  test('contradição entre completo e a lista de ausências é tratada como incompleto (conservador)', () => {
    const base = registro();
    const r = { ...base, completude: { completo: true, ausencias: [{ campo: 'x', motivo: 'y' }] } };
    expect(X.situacaoDoRegistro({ registroDaExecucao: r }).situacao).toBe('incompleto');
  });

  test('nome do arquivo: instante da chamada em UTC e id da geração; recusa id ou instante inutilizáveis', () => {
    expect(X.nomeDoArquivoDoRegistro(registro())).toBe('registro-parecer-ia_20261026T120000Z_11111111-2222-4333-8444-555555555555.json');
    const base = registro();
    expect(() => X.nomeDoArquivoDoRegistro({ ...base, identificacao: { ...base.identificacao, idDaGeracao: '../etc/passwd' } })).toThrow(/idDaGeracao/);
    expect(() => X.nomeDoArquivoDoRegistro({ ...base, identificacao: { ...base.identificacao, inicioDaChamadaAoModelo: 'ontem' } })).toThrow(/inicioDaChamadaAoModelo/);
  });

  test('o arquivo é o registro TAL COMO ESTÁ (JSON com indentação), sem consultar nada', () => {
    const reg = registro();
    const preparo = X.prepararDownloadDoRegistro(reg);
    expect(preparo.tipoMime).toBe('application/json;charset=utf-8');
    expect(JSON.parse(preparo.conteudo)).toEqual(JSON.parse(JSON.stringify(reg)));
    expect(preparo.conteudo.endsWith('}\n')).toBe(true);
  });

  test('a falha de serialização sobe com a mensagem REAL, e nenhum arquivo parcial é entregue', () => {
    const reg: any = registro();
    reg.entrada.recebidaPelaApi = {};
    reg.entrada.recebidaPelaApi.eu = reg.entrada.recebidaPelaApi;
    expect(() => X.prepararDownloadDoRegistro(reg)).toThrow(/circular/i);
  });

  test('baixarNoNavegador usa o ambiente: cria a URL, aciona com o nome, revoga mesmo se acionar falhar; sem DOM, lança', () => {
    const chamadas: string[] = [];
    const ambiente = {
      criarUrl: (c: string, t: string) => { chamadas.push(`criar:${t}:${c.length}`); return 'blob:ensaio'; },
      revogarUrl: (u: string) => { chamadas.push(`revogar:${u}`); },
      acionar: (u: string, n: string) => { chamadas.push(`acionar:${u}:${n}`); },
    };
    X.baixarNoNavegador({ nomeDoArquivo: 'a.json', conteudo: '{}\n', tipoMime: 'application/json' }, ambiente);
    expect(chamadas).toEqual(['criar:application/json:3', 'acionar:blob:ensaio:a.json', 'revogar:blob:ensaio']);

    const falha = { ...ambiente, acionar: () => { throw new Error('clique recusado'); } };
    chamadas.length = 0;
    expect(() => X.baixarNoNavegador({ nomeDoArquivo: 'a.json', conteudo: '{}\n', tipoMime: 't' }, falha)).toThrow('clique recusado');
    expect(chamadas).toContain('revogar:blob:ensaio');

    // ambiente padrão em Node (sem `document`): falha EXPLÍCITA, nunca silêncio
    expect(() => X.baixarNoNavegador({ nomeDoArquivo: 'a.json', conteudo: '{}\n', tipoMime: 't' })).toThrow(/Download indisponível/);
  });
});
