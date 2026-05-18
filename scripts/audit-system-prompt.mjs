// scripts/audit-system-prompt.mjs
// Phase 7.2 v8.1.6 — exporta o SYSTEM_PROMPT renderizado para auditoria

import { buildSystemPrompt, API_VERSION } from '../app/api/generate-academic/system-prompt.ts';
import fs from 'fs';

console.log('API_VERSION:', API_VERSION);
console.log('');

// Cenario 1: sem validacao externa, sem exclusao, sem criticos (caso comum HMCSA)
const promptDefault = buildSystemPrompt({});
fs.writeFileSync('SYSTEM_PROMPT_AUDIT_default.md', promptDefault, 'utf8');
console.log('Cenario DEFAULT escrito em SYSTEM_PROMPT_AUDIT_default.md');
console.log('Tamanho:', promptDefault.length, 'chars');
console.log('Linhas:', promptDefault.split('\n').length);

// Cenario 2: com validacao externa ativada
const promptWithValidation = buildSystemPrompt({ hasExternalValidation: true });
fs.writeFileSync('SYSTEM_PROMPT_AUDIT_externalvalidation.md', promptWithValidation, 'utf8');
console.log('');
console.log('Cenario EXTERNAL_VALIDATION escrito em SYSTEM_PROMPT_AUDIT_externalvalidation.md');
console.log('Tamanho:', promptWithValidation.length, 'chars');
