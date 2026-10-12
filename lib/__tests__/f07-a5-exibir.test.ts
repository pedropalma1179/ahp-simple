/**
 * lib/__tests__/f07-a5-exibir.test.ts
 *
 * F07, entrega A5, pontos 4 e 5: o clique em "Exibir" (e em "Carregar a referência atual") na lista de
 * execuções de `components/ReferenciaDoProjeto.tsx`.
 *
 *   - ponto 5: a falha de "Exibir" não era tratada. `lerExecucao` faz `getDoc` sem tratamento próprio e
 *     lança em falha de leitura; `exibir` não tinha `try`, e a exceção escapava do manipulador, sem aviso;
 *   - ponto 4: a corrida entre dois cliques (bloco `A5.4`, abaixo do bloco `A5.5`).
 *
 * Exercita as funções REAIS de `lib/fluxos-da-referencia.ts`, que o componente chama com os seus setters
 * (a ligação está no último bloco, por LEITURA do fonte), e a `lerExecucao` REAL de
 * `lib/referencia-leitura.ts` contra um `getDoc` que lança.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que o componente montado funcione: nenhuma tela é montada por
 * teste algum. Os setters são um armazém simples, e não os de `useState`.
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
