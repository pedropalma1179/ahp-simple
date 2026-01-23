#!/usr/bin/env node
/**
 * Script para atualizar AIReviewCard.tsx para compatibilidade com API v6.4.5
 * Uso: node fix-aireviewer-auto.js
 */

const fs = require('fs');
const path = require('path');

function fixAIReviewerCard() {
  // Caminho do arquivo
  const filePath = path.join('components', 'AIReviewCard.tsx');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Erro: Arquivo não encontrado: ${filePath}`);
    console.log('   Execute este script na raiz do projeto: C:\\AHP-BOCR\\ahp-simple');
    return false;
  }
  
  console.log('📂 Lendo arquivo:', filePath);
  
  // Ler conteúdo do arquivo
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fazer backup
  const backupPath = filePath + '.backup-v645';
  fs.writeFileSync(backupPath, content, 'utf-8');
  console.log(`✅ Backup criado: ${backupPath}`);
  
  // Contador de mudanças
  let changes = 0;
  
  // MUDANÇA 1: Adicionar texto_completo e version no tipo AIReviewResponse
  if (!content.includes('texto_completo?: string;')) {
    const pattern = /(interface AIReviewResponse \{[^}]*resumo_executivo\?: string;)/;
    const replacement = '$1\n  \n  // NOVO v6.4.5: Campo unificado com markdown completo\n  texto_completo?: string;\n  version?: string;';
    
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changes++;
      console.log('✅ Mudança 1: Adicionado tipo texto_completo');
    } else {
      console.log('⚠️  Mudança 1: Não foi possível adicionar tipo (pode já existir)');
    }
  } else {
    console.log('⏭️  Mudança 1: texto_completo já existe no tipo');
  }
  
  // MUDANÇA 2: Seção do resumo - condição
  const pattern2 = /\{aiReview\.resumo_executivo && \(/g;
  const replacement2 = '{(aiReview.texto_completo || aiReview.resumo_executivo) && (';
  
  let newContent = content.replace(pattern2, replacement2);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 2: Atualizado condição do resumo');
  } else {
    console.log('⚠️  Mudança 2: Já estava correta ou não encontrada');
  }
  
  // MUDANÇA 3: MarkdownRenderer no resumo
  const pattern3 = /<MarkdownRenderer content=\{aiReview\.resumo_executivo\} \/>/g;
  const replacement3 = '<MarkdownRenderer content={aiReview.texto_completo || aiReview.resumo_executivo || \'\'} />';
  
  newContent = content.replace(pattern3, replacement3);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 3: Atualizado MarkdownRenderer do resumo');
  } else {
    console.log('⚠️  Mudança 3: Já estava correta ou não encontrada');
  }
  
  // MUDANÇA 4: Seção Parecer Completo - condição
  const pattern4 = /\{aiReview\.observacoes_revisor && \(/g;
  const replacement4 = '{(aiReview.texto_completo || aiReview.observacoes_revisor) && (';
  
  newContent = content.replace(pattern4, replacement4);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 4: Atualizado condição do Parecer Completo');
  } else {
    console.log('⚠️  Mudança 4: Já estava correta ou não encontrada');
  }
  
  // MUDANÇA 5: MarkdownRenderer no Parecer Completo
  const pattern5 = /<MarkdownRenderer content=\{aiReview\.observacoes_revisor\} \/>/g;
  const replacement5 = '<MarkdownRenderer content={aiReview.texto_completo || aiReview.observacoes_revisor || \'\'} />';
  
  newContent = content.replace(pattern5, replacement5);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 5: Atualizado MarkdownRenderer do Parecer Completo');
  } else {
    console.log('⚠️  Mudança 5: Já estava correta ou não encontrada');
  }
  
  // MUDANÇA 6: Botão copiar - usar texto_completo
  const pattern6 = /navigator\.clipboard\.writeText\(aiReview\.observacoes_revisor\);/g;
  const replacement6 = 'navigator.clipboard.writeText(aiReview.texto_completo || aiReview.observacoes_revisor || \'\');';
  
  newContent = content.replace(pattern6, replacement6);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 6: Atualizado botão copiar');
  } else {
    console.log('⚠️  Mudança 6: Já estava correta ou não encontrada');
  }
  
  // MUDANÇA 7: Footer - atualizar versão
  const pattern7 = /🎓 Revisão por Professor Titular \(IA v6\.1\)/g;
  const replacement7 = '🎓 Revisão Acadêmica A1/Q1 (API v{aiReview.version || aiReview.metadata?.version || \'6.4.5\'})';
  
  newContent = content.replace(pattern7, replacement7);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 7: Atualizado footer para mostrar versão');
  } else {
    console.log('⚠️  Mudança 7: Já estava correta ou não encontrada');
  }
  
  // MUDANÇA 8: Título da seção
  const pattern8 = /📝 Parecer Completo do Revisor/g;
  const replacement8 = '📝 Revisão Acadêmica Completa';
  
  newContent = content.replace(pattern8, replacement8);
  if (newContent !== content) {
    content = newContent;
    changes++;
    console.log('✅ Mudança 8: Atualizado título da seção');
  } else {
    console.log('⚠️  Mudança 8: Já estava correta');
  }
  
  // Salvar arquivo modificado
  fs.writeFileSync(filePath, content, 'utf-8');
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ CONCLUÍDO! ${changes} mudanças aplicadas`);
  console.log('='.repeat(60));
  console.log(`📁 Arquivo atualizado: ${filePath}`);
  console.log(`💾 Backup salvo em: ${backupPath}`);
  console.log('\nPróximos passos:');
  console.log('  1. npm run build');
  console.log('  2. vercel --prod');
  console.log('\n✨ AIReviewCard.tsx agora é compatível com API v6.4.5!');
  
  return true;
}

console.log('='.repeat(60));
console.log('  FIX AIReviewCard.tsx - Compatibilidade v6.4.5');
console.log('='.repeat(60));
console.log();

const success = fixAIReviewerCard();

if (!success) {
  process.exit(1);
}
