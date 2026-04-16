const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

let functionStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function ResultadosPage')) {
    functionStart = i;
    break;
  }
}

let parenBalance = 0;
let braceBalance = 0;
let lastUnbalancedLine = -1;
let unbalancedDetails = null;

for (let i = functionStart; i < lines.length; i++) {
  const line = lines[i];
  let j = 0;
  
  while (j < line.length) {
    const char = line[j];
    
    // Ignorar strings
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      j++;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      j++;
      continue;
    }
    
    // Ignorar comentários de linha
    if (char === '/' && j + 1 < line.length && line[j + 1] === '/') {
      break;
    }
    
    // Ignorar comentários de bloco
    if (char === '/' && j + 1 < line.length && line[j + 1] === '*') {
      j += 2;
      while (j < line.length - 1) {
        if (line[j] === '*' && line[j + 1] === '/') {
          j += 2;
          break;
        }
        j++;
      }
      continue;
    }
    
    if (char === '(') parenBalance++;
    if (char === ')') parenBalance--;
    if (char === '{') braceBalance++;
    if (char === '}') braceBalance--;
    
    // Registrar se ficar desbalanceado
    if (parenBalance < 0 || braceBalance < 0) {
      if (!unbalancedDetails) {
        unbalancedDetails = { line: i + 1, char: char, paren: parenBalance, brace: braceBalance };
      }
    }
    
    if (parenBalance < 0 || braceBalance < 0) {
      lastUnbalancedLine = i;
    }
    
    j++;
  }
  
  // Print a cada 200 linhas da função para debug
  if ((i - functionStart) % 200 === 0 && i > functionStart) {
    console.log(`Linha ${i + 1}: paren=${parenBalance}, brace=${braceBalance}`);
  }
}

console.log(`\n=== RESULTADO FINAL ===`);
console.log(`Total de linhas: ${lines.length}`);
console.log(`Função começa: Linha ${functionStart + 1}`);
console.log(`Função termina: Linha ${lines.length}`);
console.log(`\nBalance final:`);
console.log(`  Parênteses: ${parenBalance} (esperado: 0)`);
console.log(`  Chaves: ${braceBalance} (esperado: 0)`);

if (unbalancedDetails) {
  console.log(`\n❌ DESBALANCEAMENTO DETECTADO`);
  console.log(`Primeira linha com problema: ${unbalancedDetails.line}`);
  console.log(`Caractere problemático: '${unbalancedDetails.char}'`);
  console.log(`Balance naquele ponto: paren=${unbalancedDetails.paren}, brace=${unbalancedDetails.brace}`);
  
  const problemLine = unbalancedDetails.line - 1;
  console.log(`\nContexto (linhas ${Math.max(1, problemLine - 2)} a ${problemLine + 2}):`);
  for (let k = Math.max(functionStart, problemLine - 2); k <= Math.min(lines.length - 1, problemLine + 2); k++) {
    const marker = k === problemLine ? ' >>> ' : '     ';
    console.log(`${marker}${k + 1}: ${lines[k]}`);
  }
}
