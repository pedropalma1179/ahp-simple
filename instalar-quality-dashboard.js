// instalar-quality-dashboard.js
// Execute com: node instalar-quality-dashboard.js
// Instala o novo Dashboard de Qualidade com UI moderna

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🎨 INSTALADOR DO QUALITY DASHBOARD (UI MODERNA)');
console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================
// PASSO 1: Salvar o componente
// ============================================================

const componentsDir = path.join(__dirname, 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

// Ler o componente se existir localmente ou usar o código embutido
const componentPath = path.join(componentsDir, 'QualityDashboard.tsx');

// O código está muito grande, então vamos apenas verificar se já existe
if (fs.existsSync(componentPath)) {
  console.log('✅ PASSO 1: QualityDashboard.tsx já existe\n');
} else {
  console.log('❌ PASSO 1: QualityDashboard.tsx não encontrado');
  console.log('   Por favor, salve o arquivo QualityDashboard.tsx na pasta components/\n');
  process.exit(1);
}

// ============================================================
// PASSO 2: Atualizar page.tsx
// ============================================================

console.log('📝 PASSO 2: Atualizando page.tsx...\n');

const pagePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error('❌ page.tsx não encontrado');
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf8');
const backup = content;

// 2.1 Verificar/adicionar import do QualityDashboard
if (!content.includes("import QualityDashboard")) {
  // Encontrar última linha de import
  const importMatch = content.match(/^import .+ from .+;$/gm);
  if (importMatch) {
    const lastImport = importMatch[importMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
    
    const newImport = "\nimport QualityDashboard from '@/components/QualityDashboard';";
    content = content.slice(0, lastImportIndex) + newImport + content.slice(lastImportIndex);
    console.log('   ✅ Import QualityDashboard adicionado');
  }
}

// Remover import antigo se existir
if (content.includes("import QualityAnalysisWithFilter")) {
  content = content.replace(/import QualityAnalysisWithFilter from .+;\n?/g, '');
  console.log('   ✅ Import antigo removido');
}

// 2.2 Verificar/adicionar useMemo qualityRespondentsData
if (!content.includes('qualityRespondentsData')) {
  const memoCode = `

  // Dados formatados para o Dashboard de Qualidade
  const qualityRespondentsData = useMemo(() => {
    if (!qualityAnalysis?.respondents) return [];
    return qualityAnalysis.respondents.map((r: any) => ({
      id: r.respondentId || r.id || String(Math.random()),
      cr: r.metrics?.avgCR || 0,
      status: r.status || 'REVISAR',
      overallScore: r.overallScore || 0,
      isSimulated: r.isSimulated || false,
      metrics: r.metrics,
      flags: r.flags || []
    }));
  }, [qualityAnalysis]);
`;

  const insertPoint = content.indexOf('}, [respondentsDemographics]);');
  if (insertPoint > 0) {
    const pos = insertPoint + '}, [respondentsDemographics]);'.length;
    content = content.slice(0, pos) + memoCode + content.slice(pos);
    console.log('   ✅ useMemo qualityRespondentsData adicionado');
  }
}

// 2.3 Substituir componente antigo pelo novo na TAB quality
// Procurar por QualityAnalysisWithFilter e substituir por QualityDashboard
if (content.includes('<QualityAnalysisWithFilter')) {
  content = content.replace(
    /<QualityAnalysisWithFilter\s+respondents={qualityRespondentsData[^}]*}\s*\/>/g,
    '<QualityDashboard respondents={qualityRespondentsData || []} />'
  );
  console.log('   ✅ Componente substituído de QualityAnalysisWithFilter para QualityDashboard');
}

// Se não tinha o componente antigo, adicionar o novo
if (!content.includes('<QualityDashboard') && !content.includes('<QualityAnalysisWithFilter')) {
  const searchStr = '{qualityAnalysis && (';
  const idx = content.indexOf(searchStr);
  
  if (idx > 0) {
    const fragStart = content.indexOf('<>', idx);
    if (fragStart > 0 && fragStart < idx + 100) {
      const insertPos = fragStart + 2;
      const componentCode = `
                {/* Dashboard de Qualidade Interativo */}
                <QualityDashboard respondents={qualityRespondentsData || []} />
`;
      content = content.slice(0, insertPos) + componentCode + content.slice(insertPos);
      console.log('   ✅ QualityDashboard inserido na TAB quality');
    }
  }
}

// Salvar se houve alteração
if (content !== backup) {
  const backupPath = pagePath + '.backup-dashboard-' + Date.now();
  fs.writeFileSync(backupPath, backup);
  console.log('\n   📦 Backup: ' + backupPath);
  
  fs.writeFileSync(pagePath, content);
  console.log('   💾 page.tsx salvo!\n');
} else {
  console.log('   ⚠️ Nenhuma alteração necessária no page.tsx\n');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('✨ INSTALAÇÃO CONCLUÍDA!');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n📋 Próximos passos:');
console.log('   1. Certifique-se que QualityDashboard.tsx está em components/');
console.log('   2. Execute: npm run dev');
console.log('   3. Acesse: http://localhost:3000');
console.log('   4. Navegue: Resultados → Aba "Qualidade"\n');
console.log('🎨 Novo Design:');
console.log('   • Sticky Header com estatísticas de impacto');
console.log('   • Botão "Auto-Excluir Suspeitos"');
console.log('   • Agrupamento: Atenção Requerida vs Confiáveis');
console.log('   • Barras de progresso visuais para CR');
console.log('   • Toggle switches modernos\n');
