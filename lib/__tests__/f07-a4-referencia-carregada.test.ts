/**
 * F07, A4, item 3: "Carregar a referência atual" só avança a revisão carregada DEPOIS de apresentar.
 *
 * ⚠ O que estes testes exercitam: `carregarReferenciaAtual`, de `lib/fluxos-da-referencia.ts`, que é a
 * função que `components/ReferenciaDoProjeto.tsx` chama. ⚠ O que NÃO demonstram: que o componente
 * funcione. Nenhuma tela é montada; a fiação do componente é conferida por LEITURA do fonte (bloco
 * final). A leitura real do Firestore (`lerExecucao`) é uma função injetada: aqui entra um duplo que
 * devolve `null` ou lança; o `lerExecucao` verdadeiro não é exercitado por este arquivo.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as fluxos from '@/lib/fluxos-da-referencia';
import { compararReferencia, type ReferenciaDoProjeto } from '@/lib/referencia-do-projeto';

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;

const referencia = (revision: number, executionId: string): ReferenciaDoProjeto =>
  ({ projectId: 'p', executionId, revision, operationId: `op-${revision}` } as unknown as ReferenciaDoProjeto);

const R2 = referencia(2, 'exec-2');
const R3 = referencia(3, 'exec-3');

/** Uma "tela": registra a ORDEM dos efeitos e guarda o estado que o componente guarda. */
function criarTela(inicial: ReferenciaDoProjeto | null, lerExecucao: (id: string) => Promise<Record<string, any> | null>, apresentar?: (d: Record<string, any>) => void) {
  const eventos: string[] = [];
  const estado = { carregada: inicial, avisos: [] as string[], apresentados: [] as Record<string, any>[] };
  const acoes: fluxos.AcoesDaCargaDaReferencia = {
    lerExecucao: async id => { eventos.push(`ler:${id}`); return lerExecucao(id); },
    apresentar: d => {
      eventos.push('apresentar');
      if (apresentar) apresentar(d);
      estado.apresentados.push(d);
    },
    avancarReferenciaCarregada: r => { eventos.push(`avancar:${r === null ? 'null' : r.revision}`); estado.carregada = r; },
    acrescentarAviso: t => { eventos.push('aviso'); estado.avisos.push(t); },
  };
  return { eventos, estado, acoes };
}

const DOC3 = { executionId: 'exec-3', engineVersion: 'x' };

describe('A4.3: carregarReferenciaAtual, a revisão só avança depois de apresentar', () => {
  test('(critério 1) a leitura devolve null: a revisão NÃO avança, o aviso de mudança permanece e a tela avisa que a referência não pôde ser carregada', async () => {
    const tela = criarTela(R2, async () => null);
    const desfecho = await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes });
    expect(desfecho).toBe('nao-encontrada');
    expect(tela.estado.carregada).toBe(R2); // a revisão mantida
    expect(tela.estado.apresentados).toEqual([]); // nada foi apresentado
    expect(tela.eventos).toEqual(['ler:exec-3', 'aviso']);
    // o aviso de mudança que o painel mostra é DERIVADO de (carregada, corrente): continua dizendo que mudou
    expect(compararReferencia(tela.estado.carregada, R3).mudou).toBe(true);
    expect(tela.estado.avisos).toHaveLength(1);
    expect(tela.estado.avisos[0]).toContain('não pôde ser carregada');
    expect(tela.estado.avisos[0]).toContain('revisão 3');
    expect(tela.estado.avisos[0]).toContain('exec-3');
    expect(tela.estado.avisos[0]).toContain('não foi encontrada');
    expect(tela.estado.avisos[0]).toContain('com a revisão 2 carregada');
  });

  test('(critério 2) a leitura LANÇA: a revisão não avança, a exceção NÃO escapa, e o aviso diz que não pôde ser carregada', async () => {
    const tela = criarTela(R2, async () => { throw new Error('permission-denied'); });
    // se a exceção escapasse, o `await` abaixo rejeitaria e o teste falharia aqui
    const desfecho = await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes });
    expect(desfecho).toBe('falhou');
    expect(tela.estado.carregada).toBe(R2);
    expect(tela.estado.apresentados).toEqual([]);
    expect(tela.eventos).toEqual(['ler:exec-3', 'aviso']);
    expect(compararReferencia(tela.estado.carregada, R3).mudou).toBe(true);
    expect(tela.estado.avisos[0]).toContain('não pôde ser carregada');
    expect(tela.estado.avisos[0]).toContain('permission-denied');
  });

  test('a leitura rejeita com algo que não é Error: a exceção também não escapa', async () => {
    const tela = criarTela(R2, () => Promise.reject('texto solto'));
    expect(await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes })).toBe('falhou');
    expect(tela.estado.avisos[0]).toContain('texto solto');
  });

  test('(critério 3) sucesso: a ORDEM é ler, apresentar, avançar, e a revisão avançada é a referência vista no clique', async () => {
    const tela = criarTela(R2, async () => DOC3);
    const desfecho = await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes });
    expect(desfecho).toBe('carregada');
    expect(tela.eventos).toEqual(['ler:exec-3', 'apresentar', 'avancar:3']);
    expect(tela.estado.carregada).toBe(R3);
    expect(tela.estado.apresentados).toEqual([DOC3]);
    expect(tela.estado.avisos).toEqual([]);
    expect(compararReferencia(tela.estado.carregada, R3).mudou).toBe(false);
  });

  test('a apresentação que LANÇA (síncrona): a revisão não avança, a exceção não escapa', async () => {
    const tela = criarTela(R2, async () => DOC3, () => { throw new Error('falha ao apresentar'); });
    const desfecho = await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes });
    expect(desfecho).toBe('falhou');
    expect(tela.estado.carregada).toBe(R2);
    expect(tela.eventos).toEqual(['ler:exec-3', 'apresentar', 'aviso']);
    expect(tela.estado.avisos[0]).toContain('falha ao apresentar');
  });

  test('o momento em que a revisão avança: já depois do `apresentar`, e NÃO depois da auditoria que a tela pede em seguida (que fica em voo)', async () => {
    let liberar: () => void = () => undefined;
    const emVoo = new Promise<void>(r => { liberar = r; });
    const tela = criarTela(R2, async () => DOC3);
    tela.acoes.apresentar = d => { tela.eventos.push('apresentar'); tela.estado.apresentados.push(d); return emVoo; };
    const desfecho = await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes });
    expect(desfecho).toBe('carregada'); // retornou com a "auditoria" ainda em voo
    expect(tela.estado.carregada).toBe(R3);
    liberar();
  });

  test('sem referência: não há o que apresentar, e a revisão carregada passa a ser null (comportamento de antes preservado)', async () => {
    const tela = criarTela(R2, async () => { throw new Error('não devia ler'); });
    const desfecho = await fluxos.carregarReferenciaAtual({ referencia: null, revisaoCarregada: 2, acoes: tela.acoes });
    expect(desfecho).toBe('sem-referencia');
    expect(tela.eventos).toEqual(['avancar:null']);
    expect(tela.estado.carregada).toBeNull();
  });

  test('a mensagem: com revisão carregada nenhuma, diz "sem revisão carregada"', async () => {
    const tela = criarTela(null, async () => null);
    await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: null, acoes: tela.acoes });
    expect(tela.estado.avisos[0]).toContain('sem revisão carregada');
    expect(tela.estado.avisos[0]).not.toContain('nenhuma carregada');
  });

  test('uma falha seguida de um sucesso: a segunda tentativa avança normalmente (a falha não deixou estado preso)', async () => {
    let n = 0;
    const tela = criarTela(R2, async () => (++n === 1 ? null : DOC3));
    expect(await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes })).toBe('nao-encontrada');
    expect(tela.estado.carregada).toBe(R2);
    expect(await fluxos.carregarReferenciaAtual({ referencia: R3, revisaoCarregada: 2, acoes: tela.acoes })).toBe('carregada');
    expect(tela.estado.carregada).toBe(R3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// A fiação do componente, por LEITURA, e o levantamento dos outros avanços
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.3: a fiação do componente, por LEITURA (nenhuma tela é montada)', () => {
  const COMPONENTE = 'components/ReferenciaDoProjeto.tsx';
  const componente = ler(COMPONENTE);

  test('o componente chama `carregarReferenciaAtual` uma vez, e a linha antiga (`setReferenciaCarregada(referencia)` antes da leitura) não existe mais', () => {
    expect(ocorrencias(componente, 'await carregarReferenciaAtual({')).toBe(1);
    expect(ocorrencias(componente, 'setReferenciaCarregada(referencia)')).toBe(0);
    expect(ocorrencias(componente, 'avancarReferenciaCarregada: setReferenciaCarregada,')).toBe(1);
  });

  test('LEVANTAMENTO dos avanços de `referenciaCarregada`: só dois (a escolha CONFIRMADA e o carregamento), e o da escolha vem depois da confirmação do servidor', () => {
    // padrão: `setReferenciaCarregada` em app/ components/ lib/ (fora dos testes): a declaração do estado,
    // a escolha confirmada e a passagem ao fluxo. Conferido com `git grep` na entrega (3 ocorrências).
    expect(ocorrencias(componente, 'setReferenciaCarregada')).toBe(3);
    const declaracao = "const [referenciaCarregada, setReferenciaCarregada] = useState";
    expect(ocorrencias(componente, declaracao)).toBe(1);
    // o avanço da escolha está DENTRO do ramo `confirmada`, depois de `executarEscolha` ter respondido
    const iEscolha = componente.indexOf('const escolher = async');
    const iExecutar = componente.indexOf('await executarEscolha(', iEscolha);
    const iConfirmada = componente.indexOf("if (desfecho.situacao === 'confirmada') {", iExecutar);
    const iAvanco = componente.indexOf('setReferenciaCarregada(corpo.referencia ?? null);', iConfirmada);
    const iRecusada = componente.indexOf("} else if (desfecho.situacao === 'recusada') {", iConfirmada);
    expect(iEscolha).toBeGreaterThan(0);
    expect(iExecutar).toBeGreaterThan(iEscolha);
    expect(iConfirmada).toBeGreaterThan(iExecutar);
    expect(iAvanco).toBeGreaterThan(iConfirmada);
    expect(iAvanco).toBeLessThan(iRecusada);
  });

  test('a regra de que a escolha usa a revisão CARREGADA não mudou', () => {
    expect(ocorrencias(componente, 'expectedRevision: referenciaCarregada?.revision ?? 0,')).toBe(1);
  });

  test('`exibir` (o botão Exibir) segue com o mesmo comportamento: o aviso de não encontrada, e `onExibir` direto', () => {
    const i = componente.indexOf('const exibir = async (executionId: string) => {');
    const corpo = componente.slice(i, componente.indexOf('\n  };', i));
    expect(corpo).toContain('const documento = await obterDocumento(executionId);');
    expect(corpo).toContain('`A execução ${executionId} não foi encontrada.`');
    expect(corpo).toContain('onExibir(documento);');
  });

  test('o módulo é puro: não importa Firestore, React, Next nem o componente', () => {
    const fonte = ler('lib/fluxos-da-referencia.ts');
    const importacoes = fonte.split('\n').filter(l => /^import /.test(l));
    expect(importacoes).toEqual(["import type { ReferenciaDoProjeto } from '@/lib/referencia-do-projeto';"]);
  });
});
