/**
 * Citation Whitelist Validator
 *
 * Builds a canonical citation whitelist from the 35 articles in
 * lib/rag/articles/ and validates that text references stay within it.
 *
 * Used by ai-reviewer/validateReviewOutput as defense-in-depth against PVB
 * violations (LLM citing fabricated, out-of-RAG, or contextually subooptimal
 * sources). Complements the SYSTEM_PROMPT-level whitelist (D1, commit 16b98a8).
 *
 * Phase 6.3.0a — D2.
 */

import { getAllArticles } from './index';
import type { ArticleExtraction } from './types';

// ============================================================
// Types
// ============================================================

export interface CitationEntry {
  articleId: string;
  year: number;
  authors: string[];
  primarySurname: string;
  secondarySurname: string | null;
  /** True when the article has exactly 2 authors */
  isCoauthored: boolean;
  /** True when the article has 3+ authors (must be cited as "Surname et al.") */
  isMultiAuthor: boolean;
}

export interface CitationValidationResult {
  issues: string[];
  warnings: string[];
  totalCitationsFound: number;
  totalViolations: number;
}

// ============================================================
// LaTeX cleaning (bibtex author={...} contains \"u, \'c, \v{s}, etc.)
// ============================================================

function cleanLatex(s: string): string {
  return s
    .replace(/\{\\["'`^~]\{?(\w)\}?\}?/g, '$1')
    .replace(/\\["'`^~]\{?(\w)\}?/g, '$1')
    .replace(/\{\\v\{(\w)\}\}/g, '$1')
    .replace(/\{\\[a-z]+\s+(\w)\}/g, '$1')
    .replace(/[{}\\]/g, '')
    .trim();
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractSurname(authorString: string): string {
  // bibtex format: "Surname, Given Names" OR "Given Names Surname"
  let surname: string;
  if (authorString.includes(',')) {
    surname = authorString.split(',')[0].trim();
  } else {
    const parts = authorString.split(/\s+/).filter(Boolean);
    surname = parts[parts.length - 1];
  }
  // Strip generational suffixes: "Neely Jr" -> "Neely", "Smith III" -> "Smith"
  surname = surname.replace(/\s+(Jr\.?|Sr\.?|II|III|IV|Filho|Neto)$/i, '').trim();
  return cleanLatex(surname);
}

// ============================================================
// Build whitelist (cached)
// ============================================================

let _whitelist: CitationEntry[] | null = null;

function extractCitationEntry(article: ArticleExtraction): CitationEntry | null {
  const bibtex = article.citation.bibtex;
  const year = article.metadata.year;
  if (!bibtex || !year) return null;

  const authorMatch = /author\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/.exec(bibtex);
  if (!authorMatch) return null;

  const authorsRaw = authorMatch[1];
  const authors = authorsRaw.split(/\s+and\s+/).map((a) => a.trim()).filter(Boolean);
  if (authors.length === 0) return null;

  const primarySurname = extractSurname(authors[0]);
  const secondarySurname = authors.length >= 2 ? extractSurname(authors[1]) : null;

  return {
    articleId: article.id,
    year,
    authors,
    primarySurname,
    secondarySurname,
    isCoauthored: authors.length === 2,
    isMultiAuthor: authors.length >= 3,
  };
}

function buildWhitelist(): CitationEntry[] {
  if (_whitelist !== null) return _whitelist;
  const articles = getAllArticles();
  _whitelist = articles
    .map(extractCitationEntry)
    .filter((e): e is CitationEntry => e !== null);
  return _whitelist;
}

// ============================================================
// Extract citations from review text
// ============================================================

interface ExtractedCitation {
  match: string;
  surname: string;
  hasCoauthor: boolean;
  hasEtAl: boolean;
  year: number;
  index: number;
}

/**
 * Captures patterns like:
 *   - Saaty (1977)
 *   - Saaty, 1977
 *   - Saaty & Vargas (2012)
 *   - Saaty e Vargas (2012)
 *   - Saaty et al. (2023)
 *   - Saiyed, Tatoglu, Ali & Dutta (2023)
 *
 * Limitations (acceptable for V1):
 *   - "Saaty (1987; 1990)" only matches "Saaty (1987)"; the 1990 escapes
 *   - "Autor (1977, p. N)" matches "Autor (1977"
 *   - Surnames with internal apostrophes (e.g. O'Brien) not supported
 */
const CITATION_REGEX =
  /(?<![\p{L}\-'])([\p{Lu}][\p{Ll}\-]+(?:,\s*[\p{Lu}][\p{Ll}\-]+)*(?:\s*&\s*[\p{Lu}][\p{Ll}\-]+)?(?:\s+e\s+[\p{Lu}][\p{Ll}\-]+)?(?:\s+et\s+al\.?)?)\s*[\(,]\s*(\d{4})\b/gu;

function extractCitations(text: string): ExtractedCitation[] {
  const out: ExtractedCitation[] = [];
  CITATION_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_REGEX.exec(text)) !== null) {
    const full = m[1];
    const year = parseInt(m[2], 10);
    if (isNaN(year) || year < 1900 || year > 2100) continue;

    const surnameMatch = /^[\p{Lu}][\p{Ll}\-]+/u.exec(full);
    if (!surnameMatch) continue;

    out.push({
      match: m[0],
      surname: surnameMatch[0],
      hasCoauthor: /\s*&\s*\p{Lu}|\s+e\s+\p{Lu}/u.test(full),
      hasEtAl: /et\s+al/.test(full),
      year,
      index: m.index,
    });
  }
  return out;
}

// ============================================================
// Layer 2: contextual sub-optimal attributions
// ============================================================

interface SuboptimalRule {
  id: string;
  citationPattern: RegExp;
  contextWindow: number;
  contextPattern: RegExp;
  buildMessage: (match: string) => string;
}

const SUBOPTIMAL_RULES: SuboptimalRule[] = [
  {
    id: 'SAATY_2003_BOCR',
    citationPattern: /Saaty\s*\(\s*2003\s*\)/g,
    contextWindow: 250,
    contextPattern:
      /\bBOCR\b|hierarquia\s+de\s+controle|aditivo\s+residual|multiplicativ[oa]\s+(?:simples|pot[êe]ncias)|s[íi]ntese\s+(?:aditiva|multiplicativa|subtrativa)/i,
    buildMessage: (m) =>
      `ATRIBUICAO_SUBOTIMA: "${m}" em contexto BOCR — para hierarquia de controle e fórmulas de síntese BOCR use "Saaty & Ozdemir (2003)"`,
  },
  {
    id: 'SAATY_1987_UNICITY',
    citationPattern: /Saaty\s*\(\s*1987\s*\)/g,
    contextWindow: 250,
    contextPattern:
      /[úu]nica\s+fun[çc][ãa]o|prova[mr]?\s+que|demonstram\s+que|unicidade|teorema|axiomat(?:ic|iza)/i,
    buildMessage: (m) =>
      `ATRIBUICAO_SUBOTIMA: "${m}" próximo de claim de prova/unicidade — Saaty (1987) é overview, não contém demonstração formal de unicidade. A prova clássica da média geométrica é Aczél & Saaty (1983), fora do RAG.`,
  },
  {
    id: 'SAATY_1990_UNICITY',
    citationPattern: /Saaty\s*\(\s*1990\s*\)/g,
    contextWindow: 250,
    contextPattern:
      /[úu]nica\s+fun[çc][ãa]o|[úu]nico\s+m[eé]todo|[úu]nica\s+abordagem|prova[mr]?\s+que|demonstram\s+que|unicidade|teorema/i,
    buildMessage: (m) =>
      `ATRIBUICAO_SUBOTIMA: "${m}" próximo de claim de prova/unicidade — Saaty (1990) introduz a média geométrica como método de agregação em grupo, mas NÃO prova unicidade. A prova clássica da função de agregação é Aczél & Saaty (1983), fora do RAG.`,
  },
];

function detectSuboptimalAttributions(text: string): string[] {
  const out: string[] = [];
  for (const rule of SUBOPTIMAL_RULES) {
    rule.citationPattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.citationPattern.exec(text)) !== null) {
      const start = Math.max(0, m.index - rule.contextWindow);
      const end = Math.min(text.length, m.index + m[0].length + rule.contextWindow);
      const window = text.substring(start, end);
      if (rule.contextPattern.test(window)) {
        out.push(rule.buildMessage(m[0]));
      }
    }
  }
  return out;
}

// ============================================================
// Layer 3: secondary citations exception ("(citando X)", "(apud Y)")
// ============================================================

/**
 * Strips secondary citation markers from text before whitelist validation.
 *
 * Patterns handled (case-insensitive):
 *   - "(citando Miller, 1956)"
 *   - "(citado por Brown, 2020)"
 *   - "(apud Smith, 1999)"
 *   - "(conforme citado por Jones, 2015)"
 *
 * Rationale: when the LLM cites a primary author (e.g. Saaty 1977) and the
 * primary paper itself references a secondary work (e.g. Miller 1956 for
 * cognitive load 7±2), the SYSTEM_PROMPT explicitly authorizes mentioning
 * the secondary. Without this strip, the validator would flag the secondary
 * as CITACAO_FORA_WHITELIST.
 *
 * The primary citation (outside the parens) is NOT stripped and remains
 * subject to whitelist + suboptimal-rule validation.
 *
 * Phase 6.3.0a — B3 hotfix.
 */
function stripSecondaryCitations(text: string): string {
  return text.replace(
    /\(\s*(?:citando|citado\s+por|apud|conforme\s+citado\s+por)\b[^)]*\)/gi,
    '',
  );
}

// ============================================================
// Public validator
// ============================================================

export function validateCitationsAgainstWhitelist(text: string): CitationValidationResult {
  const whitelist = buildWhitelist();
  // B3: strip secondary citations ("(citando Miller, 1956)" etc.) before validation
  // to avoid false positives when the LLM correctly mentions a secondary source
  // authorized by the SYSTEM_PROMPT (e.g. Miller 1956 cited inside Saaty 1977).
  const cleanedText = stripSecondaryCitations(text);
  const citations = extractCitations(cleanedText);

  const issues: string[] = [];
  const warnings: string[] = [];
  let violations = 0;
  const seenWarnings = new Set<string>();

  for (const cit of citations) {
    const norm = normalize(cit.surname);

    const exactMatches = whitelist.filter(
      (e) => normalize(e.primarySurname) === norm && e.year === cit.year,
    );

    // D2.4: fallback chain for ABNT-with-prefix patterns.
    // The D2.2 regex (commit c98510f) added support for "Surname1, Surname2 & Surname3"
    // ABNT long format. But it also matches sentences starting with a capitalized
    // adverb followed by a comma, e.g. "Adicionalmente, Saaty & Vargas (2012)".
    // In that case the primary surname extracted is "Adicionalmente" (not in RAG).
    // Try the token immediately after the first comma as fallback. If it matches
    // the whitelist for the same year, the citation is valid — skip the false positive.
    if (exactMatches.length === 0 && cit.match.includes(',')) {
      const afterCommaMatch = /,\s*(\p{Lu}[\p{Ll}\-]+)/u.exec(cit.match);
      if (afterCommaMatch) {
        const fallbackSurname = afterCommaMatch[1];
        const fallbackNorm = normalize(fallbackSurname);
        const fallbackMatches = whitelist.filter(
          (e) => normalize(e.primarySurname) === fallbackNorm && e.year === cit.year,
        );
        if (fallbackMatches.length > 0) {
          // Valid citation with adverbial/transitional prefix — skip false positive.
          continue;
        }
      }
    }

    if (exactMatches.length === 0) {
      const surnameInWhitelist = whitelist.some((e) => normalize(e.primarySurname) === norm);
      let msg: string;
      if (!surnameInWhitelist) {
        msg = `CITACAO_FORA_WHITELIST: "${cit.match}" — autor "${cit.surname}" não consta nos 35 articles do RAG`;
      } else {
        const knownYears = whitelist
          .filter((e) => normalize(e.primarySurname) === norm)
          .map((e) => e.year)
          .sort((a, b) => a - b);
        msg = `CITACAO_FORA_WHITELIST: "${cit.match}" — "${cit.surname}" não tem paper de ${cit.year} no RAG (anos disponíveis: ${knownYears.join(', ')})`;
      }
      if (!seenWarnings.has(msg)) {
        issues.push(msg);
        seenWarnings.add(msg);
        violations++;
      }
      continue;
    }

    // Só dispara CITACAO_INCOMPLETA se TODOS os matches (sobrenome, ano) forem
    // multi-autor. Se algum match for single-author, "Surname (Year)" é válido
    // (a citação pode estar referindo-se a esse paper). Disambiguação contextual
    // fica para a Camada 2 (SUBOPTIMAL_RULES).
    const allMultiAuthor = exactMatches.every(
      (a) => a.isCoauthored || a.isMultiAuthor,
    );
    if (allMultiAuthor && !cit.hasCoauthor && !cit.hasEtAl) {
      const article = exactMatches[0];
      let msg: string;
      if (article.isCoauthored) {
        const second = article.secondarySurname ?? '?';
        msg = `CITACAO_INCOMPLETA: "${cit.match}" — paper coautorado com ${second}; cite como "${cit.surname} & ${second} (${cit.year})"`;
      } else {
        msg = `CITACAO_INCOMPLETA: "${cit.match}" — paper tem ${article.authors.length} autores; cite como "${cit.surname} et al. (${cit.year})"`;
      }
      if (!seenWarnings.has(msg)) {
        warnings.push(msg);
        seenWarnings.add(msg);
        violations++;
      }
    }
  }

  for (const w of detectSuboptimalAttributions(cleanedText)) {
    if (!seenWarnings.has(w)) {
      warnings.push(w);
      seenWarnings.add(w);
      violations++;
    }
  }

  return {
    issues,
    warnings,
    totalCitationsFound: citations.length,
    totalViolations: violations,
  };
}

// ============================================================
// Debug / introspection
// ============================================================

export function getWhitelistStats() {
  const wl = buildWhitelist();
  const byYear = wl.reduce<Record<number, number>>((acc, e) => {
    acc[e.year] = (acc[e.year] || 0) + 1;
    return acc;
  }, {});
  return {
    total: wl.length,
    coauthored: wl.filter((e) => e.isCoauthored).length,
    multiAuthor: wl.filter((e) => e.isMultiAuthor).length,
    byYear,
  };
}

export function getCanonicalWhitelist(): CitationEntry[] {
  return buildWhitelist();
}
