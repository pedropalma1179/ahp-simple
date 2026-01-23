// app/api/generate-article/route.ts
// AI Scientific Writer v2.0 - Com busca em literatura científica
// Suporta Claude e Gemini + Semantic Scholar

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// CONFIGURAÇÃO DOS MODELOS
// ============================================================

const MODELS = {
  claude: {
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096
  },
  gemini: {
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    model: 'gemini-2.0-flash',
    maxTokens: 8192
  }
};

// ============================================================
// BUSCA EM LITERATURA CIENTÍFICA
// ============================================================

interface Paper {
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  citationCount?: number;
  abstract?: string;
  url?: string;
  doi?: string;
}

// Buscar no Semantic Scholar (API gratuita)
async function searchSemanticScholar(query: string, limit: number = 10): Promise<Paper[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=${limit}&fields=title,authors,year,journal,citationCount,abstract,externalIds,url`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Semantic Scholar API error:', response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.data || []).map((paper: any) => ({
      title: paper.title,
      authors: paper.authors?.map((a: any) => a.name) || [],
      year: paper.year,
      journal: paper.journal?.name,
      citationCount: paper.citationCount,
      abstract: paper.abstract,
      url: paper.url,
      doi: paper.externalIds?.DOI
    }));
  } catch (error) {
    console.error('Erro ao buscar no Semantic Scholar:', error);
    return [];
  }
}

// Buscar papers por múltiplos tópicos
async function searchLiterature(topics: string[]): Promise<{ papers: Paper[]; summary: string }> {
  const allPapers: Paper[] = [];
  
  for (const topic of topics) {
    const papers = await searchSemanticScholar(topic, 5);
    allPapers.push(...papers);
    
    // Rate limiting - esperar 100ms entre chamadas
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Remover duplicatas por título
  const uniquePapers = allPapers.filter((paper, index, self) =>
    index === self.findIndex(p => p.title.toLowerCase() === paper.title.toLowerCase())
  );

  // Ordenar por citações
  uniquePapers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

  // Top 15 papers
  const topPapers = uniquePapers.slice(0, 15);

  // Gerar resumo para o prompt
  const summary = topPapers.map(p => {
    const authors = p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '');
    return `- ${authors} (${p.year}). "${p.title}". ${p.journal || 'N/A'}. Citações: ${p.citationCount || 0}. ${p.doi ? `DOI: ${p.doi}` : ''}`;
  }).join('\n');

  return { papers: topPapers, summary };
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const createSystemPrompt = (literatureSummary: string) => `*** SYSTEM INSTRUCTION: ACADEMIC SCIENTIFIC WRITER (MCDM SPECIALIST) ***

**ROLE:**
Você é um pesquisador sênior em Engenharia de Produção e Pesquisa Operacional, especialista em métodos de decisão multicritério. Sua função é redigir as seções de "Resultados e Discussão" e "Conclusão" de um artigo científico baseado em uma aplicação real do método AHP-BOCR.

**ESTILO E RIGOR:**
- Use linguagem acadêmica culta em Português (PT-BR)
- Escreva em 3ª pessoa, tom formal e impessoal
- Citações no formato (Autor, Ano)
- Evite adjetivos exagerados. Use "significativo", "robusto", "consistente"
- Tabelas em formato Markdown

**BASE DE CONHECIMENTO OBRIGATÓRIA:**
1. **Saaty (1980, 2008):** Fundamentação do AHP, escala 1-9, consistência (CR < 0.10)
2. **Wijnmalen (2007):** Validação crítica do BOCR, fórmulas de síntese
3. **Petrillo et al. (2023):** State-of-the-art das 5 fórmulas BOCR (Tabela 5)
4. **Aczél & Saaty (1983):** Axiomas de agregação AIJ com média geométrica
5. **Forman & Peniwati (1998):** Agregação de julgamentos individuais

**LITERATURA ADICIONAL ENCONTRADA (USE PARA ENRIQUECER O TEXTO):**
${literatureSummary || 'Nenhuma literatura adicional disponível.'}

**ESTRUTURA OBRIGATÓRIA:**

## 4. Resultados e Discussão

### 4.1. Perfil dos Especialistas e Validação do Painel
- Descreva brevemente o painel de especialistas
- Justifique a adequação do número de respondentes

### 4.2. Análise de Consistência
- Reporte o CR global e por matriz
- Cite Saaty (1980) para validar CR < 0.10
- Mencione o método AIJ com média geométrica (Aczél & Saaty, 1983)

### 4.3. Pesos Estratégicos (BOCR)
- Interprete os pesos de cada mérito
- Discuta o perfil de decisão (conservador/inovador/balanceado)
- Relacione com a literatura quando pertinente

### 4.4. Pesos Globais dos Subcritérios
- Apresente tabela com Top 10 subcritérios
- Destaque os 3 fatores críticos (maiores pesos)
- Interprete à luz da Indústria 4.0

### 4.5. Ranking das Alternativas
- Apresente os resultados dos 5 métodos de síntese (Petrillo et al., 2023)
- Justifique por que a alternativa vencedora superou as demais
- Analise trade-offs entre B, O, C, R

### 4.6. Robustez da Decisão
- Concordância entre os 5 métodos
- Diferença percentual entre 1º e 2º
- Classificação de robustez

### 4.7. Análise de Sensibilidade
- Descreva variações nos pesos
- Identifique pontos de inversão (se houver)
- Cite metodologia de Alizadeh et al. (2020) ou similar

## 5. Conclusão

### Parágrafo 1: Síntese
- Retome objetivo e alternativa selecionada

### Parágrafo 2: Implicações Gerenciais
- Como a decisão impacta a Indústria 4.0 na organização
- Benefícios esperados (eficiência, competitividade, sustentabilidade)

### Parágrafo 3: Limitações e Trabalhos Futuros
- Subjetividade do AHP
- Sugerir: Fuzzy-AHP, ANP, integração com TOPSIS/VIKOR
- Aplicação longitudinal pós-implementação

**REGRAS DE FORMATAÇÃO:**
- Gere tabelas em Markdown
- Use **negrito** para termos importantes
- Numere seções (4.1, 4.2, etc.)
- Texto entre 1000 e 1500 palavras
- Inclua pelo menos 8-10 citações`;

// ============================================================
// CHAMADAS AOS MODELOS DE IA
// ============================================================

// Chamar Claude (Anthropic)
async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: MODELS.claude.model,
    max_tokens: MODELS.claude.maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  return message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');
}

// Chamar Gemini (Google)
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  
  const model = genAI.getGenerativeModel({ 
    model: MODELS.gemini.model,
    systemInstruction: systemPrompt
  });

  const result = await model.generateContent(userPrompt);
  const response = await result.response;
  return response.text();
}

// ============================================================
// PREPARAÇÃO DOS DADOS
// ============================================================

function prepareDataForPrompt(data: any, context: any) {
  const bocrWeights = data.bocrWeights || [0.25, 0.25, 0.25, 0.25];
  const finalScores = data.finalScores || [];
  const globalWeights = data.globalWeights || [];
  
  const top10 = [...globalWeights]
    .sort((a: any, b: any) => b.globalWeight - a.globalWeight)
    .slice(0, 10);

  const winner = finalScores[0];
  const runnerUp = finalScores[1];

  const methods = ['scoreAdditive', 'scoreProbabilistic', 'scoreSubtractiveNorm', 'scoreMultPowersNorm', 'scoreMultSimpleNorm'];
  const methodWinners = methods.map(m => {
    const sorted = [...finalScores].sort((a: any, b: any) => (b[m] || 0) - (a[m] || 0));
    return sorted[0]?.code;
  });
  const mainWinner = methodWinners[0];
  const methodsAgree = methodWinners.filter(w => w === mainWinner).length;

  const sensitivity = data.sensitivityInflections || {};
  const stableMerits = ['B', 'O', 'C', 'R'].filter(m => sensitivity[m] === null || sensitivity[m] === undefined);
  const sensitiveMerits = ['B', 'O', 'C', 'R'].filter(m => sensitivity[m] !== null && sensitivity[m] !== undefined);

  return {
    projeto: {
      nome: context?.projectName || data.projectName || 'Avaliação de Investimentos I4.0',
      descricao: context?.projectDescription || 'Seleção de tecnologias de Indústria 4.0',
      respondentes: data.responseCount || 0
    },
    consistencia: {
      cr_global: data.bocrConsistency?.cr ? (data.bocrConsistency.cr * 100).toFixed(2) + '%' : 'N/A',
      cr_valor: data.bocrConsistency?.cr || 0,
      lambda_max: data.bocrConsistency?.lambda?.toFixed(4) || 'N/A',
      status: (data.bocrConsistency?.cr || 0) <= 0.10 ? 'CONSISTENTE (CR ≤ 10%)' : 'ATENÇÃO (CR > 10%)'
    },
    pesos_bocr: {
      Benefits: { peso: (bocrWeights[0] * 100).toFixed(1) + '%', valor: bocrWeights[0] },
      Opportunities: { peso: (bocrWeights[1] * 100).toFixed(1) + '%', valor: bocrWeights[1] },
      Costs: { peso: (bocrWeights[2] * 100).toFixed(1) + '%', valor: bocrWeights[2] },
      Risks: { peso: (bocrWeights[3] * 100).toFixed(1) + '%', valor: bocrWeights[3] }
    },
    perfil_decisao: bocrWeights[0] + bocrWeights[1] > bocrWeights[2] + bocrWeights[3] 
      ? 'ORIENTADO A BENEFÍCIOS/OPORTUNIDADES' 
      : bocrWeights[2] + bocrWeights[3] > bocrWeights[0] + bocrWeights[1]
      ? 'CONSERVADOR/AVESSO AO RISCO'
      : 'BALANCEADO',
    top10_subcriterios: top10.map((w: any, i: number) => ({
      rank: i + 1,
      codigo: w.code,
      nome: w.name,
      grupo: w.group,
      peso_local: (w.localWeight * 100).toFixed(2) + '%',
      peso_global: (w.globalWeight * 100).toFixed(2) + '%'
    })),
    alternativas: finalScores.map((alt: any, i: number) => ({
      posicao: i + 1,
      codigo: alt.code,
      nome: alt.name,
      scores: {
        B: alt.B?.toFixed(4),
        O: alt.O?.toFixed(4),
        C: alt.C?.toFixed(4),
        R: alt.R?.toFixed(4),
        additive: alt.scoreAdditive?.toFixed(4),
        probabilistic: alt.scoreProbabilistic?.toFixed(4),
        subtractive: alt.scoreSubtractiveNorm?.toFixed(4),
        mult_powers: alt.scoreMultPowersNorm?.toFixed(4),
        mult_simple: alt.scoreMultSimpleNorm?.toFixed(4)
      }
    })),
    robustez: {
      metodos_concordantes: `${methodsAgree}/5`,
      unanimidade: methodsAgree === 5,
      diferenca_1o_2o: winner && runnerUp 
        ? ((winner.scoreAdditive - runnerUp.scoreAdditive) / winner.scoreAdditive * 100).toFixed(2) + '%' 
        : 'N/A',
      classificacao: methodsAgree === 5 ? 'MUITO ROBUSTA' : methodsAgree >= 4 ? 'ROBUSTA' : methodsAgree >= 3 ? 'MODERADA' : 'SENSÍVEL'
    },
    sensibilidade: {
      meritos_estaveis: stableMerits,
      meritos_sensiveis: sensitiveMerits.map(m => ({
        merito: m,
        ponto_inversao: sensitivity[m] + '%'
      })),
      classificacao: stableMerits.length === 4 ? 'MUITO ESTÁVEL' 
        : stableMerits.length >= 3 ? 'ESTÁVEL' 
        : stableMerits.length >= 2 ? 'MODERADAMENTE SENSÍVEL' 
        : 'ALTAMENTE SENSÍVEL'
    }
  };
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { calculationData, projectContext, model = 'gemini', searchLiterature: doSearch = true } = await request.json();

    if (!calculationData) {
      return NextResponse.json({
        success: false,
        error: 'Dados de cálculo não fornecidos'
      }, { status: 400 });
    }

    // Verificar API keys
    const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;
    const hasGeminiKey = !!process.env.GOOGLE_AI_API_KEY;

    if (model === 'claude' && !hasClaudeKey) {
      return NextResponse.json({
        success: false,
        error: 'API Key do Claude (Anthropic) não configurada'
      }, { status: 400 });
    }

    if (model === 'gemini' && !hasGeminiKey) {
      return NextResponse.json({
        success: false,
        error: 'API Key do Gemini (Google) não configurada. Adicione GOOGLE_AI_API_KEY nas variáveis de ambiente.'
      }, { status: 400 });
    }

    // Buscar literatura científica
    let literatureData = { papers: [] as Paper[], summary: '' };
    
    if (doSearch) {
      const searchTopics = [
        'AHP BOCR decision making',
        'Analytic Hierarchy Process industry 4.0',
        'multi-criteria decision manufacturing',
        'MCDM technology selection',
        'AHP sensitivity analysis'
      ];
      
      literatureData = await searchLiterature(searchTopics);
    }

    // Preparar dados e prompts
    const preparedData = prepareDataForPrompt(calculationData, projectContext);
    const systemPrompt = createSystemPrompt(literatureData.summary);
    
    const userPrompt = `**DADOS DO ESTUDO:**

${JSON.stringify(preparedData, null, 2)}

---

Por favor, gere as seções "4. Resultados e Discussão" e "5. Conclusão" do artigo científico conforme as instruções.

Use os dados fornecidos para criar um texto acadêmico rigoroso, citando adequadamente a literatura (Saaty, Wijnmalen, Petrillo et al., e outros papers relevantes da busca).

O texto deve ser adequado para submissão a periódicos Q1/A1 como:
- International Journal of the Analytic Hierarchy Process (IJAHP)
- Mathematics (MDPI)
- International Journal of Production Economics
- Journal of Cleaner Production`;

    // Chamar o modelo selecionado
    let articleText: string;
    
    if (model === 'claude') {
      articleText = await callClaude(systemPrompt, userPrompt);
    } else {
      articleText = await callGemini(systemPrompt, userPrompt);
    }

    return NextResponse.json({
      success: true,
      article: articleText,
      model: model,
      modelName: MODELS[model as keyof typeof MODELS].name,
      literature: {
        papersFound: literatureData.papers.length,
        topPapers: literatureData.papers.slice(0, 5).map(p => ({
          title: p.title,
          authors: p.authors.slice(0, 2).join(', ') + (p.authors.length > 2 ? ' et al.' : ''),
          year: p.year,
          citations: p.citationCount
        }))
      }
    });

  } catch (error: any) {
    console.error('Erro ao gerar artigo:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno ao gerar artigo'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'AI Scientific Writer',
    version: '2.0',
    description: 'Gerador de texto acadêmico com busca em literatura científica',
    models: ['claude', 'gemini'],
    features: [
      'Escolha entre Claude e Gemini',
      'Busca automática no Semantic Scholar',
      'Seções "Resultados e Discussão" e "Conclusão"',
      'Citações no formato (Autor, Ano)',
      'Estilo para periódicos Q1/A1'
    ],
    dataSources: [
      'Semantic Scholar API'
    ]
  });
}
