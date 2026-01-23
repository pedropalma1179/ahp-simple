// fix-ai-review-api-call.js
// Execute com: node fix-ai-review-api-call.js
// Encontra e corrige a chamada para /api/ai-reviewer

const fs = require('fs');
const path = require('path');

console.log('🔧 Procurando chamada da API ai-reviewer...\n');

const pagePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error('❌ page.tsx não encontrado');
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf8');
const original = content;

// Procurar pela chamada fetch para ai-reviewer
const fetchMatch = content.match(/fetch\s*\(\s*['"`]\/api\/ai-reviewer['"`][^]*?body:\s*JSON\.stringify\s*\(\s*\{([^}]+)\}/s);

if (fetchMatch) {
  console.log('✅ Encontrei a chamada da API!');
  console.log('\n📤 Body atual:');
  console.log('   {', fetchMatch[1].trim().slice(0, 200), '...');
} else {
  console.log('⚠️ Não encontrei padrão exato. Procurando alternativas...');
}

// Procurar pela função que chama a API
const funcPatterns = [
  /const\s+(generateAIReview|handleAIReview|fetchAIReview|requestReview)\s*=\s*async/g,
  /async\s+function\s+(generateAIReview|handleAIReview|fetchAIReview|requestReview)/g,
  /\/api\/ai-reviewer/g
];

let foundAt = [];
funcPatterns.forEach(pattern => {
  let match;
  while ((match = pattern.exec(content)) !== null) {
    foundAt.push({ index: match.index, text: match[0] });
  }
});

console.log('\n📍 Locais encontrados:');
foundAt.forEach(f => {
  const lineNum = content.slice(0, f.index).split('\n').length;
  console.log(`   Linha ${lineNum}: ${f.text}`);
});

// Encontrar o bloco completo da função
const aiReviewFuncStart = content.indexOf('const generateAIReview') || 
                          content.indexOf('const handleAIReview') ||
                          content.indexOf('const requestAIReview') ||
                          content.indexOf('const fetchAIReview');

if (aiReviewFuncStart === -1) {
  // Tentar encontrar pela chamada fetch
  const fetchIndex = content.indexOf("fetch('/api/ai-reviewer'") || 
                     content.indexOf('fetch("/api/ai-reviewer"') ||
                     content.indexOf('fetch(`/api/ai-reviewer`');
  
  if (fetchIndex > 0) {
    const lineNum = content.slice(0, fetchIndex).split('\n').length;
    console.log(`\n📌 Chamada fetch encontrada na linha ${lineNum}`);
    
    // Extrair contexto
    const start = Math.max(0, fetchIndex - 500);
    const end = Math.min(content.length, fetchIndex + 1000);
    const context = content.slice(start, end);
    
    console.log('\n📄 Contexto da chamada:');
    console.log('─'.repeat(60));
    console.log(context);
    console.log('─'.repeat(60));
  }
}

// Agora vamos corrigir o problema
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔧 APLICANDO CORREÇÃO');
console.log('═══════════════════════════════════════════════════════════════\n');

// Padrão do body incorreto (sem os campos necessários)
const oldBodyPatterns = [
  // Padrão 1: body vazio ou mínimo
  /body:\s*JSON\.stringify\s*\(\s*\{\s*\}\s*\)/g,
  // Padrão 2: apenas com calculation
  /body:\s*JSON\.stringify\s*\(\s*calculation\s*\)/g,
  /body:\s*JSON\.stringify\s*\(\s*\{\s*\.\.\.calculation\s*\}\s*\)/g,
];

// Novo body completo
const newBody = `body: JSON.stringify({
            projectName: project?.name || 'Projeto sem nome',
            projectDescription: project?.description || '',
            alternatives: project?.alternatives || [],
            bocrWeights: calculation.bocrWeights,
            bocrConsistency: calculation.bocrConsistency,
            subWeights: calculation.subWeights || {},
            subConsistency: calculation.subConsistency || {},
            finalScores: calculation.finalScores,
            responseCount: calculation.responseCount || 0,
            sensitivityInflections: calculation.sensitivityInflections || {},
            individualStats: qualityAnalysis?.respondents ? {
              total: qualityAnalysis.respondents.length,
              valid: qualityAnalysis.respondents.filter((r: any) => r.status === 'CONFIÁVEL').length,
              warning: qualityAnalysis.respondents.filter((r: any) => r.status === 'REVISAR' || r.status === 'SUSPEITO').length,
              critical: qualityAnalysis.respondents.filter((r: any) => r.status === 'CRÍTICO').length,
              avgCR: qualityAnalysis.respondents.reduce((sum: number, r: any) => sum + (r.metrics?.avgCR || 0), 0) / qualityAnalysis.respondents.length
            } : undefined
          })`;

// Tentar encontrar e substituir padrões específicos
let replaced = false;

// Padrão mais provável: body com spread de calculation mas sem project
const spreadPattern = /body:\s*JSON\.stringify\s*\(\s*\{[^}]*?\.\.\.calculation[^}]*?\}\s*\)/gs;
if (spreadPattern.test(content)) {
  content = content.replace(spreadPattern, newBody);
  replaced = true;
  console.log('✅ Padrão com spread substituído');
}

// Se não encontrou, procurar pelo padrão com apenas alguns campos
if (!replaced) {
  const partialPattern = /body:\s*JSON\.stringify\s*\(\s*\{[^}]*finalScores[^}]*\}\s*\)/gs;
  if (partialPattern.test(content)) {
    content = content.replace(partialPattern, newBody);
    replaced = true;
    console.log('✅ Padrão parcial substituído');
  }
}

// Se ainda não encontrou, procurar por qualquer body na chamada ai-reviewer
if (!replaced) {
  // Encontrar o bloco da função que contém a chamada
  const funcStart = content.search(/const\s+\w+\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^]*?\/api\/ai-reviewer/);
  
  if (funcStart > 0) {
    // Encontrar o body dentro dessa função
    const funcEnd = content.indexOf('};', funcStart + 100);
    const funcContent = content.slice(funcStart, funcEnd + 2);
    
    const bodyInFunc = funcContent.match(/body:\s*JSON\.stringify\s*\([^)]+\)/s);
    if (bodyInFunc) {
      const newFuncContent = funcContent.replace(bodyInFunc[0], newBody);
      content = content.slice(0, funcStart) + newFuncContent + content.slice(funcEnd + 2);
      replaced = true;
      console.log('✅ Body dentro da função substituído');
    }
  }
}

// Salvar se houve alteração
if (content !== original) {
  const backupPath = pagePath + '.backup-aifix-' + Date.now();
  fs.writeFileSync(backupPath, original);
  console.log('📦 Backup criado:', backupPath);
  
  fs.writeFileSync(pagePath, content);
  console.log('💾 Arquivo salvo com correções!\n');
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✨ CORREÇÃO APLICADA!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nAgora execute:');
  console.log('   npm run build && vercel --prod\n');
} else {
  console.log('⚠️ Não foi possível aplicar correção automática.\n');
  console.log('📋 CORREÇÃO MANUAL NECESSÁRIA:');
  console.log('─'.repeat(60));
  console.log(`
Na page.tsx, encontre a função que chama /api/ai-reviewer e altere o body para:

${newBody}

Campos OBRIGATÓRIOS:
- projectName: nome do projeto
- alternatives: array de alternativas  
- bocrWeights: array de pesos BOCR
- finalScores: array de scores finais
`);
}
