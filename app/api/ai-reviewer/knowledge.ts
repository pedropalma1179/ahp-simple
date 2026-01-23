// app/api/ai-reviewer/knowledge.ts
// Base de Conhecimento RAG - API AI Reviewer v6.4
// Referências científicas sobre AHP-BOCR e Indústria 4.0
// 📚 16 artigos processados | 24 referências extraídas

// ============================================================
// TIPOS
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
// BASE DE CONHECIMENTO (24 REFERÊNCIAS DE 16 ARTIGOS)
// ============================================================

export const KNOWLEDGE_BASE: ReferenceDoc[] = [
  
  // ========================================================================
  // 1. FUNDAMENTOS MATEMÁTICOS & AXIOMAS (Thomas L. Saaty)
  // ========================================================================
  {
    id: "saaty_1977_perron_frobenius",
    citation: "Saaty (1977)",
    topic: "Fundamentação no Teorema de Perron-Frobenius",
    rule: "Estabelece a base matemática do AHP: para uma matriz positiva recíproca, existe um autovalor principal real positivo (Lambda_max) cujo módulo excede todos os outros. O autovetor correspondente é o único vetor de prioridades positivo que é invariante à potência da matriz, garantindo a unicidade da solução.",
    context: "Teoria Matemática Fundamental",
    weight: 3
  },
  {
    id: "saaty_1977_consistency_index",
    citation: "Saaty (1977)",
    topic: "Índice de Consistência (CI)",
    rule: "O desvio da consistência é medido por CI = (Lambda_max - n) / (n - 1). Para matrizes recíprocas positivas, Lambda_max >= n sempre. O desvio mede a 'variância do erro' no julgamento humano. Este índice é a métrica padrão-ouro para validar a qualidade dos dados de entrada.",
    context: "Validação de Dados",
    weight: 3
  },
  {
    id: "saaty_1977_scale_psychophysics",
    citation: "Saaty (1977)",
    topic: "Justificativa da Escala 1-9",
    rule: "A escala fundamental de 1 a 9 reflete a capacidade limitada do processamento de informações humano (o número mágico 7 +/- 2 de Miller). A escala linear é validada empiricamente para converter sentimentos qualitativos em estimativas numéricas robustas, preservando a ordem de magnitude.",
    context: "Psicometria AHP",
    weight: 2
  },
  {
    id: "saaty_1987_axioms",
    citation: "Saaty (1987)",
    topic: "Os 4 Axiomas do AHP",
    rule: "Todo modelo AHP válido deve respeitar 4 axiomas: 1) Reciprocidade (se A>B por x, B<A por 1/x); 2) Homogeneidade (elementos comparados não podem diferir por mais de uma ordem de magnitude); 3) Dependência (o peso dos elementos depende da estrutura hierárquica acima); 4) Expectativas (a estrutura deve conter todos os critérios necessários).",
    context: "Teoria Axiomática",
    weight: 3
  },
  {
    id: "saaty_1990_rank_reversal_validity",
    citation: "Saaty (1990)",
    topic: "Validade da Inversão de Rank (Rank Reversal)",
    rule: "A inversão de ranking ao adicionar/remover alternativas NÃO é uma falha matemática no modo de Medição Relativa, mas uma propriedade natural da mudança na escassez/abundância de qualidades. Se a preservação absoluta do rank for obrigatória, deve-se usar o modo de Medição Absoluta (Ratings).",
    context: "Teoria da Decisão",
    weight: 2
  },
  {
    id: "saaty_1990_group_aggregation",
    citation: "Saaty (1990)",
    topic: "Agregação em Grupo (Média Geométrica)",
    rule: "Para agregar julgamentos individuais em uma decisão de grupo, deve-se usar a Média Geométrica dos julgamentos (aij) para formar uma nova matriz. O uso da Média Aritmética é matematicamente incorreto pois não preserva a propriedade recíproca da matriz.",
    context: "Decisão em Grupo",
    weight: 3
  },
  {
    id: "saaty_2003_eigenvector_proof",
    citation: "Saaty (2003)",
    topic: "Prova da Necessidade do Autovetor",
    rule: "Prova que para matrizes inconsistentes (caso real), o Autovetor Principal é a única forma de capturar a dominância de 'caminhos de ordem k' (dominance walks). Métodos simplificados como Média Geométrica das Linhas (LLSM) falham em capturar a dominância indireta completa.",
    context: "Matemática Avançada",
    weight: 2
  },
  {
    id: "saaty_2003_correction",
    citation: "Saaty (2003)",
    topic: "Algoritmo de Melhoria de Consistência",
    rule: "Define o algoritmo exato para correção: Identificar a entrada a_ij onde o desvio (epsilon_ij = a_ij * w_j / w_i) é máximo e sugerir ao decisor a revisão deste julgamento específico para o valor w_i/w_j. Isso melhora o CR com alteração mínima na estrutura original.",
    context: "Ajuste de Julgamentos",
    weight: 2
  },
  {
    id: "saaty_2015_trustworthiness",
    citation: "Saaty & Ergu (2015)",
    topic: "Critérios de Confiabilidade MCDM",
    rule: "Um método confiável deve: 1) Capturar interdependência (como ANP); 2) Permitir e medir inconsistência humana; 3) Não impor estruturas lineares artificiais em problemas intangíveis. A medição relativa é a única forma válida de medir intangíveis (amor, risco político).",
    context: "Meta-Avaliação",
    weight: 2
  },

  // ========================================================================
  // 2. VALIDAÇÃO TEÓRICA BOCR & FÓRMULAS (Wijnmalen, Petrillo)
  // ========================================================================
  {
    id: "wijnmalen_2007_multiplicative_fallacy",
    citation: "Wijnmalen (2007)",
    topic: "Crítica à Síntese Multiplicativa",
    rule: "A fórmula multiplicativa tradicional [(B*O)/(C*R)] é matematicamente ambígua e dimensionalmente incoerente ('unidades quadradas'). Testes de validação mostram que esta fórmula falha em reproduzir rankings de lucratividade monetária, exceto em casos raros de coincidência de magnitude.",
    context: "Validação Matemática BOCR",
    weight: 3
  },
  {
    id: "wijnmalen_2007_additive_solution",
    citation: "Wijnmalen (2007)",
    topic: "Superioridade da Síntese Aditiva",
    rule: "Para análises de Valor Líquido, a síntese aditiva com subtração [(bB + oO) - (cC + rR)] é a única abordagem que consistentemente reproduz resultados monetários válidos. O uso de recíprocos (1/C) é desencorajado por distorcer a linearidade da escala.",
    context: "Otimização de Decisão",
    weight: 3
  },
  {
    id: "wijnmalen_2007_commensurability",
    citation: "Wijnmalen (2007)",
    topic: "Comensurabilidade e Reescalonamento",
    rule: "Prioridades de B, O, C e R são incomensuráveis por definição (normalizam para 1). É obrigatório aplicar pesos de reescalonamento (baseados em valores monetários ou importância estratégica) para tornar as prioridades comensuráveis antes da síntese.",
    context: "Metodologia de Síntese",
    weight: 3
  },
  {
    id: "petrillo_2023_mece_structure",
    citation: "Petrillo et al. (2023)",
    topic: "Estruturação MECE",
    rule: "O BOCR garante o princípio MECE (Mutuamente Exclusivo, Coletivamente Exaustivo), evitando redundância. Valida quatro fórmulas de síntese: 1) Aditiva Pura; 2) Recíproca; 3) Complementar (1-C); e 4) Multiplicativa. A escolha depende da natureza dos dados (utilidade vs. desutilidade).",
    context: "Estado da Arte",
    weight: 3
  },

  // ========================================================================
  // 3. INTEGRAÇÃO HÍBRIDA & OTIMIZAÇÃO (Demirtas, Ustun, Alizadeh)
  // ========================================================================
  {
    id: "demirtas_2008_anp_momilp",
    citation: "Demirtas & Ustun (2008)",
    topic: "Integração ANP-Otimização (MOMILP)",
    rule: "O ANP-BOCR gera coeficientes de 'Valor Total' para funções objetivo em Programação Linear Inteira Mista (MOMILP). Isso permite otimizar não apenas a seleção, mas a alocação de quantidades (order allocation) sujeita a restrições tangíveis de capacidade.",
    context: "Pesquisa Operacional Híbrida",
    weight: 2
  },
  {
    id: "demirtas_2008_subtractive_sensitivity",
    citation: "Demirtas & Ustun (2008)",
    topic: "Impacto da Fórmula Subtrativa",
    rule: "A análise de sensibilidade demonstra que a fórmula aditiva negativa (W = bB + oO - cC - rR) é mais discriminante e altera o ranking final em comparação com fórmulas que usam complementos. A penalização direta reflete melhor a competitividade industrial.",
    context: "Análise de Sensibilidade",
    weight: 2
  },
  {
    id: "ustun_2008_multi_period",
    citation: "Ustun & Demirtas (2008)",
    topic: "Alocação Multi-período",
    rule: "Expande o modelo para cenários dinâmicos (Multi-period Lot-sizing). As prioridades BOCR ponderam o objetivo de maximização de valor ao longo do tempo, equilibrando custos de estoque e déficit em modelos de Goal Programming.",
    context: "Planejamento e Controle da Produção",
    weight: 2
  },
  {
    id: "alizadeh_2020_barrier_screening",
    citation: "Alizadeh et al. (2020)",
    topic: "Triagem de Barreiras (Barrier Analysis)",
    rule: "Introduz um framework onde o AHP-BOCR é precedido por uma 'Análise de Barreiras' para eliminar alternativas inviáveis (Hard Constraints). Apenas opções viáveis entram no modelo BOCR, aumentando a eficiência decisória em políticas públicas.",
    context: "Políticas Públicas / Energia",
    weight: 2
  },

  // ========================================================================
  // 4. METODOLOGIA FUZZY & INCERTEZA (Lee, Liang)
  // ========================================================================
  {
    id: "lee_2009_fuzzy_integration",
    citation: "Lee (2009)",
    topic: "Integração Fuzzy AHP (FAHP)",
    rule: "Em ambientes de alta incerteza tecnológica, o AHP tradicional é insuficiente. Recomenda-se o uso de Números Fuzzy Triangulares e o Método de Análise de Extensão de Chang para capturar a vaguidade na avaliação de Oportunidades e Riscos futuros.",
    context: "Indústria de Alta Tecnologia",
    weight: 2
  },
  {
    id: "lee_2009_control_hierarchy",
    citation: "Lee (2009)",
    topic: "Necessidade da Hierarquia de Controle",
    rule: "Os pesos dos méritos B, O, C e R não devem ser arbitrários. É obrigatório usar uma 'Hierarquia de Controle' com critérios estratégicos para derivar cientificamente a importância (b, o, c, r) antes da avaliação das alternativas.",
    context: "Estruturação do Modelo",
    weight: 3
  },
  {
    id: "liang_2008_intangible_risk",
    citation: "Liang & Li (2008)",
    topic: "Riscos Intangíveis em TI",
    rule: "Em seleção de software (ERP/MES), 'Riscos de Implementação' e 'Oportunidades Estratégicas' devem ter peso matemático equiparável aos custos financeiros. A análise mostra que a aversão ao risco atua como critério de veto em tecnologia da informação.",
    context: "Tecnologia da Informação",
    weight: 2
  },

  // ========================================================================
  // 5. CONTEXTO E ROBUSTEZ (Kabak, Yap, Ishizaka, Vaidya)
  // ========================================================================
  {
    id: "kabak_2014_strategic_weights",
    citation: "Kabak & Dağdeviren (2014)",
    topic: "Ponderação Estratégica Nacional",
    rule: "Demonstra que pesos BOCR variam por estratégia geopolítica. Para países em desenvolvimento buscando crescimento, 'Benefícios' e 'Oportunidades' recebem pesos maiores (ex: 0.46 e 0.28) do que 'Custos' e 'Riscos', favorecendo tecnologias renováveis sobre as tradicionais.",
    context: "Planejamento Estratégico Energético",
    weight: 2
  },
  {
    id: "yap_2015_context_sensitivity",
    citation: "Yap & Nixon (2015)",
    topic: "Sensibilidade ao Contexto Geográfico",
    rule: "A aplicação do mesmo modelo BOCR em contextos diferentes (Reino Unido vs. Índia) inverte o ranking final. Isso prova que o modelo não avalia a tecnologia no vácuo, mas sua adequação ao ecossistema local (regulatório, econômico e social).",
    context: "Comparação Internacional",
    weight: 2
  },
  {
    id: "ishizaka_2011_sensitivity_rule",
    citation: "Ishizaka & Labib (2011)",
    topic: "Regra de Análise de Sensibilidade",
    rule: "Um estudo AHP não está completo sem Análise de Sensibilidade. É obrigatório identificar o 'ponto de virada' (turning point). Se uma mudança menor que 5% no peso de um critério principal inverte a decisão, o resultado é considerado instável e requer revisão.",
    context: "Robustez da Decisão",
    weight: 3
  },
  {
    id: "vaidya_2006_application_scope",
    citation: "Vaidya & Kumar (2006)",
    topic: "Escopo de Aplicação",
    rule: "Valida que o AHP é robusto tanto para decisões operacionais quanto estratégicas, sendo a ferramenta mais utilizada para problemas de 'Seleção' e 'Avaliação' em engenharia e gestão.",
    context: "Revisão de Literatura",
    weight: 2
  }
];

// ============================================================
// FUNÇÕES DE ACESSO À BASE DE CONHECIMENTO
// ============================================================

/**
 * Retorna o contexto de conhecimento formatado para injeção no prompt da IA
 * Ordena por peso (mais importantes primeiro)
 */
export function getKnowledgeContext(): string {
  if (KNOWLEDGE_BASE.length === 0) {
    return "Nenhuma referência científica carregada.";
  }
  
  // Ordenar por peso (maior primeiro)
  const sortedRefs = [...KNOWLEDGE_BASE].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  
  return sortedRefs.map(doc => 
    `[REFERÊNCIA ACADÊMICA] ${doc.citation}
     - Contexto: ${doc.context}
     - Tópico: ${doc.topic}
     - Regra/Conclusão: ${doc.rule}`
  ).join('\n\n');
}

/**
 * Busca referências por tópico específico
 */
export function getRefsByTopic(topic: string): ReferenceDoc[] {
  const normalizedTopic = topic.toLowerCase();
  return KNOWLEDGE_BASE.filter(doc => 
    doc.topic.toLowerCase().includes(normalizedTopic) ||
    doc.rule.toLowerCase().includes(normalizedTopic)
  );
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
 * Retorna estatísticas da base de conhecimento
 */
export function getKnowledgeStats() {
  const topics = Array.from(new Set(KNOWLEDGE_BASE.map(doc => doc.topic)));
  const contexts = Array.from(new Set(KNOWLEDGE_BASE.map(doc => doc.context)));
  const authors = Array.from(new Set(KNOWLEDGE_BASE.map(doc => {
    // Extrai primeiro autor da citação
    const match = doc.citation.match(/^([A-Za-z\s&]+)/);
    return match ? match[1].trim() : doc.citation;
  })));
  
  const weightDistribution = {
    critical: KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) >= 3).length,
    important: KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) === 2).length,
    standard: KNOWLEDGE_BASE.filter(doc => (doc.weight || 0) === 1).length,
  };
  
  return {
    totalRefs: KNOWLEDGE_BASE.length,
    uniqueArticles: 16,
    topics: topics,
    topicCount: topics.length,
    contexts: contexts,
    contextCount: contexts.length,
    authors: authors,
    authorCount: authors.length,
    weightDistribution,
    categories: {
      "Fundamentos Matemáticos": KNOWLEDGE_BASE.filter(d => d.citation.includes("Saaty")).length,
      "Validação BOCR": KNOWLEDGE_BASE.filter(d => d.context.includes("BOCR") || d.context.includes("Validação")).length,
      "Otimização Híbrida": KNOWLEDGE_BASE.filter(d => d.context.includes("Otimização") || d.context.includes("Operacional")).length,
      "Metodologia Fuzzy": KNOWLEDGE_BASE.filter(d => d.context.includes("Fuzzy") || d.context.includes("Incerteza") || d.context.includes("Tecnologia")).length,
      "Robustez e Contexto": KNOWLEDGE_BASE.filter(d => d.context.includes("Robustez") || d.context.includes("Sensibilidade") || d.context.includes("Internacional")).length,
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
    errors.push("Base de conhecimento vazia");
  }
  
  // Verificar duplicatas de ID
  const ids = KNOWLEDGE_BASE.map(doc => doc.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`IDs duplicados encontrados: ${duplicateIds.join(", ")}`);
  }
  
  // Verificar campos obrigatórios
  KNOWLEDGE_BASE.forEach((doc, index) => {
    if (!doc.citation) errors.push(`Referência ${index + 1}: citation ausente`);
    if (!doc.topic) errors.push(`Referência ${index + 1}: topic ausente`);
    if (!doc.rule) errors.push(`Referência ${index + 1}: rule ausente`);
    if (!doc.context) warnings.push(`Referência ${index + 1}: context ausente`);
    if (!doc.weight) warnings.push(`Referência ${index + 1}: weight ausente (padrão: 1)`);
  });
  
  // Verificar se há referências críticas (weight >= 3)
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
