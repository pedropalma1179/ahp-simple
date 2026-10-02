#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
aplicar-guardas.py: aplica, ANTES de publicar, cada guarda de redacao que alcanca os arquivos que a rodada acrescenta ou altera, AO MESMO TRECHO que o
teste examina (arquivo inteiro normalizado, fatia, prefixo, ou varredura de diretorios), e imprime, por guarda, a fonte (teste:linhas), o escopo
NOMEADO, o que o teste afirma e o resultado.

⚠ NAO substitui os testes: os testes reais sao executados depois (`npm test`). Este script torna EXPLICITO o trecho que cada guarda examina, e aplica
  cada uma ao texto da ARVORE DE TRABALHO (o que sera publicado), comparando com a base quando o trecho nao deve ter mudado. Se uma guarda ficar
  incompativel com o que foi escrito, o script SAI 1 e NAO se afrouxa a guarda, nao se altera o teste e nao se reescreve o trecho: relata-se.

Os literais das guardas sao COPIADOS dos testes e CONFERIDOS contra o texto do teste na base (cada pedaco precisa ocorrer no arquivo de teste), para que um
literal digitado errado nao passe por guarda.

Uso, a partir da raiz do repositorio:  python3 docs/dados/a12-sem-vinculo/instrumentos/aplicar-guardas.py > docs/dados/a12-sem-vinculo/guardas/aplicacao.txt
Dependencias: python3 (medido com 3.11), git, e o commit-base no repositorio.
"""
import hashlib
import os
import re
import subprocess
import sys

BASE = 'ad2ad0afdc1a972570d3733ccc582d65a719397a'
FIACAO = 'lib/__tests__/vinculo-execucao-fiacao.test.ts'
FASE2 = 'lib/__tests__/a12-nota-veredicto-fase2.test.ts'
REGISTRO = 'docs/imprecisoes-parecer-ia.md'
CONTRATO = 'docs/contratos-de-dados.md'
ANCORA = 'docs/objetivo-estados-caminho.md'
PACOTE = 'docs/dados/a12-sem-vinculo'

os.chdir(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
resultados = []

# `\s` e `trim()` do JavaScript: o MESMO conjunto de espacos (o `\s` do Python inclui outros, e nao inclui ﻿)
JS_WS = '\t\n\v\f\r                  　﻿'
RE_WS = re.compile('[' + JS_WS + ']+')


def normalizar(t):
    return RE_WS.sub(' ', t).strip(JS_WS)


def ler(rel):
    with open(rel, encoding='utf-8') as f:
        return f.read()


def ler_base(rel):
    return subprocess.check_output(['git', 'show', f'{BASE}:{rel}']).decode('utf-8')


def sha(t):
    return hashlib.sha256(t.encode('utf-8')).hexdigest()


TESTE_FIACAO = ler_base(FIACAO)
TESTE_FASE2 = ler_base(FASE2)


def literal_do_teste(texto, fonte, rotulo):
    """O literal que a guarda usa tem de OCORRER no texto do teste na base (cada pedaco), para nao ser digitado errado."""
    assert texto in fonte, f'literal da guarda {rotulo} nao encontrado no teste: {texto[:70]!r}'
    return texto


def guarda(gid, fonte, escopo, afirma, ok, medido=''):
    resultados.append((gid, ok))
    print(f'[{gid}] {"PASSA" if ok else "FALHA"}')
    print(f'    fonte:   {fonte}')
    print(f'    escopo:  {escopo}')
    print(f'    afirma:  {afirma}')
    if medido:
        print(f'    medido:  {medido}')


print(f'# APLICACAO DAS GUARDAS DE REDACAO (secao 6.4 do pedido). Base {BASE}.')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
print(f'# HEAD {head}. Arvore de trabalho: o que sera publicado.')
st = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all'], text=True).split('\n')
alterados = sorted(l[3:] for l in st if l and not l.startswith('??'))
novos = sorted(l[3:] for l in st if l.startswith('??'))
print(f'# Arquivos ALTERADOS (rastreados): {alterados}')
print(f'# Arquivos NOVOS (nao rastreados): {len(novos)}; fora de {PACOTE}/: {[n for n in novos if not n.startswith(PACOTE + "/")]}')
fora = [a for a in alterados if a != REGISTRO] + [n for n in novos if not n.startswith(PACOTE + "/")]
assert not fora, f'a rodada so pode alterar o registro e acrescentar o pacote; ha mais: {fora}'

reg_t, reg_b = ler(REGISTRO), ler_base(REGISTRO)
n_t, n_b = normalizar(reg_t), normalizar(reg_b)
con, anc = normalizar(ler(CONTRATO)), normalizar(ler(ANCORA))
assert ler(CONTRATO) == ler_base(CONTRATO) and ler(ANCORA) == ler_base(ANCORA), 'o contrato ou o ancora foi alterado, e esta rodada nao os altera'
print(f'# Registro: base {len(reg_b.encode())} bytes, sha256 {sha(reg_b)[:12]}; trabalho {len(reg_t.encode())} bytes, sha256 {sha(reg_t)[:12]}. Contrato e ancora: byte a byte os da base.')
print()

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G1 (fiacao:1453-1459): a redacao literal da secao 5, no contrato e no registro (arquivo inteiro, normalizado), e a corrompida ausente
# --------------------------------------------------------------------------------------------------------------------------------------------------
parte1 = literal_do_teste('O módulo atual não pode ser importado diretamente pelo navegador, pois depende de APIs do Node. ', TESTE_FIACAO, 'G1a')
parte2 = literal_do_teste('Este estágio não implementa verificação de conteúdo no navegador nem no servidor.', TESTE_FIACAO, 'G1b')
REDACAO = parte1 + parte2
corrompida = REDACAO.replace('não pode', 'pode')
guarda('G1', f'{FIACAO}:1453-1459', f'arquivo inteiro, NORMALIZADO, de {CONTRATO} e de {REGISTRO}',
       'contém a redação literal da seção 5 e NÃO contém a sua versão corrompida ("não pode" por "pode")',
       REDACAO in con and REDACAO in n_t and corrompida not in con and corrompida not in n_t,
       f'redação no contrato: {REDACAO in con}; no registro: {REDACAO in n_t}; corrompida no contrato: {corrompida in con}; no registro: {corrompida in n_t}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G2 (fiacao:1461-1475): nenhum arquivo rastreavel dos cinco diretorios sustenta a frase proibida (varredura, extensoes filtradas)
# --------------------------------------------------------------------------------------------------------------------------------------------------
proibida = ' '.join([literal_do_teste('verificar conteúdo', TESTE_FIACAO, 'G2a'), literal_do_teste('exigiria o servidor', TESTE_FIACAO, 'G2b')])
EXT = re.compile(r'\.(ts|tsx|md|json|cjs|js|mjs)$')
achados, varridos, varridos_pacote, ignorados_pacote = [], 0, [], []


def varrer(d):
    global varridos
    for e in sorted(os.listdir(d)):
        rel = f'{d}/{e}'
        if os.path.isdir(rel):
            if e in ('node_modules', '.next', '.git'):
                continue
            varrer(rel)
        elif EXT.search(e):
            varridos += 1
            if rel.startswith(PACOTE + '/'):
                varridos_pacote.append(rel)
            if proibida in normalizar(ler(rel)).lower():
                achados.append(rel)
        elif rel.startswith(PACOTE + '/'):
            ignorados_pacote.append(rel)


for d in ['app', 'lib', 'docs', 'components', 'scripts']:
    varrer(d)
guarda('G2', f'{FIACAO}:1461-1475', 'varredura recursiva de app, lib, docs, components e scripts (sem node_modules, .next e .git), só arquivos .ts .tsx .md .json .cjs .js .mjs, cada um NORMALIZADO e em minúsculas',
       f'nenhum arquivo contém a frase proibida ({proibida!r})', achados == [] and varridos > 0,
       f'arquivos varridos: {varridos}; achados: {achados}; do pacote novo, ALCANÇADOS pela varredura: {len(varridos_pacote)} ({sorted({os.path.splitext(x)[1] for x in varridos_pacote})}); do pacote, FORA da extensão varrida: {len(ignorados_pacote)} ({sorted({os.path.splitext(x)[1] or os.path.basename(x) for x in ignorados_pacote})}). Contraexemplo: a frase montada é achada em "x {proibida} y": {proibida in normalizar("x " + proibida + " y").lower()}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G3 (fiacao:1477-1485): a regra da secao 7, literal, no contrato e no registro
# --------------------------------------------------------------------------------------------------------------------------------------------------
REGRA = (literal_do_teste('O estado do vínculo, isoladamente, não acrescenta causa de suspensão nem altera a elegibilidade. ', TESTE_FIACAO, 'G3a')
         + literal_do_teste('Alterações decorrentes do novo conjunto avaliado continuam sujeitas às regras existentes da etapa 1 ', TESTE_FIACAO, 'G3b')
         + literal_do_teste('e devem ter seus efeitos previstos e testados.', TESTE_FIACAO, 'G3c'))
guarda('G3', f'{FIACAO}:1477-1485', f'arquivo inteiro, NORMALIZADO, de {CONTRATO} e de {REGISTRO}', 'contém a regra da seção 7, literal',
       REGRA in con and REGRA in n_t, f'no contrato: {REGRA in con}; no registro: {REGRA in n_t}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G4 (fiacao:1706-1712): o registro traz a medicao, a decisao sobre P1 e os achados, com a predicao preservada (arquivo inteiro, normalizado)
# --------------------------------------------------------------------------------------------------------------------------------------------------
G4 = ['A.12 etapa 3, estágio 1: predição datada', 'A.12 etapa 3, estágio 1: o que foi implementado e o que foi medido', 'P1', 'fallbackSobreRespostas', 'A predição acima NÃO foi reescrita']
for s in G4:
    literal_do_teste(s, TESTE_FIACAO, 'G4')
guarda('G4', f'{FIACAO}:1706-1712', f'arquivo inteiro, NORMALIZADO, de {REGISTRO}', 'contém as cinco passagens listadas', all(s in n_t for s in G4), f'ausentes: {[s for s in G4 if s not in n_t]}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G5 (fiacao:1720-1721): a frase generalizada de R3 nao esta no contrato, no registro nem no ancora (arquivo inteiro, normalizado)
# --------------------------------------------------------------------------------------------------------------------------------------------------
generalizada = ' '.join(['diverge', 'por', 'construção'])
for p in ('diverge', 'por', 'construção'):
    literal_do_teste(f"'{p}'", TESTE_FIACAO, 'G5')
guarda('G5', f'{FIACAO}:1720-1721', f'arquivo inteiro, NORMALIZADO, de {CONTRATO}, {REGISTRO} e {ANCORA}', f'não contém a frase montada de "diverge", "por" e "construção"',
       generalizada not in con and generalizada not in n_t and generalizada not in anc,
       f'ocorrências no contrato: {con.count(generalizada)}; no registro: {n_t.count(generalizada)} (base: {n_b.count(generalizada)}); no ancora: {anc.count(generalizada)}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G6 (fiacao:1725-1742): a FATIA do Achado 1 (de "**Achado 1 (delimitado" ate "**Achado 2:"), no registro normalizado
# --------------------------------------------------------------------------------------------------------------------------------------------------
i1, f1 = n_t.find('**Achado 1 (delimitado'), None
f1 = n_t.find('**Achado 2:', i1)
i1b = n_b.find('**Achado 1 (delimitado'); f1b = n_b.find('**Achado 2:', i1b)
fatia1, fatia1b = n_t[i1:f1], n_b[i1b:f1b]
G6 = ['O id do documento pode coincidir com o `respondentId`', '`{ id: doc.id, ...data }` deixa um `id` gravado no dado sobrescrever o id do documento',
      'A ausência de gravação de `visitorId` no caminho examinado não prova a ausência em todos os documentos', 'a restrição esvazia a lista', 'passa de `disponivel` para `ausente`',
      'com a causa `disponibilidade`', 'identificado DEPOIS da predição', 'generalizava ao ramo inteiro']
for s in G6:
    literal_do_teste(s, TESTE_FIACAO, 'G6')
guarda('G6', f'{FIACAO}:1725-1744', f'a FATIA do registro normalizado entre "**Achado 1 (delimitado" e "**Achado 2:" (índices {i1} a {f1}; {len(fatia1)} caracteres)',
       'contém as passagens listadas e não contém a frase generalizada',
       i1 > -1 and f1 > i1 and all(s in fatia1 for s in G6) and generalizada not in fatia1 and fatia1 == fatia1b,
       f'a fatia é IDÊNTICA à da base (a inserção está depois dela): {fatia1 == fatia1b}; sha256 {sha(fatia1)[:12]}; ausentes: {[s for s in G6 if s not in fatia1]}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G7 (fiacao:1774-1792): a FATIA de R4 (de "### Implementado e medido: R4" ate "## Anexo 3"): ONDE A INSERCAO CAI
# --------------------------------------------------------------------------------------------------------------------------------------------------
M_INI, M_FIM = '### Implementado e medido: R4', '## Anexo 3'
literal_do_teste(M_INI, TESTE_FIACAO, 'G7ini'); literal_do_teste(M_FIM, TESTE_FIACAO, 'G7fim')
i4, i4b = n_t.find(M_INI), n_b.find(M_INI)
f4, f4b = n_t.find(M_FIM, i4), n_b.find(M_FIM, i4b)
fatia4, fatia4b = n_t[i4:f4], n_b[i4b:f4b]
G7 = ['NÃO é predição', 'Nenhum teste novo ou atualizado reprovou na primeira execução', 'Um erro meu foi achado por LEITURA, antes de qualquer execução, e corrigido antes de rodar', 'Vinte e seis',
      'nenhum reprova por erro de compilação', 'reprovaram **sete asserções, e só elas**', 'T10 a T12', 'NÃO TESTADAS', 'não foram alteradas nem unificadas', 'não foi corrigida']
G7_INTEIRO = ['A.12, etapa 3, estágio 1: complemento datado da predição, R4', 'Os desvios de previsão da rodada anterior (R1 e R2), classificados']
for s in G7 + G7_INTEIRO:
    literal_do_teste(s, TESTE_FIACAO, 'G7')
titulo_novo = '## Diagnóstico: o caminho sem `vinculoDaExecucao`, rodada só de medição, em 02/10/2026'
titulo_aceite = '## Registro: o aceite técnico da integração em `426878f` e a ressalva sobre a Fase 3, em 02/10/2026'
pos_bloco, pos_aceite_t, pos_aceite_b = n_t.find(titulo_novo), n_t.find(titulo_aceite), n_b.find(titulo_aceite)
dentro_novo = i4 < pos_bloco < f4 if pos_bloco > -1 else None
dentro_aceite_b = i4b < pos_aceite_b < f4b
n_marc_t, n_marc_b = n_t.count(M_FIM), n_b.count(M_FIM)
# onde a fatia termina, em linhas CRUAS (o marcador de fim e o PRIMEIRO depois do inicio, e pode estar numa frase, e nao no titulo do anexo)
cru_ini = reg_t.find(M_INI)
cru_fim = reg_t.find(M_FIM, cru_ini)
linha_ini, linha_fim = reg_t.count('\n', 0, cru_ini) + 1, reg_t.count('\n', 0, cru_fim) + 1
ult = reg_t.rfind(M_FIM)
linha_titulo_anexo = reg_t.count('\n', 0, ult) + 1
guarda('G7', f'{FIACAO}:1774-1796', f'a FATIA do registro normalizado entre "{M_INI}" e a PRIMEIRA ocorrência seguinte de "{M_FIM}" (índices {i4} a {f4}; {len(fatia4)} caracteres; na base {len(fatia4b)})',
       'contém as dez passagens listadas, e o registro inteiro contém as duas do complemento; a fatia não contém a frase generalizada (o critério é o do TESTE: as asserções sobre a fatia)',
       i4 > -1 and f4 > i4 and all(s in fatia4 for s in G7) and all(s in n_t for s in G7_INTEIRO) and generalizada not in fatia4,
       f'a fatia vai da linha crua {linha_ini} à linha crua {linha_fim}, onde está a PRIMEIRA ocorrência do marcador de fim (dentro de uma frase de bloco anterior), e NÃO ao título do anexo (linha crua {linha_titulo_anexo}); '
       f'ocorrências do marcador no registro: {n_marc_t} (base {n_marc_b}), ou seja, esta inserção NÃO acrescentou marcador; a fatia é IDÊNTICA à da base: {fatia4 == fatia4b}; ausentes: {[s for s in G7 if s not in fatia4]}')
print('    ⚠ PREMISSA DO PEDIDO CONFRONTADA COM A MEDIÇÃO (as duas ficam conservadas): o pedido, como ponto de partida de 02/10, diz que o bloco do commit anterior ficou DENTRO desta fatia e manda tratar o acréscimo como dentro dela até medir o contrário.')
print(f'    MEDIDO (a mesma semântica do teste): o bloco do commit anterior (aceite técnico) está FORA da fatia, na base (dentro: {dentro_aceite_b}); o acréscimo desta rodada está FORA da fatia (dentro: {dentro_novo}); a fatia termina na linha crua {linha_fim}.')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G8 (fiacao:1798): o PREFIXO slice(0, inicio) NAO contem "Nenhum teste novo ou atualizado reprovou na primeira execucao" (contraexemplo do detector de secao)
# --------------------------------------------------------------------------------------------------------------------------------------------------
frase_prefixo = 'Nenhum teste novo ou atualizado reprovou na primeira execução'
pref, prefb = n_t[:i4], n_b[:i4b]
guarda('G8', f'{FIACAO}:1798', f'o PREFIXO do registro normalizado, slice(0, inicio) com inicio = {i4} (na base {i4b})', f'não contém "{frase_prefixo}"',
       frase_prefixo not in pref and pref == prefb, f'o prefixo é IDÊNTICO ao da base (a inserção está depois do marcador de início): {pref == prefb}; sha256 {sha(pref)[:12]}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# G9 (a12-nota-veredicto-fase2:786-799): nenhum dos seis arquivos promete que o veredito deixe de ser apresentado (REGEX sobre o texto CRU, sem normalizar)
# --------------------------------------------------------------------------------------------------------------------------------------------------
ARQ_F = ['app/api/ai-reviewer/route.ts', 'components/ParecerAISection.tsx', 'app/decisor/resultados/[projectId]/page.tsx', 'lib/ai-reviewer/avaliacao-qualidade.ts', 'docs/contratos-de-dados.md', 'docs/imprecisoes-parecer-ia.md']
for a in ARQ_F:
    literal_do_teste(f"'{a}'", TESTE_FASE2, 'G9')
PROMESSA = re.compile(r'veredit[oa]s?\s+(n[ãa]o\s+(?:[ée]\s+)?apresentad|(?:deixa|deixam|deixou)\s+de\s+ser\s+apresentad|(?:fica|ficam)\s+oculto)', re.I)
literal_do_teste(r"/veredit[oa]s?\s+(n[ãa]o\s+(?:[ée]\s+)?apresentad|(?:deixa|deixam|deixou)\s+de\s+ser\s+apresentad|(?:fica|ficam)\s+oculto)/i", TESTE_FASE2, 'G9regex')
por_arquivo = {a: bool(PROMESSA.search(ler(a))) for a in ARQ_F}
guarda('G9', f'{FASE2}:786-799', 'cada um dos SEIS arquivos, texto CRU (a regex usa \\s e não há normalização); só o registro mudou', 'a regex PROMESSA ("veredito não apresentado", "deixa de ser apresentado", "fica oculto") NÃO casa',
       not any(por_arquivo.values()), f'casa em: {[a for a, v in por_arquivo.items() if v]}; trecho do registro novo analisado: {len(reg_t)} caracteres (a regex olhou o arquivo inteiro). Contraexemplos que o detector pega: {[bool(PROMESSA.search(x)) for x in ("o veredito não apresentado ao gestor", "o veredito deixa de ser apresentado", "o veredito fica oculto")]}')

# --------------------------------------------------------------------------------------------------------------------------------------------------
# Verificacoes adicionais (pedido, secao 9): a expressao protegida e a insercao pura
# --------------------------------------------------------------------------------------------------------------------------------------------------
RX = re.compile(r'outra\s+redação', re.I)
guarda('P1', 'pedido, seção 9 (proibições)', f'o registro inteiro, texto cru, e todos os arquivos novos de {PACOTE}/ de extensão de texto', 'a expressão protegida pela seção 9 do pedido (a que se manda não corrigir) não ganha nenhuma ocorrência',
       len(RX.findall(reg_t)) == len(RX.findall(reg_b)) and not any(RX.search(ler(n)) for n in novos if re.search(r'\.(md|json|txt|py|sh|diff|html|cjs)$', n)),
       f'ocorrências no registro: base {len(RX.findall(reg_b))}, trabalho {len(RX.findall(reg_t))} (casamento: "outra" + espaço(s) + "redação", sem distinção de caixa, atravessando quebra de linha)')

linhas_b, linhas_t = reg_b.split('\n'), reg_t.split('\n')
# inserção pura: as linhas da base aparecem, na mesma ordem, como prefixo e sufixo das do trabalho
k = 0
while k < len(linhas_b) and linhas_b[k] == linhas_t[k]:
    k += 1
sufixo_ok = linhas_t[len(linhas_t) - (len(linhas_b) - k):] == linhas_b[k:]
inserido = linhas_t[k: len(linhas_t) - (len(linhas_b) - k)]
proxima = linhas_t[k + len(inserido)] if k + len(inserido) < len(linhas_t) else None
guarda('P2', 'pedido, seção 6.1 (inserção pura)', f'{REGISTRO}, linha a linha, base contra trabalho', 'nenhuma linha da base foi alterada ou removida: a base é prefixo mais sufixo do trabalho, e o resto é a inserção',
       sufixo_ok and len(inserido) > 0 and len(linhas_t) - len(linhas_b) == len(inserido),
       f'prefixo comum: {k} linhas; sufixo comum: {len(linhas_b) - k} linhas; inseridas: {len(inserido)} (a partir da linha {k + 1}); remoções: 0; linha seguinte à inserção: {proxima!r}')

print()
falhas = [g for g, ok in resultados if not ok]
print(f'# RESUMO: {len(resultados) - len(falhas)} de {len(resultados)} aplicações passam' + ('' if not falhas else f'; FALHAM: {falhas}'))
sys.exit(1 if falhas else 0)
