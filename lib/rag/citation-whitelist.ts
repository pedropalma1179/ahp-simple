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
  if (authorString.includes(',')) {
    return cleanLatex(authorString.split(',')[0].trim());
  }
  const parts = authorString.split(/\s+/).filter(Boolean);
  return cleanLatex(parts[parts.length - 1]);
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
 *   - "Saaty (1977, p. 271)" matches "Saaty (1977"
 *   - Surnames with internal apostrophes (e.g. O'Brien) not supported
 */
const CITATION_REGEX =
  /(?<![A-Za-zÀ-ú])([A-ZÁÉÍÓÚÂÊÔÃÕÇÑ][a-záéíóúâêôãõçñ\-]+(?:\s*&\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇÑ][a-záéíóúâêôãõçñ\-]+)?(?:\s+e\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇÑ][a-záéíóúâêôãõçñ\-]+)?(?:\s+et\s+al\.?)?)\s*[\(,]\s*(\d{4})\b/g;

function extractCitations(text: string): ExtractedCitation[] {
  const out: ExtractedCitation[] = [];
  CITATION_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_REGEX.exec(text)) !== null) {
    const full = m[1];
    const year = parseInt(m[2], 10);
    if (isNaN(year) || year < 1900 || year > 2100) continue;

    const surnameMatch = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇÑ][a-záéíóúâêôãõçñ\-]+/.exec(full);
    if (!surnameMatch) continue;

    out.push({
      match: m[0],
      surname: surnameMatch[0],
      hasCoauthor: /\s*&\s*[A-Z]|\s+e\s+[A-Z]/.test(full),
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
// Public validator
// ============================================================

export function validateCitationsAgainstWhitelist(text: string): CitationValidationResult {
  const whitelist = buildWhitelist();
  const citations = extractCitations(text);

  const issues: string[] = [];
  const warnings: string[] = [];
  let violations = 0;
  const seenWarnings = new Set<string>();

  for (const cit of citations) {
    const norm = normalize(cit.surname);

    const exactMatches = whitelist.filter(
      (e) => normalize(e.primarySurname) === norm && e.year === cit.year,
    );

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

    for (const article of exactMatches) {
      let msg: string | null = null;
      if (article.isCoauthored && !cit.hasCoauthor && !cit.hasEtAl) {
        const second = article.secondarySurname ?? '?';
        msg = `CITACAO_INCOMPLETA: "${cit.match}" — paper coautorado com ${second}; cite como "${cit.surname} & ${second} (${cit.year})"`;
      } else if (article.isMultiAuthor && !cit.hasEtAl) {
        msg = `CITACAO_INCOMPLETA: "${cit.match}" — paper tem ${article.authors.length} autores; cite como "${cit.surname} et al. (${cit.year})"`;
      }
      if (msg && !seenWarnings.has(msg)) {
        warnings.push(msg);
        seenWarnings.add(msg);
        violations++;
      }
    }
  }

  for (const w of detectSuboptimalAttributions(text)) {
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
