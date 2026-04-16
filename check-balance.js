const fs = require('fs');
const content = fs.readFileSync('./app/decisor/resultados/[projectId]/page.tsx', 'utf8');
const lines = content.split(/\r?\n/);

// Contar parênteses/chaves/colchetes abertos/fechados
let openParen = 0, closeParen = 0;
let openBrace = 0, closeBrace = 0;
let openBracket = 0, closeBracket = 0;

let lastUnbalancedLine = 0;

lines.forEach((line, i) => {
  if (i < 1700 || i > 1750) return; // Procurar na região do problema
  
  // Contar ignorando strings e comentários
  let inString = false;
  let stringChar = '';
  let inComment = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prev = j > 0 ? line[j-1] : '';
    const next = j < line.length - 1 ? line[j+1] : '';
    
    if (!inString && !inComment) {
      if ((char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (char === '/' && next === '/') {
        inComment = true;
        j = line.length; // Skip rest of line
      } else {
        if (char === '(') openParen++;
        else if (char === ')') closeParen++;
        else if (char === '{') openBrace++;
        else if (char === '}') closeBrace++;
        else if (char === '[') openBracket++;
        else if (char === ']') closeBracket++;
      }
    } else if (inString && char === stringChar && prev !== '\\') {
      inString = false;
    }
  }
  
  const balance = openParen - closeParen + openBrace - closeBrace + openBracket - closeBracket;
  if (balance !== 0) {
    console.log(`Linha ${i + 1}: balance=${balance} | open=( ${openParen}  { ${openBrace}  [ ${openBracket} | close=) ${closeParen}  } ${closeBrace}  ] ${closeBracket}`);
    lastUnbalancedLine = i;
  }
});

console.log(`\nÚltima linha desbalanceada: ${lastUnbalancedLine + 1}`);
