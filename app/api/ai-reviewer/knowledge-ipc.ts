// app/api/ai-reviewer/knowledge-ipc.ts
/**
 * EXTENSÃO DA BASE DE CONHECIMENTO - IPC (Incomplete Pairwise Comparison)
 * Referências científicas sobre matrizes de comparação incompletas
 * Para integração com Parecer AI
 */

export interface KnowledgeReference {
  id: string;
  citation: string;
  topic: string;
  context: string;
  rule: string;
  priority: 'critical' | 'high' | 'medium';
  category: string;
}

// ============================================================
// REFERÊNCIAS IPC - TEORIA FUNDAMENTAL
// ============================================================

export const IPC_KNOWLEDGE: KnowledgeReference[] = [
  {
    id: 'ipc-001',
    citation: 'Bozóki, Fülöp & Rónyai (2009)',
    topic: 'Incomplete Pairwise Comparison - Teorema de Unicidade',
    context: 'Matrizes de comparação pareada incompletas em decisão multicriterial',
    rule: 'Teorema 1: A solução ótima é ÚNICA se e somente se o grafo associado à matriz incompleta é CONECTADO. Se o grafo tem s componentes conectados, o conjunto ótimo é um espaço afim de dimensão (s-1).',
    priority: 'critical',
    category: 'IPC-Theory',
  },
  {
    id: 'ipc-002',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - Número Mínimo de Comparações',
    context: 'Redução do esforço cognitivo do decisor',
    rule: 'O número MÍNIMO de comparações necessárias é n-1 (igual ao número de arestas de uma spanning tree em um grafo de n nós). O máximo é n(n-1)/2 (matriz completa). O gap é significativo: para n=5, mínimo=4 vs. máximo=10 (60% de redução).',
    priority: 'critical',
    category: 'IPC-Efficiency',
  },
  {
    id: 'ipc-003',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - Eigenvector Method Generalizado',
    context: 'Cálculo de pesos com informação parcial',
    rule: 'O Eigenvector Method pode ser generalizado para IPC através da minimização: min{λmax(A(x)) | x > 0}, onde x são as variáveis para elementos faltantes. Usando parametrização exponencial xi=e^yi, λmax(B(y)) é função log-convexa (portanto convexa) de y.',
    priority: 'high',
    category: 'IPC-Method',
  },
  {
    id: 'ipc-004',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - LLSM Generalizado',
    context: 'Logarithmic Least Squares Method para matrizes incompletas',
    rule: 'LLSM para IPC: min Σ(e(i,j)∈E) [log(aij*wj/wi)]² sujeito a Σwi=1, wi>0, onde E são apenas as arestas presentes no grafo. Teorema 3: Solução única ↔ grafo conectado. Diferente do EM, LLSM não usa completion da matriz.',
    priority: 'high',
    category: 'IPC-Method',
  },
  {
    id: 'ipc-005',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - Feedback em Tempo Real',
    context: 'Detecção de inconsistências durante preenchimento',
    rule: 'O decisor obtém um lower bound NÃO-DECRESCENTE para o CR-inconsistency em cada etapa do preenchimento da matriz. Um "salto brusco" (sharp jump) pode indicar erros de digitação ou comparações falsas, permitindo correção em tempo real.',
    priority: 'high',
    category: 'IPC-Quality',
  },
  {
    id: 'ipc-006',
    citation: 'Harker (1987)',
    topic: 'IPC - Definição Original',
    context: 'Primeira formalização de matrizes incompletas no AHP',
    rule: 'Matriz de comparação pareada incompleta: mesma forma que matriz completa (propriedades aij>0, aii=1, aij=1/aji) mas um ou mais elementos (denotados por *) não são fornecidos. Introduz variáveis x1,x2,...,xd para elementos faltantes no triângulo superior.',
    priority: 'medium',
    category: 'IPC-Definition',
  },
  {
    id: 'ipc-007',
    citation: 'Shiraishi, Obata & Daigo (1998)',
    topic: 'IPC - Propriedades da Matriz Recíproca Positiva',
    context: 'Propriedades matemáticas aplicadas ao AHP',
    rule: 'Propriedades de matrizes recíprocas positivas são fundamentais para garantir a existência e unicidade de soluções em IPC. O autovalor de Perron λmax é sempre real, positivo e único.',
    priority: 'medium',
    category: 'IPC-Mathematics',
  },
  {
    id: 'ipc-008',
    citation: 'Kwiesielewicz (1996)',
    topic: 'IPC - LLSM e Pseudoinversa Generalizada',
    context: 'Método logarítmico de mínimos quadrados para estimação de razões',
    rule: 'O método LLSM para matrizes incompletas utiliza pseudoinversa generalizada. As médias geométricas das linhas mantêm papel importante no cálculo explícito da solução ótima, similar ao caso completo.',
    priority: 'medium',
    category: 'IPC-Method',
  },
];

// ============================================================
// REFERÊNCIAS IPC - VALIDAÇÃO E QUALIDADE
// ============================================================

export const IPC_QUALITY_REFS: KnowledgeReference[] = [
  {
    id: 'ipc-q001',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - Trade-off Completude vs. Precisão',
    context: 'Balanceamento entre esforço e qualidade',
    rule: 'Questões práticas críticas: (1) Quantas comparações são NECESSÁRIAS para base apropriada? Mínimo n-1, mas gap até n(n-1)/2 é grande. (2) QUAIS pares comparar? Existem muitos subgrafos conectados possíveis. (3) QUANDO alertar sobre inconsistência crescente? Definir thresholds adequados.',
    priority: 'critical',
    category: 'IPC-Validation',
  },
  {
    id: 'ipc-q002',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - Spanning Tree como Estrutura Mínima',
    context: 'Escolha estratégica de comparações',
    rule: 'Número mínimo de comparações (n-1) equivale a uma spanning tree no grafo. Diferentes spanning trees resultam em diferentes níveis de robustez. Pesquisa futura necessária: qual spanning tree escolher para maximizar qualidade com esforço mínimo?',
    priority: 'high',
    category: 'IPC-Strategy',
  },
  {
    id: 'ipc-q003',
    citation: 'Van Uden (2002)',
    topic: 'IPC - Estimação de Dados Faltantes',
    context: 'Métodos para completar matrizes incompletas',
    rule: 'Estimação de elementos faltantes em matrizes de comparação pareada pode ser feita através de diferentes abordagens. Importante: distinguir entre ESTIMAÇÃO (completion) e CÁLCULO DIRETO (sem completion, como LLSM).',
    priority: 'medium',
    category: 'IPC-Method',
  },
  {
    id: 'ipc-q004',
    citation: 'Kwiesielewicz & van Uden (2003)',
    topic: 'IPC - Ranking com Dados Incompletos',
    context: 'Ordenação de alternativas com informação parcial',
    rule: 'Ranking de variantes de decisão por comparações pareadas subjetivas em casos com dados incompletos é viável. Robustez do ranking depende do nível de completude e da estrutura do grafo.',
    priority: 'medium',
    category: 'IPC-Ranking',
  },
];

// ============================================================
// REFERÊNCIAS IPC - RISCOS E LIMITAÇÕES
// ============================================================

export const IPC_RISKS_REFS: KnowledgeReference[] = [
  {
    id: 'ipc-r001',
    citation: 'Bozóki et al. (2009) - Análise Crítica',
    topic: 'IPC - Risco de Rank Reversal',
    context: 'Estabilidade da ordem das alternativas',
    rule: 'Em matrizes incompletas, existe risco teórico de Rank Reversal: a ordem das alternativas pode mudar se elementos faltantes forem estimados diferentemente ou se novas comparações forem adicionadas. Magnitude pequena entre alternativas aumenta este risco.',
    priority: 'critical',
    category: 'IPC-Risk',
  },
  {
    id: 'ipc-r002',
    citation: 'Belton & Gear (1983) - citado em Bozóki et al.',
    topic: 'Rank Reversal - Debate Teórico',
    context: 'Controvérsia sobre IIA (Independence of Irrelevant Alternatives)',
    rule: 'Belton & Gear criticaram AHP por violação de IIA (rank reversal). Saaty defendeu que em alguns contextos, mudança de ordem é DESEJÁVEL. Em IPC, este debate intensifica: completudes diferentes podem levar a rankings diferentes.',
    priority: 'high',
    category: 'IPC-Controversy',
  },
  {
    id: 'ipc-r003',
    citation: 'Análise Prática IPC',
    topic: 'IPC - Completude Mínima Aceitável',
    context: 'Guidelines práticas para aplicações reais',
    rule: 'Regra prática proposta: Completude mínima de 50-60% (entre n-1 mínimo teórico e n(n-1)/2 máximo) para aplicações com stakes moderadas. Para decisões críticas (alto impacto), considerar 70-80% de completude. Validar empiricamente para cada domínio.',
    priority: 'high',
    category: 'IPC-Guidelines',
  },
  {
    id: 'ipc-r004',
    citation: 'Bozóki et al. (2009)',
    topic: 'IPC - Limitações e Pesquisa Futura',
    context: 'Áreas que necessitam investigação adicional',
    rule: 'Questões em aberto: (1) Aproximações melhores para número ideal de comparações (entre n e n(n-1)/2). (2) Quais pares comparar (subgrafos ótimos). (3) Thresholds adequados para alertas de inconsistência. (4) Validação com problemas reais de decisão.',
    priority: 'medium',
    category: 'IPC-FutureWork',
  },
];

// ============================================================
// HELPERS
// ============================================================

/**
 * Retorna todas as referências IPC
 */
export function getAllIPCReferences(): KnowledgeReference[] {
  return [
    ...IPC_KNOWLEDGE,
    ...IPC_QUALITY_REFS,
    ...IPC_RISKS_REFS,
  ];
}

/**
 * Retorna referências IPC por categoria
 */
export function getIPCRefsByCategory(category: string): KnowledgeReference[] {
  return getAllIPCReferences().filter(ref => ref.category === category);
}

/**
 * Retorna referências IPC críticas
 */
export function getCriticalIPCRefs(): KnowledgeReference[] {
  return getAllIPCReferences().filter(ref => ref.priority === 'critical');
}

/**
 * Estatísticas da base IPC
 */
export function getIPCKnowledgeStats() {
  const all = getAllIPCReferences();
  return {
    total: all.length,
    critical: all.filter(r => r.priority === 'critical').length,
    high: all.filter(r => r.priority === 'high').length,
    medium: all.filter(r => r.priority === 'medium').length,
    categories: [...new Set(all.map(r => r.category))],
  };
}

// ============================================================
// CONTEXTO PARA PARECER AI
// ============================================================

/**
 * Gera contexto formatado sobre IPC para o System Prompt
 */
export function getIPCContextForAI(): string {
  const critical = getCriticalIPCRefs();
  const quality = IPC_QUALITY_REFS;
  const risks = IPC_RISKS_REFS;

  return `
## BASE DE CONHECIMENTO - INCOMPLETE PAIRWISE COMPARISON (IPC)

### Referências Críticas sobre IPC

${critical.map(ref => `
**${ref.citation}** - *${ref.topic}*
Contexto: ${ref.context}
Fundamento: ${ref.rule}
`).join('\n')}

### Aspectos de Qualidade e Validação

${quality.map(ref => `
**${ref.citation}** - *${ref.topic}*
Fundamento: ${ref.rule}
`).join('\n')}

### Riscos e Limitações do IPC

${risks.map(ref => `
**${ref.citation}** - *${ref.topic}*
Fundamento: ${ref.rule}
`).join('\n')}
`;
}

/**
 * Análise específica de completude
 */
export interface CompletenessAnalysis {
  totalPossible: number;      // n(n-1)/2
  minimumRequired: number;    // n-1
  actualProvided: number;     // comparações fornecidas
  completenessPercent: number; // %
  isMinimumMet: boolean;
  isGraphConnected: boolean;
  componentCount: number;
  recommendation: string;
}

/**
 * Calcula análise de completude
 */
export function analyzeCompleteness(
  n: number,
  providedComparisons: number,
  isConnected: boolean,
  componentCount: number
): CompletenessAnalysis {
  const totalPossible = (n * (n - 1)) / 2;
  const minimumRequired = n - 1;
  const completenessPercent = (providedComparisons / totalPossible) * 100;
  const isMinimumMet = providedComparisons >= minimumRequired;

  let recommendation = '';
  
  if (!isConnected) {
    recommendation = `CRÍTICO: Grafo não conectado (${componentCount} componentes). Solução NÃO é única. Adicione ${componentCount - 1} comparação(ões) para conectar o grafo.`;
  } else if (completenessPercent < 50) {
    recommendation = `ATENÇÃO: Completude muito baixa (${completenessPercent.toFixed(1)}%). Para decisões com impacto moderado/alto, recomenda-se 50-70% de completude. Considere adicionar ${Math.ceil(totalPossible * 0.5 - providedComparisons)} comparações.`;
  } else if (completenessPercent < 70) {
    recommendation = `ACEITÁVEL: Completude moderada (${completenessPercent.toFixed(1)}%). Para decisões críticas, considere aumentar para 70-80%. Adicionar ${Math.ceil(totalPossible * 0.7 - providedComparisons)} comparações melhoraria robustez.`;
  } else {
    recommendation = `BOM: Completude alta (${completenessPercent.toFixed(1)}%). Nível adequado para decisões com impacto significativo.`;
  }

  return {
    totalPossible,
    minimumRequired,
    actualProvided: providedComparisons,
    completenessPercent,
    isMinimumMet,
    isGraphConnected: isConnected,
    componentCount,
    recommendation,
  };
}
