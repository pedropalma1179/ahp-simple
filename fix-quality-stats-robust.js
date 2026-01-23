// fix-quality-stats-robust.js
// Execute com: node fix-quality-stats-robust.js
// Corrige o cálculo de individualStats para detectar respondentes ruins corretamente

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 CORREÇÃO CRÍTICA: CÁLCULO DE QUALIDADE ROBUSTO');
console.log('═══════════════════════════════════════════════════════════════\n');

const pagePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error('❌ page.tsx não encontrado');
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf8');
const original = content;

// Nova função runAiReview com cálculo robusto de qualidade
const newRunAiReview = `// Função para executar revisão profunda com IA
  const runAiReview = async () => {
    console.log('🚀 [AI-REVIEW] Função chamada!');
    console.log('🔍 [AI-REVIEW] calculation:', !!calculation, 'project:', !!project);
    
    if (!calculation || !project) {
      console.error('❌ [AI-REVIEW] Abortando - dados faltando');
      return;
    }
    
    setAiReviewLoading(true);
    setAiReview(null);
    
    try {
      console.log('📤 [AI-REVIEW] Preparando payload...');
      
      // ------------------------------------------------------------
      // CORREÇÃO CRÍTICA: CÁLCULO DE QUALIDADE ROBUSTO
      // ------------------------------------------------------------
      let individualStats = { valid: 0, warning: 0, critical: 0, total: 0, avgCR: 0 };
      
      // Tentar usar dados da análise de qualidade primeiro
      if (qualityAnalysis?.respondents && qualityAnalysis.respondents.length > 0) {
        console.log('📊 [AI-REVIEW] Usando dados de qualityAnalysis:', qualityAnalysis.respondents.length, 'respondentes');
        
        let totalCR = 0;
        individualStats = qualityAnalysis.respondents.reduce((acc: any, r: any) => {
          // 1. Tenta encontrar o CR em qualquer lugar possível
          let crValue = 0;
          
          if (typeof r.cr === 'number') crValue = r.cr;
          else if (r.metrics && typeof r.metrics.avgCR === 'number') crValue = r.metrics.avgCR;
          else if (r.consistency && typeof r.consistency.cr === 'number') crValue = r.consistency.cr;
          else if (typeof r.cr_mean === 'number') crValue = r.cr_mean;
          
          totalCR += crValue;
          
          // 2. Classificação Agressiva (Mesma régua do Menu Qualidade)
          const isExplicitlyBad = r.status === 'SUSPEITO' || r.status === 'CRÍTICO';
          const isMathematicallyBad = crValue > 0.20; // CR > 20% = CRÍTICO
          const isMathematicallySuspect = crValue > 0.10; // CR > 10% = SUSPEITO

          if (isExplicitlyBad || isMathematicallyBad) {
            acc.critical++; 
            console.log(\`⚠️ [QUALITY] Respondente CRÍTICO: \${r.id || r.visitorId || 'N/A'} (CR: \${(crValue*100).toFixed(1)}%, Status: \${r.status || 'N/A'})\`);
          } else if (isMathematicallySuspect) {
            acc.warning++;
            console.log(\`🔸 [QUALITY] Respondente SUSPEITO: \${r.id || r.visitorId || 'N/A'} (CR: \${(crValue*100).toFixed(1)}%)\`);
          } else {
            acc.valid++;
          }

          acc.total++;
          return acc;
        }, { valid: 0, warning: 0, critical: 0, total: 0 });
        
        individualStats.avgCR = individualStats.total > 0 ? totalCR / individualStats.total : 0;
        
      } else if (projectResponses && projectResponses.length > 0) {
        // Fallback: usar projectResponses diretamente
        console.log('📊 [AI-REVIEW] Fallback: usando projectResponses:', projectResponses.length, 'respostas');
        
        // Aqui precisaríamos calcular o CR de cada resposta
        // Por ora, marcamos todos como válidos (será melhorado)
        individualStats = {
          valid: projectResponses.length,
          warning: 0,
          critical: 0,
          total: projectResponses.length,
          avgCR: 0
        };
        console.log('⚠️ [AI-REVIEW] Análise de qualidade não executada - usando fallback');
      }
      
      console.log('📉 [AI-REVIEW] RESUMO DE QUALIDADE:', individualStats);
      
      // Calcular % de problemáticos
      const badRatio = individualStats.total > 0 
        ? (individualStats.warning + individualStats.critical) / individualStats.total 
        : 0;
      
      if (badRatio >= 0.3) {
        console.warn(\`🚨 [AI-REVIEW] ALERTA: \${(badRatio * 100).toFixed(0)}% dos respondentes são problemáticos! Quality Gate será ativado.\`);
      } else if (badRatio >= 0.2) {
        console.warn(\`⚠️ [AI-REVIEW] ATENÇÃO: \${(badRatio * 100).toFixed(0)}% dos respondentes requerem revisão.\`);
      }
      // ------------------------------------------------------------

      // Preparar payload
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
        individualStats: individualStats.total > 0 ? individualStats : undefined
      };
      
      console.log('📤 [AI-REVIEW] Chamando /api/ai-reviewer...');
      console.log('📤 [AI-REVIEW] individualStats enviado:', payload.individualStats);
      
      const response = await fetch('/api/ai-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('📥 [AI-REVIEW] Response status:', response.status);
      const data = await response.json();
      console.log('📥 [AI-REVIEW] Response data:', { success: data.success, hasReview: !!data.review, error: data.error });
      
      if (data.success && data.review) {
        console.log('✅ [AI-REVIEW] Sucesso! Nota:', data.review.nota_geral || data.classification?.nota, 'Veredicto:', data.review.veredito);
        setAiReview(data.review);
      } else {
        console.error('❌ [AI-REVIEW] Erro na resposta:', data.error);
        setAiReview({ 
          error: true, 
          message: data.error || 'Erro ao executar revisão' 
        });
      }
    } catch (e: any) {
      console.error('❌ [AI-REVIEW] Exceção:', e);
      setAiReview({ 
        error: true, 
        message: 'Erro de conexão: ' + (e.message || String(e))
      });
    } finally {
      console.log('🏁 [AI-REVIEW] Finalizando...');
      setAiReviewLoading(false);
    }
  };`;

// Encontrar e substituir a função runAiReview
const funcPattern = /\/\/ Função para executar revisão profunda com IA\s*\n\s*const runAiReview = async \(\) => \{[\s\S]*?\n\s{2}\};/;

if (funcPattern.test(content)) {
  content = content.replace(funcPattern, newRunAiReview);
  console.log('✅ Função runAiReview substituída com cálculo robusto de qualidade\n');
} else {
  // Tentar padrão alternativo
  const altPattern = /const runAiReview = async \(\) => \{[\s\S]*?finally \{[\s\S]*?\}\s*\n\s{2}\};/;
  if (altPattern.test(content)) {
    content = content.replace(altPattern, newRunAiReview);
    console.log('✅ Função substituída (padrão alternativo)\n');
  } else {
    console.log('⚠️ Padrão não encontrado automaticamente.\n');
    console.log('   Procurando localização da função...');
    
    const match = content.match(/const runAiReview/);
    if (match) {
      const idx = content.indexOf('const runAiReview');
      const line = content.slice(0, idx).split('\n').length;
      console.log('   📍 Função encontrada na linha:', line);
    }
  }
}

// Salvar
if (content !== original) {
  const backupPath = pagePath + '.backup-quality-' + Date.now();
  fs.writeFileSync(backupPath, original);
  console.log('📦 Backup criado:', backupPath);
  
  fs.writeFileSync(pagePath, content);
  console.log('💾 Arquivo salvo!\n');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✨ CORREÇÃO APLICADA!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('🎯 O que foi corrigido:');
  console.log('   • CR buscado em múltiplos campos (r.cr, r.metrics.avgCR, etc.)');
  console.log('   • Classificação agressiva: CR > 20% = CRÍTICO, CR > 10% = SUSPEITO');
  console.log('   • Logs detalhados de cada respondente problemático');
  console.log('   • Alerta quando Quality Gate será ativado\n');
  
  console.log('📋 Agora execute:');
  console.log('   npm run build && vercel --prod\n');
  
  console.log('🧪 Para testar após deploy:');
  console.log('   1. Execute "Análise de Qualidade" primeiro');
  console.log('   2. Depois execute "Revisão IA"');
  console.log('   3. Veja no Console os logs [QUALITY] com cada respondente ruim\n');
} else {
  console.log('⚠️ Nenhuma alteração aplicada.\n');
}
