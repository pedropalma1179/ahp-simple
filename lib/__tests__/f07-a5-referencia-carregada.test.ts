/**
 * lib/__tests__/f07-a5-referencia-carregada.test.ts
 *
 * F07, entrega A5, ponto 1: `referenciaCarregada` avançava sem apresentação no caminho da ESCOLHA confirmada.
 *
 * O defeito: `escolher` (components/ReferenciaDoProjeto.tsx) fazia `setReferenciaCarregada(corpo.referencia)` sem
 * condição na resposta de sucesso. Escolher X enquanto a tela apresentava Y avançava a revisão carregada para uma
 * referência de que nada foi apresentado: a escolha seguinte partia de uma revisão que a tela nunca apresentou
 * (`expectedRevision`), e o aviso de mudança (`compararReferencia`) calava. O caminho `recusada` já fazia o certo
 * (o painel passa a SABER a referência, mas não a "carrega"); o `confirmada` não. A4 corrigiu o outro escritor
 * desse estado (`carregarReferenciaAtual`).
 *
 * A condição: a revisão só avança quando a execução da referência devolvida é a que a tela apresenta NO
 * RETORNO do envio. A resposta de sucesso, sozinha, não a satisfaz.
 *
 * Exercita as funções REAIS de `lib/fluxos-da-referencia.ts` (`enviarEscolhaDaReferencia`,
 * `referenciaCorrespondeAApresentada`) e as REAIS `compararReferencia` e `estadoDaApresentacao` de
 * `lib/referencia-do-projeto.ts`, que é o que a tela usa para avisar da mudança e para rotular a apresentação.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que o componente montado funcione: nenhuma tela é montada por teste
 * algum, e os setters destes testes são um armazém simples, e não os de `useState`. Em particular, a leitura da
 * exibição "no retorno" é testada aqui por um LEITOR injetado (`exibicaoVigente`); que o componente injete uma
 * referência atualizada a cada renderização, e não a propriedade do fecho, é conferido por LEITURA do fonte, no
 * último bloco. E o LIMITE dessa ligação (a referência atribuída no corpo da renderização pode ficar adiante do
 * que o React comprometeu, e atrás de um `setExibicao` ainda não renderizado) NÃO é demonstrável por teste de
 * módulo, e está declarado no componente.
 */

export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const fluxos = require('@/lib/fluxos-da-referencia');
const rdp = require('@/lib/referencia-do-projeto');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;

type Ref = { executionId: string; revision: number; operationId: string; chosenAt: string; justification: string; authorship: string };
type Exib = { tipo: 'execucao'; executionId: string } | { tipo: 'anterior-a-f07' } | null;

const REF = (executionId: string, revision: number): Ref => ({
  executionId, revision, operationId: `op-${revision}`, chosenAt: '2026-10-01T00:00:00.000Z', justification: 'j', authorship: 'a',
});
const EXEC = (executionId: string): Exib => ({ tipo: 'execucao', executionId });
const EVENTO = (executionId: string, revision: number, operationId = `op-${revision}`) => ({ ...REF(executionId, revision), operationId, projectId: 'p', expectedRevision: revision - 1 });

const respostaConfirmada = (referencia: Ref | null, extra: Record<string, unknown> = {}, persistida = true) => ({
  desfecho: {
    situacao: 'confirmada',
    intencao: {},
    resposta: { status: 200, corpo: { success: true, referencia, evento: referencia ? EVENTO(referencia.executionId, referencia.revision) : undefined, recuperada: false, ...extra } },
  },
  persistida,
});

/** O armazém que os setters do componente escrevem, e o registro (em ordem) do que foi feito. */
function criarTela(inicial: { carregada: Ref | null; conhecida: Ref | null; exibicao: Exib }) {
  const t = {
    carregada: inicial.carregada,
    conhecida: inicial.conhecida,
    exibicao: inicial.exibicao,
    escolhas: [] as any[],
    historico: [] as any[],
    enviados: [] as any[],
    efeitos: [] as string[],
  };
  const acoesCom = (enviar: (p: any) => Promise<any>) => ({
    enviar: (p: any) => { t.enviados.push(p); return enviar(p); },
    setEscolha: (e: any) => { t.escolhas.push(e); t.efeitos.push(e.emAndamento ? 'escolha:em-andamento' : 'escolha:final'); },
    atualizarReferenciaConhecida: (r: Ref | null) => { t.conhecida = r; t.efeitos.push('conhecida'); },
    avancarReferenciaCarregada: (r: Ref | null) => { t.carregada = r; t.efeitos.push('carregada'); },
    acrescentarEventoAoHistorico: (e: any) => { t.historico.push(e); t.efeitos.push('historico'); },
    // o leitor da exibição de AGORA (o componente injeta uma referência atualizada a cada renderização)
    exibicaoVigente: () => t.exibicao,
  });
  const escolher = (executionId: string, enviar: (p: any) => Promise<any>, justificativa = 'porque sim') =>
    fluxos.enviarEscolhaDaReferencia({ executionId, justificativa, referenciaCarregada: t.carregada, acoes: acoesCom(enviar) });
  return { t, acoesCom, escolher };
}

function adiado<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>(res => { resolver = res; });
  return { promessa, resolver };
}
const esvaziar = () => new Promise<void>(r => setImmediate(r));

describe('A5.1: `referenciaCorrespondeAApresentada` (a condição, uma só)', () => {
  test('só é verdadeira quando a exibição é uma execução e é a da referência; é a MESMA condição do rótulo «referência escolhida» da tela', () => {
    const x = REF('exec-X', 6);
    const tabela: [string, Ref | null, Exib, boolean][] = [
      ['a exibida é a da referência', x, EXEC('exec-X'), true],
      ['a exibida é outra', x, EXEC('exec-Y'), false],
      ['o documento anterior a F07', x, { tipo: 'anterior-a-f07' }, false],
      ['sem exibição conhecida', x, null, false],
      ['sem referência', null, EXEC('exec-X'), false],
      ['sem referência e sem exibição', null, null, false],
    ];
    for (const [rotulo, ref, exib, esperado] of tabela) {
      expect([rotulo, fluxos.referenciaCorrespondeAApresentada(ref, exib)]).toEqual([rotulo, esperado]);
      // e coincide com o estado que a tela rotula (para referência não nula)
      if (ref !== null) expect(rdp.estadoDaApresentacao(ref, exib ?? { tipo: 'anterior-a-f07' }).estado === 'referencia-escolhida').toBe(esperado);
    }
  });
});

describe('A5.1: a escolha confirmada só avança a revisão carregada se a execução devolvida é a apresentada', () => {
  test('(critério 1) escolha confirmada COM a execução escolhida sendo a apresentada: a revisão avança, e o aviso de mudança não acusa', async () => {
    const { t, escolher } = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    const desfecho = await escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 6)));
    expect(desfecho).toBe('confirmada-carregada');
    expect(t.carregada).toEqual(REF('exec-X', 6));
    expect(t.conhecida).toEqual(REF('exec-X', 6));
    expect(rdp.compararReferencia(t.carregada, t.conhecida).mudou).toBe(false);
    expect(t.historico).toHaveLength(1);
    expect(t.escolhas[t.escolhas.length - 1]).toEqual({ emAndamento: false, tipo: 'sucesso', mensagem: 'Referência escolhida: revisão 6, execução exec-X.' });
  });

  test('(critério 2) escolha confirmada SEM a execução escolhida ser a apresentada: a referência conhecida é atualizada, a revisão NÃO avança, e `mudanca` continua acusando', async () => {
    const { t, escolher } = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-Y') });
    const desfecho = await escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 6)));
    expect(desfecho).toBe('confirmada-sem-carregar');
    expect(t.conhecida).toEqual(REF('exec-X', 6)); // o painel passa a SABER
    expect(t.carregada).toEqual(REF('exec-Z', 5)); // e a revisão carregada permanece
    expect(t.efeitos).not.toContain('carregada');
    const mudanca = rdp.compararReferencia(t.carregada, t.conhecida);
    expect(mudanca.mudou).toBe(true); // `mudanca` continua acusando
    expect(mudanca.texto).toContain('da revisão 5 (execução exec-Z) para a revisão 6 (execução exec-X)');
    expect(rdp.estadoDaApresentacao(t.conhecida, t.exibicao).estado).toBe('outra-execucao');
    // a escolha FOI gravada: o evento entra no histórico e a mensagem de sucesso é a de sempre
    expect(t.historico).toHaveLength(1);
    expect(t.escolhas[t.escolhas.length - 1]).toEqual({ emAndamento: false, tipo: 'sucesso', mensagem: 'Referência escolhida: revisão 6, execução exec-X.' });
  });

  test('(critério 2) com a tela sem exibição conhecida (`null`) ou no documento anterior a F07, a revisão também não avança', async () => {
    for (const exibicao of [null, { tipo: 'anterior-a-f07' } as Exib]) {
      const { t, escolher } = criarTela({ carregada: null, conhecida: null, exibicao });
      expect(await escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 1)))).toBe('confirmada-sem-carregar');
      expect(t.carregada).toBeNull();
      expect(t.conhecida).toEqual(REF('exec-X', 1));
      expect(rdp.compararReferencia(t.carregada, t.conhecida).mudou).toBe(true);
    }
  });

  test('(critério 3) REENVIO: o servidor devolve o evento ANTIGO e a referência de HOJE; a revisão só avança se a referência de hoje é a execução apresentada', async () => {
    // a escolha antiga foi de X (revisão 6); outra escolha veio depois e a referência de hoje é Z (revisão 8)
    const reenvio = () => respostaConfirmada(REF('exec-Z', 8), { recuperada: true, evento: EVENTO('exec-X', 6, 'op-antigo') });

    // a tela apresenta X (a execução do evento antigo): a de hoje é Z, então NÃO corresponde
    const a = criarTela({ carregada: REF('exec-Q', 5), conhecida: REF('exec-Q', 5), exibicao: EXEC('exec-X') });
    expect(await a.escolher('exec-X', async () => reenvio())).toBe('confirmada-sem-carregar');
    expect(a.t.conhecida).toEqual(REF('exec-Z', 8));
    expect(a.t.carregada).toEqual(REF('exec-Q', 5));
    expect(rdp.compararReferencia(a.t.carregada, a.t.conhecida).mudou).toBe(true);
    expect(a.t.historico).toEqual([]); // resposta recuperada não acrescenta o evento antigo ao histórico (como antes)

    // a tela apresenta Z (a execução da referência de hoje): corresponde, e a revisão avança PARA A DE HOJE
    const b = criarTela({ carregada: REF('exec-Q', 5), conhecida: REF('exec-Q', 5), exibicao: EXEC('exec-Z') });
    expect(await b.escolher('exec-X', async () => reenvio())).toBe('confirmada-carregada');
    expect(b.t.carregada).toEqual(REF('exec-Z', 8));
    expect(b.t.historico).toEqual([]);
  });

  test('(critério 4) a exibição TROCA enquanto a escolha está em voo: vale a exibição do RETORNO, e não a do início do pedido', async () => {
    // caso A: no início a tela apresenta X (a escolhida); durante o voo passa a apresentar Y; no retorno NÃO corresponde
    const a = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    const envioA = adiado<any>();
    const emVooA = a.escolher('exec-X', () => envioA.promessa);
    await esvaziar();
    expect(a.t.escolhas).toEqual([{ emAndamento: true, mensagem: null, tipo: null }]); // ainda em voo
    a.t.exibicao = EXEC('exec-Y'); // a troca, durante o voo
    envioA.resolver(respostaConfirmada(REF('exec-X', 6)));
    expect(await emVooA).toBe('confirmada-sem-carregar');
    expect(a.t.carregada).toEqual(REF('exec-Z', 5));
    expect(a.t.conhecida).toEqual(REF('exec-X', 6));

    // caso B: no início a tela apresenta Y; durante o voo passa a apresentar X (a escolhida); no retorno corresponde
    const b = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-Y') });
    const envioB = adiado<any>();
    const emVooB = b.escolher('exec-X', () => envioB.promessa);
    await esvaziar();
    b.t.exibicao = EXEC('exec-X');
    envioB.resolver(respostaConfirmada(REF('exec-X', 6)));
    expect(await emVooB).toBe('confirmada-carregada');
    expect(b.t.carregada).toEqual(REF('exec-X', 6));
  });

  test('(critério 5) a escolha SEGUINTE usa como `expectedRevision` uma revisão que a tela apresentou: sem avanço, a carregada; com avanço, a nova; sem carregada, 0', async () => {
    // sem avanço: a primeira escolha não foi apresentada, então a segunda parte da revisão 5 (a que a tela apresentou)
    const sem = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-Y') });
    await sem.escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 6)));
    await sem.escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 7)));
    expect(sem.t.enviados.map(p => p.expectedRevision)).toEqual([5, 5]);

    // com avanço: a primeira escolha foi apresentada, então a segunda parte da revisão 6
    const com = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    await com.escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 6)));
    await com.escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 7)));
    expect(com.t.enviados.map(p => p.expectedRevision)).toEqual([5, 6]);

    // sem referência carregada: 0
    const zero = criarTela({ carregada: null, conhecida: null, exibicao: EXEC('exec-X') });
    await zero.escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 1)));
    expect(zero.t.enviados.map(p => p.expectedRevision)).toEqual([0]);
    expect(zero.t.enviados[0]).toEqual({ executionId: 'exec-X', expectedRevision: 0, justification: 'porque sim' });
  });
});

describe('A5.1: o que o corpo de `escolher` fazia continua igual (o código foi MOVIDO para o módulo)', () => {
  test('o primeiro efeito é o estado «em andamento», e a ordem dos efeitos da resposta confirmada é a de antes: conhecida, carregada, histórico, mensagem', async () => {
    const { t, escolher } = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    await escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 6)));
    expect(t.efeitos).toEqual(['escolha:em-andamento', 'conhecida', 'carregada', 'historico', 'escolha:final']);
    expect(t.escolhas[0]).toEqual({ emAndamento: true, mensagem: null, tipo: null });
  });

  test('o armazenamento indisponível acrescenta o aviso à mensagem de sucesso, byte a byte', async () => {
    const { t, escolher } = criarTela({ carregada: null, conhecida: null, exibicao: EXEC('exec-X') });
    await escolher('exec-X', async () => respostaConfirmada(REF('exec-X', 1), {}, false));
    expect(t.escolhas[t.escolhas.length - 1].mensagem).toBe(
      'Referência escolhida: revisão 1, execução exec-X. Aviso: o armazenamento do navegador não está disponível, e uma recarga durante o envio não permitiria recuperar este pedido.'
    );
  });

  test('recusada: o painel passa a SABER a referência corrente, a revisão carregada permanece, e a mensagem é a de antes', async () => {
    const { t, escolher } = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    const desfecho = await escolher('exec-X', async () => ({
      desfecho: { situacao: 'recusada', intencao: {}, resposta: { status: 409, corpo: { error: 'A referência mudou desde que você a viu.', referencia: REF('exec-W', 7) } } },
      persistida: true,
    }));
    expect(desfecho).toBe('recusada');
    expect(t.conhecida).toEqual(REF('exec-W', 7));
    expect(t.carregada).toEqual(REF('exec-Z', 5));
    expect(t.escolhas[t.escolhas.length - 1]).toEqual({ emAndamento: false, tipo: 'erro', mensagem: 'Nada foi gravado. A referência mudou desde que você a viu.' });
    expect(t.historico).toEqual([]);
  });

  test('recusada sem `error` e sem `referencia` no corpo: o texto do status, e a referência conhecida não é tocada', async () => {
    const { t, escolher } = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    await escolher('exec-X', async () => ({ desfecho: { situacao: 'recusada', intencao: {}, resposta: { status: 400, corpo: {} } }, persistida: true }));
    expect(t.escolhas[t.escolhas.length - 1].mensagem).toBe('Nada foi gravado. Pedido recusado (status 400).');
    expect(t.efeitos).not.toContain('conhecida');
  });

  test('pendente: a mensagem de aviso é a de antes (com e sem o aviso do armazenamento)', async () => {
    const { t, escolher } = criarTela({ carregada: null, conhecida: null, exibicao: EXEC('exec-X') });
    const pendente = (persistida: boolean) => async () => ({ desfecho: { situacao: 'pendente', intencao: {}, motivo: 'sem resposta do servidor: rede caiu' }, persistida });
    expect(await escolher('exec-X', pendente(true))).toBe('pendente');
    expect(t.escolhas[t.escolhas.length - 1]).toEqual({
      emAndamento: false,
      tipo: 'aviso',
      mensagem: 'Sem confirmação do servidor (sem resposta do servidor: rede caiu). A escolha permanece guardada neste navegador e será consultada ao reabrir esta tela.',
    });
    await escolher('exec-X', pendente(false));
    expect(t.escolhas[t.escolhas.length - 1].mensagem).toContain('ao reabrir esta tela. Aviso: o armazenamento do navegador não está disponível');
    expect(t.carregada).toBeNull();
  });

  test('o envio lança: a exceção não escapa, a mensagem é a da exceção, e nada é avançado', async () => {
    const { t, escolher } = criarTela({ carregada: REF('exec-Z', 5), conhecida: REF('exec-Z', 5), exibicao: EXEC('exec-X') });
    expect(await escolher('exec-X', async () => { throw new Error('falha de rede'); })).toBe('falhou');
    expect(t.escolhas[t.escolhas.length - 1]).toEqual({ emAndamento: false, tipo: 'erro', mensagem: 'falha de rede' });
    expect(t.carregada).toEqual(REF('exec-Z', 5));
  });
});

describe('A5.1: a ligação ao componente, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const COMPONENTE = ler('components/ReferenciaDoProjeto.tsx');
  const MODULO = ler('lib/fluxos-da-referencia.ts');
  const i = COMPONENTE.indexOf('const escolher = async (executionId: string, justificativa: string) => {');
  const corpoDeEscolher = COMPONENTE.slice(i, COMPONENTE.indexOf('\n  };\n', i));

  test('`escolher` chama `enviarEscolhaDaReferencia({ executionId, justificativa, referenciaCarregada, acoes })` com os setters do componente', () => {
    expect(i).toBeGreaterThan(-1);
    expect(ocorrencias(COMPONENTE, 'await enviarEscolhaDaReferencia({')).toBe(1);
    for (const trecho of [
      'executionId,',
      'justificativa,',
      'referenciaCarregada,',
      'enviar: parametros => executarEscolha(dependenciasDoNavegador(), { projectId, ...parametros }),',
      'setEscolha,',
      'atualizarReferenciaConhecida: setReferencia,',
      'avancarReferenciaCarregada: setReferenciaCarregada,',
      'acrescentarEventoAoHistorico: evento => setHistorico(h => [evento, ...h.filter(x => x.operationId !== evento.operationId)]),',
      'exibicaoVigente: () => exibicaoVigenteRef.current,',
    ]) expect(corpoDeEscolher).toContain(trecho);
  });

  test('o botão chega a `escolher` (`onEscolher={escolher}`), e `expectedRevision` sai de `referenciaCarregada` no módulo', () => {
    expect(ocorrencias(COMPONENTE, 'onEscolher={escolher}')).toBe(1);
    expect(ocorrencias(MODULO, 'expectedRevision: referenciaCarregada?.revision ?? 0,')).toBe(1);
  });

  test('a exibição lida no retorno é uma REFERÊNCIA atualizada no corpo da renderização, e NÃO a propriedade do fecho', () => {
    // criada com a exibição inicial, e atribuída a cada renderização: uma vez, no corpo do componente (recuo de dois espaços)
    expect(ocorrencias(COMPONENTE, 'const exibicaoVigenteRef = useRef<Exibicao | null>(exibicao);')).toBe(1);
    expect(ocorrencias(COMPONENTE, '\n  exibicaoVigenteRef.current = exibicao;\n')).toBe(1);
    expect(ocorrencias(COMPONENTE, 'exibicaoVigenteRef.current =')).toBe(1); // nenhuma outra escrita, em efeito ou em manipulador
    // e a atribuição não está dentro de um `useEffect`
    for (const m of COMPONENTE.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/g)) expect(m[0]).not.toContain('exibicaoVigenteRef');
    // o leitor injetado é o da referência; a propriedade `exibicao` do fecho nunca é o leitor
    expect(COMPONENTE).not.toMatch(/exibicaoVigente:\s*\(\)\s*=>\s*exibicao\b(?!VigenteRef)/);
    expect(ocorrencias(COMPONENTE, 'exibicaoVigente:')).toBe(1);
  });

  test('NENHUM escritor direto de `setReferenciaCarregada`: o estado só é escrito pelas duas funções de fluxo (escolha e carregamento do módulo)', () => {
    expect(ocorrencias(COMPONENTE, 'setReferenciaCarregada(')).toBe(0);
    expect(ocorrencias(COMPONENTE, 'avancarReferenciaCarregada: setReferenciaCarregada,')).toBe(2); // escolher e carregarReferencia
    // e no módulo, o avanço da escolha está atrás da condição, e o do carregamento depois de `apresentar`
    expect(MODULO).toMatch(/if \(apresentada\) acoes\.avancarReferenciaCarregada\(referencia\);/);
    // três chamadas no módulo: `sem-referencia` (A4: não há referência, grava `null`), `carregada` (depois de apresentar) e a escolha
    expect(ocorrencias(MODULO, 'acoes.avancarReferenciaCarregada(')).toBe(3);
  });
});
