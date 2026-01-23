// instalar-aireviewcard-corrigido.js
// Execute com: node instalar-aireviewcard-corrigido.js
// Substitui o AIReviewCard.tsx com as 3 correções críticas

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 INSTALANDO AIReviewCard.tsx CORRIGIDO v2.0');
console.log('═══════════════════════════════════════════════════════════════\n');

const sourcePath = path.join(__dirname, 'AIReviewCard-corrigido.tsx');
const targetPath = path.join(__dirname, 'components', 'AIReviewCard.tsx');

// Verificar se o arquivo fonte existe
if (!fs.existsSync(sourcePath)) {
  console.error('❌ Arquivo AIReviewCard-corrigido.tsx não encontrado!');
  console.log('   Certifique-se de que o arquivo está na pasta raiz.\n');
  process.exit(1);
}

// Criar pasta components se não existir
const componentsDir = path.dirname(targetPath);
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
  console.log('📁 Pasta components criada');
}

// Backup do arquivo existente
if (fs.existsSync(targetPath)) {
  const backupPath = targetPath + '.backup-' + Date.now();
  fs.copyFileSync(targetPath, backupPath);
  console.log('📦 Backup criado:', backupPath);
}

// Copiar novo arquivo
fs.copyFileSync(sourcePath, targetPath);
console.log('✅ AIReviewCard.tsx instalado com correções!\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('✨ CORREÇÕES APLICADAS:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🚨 CORREÇÃO 1: Regex Destrutivo REMOVIDO');
console.log('   - Antes: .replace(/\\d+[.,]\\d+%/g, ...) corrompendo dados');
console.log('   - Depois: Texto renderizado como está (backend já processou)\n');

console.log('🛠️  CORREÇÃO 2: Normalização de Strings APLICADA');
console.log('   - Antes: "Gas B " !== "Gas B" causava 4/5 em vez de 5/5');
console.log('   - Depois: normalize(s).trim().toLowerCase() para comparação\n');

console.log('👁️  CORREÇÃO 3: Quality Gate VISÍVEL');
console.log('   - Antes: Alerta escondido em texto pequeno');
console.log('   - Depois: Box vermelho proeminente no topo quando ativado\n');

console.log('📋 Agora execute:');
console.log('   npm run build && vercel --prod\n');
