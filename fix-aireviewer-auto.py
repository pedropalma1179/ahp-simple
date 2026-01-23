#!/usr/bin/env python3
"""
Script para atualizar AIReviewCard.tsx para compatibilidade com API v6.4.5
Uso: python fix-aireviewer-auto.py
"""

import os
import re
from pathlib import Path

def fix_aireviewer_card():
    # Caminho do arquivo
    file_path = Path("components/AIReviewCard.tsx")
    
    if not file_path.exists():
        print(f"❌ Erro: Arquivo não encontrado: {file_path}")
        print("   Execute este script na raiz do projeto: C:\\AHP-BOCR\\ahp-simple")
        return False
    
    print("📂 Lendo arquivo:", file_path)
    
    # Ler conteúdo do arquivo
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fazer backup
    backup_path = file_path.with_suffix('.tsx.backup-v645')
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Backup criado: {backup_path}")
    
    # Contador de mudanças
    changes = 0
    
    # MUDANÇA 1: Adicionar texto_completo e version no tipo AIReviewResponse
    if 'texto_completo?: string;' not in content:
        # Procurar a linha com resumo_executivo e adicionar depois
        pattern = r'(interface AIReviewResponse \{[^}]*resumo_executivo\?: string;)'
        replacement = r'\1\n  \n  // NOVO v6.4.5: Campo unificado com markdown completo\n  texto_completo?: string;\n  version?: string;'
        
        new_content = re.sub(pattern, replacement, content, count=1)
        if new_content != content:
            content = new_content
            changes += 1
            print("✅ Mudança 1: Adicionado tipo texto_completo")
        else:
            print("⚠️  Mudança 1: Não foi possível adicionar tipo (pode já existir)")
    else:
        print("⏭️  Mudança 1: texto_completo já existe no tipo")
    
    # MUDANÇA 2: Seção do resumo - linha ~627
    pattern2 = r'\{aiReview\.resumo_executivo && \('
    replacement2 = r'{(aiReview.texto_completo || aiReview.resumo_executivo) && ('
    
    new_content = re.sub(pattern2, replacement2, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 2: Atualizado condição do resumo")
    else:
        print("⚠️  Mudança 2: Já estava correta ou não encontrada")
    
    # MUDANÇA 3: MarkdownRenderer no resumo
    pattern3 = r'<MarkdownRenderer content=\{aiReview\.resumo_executivo\} />'
    replacement3 = r'<MarkdownRenderer content={aiReview.texto_completo || aiReview.resumo_executivo || \'\'} />'
    
    new_content = re.sub(pattern3, replacement3, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 3: Atualizado MarkdownRenderer do resumo")
    else:
        print("⚠️  Mudança 3: Já estava correta ou não encontrada")
    
    # MUDANÇA 4: Seção Parecer Completo - condição
    pattern4 = r'\{aiReview\.observacoes_revisor && \('
    replacement4 = r'{(aiReview.texto_completo || aiReview.observacoes_revisor) && ('
    
    new_content = re.sub(pattern4, replacement4, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 4: Atualizado condição do Parecer Completo")
    else:
        print("⚠️  Mudança 4: Já estava correta ou não encontrada")
    
    # MUDANÇA 5: MarkdownRenderer no Parecer Completo
    pattern5 = r'<MarkdownRenderer content=\{aiReview\.observacoes_revisor\} />'
    replacement5 = r'<MarkdownRenderer content={aiReview.texto_completo || aiReview.observacoes_revisor || \'\'} />'
    
    new_content = re.sub(pattern5, replacement5, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 5: Atualizado MarkdownRenderer do Parecer Completo")
    else:
        print("⚠️  Mudança 5: Já estava correta ou não encontrada")
    
    # MUDANÇA 6: Botão copiar - usar texto_completo
    pattern6 = r"navigator\.clipboard\.writeText\(aiReview\.observacoes_revisor\);"
    replacement6 = r"navigator.clipboard.writeText(aiReview.texto_completo || aiReview.observacoes_revisor || '');"
    
    new_content = re.sub(pattern6, replacement6, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 6: Atualizado botão copiar")
    else:
        print("⚠️  Mudança 6: Já estava correta ou não encontrada")
    
    # MUDANÇA 7: Footer - atualizar versão
    pattern7 = r'🎓 Revisão por Professor Titular \(IA v6\.1\)'
    replacement7 = r'🎓 Revisão Acadêmica A1/Q1 (API v{aiReview.version || aiReview.metadata?.version || \'6.4.5\'})'
    
    new_content = re.sub(pattern7, replacement7, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 7: Atualizado footer para mostrar versão")
    else:
        print("⚠️  Mudança 7: Já estava correta ou não encontrada")
    
    # MUDANÇA 8: Título da seção - "Revisão Acadêmica Completa"
    pattern8 = r'📝 Parecer Completo do Revisor'
    replacement8 = r'📝 Revisão Acadêmica Completa'
    
    new_content = re.sub(pattern8, replacement8, content)
    if new_content != content:
        content = new_content
        changes += 1
        print("✅ Mudança 8: Atualizado título da seção")
    else:
        print("⚠️  Mudança 8: Já estava correta")
    
    # Salvar arquivo modificado
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n" + "="*60)
    print(f"✅ CONCLUÍDO! {changes} mudanças aplicadas")
    print("="*60)
    print(f"📁 Arquivo atualizado: {file_path}")
    print(f"💾 Backup salvo em: {backup_path}")
    print("\nPróximos passos:")
    print("  1. npm run build")
    print("  2. vercel --prod")
    print("\n✨ AIReviewCard.tsx agora é compatível com API v6.4.5!")
    
    return True

if __name__ == "__main__":
    print("="*60)
    print("  FIX AIReviewCard.tsx - Compatibilidade v6.4.5")
    print("="*60)
    print()
    
    success = fix_aireviewer_card()
    
    if not success:
        exit(1)
