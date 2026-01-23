// app/api/ai-reviewer/route.ts
// API de Revisão IA v6.4.1 - RAG + PEER REVIEWER (A1/Q1)
// Features: RAG Científico, Persona Peer Reviewer, Quality Gate, BACKWARDS COMPATIBLE

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getKnowledgeContext, getKnowledgeStats, getCriticalRefs } from './knowledge';

// ============================================================
// CONFIGURAÇÃO CENTRALIZADA DO MODELO
// ============================================================

const MODEL_CONFIG = {
  id: 'claude-sonnet-4-20250514',  // Sonnet 4 (mais recente)
  maxTokens: 5000,
  temperature: 0.3,  // Mais determinístico para análise técnica
};

// ============================================================
// TIPOS
// ============================================================

interface IndividualStats {
  total: number;
  valid: number;
  warning: number;
  critical: number;
  avgCR?: number;
}

interface ReviewRequest {
  projectName: string;
  projectDescription?: string;
  criteriaStats: {
    Benefits: IndividualStats;
    Opportunities: IndividualStats;
    Costs: IndividualStats;
    Risks: IndividualStats;
  };
  bocrWeights: {
    Benefits: number;
    Opportunities: number;
    Costs: number;
    Risks: number;
  };
  qualityMetrics: {
    overallValid: number;
    overallWarning: number;
    overallCritical: number;
    totalResponses: number;
  };
}

// ============================================================
// NORMALIZAÇÃO DE DADOS (BACKWARDS COMPATIBILITY)
// ============================================================

function normalizeRequest(rawData: any): ReviewRequest {
  // Se já está no formato novo, retorna direto
  if (rawData.criteriaStats && rawData.bocrWeights && rawData.qualityMetrics) {
    return rawData as ReviewRequest;
  }

  // Converter formato antigo para novo
  const normalized: ReviewRequest = {
    projectName: rawData.projectName || rawData.name || 'Projeto sem nome',
    projectDescription: rawData.projectDescription || rawData.description,
    criteriaStats: {
      Benefits: rawData.individualStats?.Benefits || { total: 0, valid: 0, warning: 0, critical: 0 },
      Opportunities: rawData.individualStats?.Opportunities || { total: 0, valid: 0, warning: 0, critical: 0 },
      Costs: rawData.individualStats?.Costs || { total: 0, valid: 0, warning: 0, critical: 0 },
      Risks: rawData.individualStats?.Risks || { total: 0, valid: 0, warning: 0, critical: 0 },
    },
    bocrWeights: rawData.bocrWeights || rawData.weights || {
      Benefits: 0.25,
      Opportunities: 0.25,
      Costs: 0.25,
      Risks: 0.25,
    },
    qualityMetrics: rawData.qualityMetrics || {
      overallValid: rawData.overallStats?.valid || 0,
      overallWarning: rawData.overallStats?.warning || 0,
      overallCritical: rawData.overallStats?.critical || 0,
      totalResponses: rawData.overallStats?.total || 0,
    },
  };

  return normalized;
}

// ============================================================
// SYSTEM PROMPT - PEER REVIEWER COM RAG
// ============================================================

const SYSTEM_PROMPT = `Você é um **Peer Reviewer anônimo** de uma revista acadêmica A1/Q1 em Engenharia de Produção, especializado em métodos multicritério de decisão (AHP-BOCR).

**TOM E ESTILO:**
- Técnico, impessoal, direto
- Use terceira pessoa impessoal: "O estudo apresenta...", "Verifica-se que...", "Observa-se..."
- NUNCA: "Eu acho", "Eu recomendo", "Parabéns", "Excelente trabalho"
- Críticas construtivas mas sem elogios efusivos

**ESTRUTURA DA REVISÃO:**
Use exatamente esta estrutura:

## 📊 ANÁLISE DE QUALIDADE DOS DADOS

[Avalie a homogeneidade amostral usando o Quality Gate]

## 🎯 ANÁLISE DOS PESOS BOCR

[Analise os pesos de Benefits, Opportunities, Costs, Risks]
[Compare com benchmarks da literatura científica]

## ⚠️ PRINCIPAIS OBSERVAÇÕES

[Liste os pontos críticos encontrados]

## 💡 RECOMENDAÇÕES

[Sugestões de melhoria baseadas em literatura]

**IMPORTANTE:**
- Cite referências científicas quando aplicável
- Seja crítico mesmo que os dados estejam bons
- Identifique vieses e limitações metodológicas
- Não invente dados - use apenas o que foi fornecido`;

// ============================================================
// FUNÇÃO PRINCIPAL - GERAR REVISÃO
// ============================================================

async function generateReview(data: ReviewRequest): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // ══════════════════════════════════════════════════════════
  // 1. CONSTRUIR CONTEXTO RAG
  // ══════════════════════════════════════════════════════════
  
  const knowledgeContext = getKnowledgeContext();
  const criticalRefs = getCriticalRefs();
  
  // ══════════════════════════════════════════════════════════
  // 2. MONTAR USER PROMPT COM DADOS + RAG
  // ══════════════════════════════════════════════════════════
  
  const userPrompt = `
# DADOS DO ESTUDO AHP-BOCR

**Projeto:** ${data.projectName}
${data.projectDescription ? `**Descrição:** ${data.projectDescription}` : ''}

## ESTATÍSTICAS DE CONSISTÊNCIA POR DIMENSÃO

### Benefits (Benefícios)
- Total de respostas: ${data.criteriaStats.Benefits.total}
- Válidas (CR ≤ 0.10): ${data.criteriaStats.Benefits.valid}
- Warning (0.10 < CR ≤ 0.20): ${data.criteriaStats.Benefits.warning}
- Críticas (CR > 0.20): ${data.criteriaStats.Benefits.critical}
${data.criteriaStats.Benefits.avgCR ? `- CR médio: ${data.criteriaStats.Benefits.avgCR.toFixed(3)}` : ''}

### Opportunities (Oportunidades)
- Total de respostas: ${data.criteriaStats.Opportunities.total}
- Válidas (CR ≤ 0.10): ${data.criteriaStats.Opportunities.valid}
- Warning (0.10 < CR ≤ 0.20): ${data.criteriaStats.Opportunities.warning}
- Críticas (CR > 0.20): ${data.criteriaStats.Opportunities.critical}
${data.criteriaStats.Opportunities.avgCR ? `- CR médio: ${data.criteriaStats.Opportunities.avgCR.toFixed(3)}` : ''}

### Costs (Custos)
- Total de respostas: ${data.criteriaStats.Costs.total}
- Válidas (CR ≤ 0.10): ${data.criteriaStats.Costs.valid}
- Warning (0.10 < CR ≤ 0.20): ${data.criteriaStats.Costs.warning}
- Críticas (CR > 0.20): ${data.criteriaStats.Costs.critical}
${data.criteriaStats.Costs.avgCR ? `- CR médio: ${data.criteriaStats.Costs.avgCR.toFixed(3)}` : ''}

### Risks (Riscos)
- Total de respostas: ${data.criteriaStats.Risks.total}
- Válidas (CR ≤ 0.10): ${data.criteriaStats.Risks.valid}
- Warning (0.10 < CR ≤ 0.20): ${data.criteriaStats.Risks.warning}
- Críticas (CR > 0.20): ${data.criteriaStats.Risks.critical}
${data.criteriaStats.Risks.avgCR ? `- CR médio: ${data.criteriaStats.Risks.avgCR.toFixed(3)}` : ''}

## PESOS FINAIS BOCR (Hierarquia de Controle)

- Benefits: ${(data.bocrWeights.Benefits * 100).toFixed(1)}%
- Opportunities: ${(data.bocrWeights.Opportunities * 100).toFixed(1)}%
- Costs: ${(data.bocrWeights.Costs * 100).toFixed(1)}%
- Risks: ${(data.bocrWeights.Risks * 100).toFixed(1)}%

## MÉTRICAS GERAIS DE QUALIDADE

- Total de respondentes: ${data.qualityMetrics.totalResponses}
- Respostas válidas (CR ≤ 0.10): ${data.qualityMetrics.overallValid}
- Respostas com warning (0.10 < CR ≤ 0.20): ${data.qualityMetrics.overallWarning}
- Respostas críticas (CR > 0.20): ${data.qualityMetrics.overallCritical}

---

# BASE DE CONHECIMENTO CIENTÍFICO (RAG)

${knowledgeContext}

---

# REFERÊNCIAS CRÍTICAS PRIORITÁRIAS

${criticalRefs.map(ref => `
**${ref.citation}** - ${ref.topic}
Contexto: ${ref.context}
Regra: ${ref.rule}
`).join('\n---\n')}

---

**TAREFA:**
Com base nos dados fornecidos e nas referências científicas acima, elabore uma revisão técnica seguindo rigorosamente a estrutura definida no system prompt.`;

  // ══════════════════════════════════════════════════════════
  // 3. CHAMAR API ANTHROPIC
  // ══════════════════════════════════════════════════════════

  const message = await client.messages.create({
    model: MODEL_CONFIG.id,
    max_tokens: MODEL_CONFIG.maxTokens,
    temperature: MODEL_CONFIG.temperature,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  // ══════════════════════════════════════════════════════════
  // 4. EXTRAIR RESPOSTA
  // ══════════════════════════════════════════════════════════

  const textContent = message.content.find((block) => block.type === 'text');
  return textContent && 'text' in textContent ? textContent.text : '';
}

// ============================================================
// ENDPOINTS DA API
// ============================================================

export async function GET() {
  const stats = getKnowledgeStats();
  
  return NextResponse.json({
    name: 'AI Reviewer API',
    version: '6.4.1',
    description: 'Peer Reviewer (A1/Q1) + RAG - Backwards Compatible',
    model: MODEL_CONFIG.id,
    features: [
      'RAG: Base de conhecimento com 16 artigos processados',
      'Persona: Peer Reviewer técnico impessoal',
      'Quality Gate: Detecção de respondentes ruins',
      'Benchmarks: Comparação com literatura científica',
      'Backwards Compatible: Aceita formato antigo e novo',
    ],
    knowledgeBase: {
      totalRefs: stats.totalRefs,
      uniqueArticles: stats.uniqueArticles,
      topics: stats.topicCount,
      contexts: stats.contextCount,
      categories: stats.categories,
      weightDistribution: stats.weightDistribution,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // ══════════════════════════════════════════════════════════
    // 1. RECEBER E NORMALIZAR DADOS
    // ══════════════════════════════════════════════════════════
    
    const rawData = await request.json();
    console.log('[AI-REVIEWER v6.4.1] Dados recebidos:', JSON.stringify(rawData, null, 2));

    // Normalizar para formato padrão (aceita antigo e novo)
    const data = normalizeRequest(rawData);
    console.log('[AI-REVIEWER v6.4.1] Dados normalizados:', JSON.stringify(data, null, 2));

    // ══════════════════════════════════════════════════════════
    // 2. VALIDAR DADOS MÍNIMOS
    // ══════════════════════════════════════════════════════════

    if (!data.projectName) {
      return NextResponse.json(
        { error: 'projectName é obrigatório' },
        { status: 400 }
      );
    }

    // ══════════════════════════════════════════════════════════
    // 3. GERAR REVISÃO
    // ══════════════════════════════════════════════════════════

    const review = await generateReview(data);

    // ══════════════════════════════════════════════════════════
    // 4. RETORNAR RESULTADO
    // ══════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      review,
      metadata: {
        version: '6.4.1',
        model: MODEL_CONFIG.id,
        timestamp: new Date().toISOString(),
        knowledgeBase: {
          refsUsed: getKnowledgeStats().totalRefs,
          criticalRefs: getCriticalRefs().length,
        },
      },
    });

  } catch (error: any) {
    console.error('[AI-REVIEWER v6.4.1] Erro:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao gerar revisão',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
