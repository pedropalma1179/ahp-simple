import {
  decideReviewPresentation,
  REVIEW_VALIDATION_VERSION,
} from '@/lib/ai-reviewer/review-validation-contract';

const contrato = (overrides: Record<string, unknown>) => ({
  version: REVIEW_VALIDATION_VERSION,
  estado: 'aprovado',
  isValid: true,
  issues: [],
  warnings: [],
  inconclusivos: [],
  ...overrides,
});

describe('contrato de apresentação do Parecer IA, A.27 eixo 2', () => {
  test('aprovado é apresentado normalmente e preserva avisos', () => {
    const result = decideReviewPresentation(
      contrato({ warnings: ['FORMULA_INCOMPLETA: exemplo'] })
    );

    expect(result).toEqual({
      estado: 'aprovado',
      quarantined: false,
      titulo: 'Parecer aprovado na verificação',
      motivos: [],
      warnings: ['FORMULA_INCOMPLETA: exemplo'],
    });
  });

  test('reprovado fica em quarentena com todos os motivos preservados', () => {
    const result = decideReviewPresentation(
      contrato({
        estado: 'reprovado',
        isValid: false,
        issues: ['SCORE_NAO_RECONHECIDO: exemplo'],
        inconclusivos: ['SCORE_SEM_REFERENCIA: exemplo adjacente'],
      })
    );

    expect(result.estado).toBe('reprovado');
    expect(result.quarantined).toBe(true);
    expect(result.titulo).toBe('Parecer reprovado na verificação');
    expect(result.motivos).toEqual([
      'SCORE_NAO_RECONHECIDO: exemplo',
      'SCORE_SEM_REFERENCIA: exemplo adjacente',
    ]);
  });

  test('inconclusivo fica em quarentena e explica por que não pôde ser julgado', () => {
    const result = decideReviewPresentation(
      contrato({
        estado: 'inconclusivo',
        isValid: false,
        inconclusivos: ['SCORE_SEM_REFERENCIA: exemplo'],
      })
    );

    expect(result.estado).toBe('inconclusivo');
    expect(result.quarantined).toBe(true);
    expect(result.titulo).toBe('Verificação inconclusiva');
    expect(result.motivos).toEqual(['SCORE_SEM_REFERENCIA: exemplo']);
  });

  test.each([
    ['ausente', undefined],
    ['sem versão', contrato({ version: undefined })],
    ['estado contraditório', contrato({ estado: 'aprovado', isValid: false })],
    ['arrays inválidos', contrato({ issues: 'não é array' })],
  ])('%s nunca é promovido implicitamente a aprovado', (_nome, input) => {
    const result = decideReviewPresentation(input);

    expect(result.estado).toBe('nao_confirmado');
    expect(result.quarantined).toBe(true);
    expect(result.titulo).toBe('Verificação não confirmada');
    expect(result.motivos[0]).toMatch(/não deve ser tratado como aprovado/i);
  });
});
