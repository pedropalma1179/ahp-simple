// app/api/ai-reviewer/knowledge.ts
// Base de Conhecimento RAG - API AI Reviewer v7.0
// Referências científicas dinâmicas via @/lib/rag
// 📚 Dados derivados automaticamente da Base de Conhecimento (RAG)

import {
  getAllArticles,
  getAllClaims,
  getRAGStats as getRAGStatsLib,
  getThresholdsByMetric,
  getAllFormulas,
  getAllBenchmarks,
  getFormulasByKeyword,
  getArticleIds
} from '@/lib/rag/index';

import type { ArticleExtraction, ClaimWithSource } from '@/lib/rag/types';

// ============================================================
// TIPOS (Mantidos para compatibilidade)
// ============================================================

export interface ReferenceDoc {
  id: string;
  citation: string;
  topic: string;
  rule: string;
  context: string;
  weight?: number;
}

// ============================================================
// MAPA DE ALIAS PARA TÓPICOS (Compatibilidade route.ts)
// ============================================================
const TOPIC_ALIASES: Record<string, string[]> = {
  'consistência': ['consistency', 'cr', 'ratio', 'inconsistency', 'transitivity'],
  'bocr': ['bocr', 'benefits', 'opportunities', 'costs', 'risks', 'merits', 'synthesis'],
  'sensibilidade': ['sensitivity', 'robustness', 'stability', 'rank reversal', 'perturbation'],
  'viés': ['bias', 'fairness', 'disparate', 'cognitive', 'judgment'],
  'agregação': ['aggregation', 'geometric mean', 'aip', 'aij', 'consensus'],
  'ipc': ['ipc', 'incomplete', 'missing', 'spanning tree', 'llsm'],
  'exclusão': ['exclusion', 'filtering', 'removal', 'respondent exclusion', 'data cleaning'],
};

// ============================================================
// HELPER: CONVERSÃO RAG -> REF DOC
// ============================================================

function claimToRef(claim: ClaimWithSource, article: ArticleExtraction, index: number): ReferenceDoc {
  // Tentar extrair autores do ABNT (fonte mais rica)
  let citation: string;

  if (article.citation.abnt) {
    // Ex: "ALIZADEH, R. et al." -> "Alizadeh et al."
    // Ex: "SAATY, Thomas L.; VARGAS, Luis G." -> "Saaty & Vargas"
    const abntHeader = article.citation.abnt.split('.')[0]; // Pega até o primeiro ponto (geralmente autores)

    if (abntHeader.includes('et al')) {
      const mainAuthor = abntHeader.split(',')[0].trim();
      citation = `${capitalize(mainAuthor)} et al. (${article.metadata.year})`;
    } else if (abntHeader.includes(';')) {
      // Múltiplos autores explicitados
      const authors = abntHeader.split(';').map(a => a.split(',')[0].trim());
      if (authors.length === 2) {
        citation = `${capitalize(authors[0])} & ${capitalize(authors[1])} (${article.metadata.year})`;
      } else {
        citation = `${capitalize(authors[0])} et al. (${article.metadata.year})`;
      }
    } else {
      // Autor único
      const author = abntHeader.split(',')[0].trim();
      citation = `${capitalize(author)} (${article.metadata.year})`;
    }
  } else {
    // Fallback: Tentar extrair do ID (ex: "saaty1980" -> "Saaty")
    const idPart = article.id.split('_')[0];
    const authorPart = idPart.replace(/[0-9]/g, ''); // Remove ano

    // Tratamento especial para camelCase (ex: saatyVargas -> Saaty & Vargas)
    if (authorPart.includes('Vargas')) { // Hardcoded comum
      citation = `Saaty & Vargas (${article.metadata.year})`;
    } else {
      citation = `${capitalize(authorPart)} (${article.metadata.year})`;
    }
  }

  // Helper para capitalizar (ALIZADEH -> Alizadeh)
  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Peso baseado no tipo do artigo e uso do claim
  let weight = 2;
  if (article.type === 'foundational' || article.type === 'methodological') weight = 3;
  if (claim.usable_as === 'threshold' || claim.usable_as === 'definition') weight = Math.min(weight + 1, 3);

  return {
    id: `${article.id}_c${index}`,
    citation,
    topic: claim.claim.length > 120 ? claim.claim.substring(0, 117) + '...' : claim.claim,
    rule: claim.evidence.quote || claim.verbatim_quote || claim.claim,
    context: article.metadata.domain || 'AHP-BOCR',
    weight,
  };
}

// ============================================================
// BASE DE CONHECIMENTO DERIVADA (Flat Map)
// ============================================================

// Gerar a base flat map uma única vez na inicialização
const KNOWLEDGE_BASE: ReferenceDoc[] = getAllArticles().flatMap(article => {
  return article.key_claims.map((claim, idx) =>
    claimToRef(
      { ...claim, source_article: article.id, source_year: article.metadata.year },
      article,
      idx
    )
  );
});

// ============================================================
// FUNÇÕES DE ACESSO (Assinaturas mantidas)
// ============================================================

/**
 * Retorna o contexto de conhecimento formatado para injeção no prompt da IA
 * Ordena por peso (mais importantes primeiro) e limita para economizar tokens
 */
export function getKnowledgeContext(): string {
  if (KNOWLEDGE_BASE.length === 0) {
    return "Nenhuma referência científica carregada.";
  }

  // Ordenar por peso (desc) e depois por citação
  const sortedRefs = [...KNOWLEDGE_BASE].sort((a, b) => {
    const wDiff = (b.weight || 0) - (a.weight || 0);
    if (wDiff !== 0) return wDiff;
    return a.citation.localeCompare(b.citation);
  });

  // Limitar top 60 para não estourar contexto (aprox. 3k tokens)
  const topRefs = sortedRefs.slice(0, 60);

  return topRefs.map(doc =>
    `[REFERÊNCIA ACADÊMICA] ${doc.citation}
     - Contexto: ${doc.context}
     - Tópico: ${doc.topic}
     - Regra/Conclusão: ${doc.rule}`
  ).join('\n\n');
}

/**
 * Busca referências por tópico específico (com suporte a alias)
 */
export function getRefsByTopic(topic: string): ReferenceDoc[] {
  const normalizedInput = topic.toLowerCase();

  // Expandir busca usando aliases
  const searchTerms = [normalizedInput];
  if (TOPIC_ALIASES[normalizedInput]) {
    searchTerms.push(...TOPIC_ALIASES[normalizedInput]);
  }

  return KNOWLEDGE_BASE.filter(doc => {
    const text = (doc.topic + ' ' + doc.rule + ' ' + doc.context).toLowerCase();
    return searchTerms.some(term => text.includes(term));
  });
}

/**
 * Busca referências por contexto (ex: "automotivo", "energia", "TI")
 */
export function getRefsByContext(context: string): ReferenceDoc[] {
  const normalizedContext = context.toLowerCase();
  return KNOWLEDGE_BASE.filter(doc =>
    doc.context.toLowerCase().includes(normalizedContext)
  );
}

/**
 * Busca referências por autor (ex: "Saaty", "Wijnmalen")
 */
export function getRefsByAuthor(author: string): ReferenceDoc[] {
  const normalizedAuthor = author.toLowerCase();
  return KNOWLEDGE_BASE.filter(doc =>
    doc.citation.toLowerCase().includes(normalizedAuthor)
  );
}

/**
 * Retorna referências de alta prioridade (weight >= 3)
 */
export function getCriticalRefs(): ReferenceDoc[] {
  return KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) >= 3)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
}

/**
 * Retorna estatísticas da base de conhecimento (Real-time do RAG)
 */
export function getKnowledgeStats() {
  const ragStats = getRAGStatsLib();

  const topics = Array.from(new Set(KNOWLEDGE_BASE.map(doc => doc.topic)));
  const contexts = Array.from(new Set(KNOWLEDGE_BASE.map(doc => doc.context)));
  const authors = Array.from(new Set(KNOWLEDGE_BASE.map(doc => {
    const match = doc.citation.match(/^([A-Za-z\s&]+)/);
    return match ? match[1].trim() : doc.citation;
  })));

  const weightDistribution = {
    critical: KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) >= 3).length,
    important: KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) === 2).length,
    standard: KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) <= 1).length,
  };

  return {
    totalRefs: KNOWLEDGE_BASE.length,
    uniqueArticles: ragStats.total_articles,
    topics: topics,
    topicCount: topics.length,
    contexts: contexts,
    contextCount: contexts.length,
    authors: authors,
    authorCount: authors.length,
    weightDistribution,
    // Estatísticas adicionais do RAG
    rag: ragStats,
    categories: {
      "Fundamentos Matemáticos": KNOWLEDGE_BASE.filter(d => d.citation.includes("Saaty")).length,
      "Validação BOCR": getRefsByTopic('bocr').length,
      "Otimização Híbrida": getRefsByContext('Otimização').length + getRefsByContext('Operacional').length,
      "Metodologia Fuzzy": getRefsByTopic('fuzzy').length,
      "Robustez e Contexto": getRefsByTopic('sensibilidade').length,
    }
  };
}

/**
 * Valida se a base de conhecimento está carregada corretamente
 */
export function validateKnowledgeBase(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar se há referências
  if (KNOWLEDGE_BASE.length === 0) {
    errors.push("Base de conhecimento vazia (RAG retornou 0 claims)");
  }

  // Verificar integridade e campos obrigatórios
  KNOWLEDGE_BASE.forEach((doc, index) => {
    if (!doc.citation) errors.push(`Referência ${index}: citation ausente`);
    if (!doc.rule) errors.push(`Referência ${index}: rule ausente`);
  });

  // Verificar se há referências críticas
  const criticalCount = KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) >= 3).length;
  if (criticalCount === 0) {
    warnings.push("Nenhuma referência crítica (weight >= 3) encontrada");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================
// NOVAS EXPORTS (RAG SPECIFIC) - Para injeção no Prompt
// ============================================================

/** Retorna texto formatado com thresholds científicos validos */
export function getRAGThresholds(metric: string): string {
  const thresholds = getThresholdsByMetric(metric);
  if (thresholds.length === 0) return "Nenhum limiar específico encontrado no RAG.";

  return thresholds.map(t =>
    `- **${t.value} ${t.unit}** (${t.operator}): ${t.context}
      *Fonte:* ${t.source_article} (${t.source_year}) - "${t.evidence.quote || 'Citação direta não disponível'}"`
  ).join('\n');
}

/** Retorna texto formatado com fórmulas matemáticas (LaTeX) */
export function getRAGFormulas(keyword: string): string {
  const formulas = getFormulasByKeyword(keyword);
  if (formulas.length === 0) return "Nenhuma fórmula específica encontrada no RAG.";

  return formulas.map(f =>
    `### ${f.description} (${f.source_article}, ${f.source_year})
    $$
    ${f.latex}
    $$
    *Variáveis:* ${Object.entries(f.variables).map(([k, v]) => `${k}=${v}`).join(', ')}
    *Condições:* ${f.conditions || 'Gerais'}`
  ).join('\n\n');
}

/** Retorna tabela markdown com benchmarks empíricos */
export function getRAGBenchmarks(): string {
  const benchmarks = getAllBenchmarks();
  if (benchmarks.length === 0) return "Nenhum benchmark empírico disponível.";

  // Cabeçalho da tabela
  let table = `| Estudo | Domínio | N (Resp) | Pesos BOCR (B/O/C/R) | CR Agregado |\n|---|---|---|---|---|\n`;

  // Linhas (Top 10 mais recentes/relevantes)
  table += benchmarks
    .sort((a, b) => (b.source_year || 0) - (a.source_year || 0))
    .slice(0, 10)
    .map(b => {
      const weights = b.bocr_weights
        ? `${b.bocr_weights.B.toFixed(2)}/${b.bocr_weights.O.toFixed(2)}/${b.bocr_weights.C.toFixed(2)}/${b.bocr_weights.R.toFixed(2)}`
        : 'N/A';
      return `| ${b.source_article} (${b.source_year}) | ${b.domain || '-'} | ${b.n_respondents || '-'} | ${weights} | ${b.cr_aggregated ? b.cr_aggregated.toFixed(3) : '-'} |`;
    })
    .join('\n');

  return table;
}
