/**
 * lib/__tests__/validate-review.test.ts
 *
 * `validateReviewOutput`, A.27 eixo 1. Caracterizado em 1a, atualizado em 1b.
 *
 * ⚠ Em 1a cada teste afirmava O QUE O CÓDIGO FAZIA, com o comentário dizendo se
 * aquilo era o desejado ou o defeito. Em 1b os quatro que descreviam defeito
 * foram atualizados, e o comentário de cada um registra o comportamento antigo ao
 * lado do novo. Os dois que descreviam o comportamento desejado — casos 2 e 6 —
 * não mudaram de expectativa.
 *
 * Os seis casos são os mesmos exercitados pelo handler real, fora da árvore.
 */

import { validateReviewOutput } from '@/lib/ai-reviewer/validate-review';
import type { ReviewRequest } from '@/lib/ai-reviewer/review-request';

const ALVO = { code: 'A1', name: 'A1', score: 0.06412946722825451 };
const SEGUNDO = { code: 'A2', name: 'A2', score: 0.026937 };

/** Molde dos casos 1 a 5: um único ponto de escore, e só o valor varia. */
const molde = (v: string) =>
  ['## RESUMO', `A1: Score = ${v}.`, '## DECISAO EDITORIAL', '**ACEITO**'].join('\n');

/** Caso 6: nenhuma afirmação de escore, e nenhum termo que dispare a regra 2. */
const TEXTO_CONTROLE = ['## RESUMO', 'A1 lidera o ranking.', '## DECISAO EDITORIAL', '**ACEITO**'].join('\n');

const dados = (finalScores: any[]): ReviewRequest =>
  ({
    projectName: 'caracterizacao A27',
    alternatives: [{ code: 'A1', name: 'A1' }, { code: 'A2', name: 'A2' }],
    bocrWeights: { Benefits: 0.3723, Opportunities: 0.1517, Costs: 0.1974, Risks: 0.2786 },
    finalScores,
    bocrConsistency: { cr: 0.0106, lambda: 4.0286 },
  } as unknown) as ReviewRequest;

const REF_VALIDA = [ALVO, SEGUNDO];
/** "Nenhuma referência válida": campo presente, valores não numéricos; o filtro descarta. */
const REF_INVALIDA = [{ code: 'A1', name: 'A1', score: 'abc' }, { code: 'A2', name: 'A2', score: null }];

const FORMULA_INCOMPLETA =
  'FORMULA_INCOMPLETA: Fórmula mencionada mas sem distinção clara entre pesos pessoais (v) e rescaling (s)';

/** Achados de escore, isolados dos demais avisos que a entrada dispara. */
const deEscore = (avisos: string[]) => avisos.filter(w => w.startsWith('SCORE_'));

describe('validateReviewOutput: caracterização dos seis casos', () => {
  // ALTERADO em 1b. Antes: silêncio porque a vírgula impedia a comparação, então o
  // acerto não era verificado. Agora: o valor é reconhecido, comparado e confere.
  // O resultado observável é o mesmo — nenhum achado —, e o que mudou é que agora
  // ele decorre de comparação feita. Os demais avisos seguem preservados.
  test('caso 1, valor de referência com VÍRGULA: reconhecido, compatível, sem achado', () => {
    const r = validateReviewOutput(molde('0,0641'), [], dados(REF_VALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(deEscore(r.issues)).toEqual([]);
    expect(r.estado).toBe('aprovado');
    expect(r.inconclusivos).toEqual([]);
    expect(r.isValid).toBe(true);
    expect(r.warnings).toContain(FORMULA_INCOMPLETA);
  });

  // NÃO alterado em 1b quanto ao veredito: já era o comportamento desejado. Ganhou
  // apenas a asserção dos campos novos.
  test('caso 2, valor de referência com PONTO: reconhecido, compatível, sem achado', () => {
    const r = validateReviewOutput(molde('0.0641'), [], dados(REF_VALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(deEscore(r.issues)).toEqual([]);
    expect(r.estado).toBe('aprovado');
    expect(r.inconclusivos).toEqual([]);
    expect(r.isValid).toBe(true);
    expect(r.warnings).toContain(FORMULA_INCOMPLETA);
  });

  // ALTERADO em 1b, e é a correção central. Antes: nenhum achado, isValid true — a
  // expressão capturava "0" antes da vírgula e a guarda `> 0` abortava a regra.
  // Agora: reconhecido, incompatível, REPROVA.
  test('caso 3, valor FICTÍCIO com VÍRGULA: reconhecido, incompatível, reprova', () => {
    const r = validateReviewOutput(molde('0,9999'), [], dados(REF_VALIDA));
    expect(r.issues).toContain(
      'SCORE_NAO_RECONHECIDO: Score 0.9999 não encontrado nos dados injetados'
    );
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.estado).toBe('reprovado');
    expect(r.isValid).toBe(false);
  });

  // ALTERADO em 1b. Antes: o achado existia, mas como AVISO, e aviso não derrubava
  // `isValid`. Agora: o mesmo achado entra em `issues` e REPROVA. O texto da
  // mensagem não mudou; mudou o balde.
  test('caso 4, valor FICTÍCIO com PONTO: reconhecido, incompatível, reprova', () => {
    const r = validateReviewOutput(molde('0.9999'), [], dados(REF_VALIDA));
    expect(r.issues).toContain(
      'SCORE_NAO_RECONHECIDO: Score 0.9999 não encontrado nos dados injetados'
    );
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.estado).toBe('reprovado');
    expect(r.isValid).toBe(false);
  });

  // ALTERADO em 1b. Antes: nenhum achado e isValid true — ausência de verificação
  // chegava indistinguível de verificação aprovada. Agora: estado INCONCLUSIVO com
  // motivo explícito. ⚠ O teste afirma o ESTADO e o MOTIVO, não a negação de
  // "aprovado": reprovação genérica satisfaria "não aprovado" e descumpriria a
  // decisão de distinguir ausência de referência de reprovação.
  test('caso 5, afirmação de escore SEM referência válida: inconclusivo com motivo', () => {
    const r = validateReviewOutput(molde('0.0641'), [], dados(REF_INVALIDA));
    expect(r.estado).toBe('inconclusivo');
    expect(r.inconclusivos).toHaveLength(1);
    expect(r.inconclusivos[0]).toMatch(/^SCORE_SEM_REFERENCIA: /);
    expect(r.inconclusivos[0]).toMatch(/verificação numérica não pôde ser feita/);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(false);
  });

  // NÃO alterado em 1b quanto ao veredito, e é o ponto do controle: regra sem
  // afirmação aplicável não roda, e ausência de achado continua não virando achado.
  // ⚠ Em particular NÃO é inconclusivo: falta a afirmação, não a referência.
  test('caso 6, CONTROLE, sem afirmação de escore e sem referência: nenhum achado', () => {
    const r = validateReviewOutput(TEXTO_CONTROLE, [], dados(REF_INVALIDA));
    expect(r.estado).toBe('aprovado');
    expect(r.inconclusivos).toEqual([]);
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
  });

  // Combinação, não caso isolado: os seis acima não verificam precedência.
  test('precedência: reprovação por outra regra E inconclusão numérica', () => {
    const texto = ['## RESUMO', 'A1: Score = 0.0641, conforme ChatGPT (2024).',
                   '## DECISAO EDITORIAL', '**ACEITO**'].join('\n');
    const r = validateReviewOutput(texto, [], dados(REF_INVALIDA));
    // a reprovação prevalece no estado
    expect(r.estado).toBe('reprovado');
    expect(r.isValid).toBe(false);
    expect(r.issues.some(i => i.startsWith('REFERENCIA_IA_PROIBIDA:'))).toBe(true);
    // e o motivo da inconclusão numérica NÃO é descartado
    expect(r.inconclusivos).toHaveLength(1);
    expect(r.inconclusivos[0]).toMatch(/^SCORE_SEM_REFERENCIA: /);
  });
});
