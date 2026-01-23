// instalar-ai-reviewer-v6.js
// Execute com: node instalar-ai-reviewer-v6.js
// Instala a API de Revisão IA v6.0

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🤖 INSTALADOR DA API AI REVIEWER v6.0');
console.log('═══════════════════════════════════════════════════════════════\n');

const sourcePath = path.join(__dirname, 'ai-reviewer-v6-route.ts');
const targetPath = path.join(__dirname, 'app', 'api', 'ai-reviewer', 'route.ts');

// Verificar se o arquivo fonte existe
if (!fs.existsSync(sourcePath)) {
  console.error('❌ Arquivo ai-reviewer-v6-route.ts não encontrado!');
  console.log('   Certifique-se de que o arquivo está na pasta raiz do projeto.\n');
  process.exit(1);
}

// Verificar se o diretório de destino existe
const targetDir = path.dirname(targetPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('📁 Diretório criado:', targetDir);
}

// Fazer backup do arquivo existente
if (fs.existsSync(targetPath)) {
  const backupPath = targetPath + '.backup-v5-' + Date.now();
  fs.copyFileSync(targetPath, backupPath);
  console.log('📦 Backup criado:', backupPath);
}

// Copiar novo arquivo
fs.copyFileSync(sourcePath, targetPath);
console.log('✅ API v6.0 instalada:', targetPath);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✨ INSTALAÇÃO CONCLUÍDA!');
console.log('═══════════════════════════════════════════════════════════════');

console.log('\n📋 Novidades da v6.0:');
console.log('   • Quality Gate: Penaliza nota se >30% dos respondentes são ruins');
console.log('   • Tokenização: IA não decide mais a classificação (A/B/C)');
console.log('   • Paradoxo da Agregação: Detecta CR global bom com dados ruins');
console.log('   • Certificado Individual: Auditoria da qualidade por respondente');

console.log('\n📋 Como usar:');
console.log('   1. Execute: npm run dev');
console.log('   2. Navegue até: Resultados → Clique em "Revisão IA"');
console.log('   3. A API receberá automaticamente individualStats do qualityAnalysis');

console.log('\n⚠️  Para funcionar corretamente, o frontend deve enviar:');
console.log('   individualStats: { total, valid, warning, critical, avgCR? }');
console.log('   Isso vem do componente de Análise de Qualidade.\n');
