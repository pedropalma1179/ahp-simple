const fs = require('fs');
const path = './app/decisor/resultados/[projectId]/page.tsx';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

console.log(`Total de linhas: ${lines.length}`);

// Procura pela função export default
const exportIdx = lines.findIndex(l => l.includes('export default function ResultadosPage'));
console.log(`export default encontrado na linha ${exportIdx + 1}`);

// Procura por return (
const returnIdx = lines.findIndex((l, i) => i > exportIdx && l.trim() === 'return (');
console.log(`return ( encontrado na linha ${returnIdx + 1}`);

// Tenta encontrar a linha onde fecha a return - deve ser }); logo antes do final da função
// Procurar de trás para frente pelo último )}; 
let lastReturn = -1;
for (let i = lines.length - 1; i > returnIdx; i--) {
  if (lines[i].trim() === ');') {
    lastReturn = i;
    console.log(`Encontrado ); na linha ${i + 1}`);
    break;
  }
}

if (lastReturn > 0) {
  const truncated = lines.slice(0, lastReturn + 1).join('\n') + '\n';
  fs.writeFileSync(path, truncated, 'utf8');
  console.log(`✓ Truncado até linha ${lastReturn + 1}`);
  console.log(`Novas linhas: ${truncated.split('\n').length}`);
}
