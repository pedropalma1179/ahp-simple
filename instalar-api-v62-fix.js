// instalar-api-v62-fix.js
// Execute com: node instalar-api-v62-fix.js
// Corrige o bug: Cannot read properties of undefined (reading 'B')

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 INSTALANDO API v6.2 - FIX BUG subConsistency');
console.log('═══════════════════════════════════════════════════════════════\n');

const sourcePath = path.join(__dirname, 'route-v62-fixed.ts');
const targetPath = path.join(__dirname, 'app', 'api', 'ai-reviewer', 'route.ts');

// Verificar se o arquivo fonte existe
if (!fs.existsSync(sourcePath)) {
  console.error('❌ Arquivo route-v62-fixed.ts não encontrado!');
  console.log('   Baixe o arquivo e coloque na raiz do projeto.\n');
  process.exit(1);
}

// Criar diretório se não existir
const targetDir = path.dirname(targetPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('📁 Diretório criado:', targetDir);
}

// Backup
if (fs.existsSync(targetPath)) {
  const backupPath = targetPath + '.backup-' + Date.now();
  fs.copyFileSync(targetPath, backupPath);
  console.log('📦 Backup criado');
}

// Copiar
fs.copyFileSync(sourcePath, targetPath);
console.log('✅ API v6.2 instalada!\n');

console.log('🐛 Bug corrigido:');
console.log('   - Cannot read properties of undefined (reading \'B\')');
console.log('   - subConsistency agora tem default para objeto vazio');
console.log('   - Verificação ?? 0 em todos os acessos a CR\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 Agora execute:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n   npm run build && vercel --prod\n');
