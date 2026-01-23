// instalar-page-debug.js
// Execute com: node instalar-page-debug.js
// Instala o page.tsx com logs de debug para diagnosticar a Revisão IA

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 INSTALANDO PAGE.TSX COM LOGS DE DEBUG');
console.log('═══════════════════════════════════════════════════════════════\n');

const sourcePath = path.join(__dirname, 'page-debug.tsx');
const targetPath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');

if (!fs.existsSync(sourcePath)) {
  console.error('❌ Arquivo page-debug.tsx não encontrado');
  console.log('   Certifique-se de baixar o arquivo e colocá-lo na raiz do projeto.\n');
  process.exit(1);
}

// Backup
if (fs.existsSync(targetPath)) {
  const backupPath = targetPath + '.backup-' + Date.now();
  fs.copyFileSync(targetPath, backupPath);
  console.log('📦 Backup criado');
}

// Copiar
fs.copyFileSync(sourcePath, targetPath);
console.log('✅ page.tsx instalado com logs de debug!\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 Agora execute:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n   npm run build && vercel --prod\n');
console.log('Depois de fazer deploy:');
console.log('   1. Abra o Console (F12)');
console.log('   2. Clique em "Executar Revisão IA"');
console.log('   3. Procure por logs [AI-REVIEW]\n');
