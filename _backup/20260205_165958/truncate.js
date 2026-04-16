const fs = require('fs');
const path = 'C:\\AHP-BOCR\\ahp-simple\\app\\decisor\\resultados\\[projectId]\\page.tsx';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
console.log(`Total de linhas: ${lines.length}`);

// Encontrar índice do fechamento de função (}) por volta de linha 2224
let closeIdx = -1;
for (let i = 2220; i < Math.min(2230, lines.length); i++) {
  if (lines[i].trim() === '}') {
    closeIdx = i;
    break;
  }
}

console.log(`Índice da função close: ${closeIdx}`);

if (closeIdx >= 0) {
  const truncated = lines.slice(0, closeIdx + 1).join('\n') + '\n';
  fs.writeFileSync(path, truncated, 'utf8');
  const newLines = truncated.split('\n').length;
  console.log(`✓ Arquivo salvo! Novas linhas: ${newLines}`);
} else {
  console.log('⚠ Não encontrado linha de fechamento, cortando em 2224');
  const truncated = lines.slice(0, 2224).join('\n') + '\n';
  fs.writeFileSync(path, truncated, 'utf8');
  console.log(`✓ Truncado para 2224 linhas`);
}
