/**
 * lib/ai-reviewer/validate-review.ts
 *
 * Validação pós-geração do texto do Parecer IA. Movida de
 * `app/api/ai-reviewer/route.ts` em A.27, eixo 1, commit 1a, sem alteração de
 * comportamento. O commit 1b alterou TRÊS coisas, e só elas: a expressão de
 * escores passou a reconhecer vírgula, o escore incompatível com os dados passou
 * a REPROVAR em vez de avisar, e existe estado `inconclusivo` para quando há
 * afirmação numérica e nenhuma referência válida. As sete regras e a ordem delas
 * seguem as mesmas.
 *
 * Está em `lib/` para ser diretamente testável. ⚠ Isso NÃO era impedimento
 * antes: `roots`, no `jest.config.js`, limita onde os testes são DESCOBERTOS,
 * não de onde importam, e o ensaio de F06 exercitou o handler real sem exportar
 * nada da rota. A extração serve à legibilidade do teste e à separação entre
 * movimento de código e mudança de comportamento, não a uma restrição do jest.
 */

import { validateCitationsAgainstWhitelist } from '@/lib/rag/citation-whitelist';
import { getValidFinalScores, type ReviewRequest } from './review-request';

// ============================================================
// VALIDAÇÃO PÓS-GERAÇÃO (Anti-Alucinação)
// ============================================================

/**
 * ⚠ `isValid` é `false` tanto para reprovado quanto para inconclusivo: a resposta
 * não pode declarar "válido" e "inconclusivo" ao mesmo tempo. Quem precisa
 * distinguir os dois lê `estado`.
 */
export type EstadoValidacao = 'aprovado' | 'reprovado' | 'inconclusivo';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  /** Estado próprio da verificação, distinto de `isValid`, que só tem dois valores. */
  estado: EstadoValidacao;
  /**
   * Motivos pelos quais alguma verificação não pôde julgar. ⚠ São PRESERVADOS
   * mesmo quando há reprovação por outra regra: a reprovação prevalece no
   * `estado`, e o motivo da inconclusão não é descartado.
   */
  inconclusivos: string[];
}

/**
 * Padrão de reconhecimento de escore no texto, em fábrica para que cada uso
 * receba uma expressão nova e não herde `lastIndex` de outro.
 *
 * ⚠ A classe aceita VÍRGULA desde A.27 eixo 1: antes era `[\d.]+`, e um escore
 * escrito `0,9999` era capturado como `"0"`, que a guarda `> 0` descartava — o
 * número inventado passava sem qualquer achado. Medido em F06.
 */
const padraoEscore = () => /Score\s*=?\s*([\d.,]+)/gi;

/** Normaliza o separador decimal antes de comparar. Não altera tolerância nem casas. */
function normalizarSeparador(bruto: string): number {
  return parseFloat(bruto.replace(/,/g, '.'));
}

export function validateReviewOutput(
  review: string,
  respondentIds: string[],
  data: ReviewRequest
): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const inconclusivos: string[] = [];

  // 1. Verificar menção a "respondente não identificado" ou variantes
  const phantomPatterns = [
    /respondente\s+(não\s+identificad[oa]|adicional|desconhecid[oa]|anônim[oa]|extra)/gi,
    /\d+\s+respondente[s]?\s+adiciona[il]/gi,
    /respondente[s]?\s+sem\s+identifica/gi,
    /respondente[s]?\s+cujo[s]?\s+dado[s]?\s+não/gi,
  ];
  for (const pattern of phantomPatterns) {
    const match = review.match(pattern);
    if (match) {
      issues.push(`RESPONDENTE_FANTASMA: Detectada menção a respondente inexistente: "${match[0]}"`);
    }
  }

  // 2. Verificar se a fórmula completa com v e s está presente (quando mencionada)
  const formulaMentioned = /fórmula|síntese|score.*=|subtrativ/i.test(review);
  if (formulaMentioned) {
    const hasRescaling = /rescaling|comensurabilidade|\bsb\b|\bso\b|\bsc\b|\bsr\b|s\s*[×·]\s*[BOCR]/i.test(review);
    const hasPersonal = /pesos?\s+pessoa|personal|hierarquia\s+de\s+controle|\bvb\b|\bvo\b|\bvc\b|\bvr\b/i.test(review);
    const hasSimplified = /\bbB\s*\+\s*oO\s*[-−]\s*cC\s*[-−]\s*rR\b/i.test(review);

    if (hasSimplified && !hasRescaling) {
      issues.push('FORMULA_SIMPLIFICADA: Fórmula simplificada (bB+oO-cC-rR) usada sem menção a rescaling weights');
    }
    if (!hasPersonal && !hasRescaling && formulaMentioned) {
      warnings.push('FORMULA_INCOMPLETA: Fórmula mencionada mas sem distinção clara entre pesos pessoais (v) e rescaling (s)');
    }
  }

  // 3. Verificar referências proibidas (ferramentas IA como fontes)
  const aiRefPatterns = [
    /Scopus\s+AI/gi,
    /ChatGPT/gi,
    /Gemini\s+\(\d{4}\)/gi,
    /Claude\s+\(\d{4}\)/gi,
    /OpenAI\s+\(\d{4}\)/gi,
    /Anthropic\s+\(\d{4}\)/gi,
  ];
  for (const pattern of aiRefPatterns) {
    const match = review.match(pattern);
    if (match) {
      issues.push(`REFERENCIA_IA_PROIBIDA: Ferramenta de IA citada como referência: "${match[0]}"`);
    }
  }

  // 4. Verificar consistência do total de respondentes
  if (respondentIds.length > 0) {
    const totalMatch = review.match(/(\d+)\s+especialistas/g);
    if (totalMatch) {
      for (const m of totalMatch) {
        const num = parseInt(m);
        if (!isNaN(num) && num > respondentIds.length && num !== data.exclusionInfo?.totalCollected) {
          warnings.push(`TOTAL_INCONSISTENTE: Parecer menciona ${num} especialistas, mas a lista tem ${respondentIds.length}`);
        }
      }
    }
  }

  // 5. Verificar scores das alternativas
  const validFinalScores = getValidFinalScores(data);
  const temAfirmacaoDeEscore = padraoEscore().test(review);

  if (validFinalScores.length > 0) {
    const scoreRegex = padraoEscore();
    let scoreMatch;
    const knownScores = new Set(validFinalScores.map(fs => fs.score.toFixed(4)));
    const knownScores6 = new Set(validFinalScores.map(fs => fs.score.toFixed(6)));

    while ((scoreMatch = scoreRegex.exec(review)) !== null) {
      const reportedScore = normalizarSeparador(scoreMatch[1]);
      if (!isNaN(reportedScore) && reportedScore > 0 && reportedScore < 1) {
        const r4 = reportedScore.toFixed(4);
        const r6 = reportedScore.toFixed(6);
        if (!knownScores.has(r4) && !knownScores6.has(r6)) {
          // ⚠ REPROVA desde A.27 eixo 1. Antes era aviso, e aviso não derruba
          // `isValid`: um escore que não existe nos dados era apresentado como
          // parecer aprovado.
          issues.push(`SCORE_NAO_RECONHECIDO: Score ${reportedScore} não encontrado nos dados injetados`);
        }
      }
    }
  } else if (temAfirmacaoDeEscore) {
    // Há afirmação numérica a verificar e nenhuma referência válida nos dados:
    // a verificação não pode julgar. ⚠ Isto NÃO é aprovação nem reprovação.
    inconclusivos.push(
      'SCORE_SEM_REFERENCIA: O parecer afirma escore, mas os dados não trazem nenhum finalScore válido para comparar; a verificação numérica não pôde ser feita'
    );
  }

  // 6. Verificar limiares empíricos sem referência
  const empiricalClaims = [
    { pattern: /50%\s+de\s+conformidade/gi, desc: 'limiar de 50% de conformidade CR' },
    { pattern: /limiar\s+emp[ií]rico\s+de\s+\d+%/gi, desc: 'limiar empírico percentual' },
    { pattern: /padr[ãa]o\s+emp[ií]rico.*?\d+%/gi, desc: 'padrão empírico percentual' },
  ];
  for (const { pattern, desc } of empiricalClaims) {
    const match = review.match(pattern);
    if (match) {
      // Verificar se há citação próxima (dentro de 200 chars)
      const idx = review.indexOf(match[0]);
      const vicinity = review.substring(idx, idx + 300);
      const hasCitation = /\([A-Z][a-z]+.*?\d{4}\)/.test(vicinity);
      if (!hasCitation) {
        warnings.push(`EMPIRICO_SEM_REF: Afirmação empírica "${desc}" sem referência próxima`);
      }
    }
  }

  // 7. Verificar citações contra whitelist canônica dos 35 articles do RAG (D2)
  const citationResult = validateCitationsAgainstWhitelist(review);
  for (const issue of citationResult.issues) issues.push(issue);
  for (const warning of citationResult.warnings) warnings.push(warning);

  // ⚠ Precedência: havendo reprovação por outra regra E inconclusão numérica,
  // prevalece a REPROVAÇÃO no estado, e o motivo da inconclusão é preservado.
  const estado: EstadoValidacao =
    issues.length > 0 ? 'reprovado' : inconclusivos.length > 0 ? 'inconclusivo' : 'aprovado';

  return {
    isValid: issues.length === 0 && inconclusivos.length === 0,
    issues,
    warnings,
    estado,
    inconclusivos,
  };
}
