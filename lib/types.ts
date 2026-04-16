
// lib/types.ts
// Tipos compartilhados para o sistema AHP-BOCR
// Centraliza interfaces usadas em múltiplos módulos

/**
 * Tipo de comparação na hierarquia AHP-BOCR.
 * - bocr: comparação entre B, O, C, R (nível estratégico)
 * - magnitude: comparação de magnitude/impacto total entre B, O, C, R
 * - subcriteria: comparação entre subcritérios dentro de um grupo BOCR
 * - alternatives: comparação entre alternativas sob um subcritério
 */
export type ComparisonType = 'bocr' | 'magnitude' | 'subcriteria' | 'alternatives';

/**
 * Direção de preferência no julgamento.
 * - 'A': itemA é preferido (slider para a esquerda, rawSlider < 0)
 * - 'B': itemB é preferido (slider para a direita, rawSlider > 0)
 * - 'equal': ambos têm igual importância (rawSlider === 0)
 */
export type FavorsDirection = 'A' | 'B' | 'equal';

/**
 * Uma comparação par-a-par gerada por generateAllComparisons().
 * Representa a PERGUNTA (sem resposta ainda).
 */
export interface ComparisonItem {
    /** Tipo da comparação na hierarquia */
    type: ComparisonType;
    /** Grupo ao qual pertence (ex: 'B' para subcritérios de Benefícios, 'B1' para alternativas sob B1) */
    group: string;
    /** Código do primeiro item (ex: 'B', 'B1', 'ALT1') */
    itemA: string;
    /** Código do segundo item */
    itemB: string;
}

/**
 * Um julgamento (resposta) do respondente a uma comparação.
 * Extends ComparisonItem com o valor atribuído.
 */
export interface JudgmentItem extends ComparisonItem {
    /** Valor na escala de Saaty (1-9). null se pulado (IPC). */
    saatyValue: number | null;
    /** Direção da preferência */
    favors: FavorsDirection;
    /** Valor bruto do slider (-8 a +8) */
    rawSlider: number;
    /** true se o respondente escolheu pular esta comparação (IPC) */
    skipped?: boolean;
}
