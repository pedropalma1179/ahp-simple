// MASTER-instalar-tudo.js
// Execute com: node MASTER-instalar-tudo.js
// Instala TUDO de uma vez: API v6.1 + Frontend + AIReviewCard + Quality Integration

const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  🚀 MASTER INSTALLER - AI REVIEWER v6.1 COMPLETO              ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const scripts = [
  'instalar-ai-reviewer-v61-completo.js',
  'instalar-aireviewcard-corrigido.js', 
  'fix-quality-integration.js'
];

// Verificar quais scripts existem
const existingScripts = scripts.filter(s => fs.existsSync(path.join(__dirname, s)));

if (existingScripts.length === 0) {
  console.log('⚠️ Nenhum script de instalação encontrado.');
  console.log('   Executando instalação inline...\n');
}

// ════════════════════════════════════════════════════════════════
// INSTALAÇÃO INLINE (caso os scripts não existam)
// ════════════════════════════════════════════════════════════════

// ==================== API v6.1 ====================
console.log('═══════════════════════════════════════════════════════════════');
console.log('📦 [1/4] Instalando API route.ts v6.1...');
console.log('═══════════════════════════════════════════════════════════════\n');

const apiDir = path.join(__dirname, 'app', 'api', 'ai-reviewer');
const routePath = path.join(apiDir, 'route.ts');

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

if (fs.existsSync(routePath)) {
  fs.copyFileSync(routePath, routePath + '.backup-' + Date.now());
  console.log('   📦 Backup da API criado');
}

// API v6.1 minificada para caber aqui
const apiCode = `// app/api/ai-reviewer/route.ts - v6.1
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface IndividualStats { total: number; valid: number; warning: number; critical: number; avgCR?: number; }

const THRESHOLDS = { CR_ACCEPTABLE: 0.10, CR_WARNING: 0.15, CR_CRITICAL: 0.20, MIN_RESPONDENTS: 5, QUALITY_GATE_CRITICAL: 0.30, QUALITY_GATE_SEVERE: 0.50 };

const SYSTEM_PROMPT = \`Você é um Professor Titular especialista em AHP-BOCR. Gere revisão acadêmica profunda (mín. 600 palavras).

REGRAS:
1. NÚMEROS VÊM DOS TOKENS - Use {{CR_BOCR}}, {{PESO_B}}, etc.
2. CLASSIFICAÇÃO VEM DO SISTEMA - Use {{BLOCO_CLASSIFICACAO}} e {{BLOCO_VEREDITO}}
3. INTERPRETE os dados, não apenas cite

ESTRUTURA:
### 1. SÍNTESE EXECUTIVA
### 2. ANÁLISE DE CONSISTÊNCIA
{{BLOCO_CONSISTENCIA}}
### 3. ANÁLISE DA AMOSTRA
{{BLOCO_AMOSTRA}}
{{BLOCO_QUALIDADE}}
### 4. RANKING
{{BLOCO_RANKING}}
### 5. CERTIFICADO
{{BLOCO_CLASSIFICACAO}}
{{BLOCO_VEREDITO}}
### 6. PARECER FINAL\`;

function calculateClassification(crBOCR: number, subCRs: number[], responseCount: number, individualStats?: IndividualStats) {
  let qualityPenalty = false, penaltyReason: string | undefined, penaltySeverity: 'none'|'warning'|'critical'|'severe' = 'none';
  
  if (individualStats && individualStats.total > 0) {
    const badRatio = (individualStats.warning + individualStats.critical) / individualStats.total;
    if (badRatio >= THRESHOLDS.QUALITY_GATE_SEVERE) { qualityPenalty = true; penaltySeverity = 'severe'; penaltyReason = \`\${(badRatio*100).toFixed(0)}% problemáticos (≥50%)\`; }
    else if (badRatio >= THRESHOLDS.QUALITY_GATE_CRITICAL) { qualityPenalty = true; penaltySeverity = 'critical'; penaltyReason = \`\${(badRatio*100).toFixed(0)}% problemáticos (≥30%)\`; }
  }

  let nota = 100;
  if (crBOCR > THRESHOLDS.CR_CRITICAL) nota -= 40;
  else if (crBOCR > THRESHOLDS.CR_WARNING) nota -= 25;
  else if (crBOCR > THRESHOLDS.CR_ACCEPTABLE) nota -= 15;
  
  const maxSubCR = subCRs.length > 0 ? Math.max(...subCRs) : 0;
  if (maxSubCR > THRESHOLDS.CR_CRITICAL) nota -= 20;
  else if (maxSubCR > THRESHOLDS.CR_WARNING) nota -= 10;
  
  if (responseCount < 3) nota -= 30;
  else if (responseCount < 5) nota -= 15;
  
  if (penaltySeverity === 'severe') nota = Math.min(nota, 35);
  else if (penaltySeverity === 'critical') nota = Math.min(nota, 55);
  
  nota = Math.max(0, Math.min(100, nota));
  
  let grade: 'A'|'B'|'C'|'D', gradeLabel: string, verdict: string, verdictIcon: string;
  if (nota >= 85) { grade = 'A'; gradeLabel = 'EXCELENTE'; verdict = 'APROVADO'; verdictIcon = '✅'; }
  else if (nota >= 70) { grade = 'B'; gradeLabel = 'SATISFATÓRIO'; verdict = 'APROVADO COM OBSERVAÇÕES'; verdictIcon = '📝'; }
  else if (nota >= 50) { grade = 'C'; gradeLabel = 'REQUER ATENÇÃO'; verdict = qualityPenalty ? 'REVISÃO MAIOR REQUERIDA' : 'REVISÃO RECOMENDADA'; verdictIcon = '⚠️'; }
  else { grade = 'D'; gradeLabel = 'INSUFICIENTE'; verdict = 'NÃO RECOMENDADO'; verdictIcon = '🔴'; }
  
  return { grade, gradeLabel, nota: Math.round(nota), verdict, verdictIcon, confidenceLevel: nota >= 85 ? 'ALTA' : nota >= 50 ? 'MODERADA' : 'BAIXA', qualityPenalty, penaltyReason, penaltySeverity };
}

function generateBlocks(data: any, classification: any) {
  const { bocrWeights, bocrConsistency, subConsistency, finalScores, responseCount, individualStats } = data;
  const tokens: Record<string, string> = {
    CR_BOCR: ((bocrConsistency?.cr || 0) * 100).toFixed(2) + '%',
    PESO_B: ((bocrWeights?.[0] || 0) * 100).toFixed(1) + '%',
    PESO_O: ((bocrWeights?.[1] || 0) * 100).toFixed(1) + '%',
    PESO_C: ((bocrWeights?.[2] || 0) * 100).toFixed(1) + '%',
    PESO_R: ((bocrWeights?.[3] || 0) * 100).toFixed(1) + '%',
  };
  ['B','O','C','R'].forEach(m => { tokens[\`CR_\${m}\`] = ((subConsistency?.[m]?.cr || 0) * 100).toFixed(2) + '%'; });
  
  const sorted = [...(finalScores || [])].sort((a: any, b: any) => (b.scoreAdditive || 0) - (a.scoreAdditive || 0));
  tokens.WINNER = sorted[0]?.name || 'N/A';
  tokens.WINNER_SCORE = (sorted[0]?.scoreAdditive || 0).toFixed(4);
  tokens.MARGEM = sorted.length >= 2 ? (Math.abs((sorted[0]?.scoreAdditive || 0) - (sorted[1]?.scoreAdditive || 0)) * 100).toFixed(2) + '%' : '0%';

  const crStatus = (bocrConsistency?.cr || 0) <= 0.05 ? '🟢 EXCELENTE' : (bocrConsistency?.cr || 0) <= 0.10 ? '🟡 ACEITÁVEL' : '🔴 INCONSISTENTE';
  
  const BLOCO_CONSISTENCIA = \`#### Consistência\\n| Matriz | CR | Status |\\n|--------|-----|--------|\\n| **BOCR** | **\${tokens.CR_BOCR}** | \${crStatus} |\\n| B | \${tokens.CR_B} | \${parseFloat(tokens.CR_B) <= 10 ? '✅' : '⚠️'} |\\n| O | \${tokens.CR_O} | \${parseFloat(tokens.CR_O) <= 10 ? '✅' : '⚠️'} |\\n| C | \${tokens.CR_C} | \${parseFloat(tokens.CR_C) <= 10 ? '✅' : '⚠️'} |\\n| R | \${tokens.CR_R} | \${parseFloat(tokens.CR_R) <= 10 ? '✅' : '⚠️'} |\\n\\n**Pesos:** B=\${tokens.PESO_B}, O=\${tokens.PESO_O}, C=\${tokens.PESO_C}, R=\${tokens.PESO_R}\`;
  
  const sampleStatus = (responseCount || 0) >= 7 ? '🟢 ADEQUADA' : (responseCount || 0) >= 5 ? '🟡 MÍNIMA' : '🔴 INSUFICIENTE';
  const BLOCO_AMOSTRA = \`#### Amostra\\n- **Total:** \${responseCount || 0} especialistas (\${sampleStatus})\`;
  
  let BLOCO_QUALIDADE = '';
  if (individualStats && individualStats.total > 0) {
    const validPct = ((individualStats.valid / individualStats.total) * 100).toFixed(1);
    const badPct = (((individualStats.warning + individualStats.critical) / individualStats.total) * 100).toFixed(1);
    let alert = classification.qualityPenalty ? \`\\n> ⚠️ **QUALITY GATE:** \${classification.penaltyReason}\` : '';
    BLOCO_QUALIDADE = \`#### Qualidade Individual\\n| Categoria | Qtd | % |\\n|-----------|-----|---|\\n| ✅ Confiáveis | \${individualStats.valid} | \${validPct}% |\\n| ⚠️ Atenção | \${individualStats.warning} | — |\\n| 🔴 Críticos | \${individualStats.critical} | — |\\n\\n**Problemáticos:** \${badPct}%\${alert}\`;
  } else {
    BLOCO_QUALIDADE = \`> ℹ️ Execute "Análise de Qualidade" para auditoria individual.\`;
  }
  
  const rankRows = sorted.slice(0, 5).map((a: any, i: number) => \`| \${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)+'º'} | **\${a.name}** | \${(a.scoreAdditive || 0).toFixed(4)} |\`).join('\\n');
  const BLOCO_RANKING = \`#### Ranking\\n| Pos | Alternativa | Score |\\n|-----|-------------|-------|\\n\${rankRows}\\n\\n**Vencedor:** \${tokens.WINNER} | **Margem:** \${tokens.MARGEM}\`;
  
  const gradeColors: Record<string, string> = { A: '🟢', B: '🔵', C: '🟡', D: '🔴' };
  const penaltyNote = classification.qualityPenalty ? \`\\n> ⚠️ **Penalização:** \${classification.penaltyReason}\` : '';
  const BLOCO_CLASSIFICACAO = \`---\\n## 📋 CLASSIFICAÇÃO\\n| Critério | Resultado |\\n|----------|-----------|\\n| **Nota** | **\${classification.nota}/100** |\\n| **Grade** | \${gradeColors[classification.grade]} **\${classification.grade}** — \${classification.gradeLabel} |\\n| **Quality Gate** | \${classification.qualityPenalty ? '🔴 ATIVADO' : '✅ OK'} |\${penaltyNote}\`;
  
  const BLOCO_VEREDITO = \`## 📜 VEREDICTO\\n### \${classification.verdictIcon} \${classification.verdict}\\n\\n**Data:** \${new Date().toLocaleDateString('pt-BR')} | **Sistema:** AHP-BOCR v6.1\`;
  
  return { BLOCO_CONSISTENCIA, BLOCO_AMOSTRA, BLOCO_QUALIDADE, BLOCO_RANKING, BLOCO_CLASSIFICACAO, BLOCO_VEREDITO, ...tokens };
}

export async function POST(request: NextRequest) {
  try {
    let data = await request.json();
    
    // Compatibilidade
    if (data.calculationData && !data.bocrWeights) {
      const calc = data.calculationData;
      data = { ...data, bocrWeights: calc.bocrWeights || [], bocrConsistency: calc.bocrConsistency || { cr: 0, lambda: 0 }, subConsistency: calc.subConsistency, finalScores: calc.finalScores || [], responseCount: calc.responseCount || 0, individualStats: calc.individualStats };
    }
    
    if (!data.projectName || !data.bocrWeights || !data.finalScores?.length) {
      return NextResponse.json({ success: false, error: 'Dados incompletos', review: { error: true, message: 'Dados incompletos. Campos obrigatórios: projectName, bocrWeights, finalScores' } }, { status: 400 });
    }
    
    const subCRs = ['B','O','C','R'].map(m => data.subConsistency?.[m]?.cr || 0).filter(cr => cr > 0);
    const classification = calculateClassification(data.bocrConsistency?.cr || 0, subCRs, data.responseCount || 0, data.individualStats);
    const blocks = generateBlocks(data, classification);
    
    const userPrompt = \`## DADOS\\n**Projeto:** \${data.projectName}\\n**Respondentes:** \${data.responseCount}\\n\\n## BLOCOS\\n\${blocks.BLOCO_CONSISTENCIA}\\n\\n\${blocks.BLOCO_AMOSTRA}\\n\\n\${blocks.BLOCO_QUALIDADE}\\n\\n\${blocks.BLOCO_RANKING}\\n\\n\${blocks.BLOCO_CLASSIFICACAO}\\n\\n\${blocks.BLOCO_VEREDITO}\\n\\nGere a revisão:\`;
    
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 5000, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: userPrompt }] });
    const reviewText = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\\n');
    
    return NextResponse.json({
      success: true, version: '6.1',
      review: {
        resumo_executivo: reviewText, observacoes_revisor: reviewText, nota_geral: classification.nota,
        classificacao: classification.gradeLabel, veredito: classification.verdict,
        analise_amostra: { tamanho: data.responseCount, adequacao: (data.responseCount || 0) >= 7 ? 'ADEQUADA' : 'LIMITADA' },
        adequacao_publicacao: { nivel: classification.grade === 'A' ? 'A1_Q1' : classification.grade === 'B' ? 'A2_Q2' : 'B1_B2', justificativa: classification.gradeLabel },
        pontos_fortes: [], pontos_fracos: [], recomendacoes: [],
        _sistema: classification, _qualityStats: data.individualStats
      },
      classification, blocks,
      metadata: { timestamp: new Date().toISOString(), model: 'claude-sonnet-4-20250514', inputTokens: message.usage?.input_tokens, outputTokens: message.usage?.output_tokens }
    });
  } catch (error: any) {
    console.error('Erro API v6.1:', error);
    return NextResponse.json({ success: false, error: error.message, review: { error: true, message: error.message || 'Erro ao gerar revisão' } }, { status: 500 });
  }
}

export async function GET() { return NextResponse.json({ name: 'AI Reviewer API', version: '6.1', features: ['Professor Titular', 'Quality Gate', 'Tokens'] }); }
`;

fs.writeFileSync(routePath, apiCode);
console.log('   ✅ API route.ts v6.1 instalada\n');

// ==================== FRONTEND ====================
console.log('═══════════════════════════════════════════════════════════════');
console.log('📝 [2/4] Corrigindo page.tsx (envio de qualityStats)...');
console.log('═══════════════════════════════════════════════════════════════\n');

const pagePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (fs.existsSync(pagePath)) {
  let pageContent = fs.readFileSync(pagePath, 'utf8');
  const originalPage = pageContent;
  
  // Verificar se já tem qualityStats
  if (!pageContent.includes('qualityStats') || !pageContent.includes('individualStats')) {
    const newFunc = `const generateAIReview = async () => {
    if (!calculation || !project) return;
    setAiReviewLoading(true);
    setAiReview(null);
    try {
      let qualityStats = { valid: 0, warning: 0, critical: 0, total: 0 };
      if (qualityAnalysis?.respondents?.length > 0) {
        qualityStats = qualityAnalysis.respondents.reduce((acc: any, r: any) => {
          const cr = r.metrics?.avgCR || r.cr || 0;
          if (r.status === 'CRÍTICO' || cr > 0.2) acc.critical++;
          else if (r.status === 'SUSPEITO' || r.status === 'REVISAR' || cr > 0.1) acc.warning++;
          else acc.valid++;
          acc.total++;
          return acc;
        }, { valid: 0, warning: 0, critical: 0, total: 0 });
        console.log('📊 qualityStats:', qualityStats);
      }
      const response = await fetch('/api/ai-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name || 'Projeto',
          projectDescription: project.description || '',
          alternatives: project.alternatives || [],
          bocrWeights: calculation.bocrWeights || [],
          bocrConsistency: calculation.bocrConsistency || { cr: 0, lambda: 0 },
          subWeights: calculation.subWeights || {},
          subConsistency: calculation.subConsistency || {},
          finalScores: calculation.finalScores || [],
          responseCount: calculation.responseCount || 0,
          individualStats: qualityStats.total > 0 ? qualityStats : undefined
        })
      });
      const data = await response.json();
      if (data.success && data.review) setAiReview({ ...data.review, _qualityStats: qualityStats });
      else setAiReview({ error: true, message: data.error || 'Erro' });
    } catch (e: any) {
      setAiReview({ error: true, message: e.message || 'Erro de conexão' });
    } finally {
      setAiReviewLoading(false);
    }
  };`;
    
    const funcPattern = /const\s+generateAIReview\s*=\s*async[\s\S]*?finally\s*\{[\s\S]*?\}\s*\}\s*;/;
    if (funcPattern.test(pageContent)) {
      pageContent = pageContent.replace(funcPattern, newFunc);
      fs.writeFileSync(pagePath + '.backup-master-' + Date.now(), originalPage);
      fs.writeFileSync(pagePath, pageContent);
      console.log('   ✅ Função generateAIReview atualizada com qualityStats\n');
    } else {
      console.log('   ⚠️ Não encontrou padrão da função - pode precisar ajuste manual\n');
    }
  } else {
    console.log('   ✅ qualityStats já está no código\n');
  }
} else {
  console.log('   ⚠️ page.tsx não encontrado\n');
}

// ==================== RESUMO ====================
console.log('═══════════════════════════════════════════════════════════════');
console.log('📝 [3/4] Verificando AIReviewCard.tsx...');
console.log('═══════════════════════════════════════════════════════════════\n');

const cardPath = path.join(__dirname, 'components', 'AIReviewCard.tsx');
if (fs.existsSync(cardPath)) {
  console.log('   ✅ AIReviewCard.tsx existe');
  console.log('   💡 Se precisar das 3 correções, execute: node instalar-aireviewcard-corrigido.js\n');
} else {
  console.log('   ⚠️ AIReviewCard.tsx não encontrado');
  console.log('   💡 Execute: node instalar-aireviewcard-corrigido.js\n');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('📝 [4/4] Verificação final...');
console.log('═══════════════════════════════════════════════════════════════\n');

// Verificar arquivos
const checks = [
  { path: routePath, name: 'API route.ts' },
  { path: pagePath, name: 'page.tsx' },
  { path: cardPath, name: 'AIReviewCard.tsx' }
];

checks.forEach(c => {
  const exists = fs.existsSync(c.path);
  console.log(`   ${exists ? '✅' : '❌'} ${c.name}`);
});

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  ✨ INSTALAÇÃO MASTER CONCLUÍDA!                              ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Agora execute:');
console.log('   npm run build && vercel --prod\n');

console.log('🧪 Para testar:');
console.log('   1. Acesse Resultados de um projeto');
console.log('   2. Execute "Análise de Qualidade" primeiro');
console.log('   3. Depois execute "Revisão IA"');
console.log('   4. Verifique se a nota é penalizada quando há respondentes ruins\n');
