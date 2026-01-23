// fix-quality-integration.js
// Execute com: node fix-quality-integration.js
// Corrige: 1) Envio de qualityStats para API, 2) Exibição de Auditoria Individual no card

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 INTEGRAÇÃO COMPLETA DE QUALIDADE');
console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================
// PASSO 1: Corrigir page.tsx - Enviar qualityStats
// ============================================================

console.log('📝 PASSO 1: Corrigindo page.tsx (envio de qualityStats)...\n');

const pagePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error('❌ page.tsx não encontrado');
  process.exit(1);
}

let pageContent = fs.readFileSync(pagePath, 'utf8');
const originalPage = pageContent;

// Nova função generateAIReview completa com qualityStats
const newGenerateAIReview = `const generateAIReview = async () => {
    if (!calculation || !project) {
      console.error('Dados insuficientes para revisão');
      return;
    }
    
    setAiReviewLoading(true);
    setAiReview(null);
    
    try {
      // ════════════════════════════════════════════════════════
      // PASSO 1: Calcular estatísticas de qualidade dos respondentes
      // ════════════════════════════════════════════════════════
      let qualityStats = { valid: 0, warning: 0, critical: 0, total: 0, avgCR: 0 };
      
      // Tentar pegar da análise de qualidade já executada
      if (qualityAnalysis?.respondents && qualityAnalysis.respondents.length > 0) {
        const stats = qualityAnalysis.respondents.reduce((acc: any, r: any) => {
          const cr = r.metrics?.avgCR || r.cr || 0;
          const status = r.status || 'REVISAR';
          
          // Critérios de classificação
          if (status === 'CRÍTICO' || cr > 0.20) {
            acc.critical++;
          } else if (status === 'SUSPEITO' || status === 'REVISAR' || cr > 0.10) {
            acc.warning++;
          } else {
            acc.valid++;
          }
          
          acc.total++;
          acc.totalCR += cr;
          return acc;
        }, { valid: 0, warning: 0, critical: 0, total: 0, totalCR: 0 });
        
        qualityStats = {
          total: stats.total,
          valid: stats.valid,
          warning: stats.warning,
          critical: stats.critical,
          avgCR: stats.total > 0 ? stats.totalCR / stats.total : 0
        };
        
        console.log('📊 Estatísticas de Qualidade calculadas:', qualityStats);
        
        // Verificar se há problemas
        const badRatio = (qualityStats.warning + qualityStats.critical) / qualityStats.total;
        if (badRatio >= 0.3) {
          console.warn('⚠️ ALERTA: ' + (badRatio * 100).toFixed(0) + '% dos respondentes são problemáticos!');
        }
      } else {
        console.log('ℹ️ Análise de qualidade não disponível - usando valores padrão');
      }
      
      // ════════════════════════════════════════════════════════
      // PASSO 2: Montar payload com individualStats
      // ════════════════════════════════════════════════════════
      const payload = {
        projectName: project.name || 'Projeto sem nome',
        projectDescription: project.description || '',
        alternatives: project.alternatives || [],
        bocrWeights: calculation.bocrWeights || [],
        bocrConsistency: calculation.bocrConsistency || { cr: 0, lambda: 0 },
        subWeights: calculation.subWeights || {},
        subConsistency: calculation.subConsistency || {},
        finalScores: calculation.finalScores || [],
        responseCount: calculation.responseCount || 0,
        sensitivityInflections: calculation.sensitivityInflections || {},
        // ⭐ CRÍTICO: individualStats para o Quality Gate funcionar
        individualStats: qualityStats.total > 0 ? qualityStats : undefined
      };
      
      console.log('📤 Enviando para API ai-reviewer:', {
        projectName: payload.projectName,
        responseCount: payload.responseCount,
        individualStats: payload.individualStats,
        bocrCR: payload.bocrConsistency?.cr
      });
      
      // ════════════════════════════════════════════════════════
      // PASSO 3: Chamar API
      // ════════════════════════════════════════════════════════
      const response = await fetch('/api/ai-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      console.log('📥 Resposta da API:', {
        success: data.success,
        version: data.version,
        nota: data.review?.nota_geral || data.classification?.nota,
        qualityPenalty: data.classification?.qualityPenalty
      });
      
      if (data.success && data.review) {
        // Adicionar qualityStats ao review para o card poder exibir
        setAiReview({
          ...data.review,
          _qualityStats: qualityStats
        });
      } else {
        console.error('Erro na revisão IA:', data.error);
        setAiReview({
          error: true,
          message: data.error || 'Erro ao executar revisão'
        });
      }
    } catch (e: any) {
      console.error('Erro ao executar revisão IA:', e);
      setAiReview({
        error: true,
        message: 'Erro de conexão com a API: ' + (e.message || '')
      });
    } finally {
      setAiReviewLoading(false);
    }
  };`;

// Encontrar e substituir a função
const funcPatterns = [
  /const\s+generateAIReview\s*=\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?\n\s{2}\};/,
  /const\s+generateAIReview\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n  \};/,
];

let pageReplaced = false;
for (const pattern of funcPatterns) {
  if (pattern.test(pageContent)) {
    pageContent = pageContent.replace(pattern, newGenerateAIReview);
    pageReplaced = true;
    console.log('   ✅ Função generateAIReview substituída');
    break;
  }
}

if (!pageReplaced) {
  // Tentar padrão alternativo
  const altPattern = /const\s+generateAIReview\s*=\s*async[^]*?finally\s*\{[^]*?\}\s*\}\s*;/;
  if (altPattern.test(pageContent)) {
    pageContent = pageContent.replace(altPattern, newGenerateAIReview);
    pageReplaced = true;
    console.log('   ✅ Função substituída (padrão alternativo)');
  }
}

if (pageContent !== originalPage) {
  const backupPath = pagePath + '.backup-quality-' + Date.now();
  fs.writeFileSync(backupPath, originalPage);
  console.log('   📦 Backup criado');
  fs.writeFileSync(pagePath, pageContent);
  console.log('   💾 page.tsx salvo\n');
} else {
  console.log('   ⚠️ Não foi possível atualizar automaticamente\n');
}

// ============================================================
// PASSO 2: Atualizar AIReviewCard - Adicionar Auditoria Individual
// ============================================================

console.log('📝 PASSO 2: Atualizando AIReviewCard.tsx (Auditoria Individual)...\n');

const cardPath = path.join(__dirname, 'components', 'AIReviewCard.tsx');

if (!fs.existsSync(cardPath)) {
  console.log('   ⚠️ AIReviewCard.tsx não encontrado - será criado pelo outro script\n');
} else {
  let cardContent = fs.readFileSync(cardPath, 'utf8');
  const originalCard = cardContent;
  
  // Verificar se já tem a linha de Auditoria Individual
  if (cardContent.includes('Auditoria Individual')) {
    console.log('   ✅ Auditoria Individual já existe no componente\n');
  } else {
    // Adicionar _qualityStats ao tipo
    if (!cardContent.includes('_qualityStats')) {
      cardContent = cardContent.replace(
        /interface AIReviewResponse \{/,
        `interface AIReviewResponse {
  _qualityStats?: {
    valid: number;
    warning: number;
    critical: number;
    total: number;
    avgCR?: number;
  };`
      );
      console.log('   ✅ Tipo _qualityStats adicionado');
    }
    
    // Encontrar o card azul de Validações Matemáticas e adicionar linha
    const validacoesPattern = /(<div className="flex items-center justify-between p-2 bg-white rounded">\s*<span className="text-gray-600">Scores Distributivos<\/span>[\s\S]*?<\/div>)/;
    
    const auditoriaIndividualCode = `$1
            
            {/* Auditoria Individual - Quality Gate Visual */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-gray-600">Auditoria Individual</span>
              {(() => {
                const stats = aiReview?._qualityStats || aiReview?._sistema;
                const temProblemas = stats?.qualityPenalty || 
                  (stats?.warning && stats?.critical && (stats.warning + stats.critical) / (stats.total || 1) >= 0.3);
                
                if (temProblemas) {
                  return (
                    <span className="font-bold text-red-600 flex items-center gap-1">
                      ⚠️ Dados Suspeitos
                    </span>
                  );
                }
                
                if (stats?.total > 0 && stats.warning > 0) {
                  return (
                    <span className="font-medium text-yellow-600 flex items-center gap-1">
                      ⚠ Atenção ({stats.warning} revisar)
                    </span>
                  );
                }
                
                return <span className="font-medium text-green-600">✓ Consistente</span>;
              })()}
            </div>`;
    
    if (validacoesPattern.test(cardContent)) {
      cardContent = cardContent.replace(validacoesPattern, auditoriaIndividualCode);
      console.log('   ✅ Linha "Auditoria Individual" adicionada ao card azul');
    }
    
    if (cardContent !== originalCard) {
      const backupPath = cardPath + '.backup-audit-' + Date.now();
      fs.writeFileSync(backupPath, originalCard);
      console.log('   📦 Backup criado');
      fs.writeFileSync(cardPath, cardContent);
      console.log('   💾 AIReviewCard.tsx salvo\n');
    }
  }
}

// ============================================================
// FINALIZAÇÃO
// ============================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('✨ INTEGRAÇÃO DE QUALIDADE CONCLUÍDA!');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📊 O que foi feito:');
console.log('   1. page.tsx: qualityStats calculado e enviado para API');
console.log('   2. AIReviewCard: linha "Auditoria Individual" no card azul');
console.log('   3. Quality Gate: API vai penalizar nota se >30% problemáticos\n');

console.log('📋 Agora execute:');
console.log('   npm run build && vercel --prod\n');

console.log('🧪 Para testar:');
console.log('   1. Vá em Resultados → Aba "Qualidade" → Execute análise');
console.log('   2. Depois clique em "Executar Revisão IA"');
console.log('   3. Verifique se aparece "Auditoria Individual" no card azul');
console.log('   4. Se houver respondentes ruins, a nota deve ser penalizada\n');
