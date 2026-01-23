#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Limpeza - AHP-BOCR Project
====================================
Analisa e remove arquivos desnecessários do projeto.
Versão: 1.0
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Configuração do projeto
PROJECT_ROOT = Path(r"C:\AHP-BOCR\ahp-simple")

# ============================================================================
# DEFINIÇÃO DOS ARQUIVOS A EXCLUIR
# ============================================================================

FILES_TO_DELETE = {
    "API Routes Antigas (versões obsoletas)": [
        "audit-decision-route.ts",
        "audit-decision-route-fixed.ts",
        "audit-decision-route-v3.ts",
        "audit-decision-route-v4.ts",
        "audit-decision-v2-route.ts",
    ],
    
    "Páginas TSX Versionadas (já integradas em app/)": [
        "avaliacao-page-v2.tsx",
        "avaliacao-page-v5.tsx",
        "especialista-page.tsx",
        "page-home-atualizada.tsx",
        "projetos-page-refatorada.tsx",
        "projetos-page-v2.tsx",
        "projetos-page-v5.tsx",
        "generate-article-route-v2.ts",
    ],
    
    "Arquivos de Backup/Teste": [
        "backup-api-route.ts",
        "test-claude-route.ts",
        "data-v2.ts",
    ],
    
    "Arquivos Mal Posicionados (duplicados)": [
        "decisor-layout.tsx",
        "decisor-page-redirect.tsx",
        "unesp-seeklogo.png",  # Já existe em public/
        "mapa_projeto.txt",
    ],
}

FOLDERS_TO_DELETE = {
    "Pastas Temporárias": [
        "mnt",
    ],
}

# Arquivos que NÃO devem ser deletados (para referência)
FILES_TO_KEEP = [
    # Configurações essenciais
    ".gitignore",
    "next.config.js",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.js",
    "next-env.d.ts",
    
    # Documentação
    "README.md",
    "AI-AUDITOR-GUIDELINE.md",
    "DEPLOY-COMPLETO.md",
    "DEPLOY-RESULTADOS.md",
    
    # Arquivos de código ATUAIS (versões mais recentes)
    "avaliacao-page-with-demographics.tsx",  # Versão final
    "calculate-route.ts",
    "dashboard-final-v4.tsx",
    "data.ts",
    "especialista-page-v2.tsx",  # Versão final
    "export-demographics-route.ts",
    "ExportDemographicsButton.tsx",
    "generate-academic-route.ts",
    "ImpactComparison.tsx",
    "obrigado-page.tsx",
    "page-home-login.tsx",  # Versão final
    "perfil-page.tsx",
    "projetos-page-v6.tsx",  # Versão final
    "RespondentsDemographics.tsx",
    "resultados-page.tsx",
    "simulacao-page.tsx",
    "simulate-api-route.ts",
    
    # Pastas essenciais
    ".next",
    ".vercel",
    "app",
    "components",
    "lib",
    "node_modules",
    "public",
]


def print_header():
    """Imprime cabeçalho do script"""
    print("\n" + "=" * 78)
    print("  SCRIPT DE LIMPEZA - AHP-BOCR PROJECT")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 78)
    print(f"\n  Diretório do projeto: {PROJECT_ROOT}\n")


def print_category(name: str):
    """Imprime categoria de arquivos"""
    print(f"\n┌{'─' * 76}┐")
    print(f"│ {name:<74} │")
    print(f"└{'─' * 76}┘")


def analyze_files():
    """Analisa quais arquivos existem e retorna estatísticas"""
    stats = {
        "found": [],
        "not_found": [],
        "total_size": 0,
    }
    
    # Verificar arquivos
    for category, files in FILES_TO_DELETE.items():
        for filename in files:
            filepath = PROJECT_ROOT / filename
            if filepath.exists():
                size = filepath.stat().st_size
                stats["found"].append({
                    "path": filepath,
                    "name": filename,
                    "size": size,
                    "category": category,
                })
                stats["total_size"] += size
            else:
                stats["not_found"].append({
                    "name": filename,
                    "category": category,
                })
    
    # Verificar pastas
    for category, folders in FOLDERS_TO_DELETE.items():
        for foldername in folders:
            folderpath = PROJECT_ROOT / foldername
            if folderpath.exists() and folderpath.is_dir():
                # Calcular tamanho da pasta
                folder_size = sum(f.stat().st_size for f in folderpath.rglob('*') if f.is_file())
                stats["found"].append({
                    "path": folderpath,
                    "name": foldername + "/",
                    "size": folder_size,
                    "category": category,
                    "is_folder": True,
                })
                stats["total_size"] += folder_size
    
    return stats


def format_size(size_bytes: int) -> str:
    """Formata tamanho em bytes para formato legível"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def display_files_to_delete(stats: dict):
    """Exibe lista de arquivos que serão deletados"""
    if not stats["found"]:
        print("\n✅ Nenhum arquivo para deletar encontrado!")
        print("   O projeto já está limpo.")
        return False
    
    # Agrupar por categoria
    by_category = {}
    for item in stats["found"]:
        cat = item["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(item)
    
    # Exibir por categoria
    idx = 1
    for category, items in by_category.items():
        print_category(category)
        for item in items:
            size_str = format_size(item["size"])
            marker = "📁" if item.get("is_folder") else "📄"
            print(f"  [{idx:2d}] {marker} {item['name']:<45} ({size_str:>10})")
            idx += 1
    
    # Resumo
    print(f"\n{'─' * 78}")
    print(f"  📊 RESUMO:")
    print(f"     • Arquivos/pastas a deletar: {len(stats['found'])}")
    print(f"     • Espaço a liberar: {format_size(stats['total_size'])}")
    if stats["not_found"]:
        print(f"     • Já deletados anteriormente: {len(stats['not_found'])}")
    print(f"{'─' * 78}")
    
    return True


def delete_files(stats: dict):
    """Executa a deleção dos arquivos"""
    print("\n🔄 Iniciando exclusão...\n")
    
    deleted = 0
    errors = 0
    
    for item in stats["found"]:
        filepath = item["path"]
        try:
            if item.get("is_folder"):
                import shutil
                shutil.rmtree(filepath)
            else:
                filepath.unlink()
            print(f"  ✅ {item['name']}")
            deleted += 1
        except Exception as e:
            print(f"  ❌ {item['name']} - ERRO: {e}")
            errors += 1
    
    print(f"\n{'─' * 78}")
    print(f"  🏁 RESULTADO:")
    print(f"     • Deletados com sucesso: {deleted}")
    if errors:
        print(f"     • Erros: {errors}")
    print(f"     • Espaço liberado: {format_size(stats['total_size'])}")
    print(f"{'─' * 78}")


def main():
    """Função principal"""
    print_header()
    
    # Verificar se diretório existe
    if not PROJECT_ROOT.exists():
        print(f"❌ ERRO: Diretório não encontrado: {PROJECT_ROOT}")
        print("   Verifique o caminho e tente novamente.")
        sys.exit(1)
    
    # Analisar arquivos
    print("🔍 Analisando projeto...")
    stats = analyze_files()
    
    # Exibir lista
    has_files = display_files_to_delete(stats)
    
    if not has_files:
        sys.exit(0)
    
    # Confirmação
    print("\n⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!")
    print("   Recomendação: Faça backup antes de continuar.")
    print()
    
    try:
        confirm = input("   Deseja prosseguir com a exclusão? (S/N): ").strip().upper()
    except KeyboardInterrupt:
        print("\n\n   Operação cancelada.")
        sys.exit(0)
    
    if confirm != 'S':
        print("\n   Operação cancelada pelo usuário.")
        print("   Nenhum arquivo foi excluído.")
        sys.exit(0)
    
    # Executar deleção
    delete_files(stats)
    
    # Próximos passos
    print("\n📋 PRÓXIMOS PASSOS RECOMENDADOS:")
    print("   1. npm run build")
    print("   2. npm run dev (testar localmente)")
    print("   3. npx vercel --prod (deploy)")
    print()


if __name__ == "__main__":
    main()
