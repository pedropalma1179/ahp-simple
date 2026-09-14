import type { ValidationResult } from './validate-review';

export const REVIEW_VALIDATION_VERSION = 1 as const;

export interface ReviewValidationContract extends ValidationResult {
  version: typeof REVIEW_VALIDATION_VERSION;
}

export type ReviewPresentationState =
  | 'aprovado'
  | 'reprovado'
  | 'inconclusivo'
  | 'nao_confirmado';

export interface ReviewPresentationDecision {
  estado: ReviewPresentationState;
  quarantined: boolean;
  titulo: string;
  motivos: string[];
  warnings: string[];
}

const NAO_CONFIRMADO =
  'Não foi possível confirmar a verificação deste parecer. O texto não deve ser tratado como aprovado.';

export function toReviewValidationContract(
  validation: ValidationResult
): ReviewValidationContract {
  return { version: REVIEW_VALIDATION_VERSION, ...validation };
}

/**
 * Fronteira defensiva entre a resposta da API e a apresentação. Além de exigir a
 * versão do contrato, rejeita combinações contraditórias para que ausência ou
 * payload parcial nunca sejam interpretados como aprovação.
 */
export function decideReviewPresentation(input: unknown): ReviewPresentationDecision {
  if (!input || typeof input !== 'object') return unconfirmed();

  const value = input as Record<string, unknown>;
  const issues = stringArray(value.issues);
  const warnings = stringArray(value.warnings);
  const inconclusivos = stringArray(value.inconclusivos);

  if (
    value.version !== REVIEW_VALIDATION_VERSION ||
    issues === null ||
    warnings === null ||
    inconclusivos === null ||
    typeof value.isValid !== 'boolean'
  ) {
    return unconfirmed();
  }

  if (
    value.estado === 'aprovado' &&
    value.isValid === true &&
    issues.length === 0 &&
    inconclusivos.length === 0
  ) {
    return {
      estado: 'aprovado',
      quarantined: false,
      titulo: 'Parecer aprovado na verificação',
      motivos: [],
      warnings,
    };
  }

  if (value.estado === 'reprovado' && value.isValid === false && issues.length > 0) {
    return {
      estado: 'reprovado',
      quarantined: true,
      titulo: 'Parecer reprovado na verificação',
      motivos: [...issues, ...inconclusivos],
      warnings,
    };
  }

  if (
    value.estado === 'inconclusivo' &&
    value.isValid === false &&
    issues.length === 0 &&
    inconclusivos.length > 0
  ) {
    return {
      estado: 'inconclusivo',
      quarantined: true,
      titulo: 'Verificação inconclusiva',
      motivos: inconclusivos,
      warnings,
    };
  }

  return unconfirmed();
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
    ? value
    : null;
}

function unconfirmed(): ReviewPresentationDecision {
  return {
    estado: 'nao_confirmado',
    quarantined: true,
    titulo: 'Verificação não confirmada',
    motivos: [NAO_CONFIRMADO],
    warnings: [],
  };
}
