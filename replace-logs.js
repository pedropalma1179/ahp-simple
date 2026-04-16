const fs = require('fs');

const path = 'app/api/ai-reviewer/route.ts';
let content = fs.readFileSync(path, 'utf8');

// CORREÇÃO 2 — Atualizar header
content = content.replace(
  /\/\/ API de Revisão IA v6\.6\.0 - PEER REVIEW ACADÊMICO A1\/Q1/,
  '// API de Revisão IA - PEER REVIEW ACADÊMICO A1/Q1\n// Versão: ver constante API_VERSION abaixo'
);
content = content.replace(
  /\/\/ Features: Análise Qualitativa Profunda \+ RAG \+ Detecção de Viés \(Dodevska et al., 2023\)/,
  '// Features: Análise Qualitativa Profunda + RAG + Detecção de Viés (Dodevska et al., 2023) + Anti-Alucinação'
);

// CORREÇÃO 1 — Adicionar constantes
const versionBlock = `// ============================================================
// VERSÃO E LOGGING (fonte única de verdade)
// ============================================================
const API_VERSION = '7.1.6';
const API_TAG = 'anti-hallucination-v2';
const LOG_PREFIX = \`[AI-REVIEWER v\${API_VERSION}]\`;

`;
content = content.replace(
  /(\/\/ ============================================================\r?\n\/\/ SAFE FORMATTING HELPERS)/,
  versionBlock + '$1'
);

// CORREÇÃO 5 — Atualizar comentários
content = content.replace(/\/\/ SAFE FORMATTING HELPERS \(v7\.1\.1-safefixed\)/g, '// SAFE FORMATTING HELPERS');
content = content.replace(/\/\/ RAG INJECTION \(v7\.0\)/g, '// RAG INJECTION');
// Replaces specifically 'CORREÇÃO vX.Y: ' with just the rest
content = content.replace(/\/\/ CORREÇÃO v6\.5: Usar statistics\.byStatus como fonte primária/g, '// Usar statistics.byStatus como fonte primária');
// To catch any other occurrences of v6.5 inside comments that weren't strictly listed but exist like "CORREÇÃO v6.5: Garantir...", we can replace them too to be safe, but let's stick to the prompt's exact table.
const replaces = [
  ['// SAFE FORMATTING HELPERS (v7.1.1-safefixed)', '// SAFE FORMATTING HELPERS'],
  ['// RAG INJECTION (v7.0)', '// RAG INJECTION'],
  ['// CORREÇÃO v6.5: Usar statistics.byStatus como fonte primária', '// Usar statistics.byStatus como fonte primária'],
  ['// ANTI-ALUCINAÇÃO v7.1: Lista completa de respondentes', '// ANTI-ALUCINAÇÃO: Lista completa de respondentes'],
  ['// ANTI-ALUCINAÇÃO v7.1: Fórmula completa com v e s', '// ANTI-ALUCINAÇÃO: Fórmula completa com v e s'],
  ['// ANTI-ALUCINAÇÃO v7.1: Ranking final das alternativas', '// ANTI-ALUCINAÇÃO: Ranking final das alternativas'],
  ['// ANTI-ALUCINAÇÃO v7.1: Validação pós-geração', '// ANTI-ALUCINAÇÃO: Validação pós-geração'],
  ['// VALIDAÇÃO PÓS-GERAÇÃO (Anti-Alucinação v7.1)', '// VALIDAÇÃO PÓS-GERAÇÃO (Anti-Alucinação)']
];
replaces.forEach(r => {
  content = content.split(r[0]).join(r[1]);
});

// Outros cosméticos que as vezes sobram
content = content.replace(/\/\/ ANTI-ALUCINAÇÃO v7\.1/g, '// ANTI-ALUCINAÇÃO');
content = content.replace(/\/\/ CORREÇÃO v6\.5/g, '// CORREÇÃO');


// CORREÇÃO 3 — Substituir todos os prefixos de log
// For backticks: `[AI-REVIEWER v6.5] ...` -> `${LOG_PREFIX} ...`
content = content.replace(/`\[AI-REVIEWER v(?:6\.5|6\.6\.0|7\.1|7\.1\.2|7\.1\.3|7\.1\.5)\]/g, '`${LOG_PREFIX}');

// For single quotes: '[AI-REVIEWER v6.5] ...' -> `${LOG_PREFIX} ...`
content = content.replace(/'\[AI-REVIEWER v(?:6\.5|6\.6\.0|7\.1|7\.1\.2|7\.1\.3|7\.1\.5)\]([^']*)'/g, '`${LOG_PREFIX}$1`');

// For any rogue double quotes
content = content.replace(/"\[AI-REVIEWER v(?:6\.5|6\.6\.0|7\.1|7\.1\.2|7\.1\.3|7\.1\.5)\]([^"]*)"/g, '`${LOG_PREFIX}$1`');


// CORREÇÃO 4 — Atualizar campos version nos responses
content = content.replace(/version:\s*'6\.6\.0-bias',/g, 'version: `${API_VERSION}-${API_TAG}`,');
content = content.replace(/version:\s*'7\.1\.5-multi-score-keys',/g, 'version: `${API_VERSION}-${API_TAG}`,');

fs.writeFileSync(path, content, 'utf8');

console.log('Script concluded successfully.');
