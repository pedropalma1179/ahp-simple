/**
 * lib/__tests__/a33-triagem-parafrase.test.ts
 *
 * Os TRÊS CONTROLES da triagem de transcrição, A.33 etapa 3.
 *
 * ⚠ **O esperado de cada um foi declarado ANTES de rodar**, e está na tabela abaixo,
 * que é cópia da tabela do escopo recebido:
 *
 * | Controle | Esperado, declarado antes |
 * |---|---|
 * | transcrição SEM aspas | **sinalizada** |
 * | paráfrase FIEL | **não sinalizada** |
 * | paráfrase que ALTERA O SENTIDO | **provavelmente não sinalizada**, e é o limite |
 *
 * ⚠ **Sinalizar os três seria falso positivo geral; sinalizar só o primeiro é o
 * comportamento correto.** O terceiro controle existe para registrar o que a triagem
 * NÃO cobre, e não para ser consertado.
 */

import { triarTranscricao, LIMIAR_CORRIDA } from '@/lib/rag/triagem-parafrase';

/**
 * Trecho de origem dos três controles.
 *
 * ⚠ **É o `verbatim_quote` do Saaty que o prompt antigo ensinava**, e não um texto
 * inventado para o ensaio: é o trecho com maior chance real de ser transcrito.
 */
const TRECHO = 'require the ratio to be very small; e.g., of the order of 0.1';

describe('triagem de transcrição: os três controles', () => {
  it('CONTROLE 1, transcrição SEM aspas: SINALIZADA, como declarado', () => {
    // O parecer reproduz o trecho e apenas retira as aspas. Segundo a predição de
    // A.33, isto continua sendo transcrição.
    const afirmacao =
      'Saaty (1977) estabelece que require the ratio to be very small, e.g., of the order of 0.1, e o CR observado atende.';

    const r = triarTranscricao(afirmacao, TRECHO);

    expect(r.sinalizada).toBe(true);
    expect(r.maiorCorridaComum).toBeGreaterThanOrEqual(LIMIAR_CORRIDA);
  });

  it('CONTROLE 2, paráfrase FIEL: NÃO sinalizada, como declarado', () => {
    // Mesmo sentido, palavras próprias. Compartilha termo técnico, que é legítimo.
    const afirmacao =
      'Saaty (1977) estabelece 0,10 como valor de referência para a razão de consistência.';

    const r = triarTranscricao(afirmacao, TRECHO);

    expect(r.sinalizada).toBe(false);
    expect(r.maiorCorridaComum).toBeLessThan(LIMIAR_CORRIDA);
  });

  it('CONTROLE 3, paráfrase que ALTERA O SENTIDO: NÃO sinalizada, e é o LIMITE', () => {
    // ⚠ **Inverte a direção do limiar**, e portanto é falsa. A triagem é léxica, não
    // semântica, então ela **não vê** este erro. **Este resultado é o esperado
    // declarado antes, e não um defeito a corrigir:** registrá-lo é o objetivo do
    // controle.
    const afirmacao =
      'Saaty (1977) estabelece que a razão de consistência deve ser superior a 0,10.';

    const r = triarTranscricao(afirmacao, TRECHO);

    expect(r.sinalizada).toBe(false);
    // O que a etapa 4 tem de pegar à mão, porque a triagem não pega.
    expect(r.maiorCorridaComum).toBeLessThan(LIMIAR_CORRIDA);
  });

  it('os três juntos: exatamente UM sinalizado, e não zero nem três', () => {
    // ⚠ Zero significaria triagem cega; três significariam falso positivo geral.
    const casos = [
      'Saaty (1977) estabelece que require the ratio to be very small, e.g., of the order of 0.1.',
      'Saaty (1977) estabelece 0,10 como valor de referência para a razão de consistência.',
      'Saaty (1977) estabelece que a razão de consistência deve ser superior a 0,10.',
    ];
    const sinalizados = casos.filter((c) => triarTranscricao(c, TRECHO).sinalizada);
    expect(sinalizados).toHaveLength(1);
    expect(sinalizados[0]).toBe(casos[0]);
  });
});

describe('triagem: o que ela devolve para a conferência humana ler', () => {
  it('nomeia o trecho em comum, em vez de só acusar', () => {
    const afirmacao = 'O estudo pede require the ratio to be very small e nada mais.';
    const r = triarTranscricao(afirmacao, TRECHO);

    expect(r.trechoEmComum).toContain('require the ratio to be very small');
    expect(r.fracaoDoTrecho).toBeGreaterThan(0);
    expect(r.fracaoDoTrecho).toBeLessThanOrEqual(1);
  });

  it('trecho vazio não quebra nem inventa fração', () => {
    const r = triarTranscricao('qualquer afirmação', '');
    expect(r.maiorCorridaComum).toBe(0);
    expect(r.fracaoDoTrecho).toBe(0);
    expect(r.sinalizada).toBe(false);
  });

  it('CONTROLE de termo técnico legítimo: repetição curta NÃO sinaliza', () => {
    // "razão de consistência" aparece nos dois por necessidade do domínio.
    const r = triarTranscricao(
      'A razão de consistência do painel ficou em 1,06%.',
      'a razão de consistência mede a coerência dos julgamentos'
    );
    expect(r.sinalizada).toBe(false);
  });
});
