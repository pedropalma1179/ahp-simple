/**
 * lib/__tests__/f07-a5-exibir.test.ts
 *
 * F07, entrega A5, pontos 4 e 5: o clique em "Exibir" (e em "Carregar a referência atual") na lista de
 * execuções de `components/ReferenciaDoProjeto.tsx`.
 *
 *   - ponto 5: a falha de "Exibir" não era tratada. `lerExecucao` faz `getDoc` sem tratamento próprio e
 *     lança em falha de leitura; `exibir` não tinha `try`, e a exceção escapava do manipulador, sem aviso;
 *   - ponto 4: a corrida entre dois cliques (blocos `A5.4`, depois dos blocos `A5.5`): o ÚLTIMO clique vence.
 *
 * Exercita as funções REAIS de `lib/fluxos-da-referencia.ts` (`exibirExecucaoDaLista`,
 * `carregarReferenciaAtual`, `criarOrdemDeCliques`), que o componente chama com os seus setters (a ligação
 * está nos blocos de LEITURA do fonte, em cada ponto), e a `lerExecucao` REAL de `lib/referencia-leitura.ts`
 * contra um `getDoc` que lança.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que o componente montado funcione: nenhuma tela é montada por
 * teste algum. Os setters são um armazém simples, e não os de `useState`. Nos blocos `A5.4`, as funções
 * auxiliares `clicarExibir` e `clicarCarregar` repetem a FIAÇÃO de duas linhas que o componente faz (pegar o
 * bilhete no clique e passar `vigente`); a lógica sob teste (a conferência e os desfechos) é a REAL, e a fiação
 * repetida é conferida contra o componente, por leitura, no último bloco.
 */

export {};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const firestore = require('firebase/firestore');
const referenciaLeitura = require('@/lib/referencia-leitura');
const fluxos = require('@/lib/fluxos-da-referencia');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;

/** O armazém: o que a tela apresentou, os avisos, e a ordem das escritas. */
function criarTela(lerExecucao: (id: string) => Promise<Record<string, any> | null>, opcoes: { apresentar?: (d: Record<string, any>) => void } = {}) {
  const apresentados: Record<string, any>[] = [];
  const avisos: string[] = [];
  const acoes = {
    lerExecucao,
    apresentar: (d: Record<string, any>) => {
      if (opcoes.apresentar) opcoes.apresentar(d);
      apresentados.push(d);
    },
    acrescentarAviso: (t: string) => { avisos.push(t); },
  };
  return { apresentados, avisos, acoes };
}

const DOC_X = { executionId: 'exec-X', engineVersion: 'x' };

describe('A5.5: a falha de "Exibir" é tratada', () => {
  test('(critério 1) `lerExecucao` REAL contra um `getDoc` que lança: a exceção não escapa do manipulador, a tela avisa que a execução não pôde ser LIDA, e a apresentação não muda', async () => {
    firestore.getDoc.mockReset();
    firestore.getDoc.mockRejectedValue(new Error('permission-denied'));
    // a premissa do defeito, medida: a função real LANÇA
    await expect(referenciaLeitura.lerExecucao({}, 'exec-X')).rejects.toThrow('permission-denied');
    // o manipulador, com a leitura real injetada como o componente a injeta (`obterDocumento` chama `lerExecucao`)
    const tela = criarTela(id => referenciaLeitura.lerExecucao({}, id));
    const desfecho = await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: tela.acoes }); // se a exceção escapasse, esta linha rejeitaria
    expect(desfecho).toBe('falhou');
    expect(tela.apresentados).toEqual([]); // a apresentação não mudou
    expect(tela.avisos).toHaveLength(1);
    expect(tela.avisos[0]).toBe(fluxos.avisoDeExecucaoNaoLida('exec-X', 'permission-denied'));
    expect(tela.avisos[0]).toContain('não pôde ser lida');
    expect(tela.avisos[0]).toContain('exec-X');
    expect(tela.avisos[0]).toContain('permission-denied');
  });

  test('(critério 2) o caso `null` continua com o aviso de HOJE, e os dois avisos são distinguíveis', async () => {
    const nula = criarTela(async () => null);
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: nula.acoes })).toBe('nao-encontrada');
    expect(nula.avisos).toEqual(['A execução exec-X não foi encontrada.']); // o texto de antes de A5, byte a byte
    expect(nula.apresentados).toEqual([]);

    const lanca = criarTela(async () => { throw new Error('rede caiu'); });
    await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: lanca.acoes });
    expect(lanca.avisos[0]).not.toBe(nula.avisos[0]);
    expect(lanca.avisos[0]).not.toContain('não foi encontrada');
    expect(nula.avisos[0]).not.toContain('não pôde ser lida');
  });

  test('(critério 3) a ação VOLTA a ser possível depois da falha, sem recarregar: o mesmo manipulador, a mesma tela, a leitura seguinte funciona', async () => {
    let chamadas = 0;
    const tela = criarTela(async () => {
      chamadas += 1;
      if (chamadas === 1) throw new Error('rede caiu');
      return DOC_X;
    });
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: tela.acoes })).toBe('falhou');
    expect(tela.apresentados).toEqual([]);
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: tela.acoes })).toBe('apresentada');
    expect(tela.apresentados).toEqual([DOC_X]);
    expect(tela.avisos).toHaveLength(1); // só o da primeira tentativa
  });

  test('a leitura deu certo e a APRESENTAÇÃO lança: aviso próprio, a exceção não escapa', async () => {
    const tela = criarTela(async () => DOC_X, { apresentar: () => { throw new Error('falha ao apresentar'); } });
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: tela.acoes })).toBe('falhou');
    expect(tela.avisos).toEqual([fluxos.avisoDeExecucaoNaoApresentada('exec-X', 'falha ao apresentar')]);
    expect(tela.avisos[0]).toContain('foi lida, mas não pôde ser apresentada');
  });

  test('o sucesso: o documento é entregue UMA vez, exatamente como veio, e não há aviso', async () => {
    const tela = criarTela(async () => DOC_X);
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: tela.acoes })).toBe('apresentada');
    expect(tela.apresentados).toHaveLength(1);
    expect(tela.apresentados[0]).toBe(DOC_X);
    expect(tela.avisos).toEqual([]);
  });

  test('uma leitura que rejeita com algo que não é Error: a exceção também não escapa', async () => {
    const tela = criarTela(() => Promise.reject('texto solto'));
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes: tela.acoes })).toBe('falhou');
    expect(tela.avisos[0]).toContain('texto solto');
  });

  test('o caminho de "Carregar a referência atual" (A4, item 3) NÃO foi alterado: a mesma leitura que lança segue avisando e sem avançar a revisão', async () => {
    const avancos: unknown[] = [];
    const avisos: string[] = [];
    const referencia = { projectId: 'p', executionId: 'exec-X', revision: 3, operationId: 'op-3' };
    const desfecho = await fluxos.carregarReferenciaAtual({
      referencia,
      revisaoCarregada: 2,
      acoes: {
        lerExecucao: async () => { throw new Error('permission-denied'); },
        apresentar: () => undefined,
        avancarReferenciaCarregada: (r: unknown) => { avancos.push(r); },
        acrescentarAviso: (t: string) => { avisos.push(t); },
      },
    });
    expect(desfecho).toBe('falhou');
    expect(avancos).toEqual([]);
    expect(avisos[0]).toContain('não pôde ser carregada'); // o texto próprio do carregamento, não o do Exibir
    expect(avisos[0]).not.toContain('não pôde ser lida');
  });
});

describe('A5.5: a ligação ao componente, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const COMPONENTE = ler('components/ReferenciaDoProjeto.tsx');

  test('`exibir` chama `exibirExecucaoDaLista({ executionId, acoes: { lerExecucao: obterDocumento, apresentar: onExibir, acrescentarAviso: setAvisos } })`', () => {
    expect(ocorrencias(COMPONENTE, 'await exibirExecucaoDaLista({')).toBe(1);
    const i = COMPONENTE.indexOf('const exibir = async (executionId: string) => {');
    const corpo = COMPONENTE.slice(i, COMPONENTE.indexOf('\n  };\n', i));
    expect(corpo).toContain('executionId,');
    expect(corpo).toContain('lerExecucao: obterDocumento,');
    expect(corpo).toContain('apresentar: documento => { onExibir(documento); },');
    expect(corpo).toContain('acrescentarAviso: texto => setAvisos(a => [...a, texto]),');
  });

  test('o painel recebe `exibir` como `onExibir` (é o manipulador do botão "Exibir"), e `obterDocumento` é o MESMO do carregamento', () => {
    expect(ocorrencias(COMPONENTE, 'onExibir={exibir}')).toBe(1);
    expect(ocorrencias(COMPONENTE, 'lerExecucao: obterDocumento,')).toBe(2); // exibir e carregarReferencia
    expect(ocorrencias(COMPONENTE, 'await lerExecucao(db, executionId)')).toBe(1); // a única leitura real, dentro de obterDocumento
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ponto 4: a corrida entre dois cliques. O ÚLTIMO clique vence.
// ─────────────────────────────────────────────────────────────────────────────

/** Uma leitura em voo, cuja resolução o teste controla. */
function adiado<T>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<T>((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}
type Leitura = ReturnType<typeof adiado<Record<string, any> | null>>;
const novaLeitura = (): Leitura => adiado<Record<string, any> | null>();
/** Deixa as continuações pendentes rodarem. */
const esvaziar = () => new Promise<void>(r => setImmediate(r));

/** A tela dos cliques: UMA ordem (como o `useRef` do componente), os eventos na ordem em que ocorreram e os avisos. */
function criarTelaDeCliques() {
  return { ordem: fluxos.criarOrdemDeCliques(), eventos: [] as string[], avisos: [] as string[] };
}
type TelaDeCliques = ReturnType<typeof criarTelaDeCliques>;

/**
 * O clique em "Exibir", com a FIAÇÃO que `exibir` faz no componente: o bilhete é pego NO CLIQUE, antes do
 * `await`, e `vigente` o confere contra a ordem de agora. (A fiação é conferida contra o componente, por leitura,
 * no último bloco.)
 */
function clicarExibir(tela: TelaDeCliques, executionId: string, leitura: Leitura) {
  const bilhete = tela.ordem.novo();
  return fluxos.exibirExecucaoDaLista({
    executionId,
    acoes: {
      lerExecucao: () => leitura.promessa,
      apresentar: (d: Record<string, any>) => { tela.eventos.push(`apresentar:${d.executionId}`); },
      acrescentarAviso: (t: string) => { tela.avisos.push(t); },
      vigente: () => tela.ordem.vigente(bilhete),
    },
  });
}

/** O clique em "Carregar a referência atual", com a fiação de `carregarReferencia`. */
function clicarCarregar(tela: TelaDeCliques, referencia: { projectId: string; executionId: string; revision: number; operationId: string }, leitura: Leitura) {
  const bilhete = tela.ordem.novo();
  return fluxos.carregarReferenciaAtual({
    referencia,
    revisaoCarregada: 1,
    acoes: {
      lerExecucao: () => leitura.promessa,
      apresentar: (d: Record<string, any>) => { tela.eventos.push(`apresentar:${d.executionId}`); },
      avancarReferenciaCarregada: (r: { executionId: string; revision: number } | null) => { tela.eventos.push(`avancar:${r?.executionId}@${r?.revision}`); },
      acrescentarAviso: (t: string) => { tela.avisos.push(t); },
      vigente: () => tela.ordem.vigente(bilhete),
    },
  });
}

const refDe = (executionId: string, revision: number) => ({ projectId: 'p', executionId, revision, operationId: `op-${revision}` });
const docDe = (executionId: string) => ({ executionId, engineVersion: 'x' });

describe('A5.4: o ÚLTIMO clique vence (dois cliques em "Exibir")', () => {
  test('(critério 1) a primeira leitura resolve DEPOIS da segunda: a tela fica na execução do último clique, e a primeira não tem efeito algum', async () => {
    const tela = criarTelaDeCliques();
    const leituraX = novaLeitura();
    const leituraY = novaLeitura();
    const cliqueX = clicarExibir(tela, 'exec-X', leituraX); // o primeiro clique
    const cliqueY = clicarExibir(tela, 'exec-Y', leituraY); // o último
    leituraY.resolver(docDe('exec-Y'));
    await esvaziar();
    leituraX.resolver(docDe('exec-X')); // a mais lenta resolve por último
    expect(await cliqueY).toBe('apresentada');
    expect(await cliqueX).toBe('superada');
    expect(tela.eventos).toEqual(['apresentar:exec-Y']); // a execução X nunca foi apresentada
    expect(tela.avisos).toEqual([]);
  });

  test('a primeira leitura resolve ANTES da segunda: o resultado é o mesmo (a execução do último clique), porque o primeiro já foi superado', async () => {
    const tela = criarTelaDeCliques();
    const leituraX = novaLeitura();
    const leituraY = novaLeitura();
    const cliqueX = clicarExibir(tela, 'exec-X', leituraX);
    const cliqueY = clicarExibir(tela, 'exec-Y', leituraY);
    leituraX.resolver(docDe('exec-X')); // volta primeiro, com o segundo clique ainda em voo
    await esvaziar();
    expect(tela.eventos).toEqual([]); // nada foi apresentado: quem manda é o último clique
    leituraY.resolver(docDe('exec-Y'));
    expect(await cliqueX).toBe('superada');
    expect(await cliqueY).toBe('apresentada');
    expect(tela.eventos).toEqual(['apresentar:exec-Y']);
  });

  test('dois cliques SEQUENCIAIS (o primeiro já terminou): os dois têm efeito, na ordem em que aconteceram', async () => {
    const tela = criarTelaDeCliques();
    const leituraX = novaLeitura();
    const cliqueX = clicarExibir(tela, 'exec-X', leituraX);
    leituraX.resolver(docDe('exec-X'));
    expect(await cliqueX).toBe('apresentada');
    const leituraY = novaLeitura();
    const cliqueY = clicarExibir(tela, 'exec-Y', leituraY);
    leituraY.resolver(docDe('exec-Y'));
    expect(await cliqueY).toBe('apresentada');
    expect(tela.eventos).toEqual(['apresentar:exec-X', 'apresentar:exec-Y']);
  });

  test('o MESMO executionId clicado duas vezes: só o último clique apresenta (uma apresentação, não duas)', async () => {
    const tela = criarTelaDeCliques();
    const primeira = novaLeitura();
    const segunda = novaLeitura();
    const c1 = clicarExibir(tela, 'exec-X', primeira);
    const c2 = clicarExibir(tela, 'exec-X', segunda);
    primeira.resolver(docDe('exec-X'));
    segunda.resolver(docDe('exec-X'));
    expect([await c1, await c2]).toEqual(['superada', 'apresentada']);
    expect(tela.eventos).toEqual(['apresentar:exec-X']);
  });
});

describe('A5.4: "Carregar a referência atual" e "Exibir" são da MESMA ordem de cliques', () => {
  test('(critério 2) "Carregar" seguido de "Exibir", a leitura do Carregar resolvendo depois: a tela fica na do Exibir, e a revisão carregada NÃO avança', async () => {
    const tela = criarTelaDeCliques();
    const leituraRef = novaLeitura();
    const leituraY = novaLeitura();
    const carregar = clicarCarregar(tela, refDe('exec-X', 5), leituraRef);
    const exibir = clicarExibir(tela, 'exec-Y', leituraY);
    leituraY.resolver(docDe('exec-Y'));
    await esvaziar();
    leituraRef.resolver(docDe('exec-X'));
    expect(await exibir).toBe('apresentada');
    expect(await carregar).toBe('superada');
    expect(tela.eventos).toEqual(['apresentar:exec-Y']); // sem `avancar:`: a revisão 5 não foi apresentada
    expect(tela.avisos).toEqual([]);
  });

  test('(critério 2, o inverso) "Exibir" seguido de "Carregar", a leitura do Exibir resolvendo depois: a tela fica na referência, e a revisão avança PARA ELA', async () => {
    const tela = criarTelaDeCliques();
    const leituraY = novaLeitura();
    const leituraRef = novaLeitura();
    const exibir = clicarExibir(tela, 'exec-Y', leituraY);
    const carregar = clicarCarregar(tela, refDe('exec-X', 5), leituraRef);
    leituraRef.resolver(docDe('exec-X'));
    await esvaziar();
    leituraY.resolver(docDe('exec-Y'));
    expect(await carregar).toBe('carregada');
    expect(await exibir).toBe('superada');
    expect(tela.eventos).toEqual(['apresentar:exec-X', 'avancar:exec-X@5']);
    expect(tela.avisos).toEqual([]);
  });

  test('(critério 2) as duas ordens de resolução, nos dois pares: sempre vence o último clique', async () => {
    for (const primeiroEhCarregar of [true, false]) {
      for (const ultimoResolvePrimeiro of [true, false]) {
        const tela = criarTelaDeCliques();
        const l1 = novaLeitura();
        const l2 = novaLeitura();
        const c1 = primeiroEhCarregar ? clicarCarregar(tela, refDe('exec-X', 5), l1) : clicarExibir(tela, 'exec-X', l1);
        const c2 = primeiroEhCarregar ? clicarExibir(tela, 'exec-Y', l2) : clicarCarregar(tela, refDe('exec-Y', 6), l2);
        if (ultimoResolvePrimeiro) { l2.resolver(docDe('exec-Y')); await esvaziar(); l1.resolver(docDe('exec-X')); }
        else { l1.resolver(docDe('exec-X')); await esvaziar(); l2.resolver(docDe('exec-Y')); }
        await c1; await c2;
        // o último clique apresenta Y; a revisão só avança se o último clique era o Carregar (e é a de Y)
        expect(tela.eventos).toEqual(primeiroEhCarregar ? ['apresentar:exec-Y'] : ['apresentar:exec-Y', 'avancar:exec-Y@6']);
        expect(tela.avisos).toEqual([]);
      }
    }
  });
});

describe('A5.4: nenhuma apresentação mistura documento de uma execução com estado de outra', () => {
  /** As seis ordens de resolução de três leituras. */
  const PERMUTACOES = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

  test('(critério 3) três cliques, nas 8 combinações de Exibir/Carregar e nas 6 ordens de resolução (48 casos): UMA apresentação, a do último clique; todo avanço de revisão vem logo depois da apresentação da MESMA execução', async () => {
    let casos = 0;
    for (let mascara = 0; mascara < 8; mascara += 1) {
      for (const ordemDeResolucao of PERMUTACOES) {
        const tela = criarTelaDeCliques();
        const cliques = [0, 1, 2].map(i => ({ id: `exec-${i}`, ehCarregar: Boolean(mascara & (1 << i)), revisao: 10 + i, leitura: novaLeitura() }));
        const promessas = cliques.map(c => (c.ehCarregar ? clicarCarregar(tela, refDe(c.id, c.revisao), c.leitura) : clicarExibir(tela, c.id, c.leitura)));
        for (const i of ordemDeResolucao) { cliques[i].leitura.resolver(docDe(cliques[i].id)); await esvaziar(); }
        await Promise.all(promessas);
        casos += 1;
        const ultimo = cliques[2];
        const esperado = ultimo.ehCarregar ? [`apresentar:${ultimo.id}`, `avancar:${ultimo.id}@${ultimo.revisao}`] : [`apresentar:${ultimo.id}`];
        expect({ mascara, ordemDeResolucao, eventos: tela.eventos, avisos: tela.avisos }).toEqual({ mascara, ordemDeResolucao, eventos: esperado, avisos: [] });
        // o invariante, dito à parte: nenhum `avancar:` sem a apresentação da mesma execução imediatamente antes
        tela.eventos.forEach((e, i) => {
          if (e.startsWith('avancar:')) expect(tela.eventos[i - 1]).toBe(`apresentar:${e.slice('avancar:'.length).split('@')[0]}`);
        });
      }
    }
    expect(casos).toBe(48);
  });
});

describe('A5.4: um clique superado não avisa; o clique vigente avisa como antes', () => {
  test('a leitura do clique SUPERADO lança: sem aviso (a tela já deixou aquele clique), e o desfecho é `superada`', async () => {
    const tela = criarTelaDeCliques();
    const l1 = novaLeitura();
    const l2 = novaLeitura();
    const c1 = clicarExibir(tela, 'exec-X', l1);
    const c2 = clicarExibir(tela, 'exec-Y', l2);
    l2.resolver(docDe('exec-Y'));
    await esvaziar();
    l1.rejeitar(new Error('rede caiu'));
    expect(await c1).toBe('superada');
    expect(await c2).toBe('apresentada');
    expect(tela.avisos).toEqual([]);
    expect(tela.eventos).toEqual(['apresentar:exec-Y']);
  });

  test('a leitura do "Carregar a referência atual" SUPERADO lança: sem aviso e sem avançar a revisão (o mesmo vale para "Carregar", e não só para "Exibir")', async () => {
    const tela = criarTelaDeCliques();
    const lCarregar = novaLeitura();
    const lExibir = novaLeitura();
    const carregar = clicarCarregar(tela, refDe('exec-X', 5), lCarregar);
    const exibir = clicarExibir(tela, 'exec-Y', lExibir);
    lExibir.resolver(docDe('exec-Y'));
    await esvaziar();
    lCarregar.rejeitar(new Error('rede caiu'));
    expect(await carregar).toBe('superada');
    expect(await exibir).toBe('apresentada');
    expect(tela.avisos).toEqual([]);
    expect(tela.eventos).toEqual(['apresentar:exec-Y']); // sem `avancar:`
  });

  test('a leitura do clique SUPERADO devolve `null`: sem o aviso «não foi encontrada»', async () => {
    const tela = criarTelaDeCliques();
    const l1 = novaLeitura();
    const l2 = novaLeitura();
    const c1 = clicarExibir(tela, 'exec-X', l1);
    const c2 = clicarExibir(tela, 'exec-Y', l2);
    l1.resolver(null);
    l2.resolver(docDe('exec-Y'));
    expect([await c1, await c2]).toEqual(['superada', 'apresentada']);
    expect(tela.avisos).toEqual([]);
  });

  test('o clique VIGENTE que falha avisa, mesmo havendo um clique anterior superado em voo; e o aviso não vira o do clique anterior', async () => {
    const tela = criarTelaDeCliques();
    const l1 = novaLeitura();
    const l2 = novaLeitura();
    const c1 = clicarExibir(tela, 'exec-X', l1);
    const c2 = clicarExibir(tela, 'exec-Y', l2);
    l2.rejeitar(new Error('permission-denied'));
    await esvaziar();
    l1.resolver(docDe('exec-X'));
    expect(await c2).toBe('falhou');
    expect(await c1).toBe('superada');
    expect(tela.avisos).toEqual([fluxos.avisoDeExecucaoNaoLida('exec-Y', 'permission-denied')]);
    expect(tela.eventos).toEqual([]); // a tela fica no que exibia: nada do X foi apresentado em lugar do Y que falhou
  });

  test('o "Carregar" VIGENTE que falha mantém o aviso e a revisão (A4, item 3), com um "Exibir" anterior superado em voo', async () => {
    const tela = criarTelaDeCliques();
    const lExibir = novaLeitura();
    const lCarregar = novaLeitura();
    const exibir = clicarExibir(tela, 'exec-Y', lExibir);
    const carregar = clicarCarregar(tela, refDe('exec-X', 5), lCarregar);
    lCarregar.resolver(null);
    lExibir.resolver(docDe('exec-Y'));
    expect(await carregar).toBe('nao-encontrada');
    expect(await exibir).toBe('superada');
    expect(tela.avisos).toHaveLength(1);
    expect(tela.avisos[0]).toBe(fluxos.mensagemDeFalhaDaCarga(refDe('exec-X', 5), 'a execução exec-X não foi encontrada', 1));
    expect(tela.eventos).toEqual([]);
  });
});

describe('A5.4: o clique único se comporta como antes (e quem não passa `vigente` também)', () => {
  test('um clique só em "Exibir" e um só em "Carregar": apresentam, avançam e avisam exatamente como sem a ordem', async () => {
    const tela = criarTelaDeCliques();
    const l1 = novaLeitura();
    const c1 = clicarExibir(tela, 'exec-X', l1);
    l1.resolver(docDe('exec-X'));
    expect(await c1).toBe('apresentada');
    const l2 = novaLeitura();
    const c2 = clicarCarregar(tela, refDe('exec-Y', 7), l2);
    l2.resolver(docDe('exec-Y'));
    expect(await c2).toBe('carregada');
    expect(tela.eventos).toEqual(['apresentar:exec-X', 'apresentar:exec-Y', 'avancar:exec-Y@7']);
  });

  test('sem `vigente` (como os testes de A4 chamam), nada é superado: o comportamento de A4 está intacto', async () => {
    const eventos: string[] = [];
    const acoes = {
      lerExecucao: async () => DOC_X,
      apresentar: () => { eventos.push('apresentar'); },
      avancarReferenciaCarregada: () => { eventos.push('avancar'); },
      acrescentarAviso: () => undefined,
    };
    expect(await fluxos.carregarReferenciaAtual({ referencia: refDe('exec-X', 3), revisaoCarregada: 2, acoes })).toBe('carregada');
    expect(await fluxos.exibirExecucaoDaLista({ executionId: 'exec-X', acoes })).toBe('apresentada');
    expect(eventos).toEqual(['apresentar', 'avancar', 'apresentar']);
  });

  test('`criarOrdemDeCliques`: o bilhete de um clique deixa de ser vigente assim que outro acontece, e só o último é vigente', () => {
    const ordem = fluxos.criarOrdemDeCliques();
    const a = ordem.novo();
    expect(ordem.vigente(a)).toBe(true);
    const b = ordem.novo();
    expect(ordem.vigente(a)).toBe(false);
    expect(ordem.vigente(b)).toBe(true);
    expect(a).not.toBe(b);
    // duas ordens são independentes: a de um painel não supera a de outro
    const outra = fluxos.criarOrdemDeCliques();
    outra.novo();
    expect(ordem.vigente(b)).toBe(true);
  });
});

describe('A5.4: a ligação ao componente, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const COMPONENTE = ler('components/ReferenciaDoProjeto.tsx');
  const corpoDe = (inicio: string) => {
    const i = COMPONENTE.indexOf(inicio);
    expect(i).toBeGreaterThan(-1);
    return COMPONENTE.slice(i, COMPONENTE.indexOf('\n  };\n', i));
  };

  test('UMA ordem por painel, num `useRef` criado uma vez, e compartilhada por "Exibir" e "Carregar a referência atual" (dois pegadores de bilhete, uma única ordem)', () => {
    expect(ocorrencias(COMPONENTE, 'criarOrdemDeCliques()')).toBe(1);
    expect(ocorrencias(COMPONENTE, 'useRef<OrdemDeCliques | null>(null)')).toBe(1);
    expect(ocorrencias(COMPONENTE, 'ordemDeCliques.novo()')).toBe(2);
    expect(ocorrencias(COMPONENTE, 'vigente: () => ordemDeCliques.vigente(bilhete),')).toBe(2);
  });

  test('em `exibir` e em `carregarReferencia`, o bilhete é pego ANTES do `await` da função de fluxo (no clique), e `vigente` está nos argumentos de `acoes`', () => {
    for (const [inicio, chamada] of [
      ['const exibir = async (executionId: string) => {', 'await exibirExecucaoDaLista({'],
      ['const carregarReferencia = async () => {', 'await carregarReferenciaAtual({'],
    ]) {
      const corpo = corpoDe(inicio);
      const iBilhete = corpo.indexOf('const bilhete = ordemDeCliques.novo();');
      const iChamada = corpo.indexOf(chamada);
      expect(iBilhete).toBeGreaterThan(-1);
      expect(iChamada).toBeGreaterThan(iBilhete); // o bilhete vem antes da chamada que aguarda a leitura
      expect(corpo.slice(0, iBilhete)).not.toContain('await'); // e nenhum `await` o precede
      expect(corpo.slice(iChamada)).toContain('vigente: () => ordemDeCliques.vigente(bilhete),');
    }
  });

  test('os dois botões chegam a esses dois manipuladores: `onExibir={exibir}` e `onCarregarReferencia={carregarReferencia}`', () => {
    expect(ocorrencias(COMPONENTE, 'onExibir={exibir}')).toBe(1);
    expect(ocorrencias(COMPONENTE, 'onCarregarReferencia={carregarReferencia}')).toBe(1);
  });
});
