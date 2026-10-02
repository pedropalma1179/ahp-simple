#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analisar-fases.py: ANALISE dos artefatos da sonda do caminho sem `vinculoDaExecucao`.

NAO e a sonda. A sonda (`sonda-sem-vinculo.test.ts.txt`) EXECUTA o tratador real e GRAVA os artefatos das fases A, B e C. Este script SO LE
os artefatos gravados (e o fonte da base, por `git show`), CONFERE a integridade de cada um contra o registro da propria sonda e produz as
comparacoes que o relato precisa:

  fase-a/analise.json  + fase-a/diffs/*.diff   (contextos: controle x cada variante ausente; frases so do caso ausente, com localizador)
  fase-b/analise.json                          (corpos: enumeracao de chaves, diff bruto, projecao sem `metadata.timestamp`, interacao)
  fase-c/analise.json                          (renderizacao: estado de A.27, o que se exibe, busca declarada por mencao ao vinculo)
  fase-d/analise.json                          (leitura de codigo assistida: retornos do preparo do vinculo, saidas de runAiReview, ancoras do pedido)

⚠ Contagens independentes da sonda: a sonda conta em JavaScript, este script conta em Python (`re`, Unicode). Onde os dois contam a mesma
  coisa (bytes, linhas, `vinculo` como palavra), o script CONFERE que coincidem; onde nao coincidem por construcao (comprimento em
  caracteres: o JavaScript conta unidades UTF-16 e o Python, pontos de codigo), declara.

⚠ Leitura NAO e medicao. Os campos `leitura` e `classes` das frases do caso ausente sao CLASSIFICACAO FEITA POR LEITURA (e o script PARA se
  alguma frase medida nao tiver leitura, ou se alguma leitura nao tiver frase); o que o script MEDE e a presenca, a posicao e o texto.

Uso, a partir da RAIZ do repositorio (precisa do commit-base no repositorio e de `git`, GNU `diff` e `node` no PATH):

    python3 docs/dados/a12-sem-vinculo/instrumentos/analisar-fases.py [--dados docs/dados/a12-sem-vinculo] [--so-conferir]

Sem `--so-conferir`, grava os arquivos de analise em `--dados`. Sai 0 se tudo confere; sai 1 (e diz o que) se algo diverge.
Dependencias: python3 (medido com 3.11), git, diff (diffutils), node (apenas para o controle de `JSON.stringify`).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter

BASE = 'ad2ad0afdc1a972570d3733ccc582d65a719397a'
ROTA = 'app/api/ai-reviewer/route.ts'
PAGINA = 'app/decisor/resultados/[projectId]/page.tsx'
COMPONENTE = 'components/ParecerAISection.tsx'
VINCULO_TS = 'lib/ai-reviewer/vinculo-execucao.ts'

# `vinculo` como PALAVRA (a mesma expressao da sonda: `/v[ií]nculo/gi`), e o radical amplo (inclui `vinculado`). Unicode: casa `VÍNCULO`.
PALAVRA = re.compile(r'v[ií]nculo', re.IGNORECASE)
RADICAL = re.compile(r'v[ií]ncul', re.IGNORECASE)
MARCADOR_DO_BLOCO = '## DADOS DO SISTEMA — VÍNCULO DA AVALIAÇÃO DE QUALIDADE COM A EXECUÇÃO DO CÁLCULO'
CABECALHO_DA_LISTA = '## DADOS DO SISTEMA — RESPONDENTES'
LINHA_DO_TITULO = '**Título do Projeto:**'

CONDICOES = ['sem-exclusao', 'com-exclusao']
VARIANTES = ['controle', 'chave-ausente', 'undefined-explicito', 'null']
AUSENTES = ['chave-ausente', 'undefined-explicito', 'null']
CLASSES = ['elegivel', 'suspensa-contradicao']

problemas = []


def exigir(cond, mensagem):
    """Conferencia: registra o problema (e o script termina com saida 1 ao fim), em vez de seguir como se nada houvesse."""
    if not cond:
        problemas.append(mensagem)
    return bool(cond)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def ler_bytes(caminho):
    with open(caminho, 'rb') as f:
        return f.read()


def ler_texto(caminho):
    return ler_bytes(caminho).decode('utf-8')


def ler_json(caminho):
    return json.loads(ler_texto(caminho))


def gravar_json(caminho, objeto):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(objeto, f, ensure_ascii=False, indent=1)
        f.write('\n')


def gravar_texto(caminho, texto):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, 'w', encoding='utf-8', newline='\n') as f:
        f.write(texto)


def git_show(caminho):
    return subprocess.check_output(['git', 'show', f'{BASE}:{caminho}']).decode('utf-8')


def linhas_numeradas(texto):
    return texto.split('\n')


def achar_unico(linhas, agulha, rotulo):
    """Linha (1-based) em que a agulha ocorre; exige UMA so ocorrencia no arquivo, para o localizador nao ser adivinhado."""
    achadas = [i + 1 for i, l in enumerate(linhas) if agulha in l]
    exigir(len(achadas) == 1, f'localizador de {rotulo}: {len(achadas)} linhas contem a agulha {agulha!r}: {achadas}')
    return achadas[0] if achadas else None


def diff_normal(caminho_a, caminho_b):
    """`diff` (diffutils) em formato normal, que traz o numero das linhas dos dois lados. Saida 1 = diferem; 2 = falha."""
    p = subprocess.run(['diff', caminho_a, caminho_b], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    exigir(p.returncode in (0, 1), f'diff falhou ({p.returncode}): {p.stderr.decode("utf-8", "replace")}')
    return p.returncode, p.stdout.decode('utf-8')


RE_HUNK = re.compile(r'^(\d+)(?:,(\d+))?([acd])(\d+)(?:,(\d+))?$')


def hunks_do_diff(saida):
    return [l for l in saida.split('\n') if RE_HUNK.match(l)]


def bag(linhas):
    """Multiconjunto das linhas NAO BRANCAS: independe do alinhamento que o diff escolha entre as muitas linhas em branco."""
    return Counter(l for l in linhas if l.strip() != '')


def corrida_de_brancos_antes(linhas, indice):
    """Quantas linhas em branco consecutivas precedem a linha `indice` (0-based), e a ultima linha NAO branca antes delas (1-based)."""
    j, n = indice - 1, 0
    while j >= 0 and linhas[j].strip() == '':
        n += 1
        j -= 1
    return n, j + 1, (linhas[j] if j >= 0 else '')


def mencoes_por_linha(texto):
    por_linha = []
    for i, l in enumerate(texto.split('\n'), 1):
        n = len(PALAVRA.findall(l))
        if n:
            por_linha.append({'linha': i, 'ocorrencias': n, 'origem': 'titulo do projeto, texto SINTETICO da sonda' if l.startswith(LINHA_DO_TITULO) else 'texto do sistema', 'inicio': l[:90]})
    return por_linha


# ======================================================================================================================================
# AS FRASES DO CASO AUSENTE, E A LEITURA DE CADA UMA (ESCRITAS A MAO; leitura, e NAO medicao). O script mede quais linhas existem so no
# caso ausente e PARA se esta tabela nao as cobrir exatamente, nos dois sentidos.
# ======================================================================================================================================
FRASES = [
    dict(id='E1', prefixo='- Amostra original coletada: ', cond=['com-exclusao'], agulha='amostra: `- Amostra original coletada:', linha=862,
         classes=['nenhuma das cinco (contagem sem população nem etapa)'],
         leitura='Conta a amostra sem nomear a população nem a etapa. No controle a mesma posição nomeia as duas (população: respostas carregadas pela tela; etapa: coleta).'),
    dict(id='E2', prefixo='- Respondentes incluídos na análise: ', cond=['com-exclusao'], agulha='restantes: `- Respondentes incluídos na análise:', linha=863,
         classes=['nenhuma das cinco (contagem sem população nem etapa)'],
         leitura='"Incluídos na análise" não diz de que etapa é o conjunto, nem se coincide com o enviado ao modelo ou com o incluído no documento de cálculo. O controle separa "restantes após a exclusão do gestor", "incluídos no documento de cálculo" e "enviados".'),
    dict(id='E3', prefixo='- Respondentes excluídos: ', cond=['com-exclusao'], agulha='excluidos: `- Respondentes excluídos:', linha=864,
         classes=['nenhuma das cinco (contagem sem população nem etapa)'],
         leitura='Conta os excluídos sem nomear a etapa. O controle diz "excluídos pelo gestor" e nomeia a população e a etapa.'),
    dict(id='E4', prefixo='- Os dados de qualidade abaixo referem-se APENAS aos ', cond=['com-exclusao'], agulha='qualidade: `- Os dados de qualidade abaixo referem-se APENAS aos', linha=865,
         classes=['nenhuma das cinco (contagem sem população nem etapa)'],
         leitura='Delimita os dados de qualidade aos "incluídos" sem nomear população nem etapa. O controle os delimita aos "ENVIADOS a você (população: enviados; etapa: envio)".'),
    dict(id='L1', prefixo='## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)', cond=CONDICOES, agulha="cabecalho: '## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)'", linha=931,
         classes=['exaustividade'],
         leitura='Declara a lista EXAUSTIVA sem dizer de que conjunto. O controle restringe: "(lista EXAUSTIVA do conjunto enviado)".'),
    dict(id='L2', prefixo='**TOTAL: ', cond=CONDICOES, agulha='total: `**TOTAL: ${respondents.length} respondentes (esta lista é COMPLETA — não existem outros)**`', linha=932,
         classes=['completude', 'exaustividade'],
         leitura='Afirma a lista COMPLETA e que "não existem outros", sem restringir ao conjunto enviado. Na condição com exclusão o mesmo contexto traz, nas linhas das contagens da filtragem, 6 coletados, 4 incluídos e 2 excluídos: as duas afirmações coexistem no texto entregue. O controle diz "COMPLETA para o conjunto enviado".'),
    dict(id='L3', prefixo='**AGREGAÇÃO POR MATRIZ: ', cond=CONDICOES, agulha='`**AGREGAÇÃO POR MATRIZ: todos os ${respondents.length} respondentes responderam à TOTALIDADE', linha=934,
         classes=['totalidade'],
         leitura='Afirma como fato que todos responderam à TOTALIDADE das comparações pareadas e que N é o tamanho da lista em TODAS as matrizes agregadas. O número vem de `respondents.length` (`route.ts:934`), isto é, da contagem da lista, e não de um campo de completude. O controle, nesta posição, declara que a contagem do documento de cálculo NÃO é medição da participação por célula e que não deve ser apresentada como o N de matriz alguma.'),
    dict(id='L4', prefixo='⚠ NÃO existe divisão de respondentes por mérito, dimensão ou subcritério.', cond=CONDICOES, agulha='`⚠ NÃO existe divisão de respondentes por mérito, dimensão ou subcritério.', linha=935,
         classes=['ausência de divisão'],
         leitura='Afirma como fato do sistema que NÃO existe divisão de respondentes. O controle afirma outra coisa, sobre a requisição: "esta requisição não traz divisão", e pede que não se atribua um N diferente a cada matriz.'),
    dict(id='L5', prefixo='⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista. ', cond=CONDICOES, agulha="regraDeMencao: '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista.", linha=937,
         classes=['regra de menção'],
         leitura='Proíbe mencionar respondente fora da lista, sem a qualificação "COMO PARTICIPANTES DA AVALIAÇÃO ENVIADA" e sem a exceção para divergência registrada que o controle traz. No caso ausente não há bloco que registre divergência.'),
]


def achar_linha_exata(linhas, texto, rotulo):
    """Linha (1-based) cujo conteudo, sem os espacos das pontas, e EXATAMENTE `texto`; exige uma so."""
    achadas = [i + 1 for i, l in enumerate(linhas) if l.strip() == texto]
    exigir(len(achadas) == 1, f'localizador de {rotulo}: {len(achadas)} linhas iguais a {texto!r}: {achadas}')
    return achadas[0] if achadas else None


# ======================================================================================================================================
# AS ANCORAS DO PEDIDO (secao 1 e seguintes): cada uma, lida NA LINHA que o pedido indica, na base. Divergir de uma ancora e INFORMACAO
# (o localizador do pedido envelheceu), e nao e parada: o script registra `confere: false` e imprime.
# ======================================================================================================================================
ANCORAS = [
    ('H1', ROTA, 600, 'vinculoDaExecucao: rawData.vinculoDaExecucao', 'normalizeRequest copia o campo'),
    ('H1', ROTA, 848, 'mantém a redação anterior, byte a byte', 'comentario que descreve a ausencia'),
    ('H1', ROTA, 852, 'const comVinculo = lerVinculoParaTexto(data.vinculoDaExecucao).modo', 'comVinculo'),
    ('H1', ROTA, 859, 'const linhasDaExclusao = comVinculo', 'sitio de redacao 1: as linhas da exclusao'),
    ('H1', ROTA, 928, 'const frases: FrasesDaLista = comVinculo', 'sitio de redacao 2: as frases da lista de respondentes'),
    ('H1', ROTA, 973, 'const textoDoVinculo = descreverVinculoParaContexto(', 'texto do bloco do vinculo'),
    ('H1', ROTA, 974, "const blocoDoVinculo = textoDoVinculo === '' ? ''", 'bloco vazio quando o texto do vinculo e vazio'),
    ('H2', ROTA, 931, "cabecalho: '## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)'", 'cabecalho da lista, caso ausente'),
    ('H2', ROTA, 932, 'total: `**TOTAL: ${respondents.length} respondentes (esta lista é COMPLETA — não existem outros)**`', 'total, caso ausente'),
    ('H2', ROTA, 934, '`**AGREGAÇÃO POR MATRIZ: todos os ${respondents.length} respondentes responderam à TOTALIDADE', 'agregacao por matriz, caso ausente'),
    ('H2', ROTA, 935, '`⚠ NÃO existe divisão de respondentes por mérito, dimensão ou subcritério.', 'ausencia de divisao, caso ausente'),
    ('H2', ROTA, 937, "regraDeMencao: '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista.", 'regra de mencao, caso ausente'),
    ('H3', ROTA, 1479, 'return NextResponse.json({', 'inicio do corpo de sucesso'),
    ('H3', ROTA, 1512, 'timestamp: new Date().toISOString(),', 'metadata.timestamp'),
    ('H3', ROTA, 1523, '});', 'fim do corpo de sucesso'),
    ('H4', COMPONENTE, 240, "presentation?.estado === 'aprovado'", 'portao do destaque (tres condicoes)'),
    ('H5', PAGINA, 1033, 'const preparoDoVinculo = prepararVinculoDaTela({', 'a tela chama o preparo do vinculo'),
    ('H5', PAGINA, 1038, 'const vinculoDaExecucao = preparoDoVinculo.vinculo;', 'a tela toma o vinculo da preparacao'),
    ('H5', PAGINA, 1247, 'vinculoDaExecucao,', 'o payload inclui o campo'),
    ('H5', PAGINA, 1350, "const response = await fetch('/api/ai-reviewer', {", 'o fetch'),
    ('H5', PAGINA, 1353, 'body: JSON.stringify(finalPayload)', 'a serializacao do transporte'),
    ('H5', PAGINA, 1363, 'setAiReview({', 'a montagem do aiReview (inicio)'),
    ('H5', PAGINA, 1371, 'metadata: data.metadata', 'a montagem do aiReview (ultima chave)'),
]


def verificar_ancoras(fontes):
    por_arquivo = {ROTA: linhas_numeradas(fontes['rota']), PAGINA: linhas_numeradas(fontes['pagina']), COMPONENTE: linhas_numeradas(fontes['componente'])}
    saida = []
    for h, arq, linha, trecho, o_que in ANCORAS:
        l = por_arquivo[arq][linha - 1] if 0 < linha <= len(por_arquivo[arq]) else ''
        saida.append({'hipotese': h, 'localizador': f'{arq}:{linha}', 'trechoEsperado': trecho, 'linhaLida': l.strip()[:160], 'confere': trecho in l, 'oQueE': o_que})
    return saida


# ======================================================================================================================================
# FASE D, a parte que e LEITURA DE CODIGO assistida por maquina: os retornos de `prepararVinculoDaTela` e as saidas de `runAiReview`.
# (As buscas de quem chama a rota estao no roteiro `buscas-fase-d.sh.txt`, com a saida gravada.) Leitura, e NAO medicao.
# ======================================================================================================================================
SAIDAS_DE_RUNAIREVIEW = {
    952: 'saída da função ANTES do `try` e antes de qualquer payload (`calculation` ou `project` ausente): não chega ao fetch',
    1000: 'retorno de callback de `filter` (não sai de `runAiReview`)',
    1006: 'retorno de callback de `filter` (não sai de `runAiReview`)',
    1085: 'retorno de callback de `reduce` (não sai de `runAiReview`)',
    1120: 'retorno de callback de `forEach` (não sai de `runAiReview`)',
    1215: 'retorno de callback de `map` (não sai de `runAiReview`)',
}


def analisar_fase_d(fontes):
    vt = linhas_numeradas(fontes['vinculo_ts'])
    ini = achar_unico(vt, 'export function prepararVinculoDaTela(', 'vinculo-execucao.ts: prepararVinculoDaTela')
    fim = next(i for i in range(ini, len(vt)) if vt[i] == '}') + 1
    retornos = []
    for i in range(ini - 1, fim):
        if re.match(r'^\s*return\b', vt[i]):
            janela = ' '.join(x.strip() for x in vt[i:i + 3])
            retornos.append({'linha': i + 1, 'texto': vt[i].strip()[:150], 'devolveOObjetoVinculo': bool(re.search(r'\bvinculo\b', janela))})
    lancamentos = [i + 1 for i in range(ini - 1, fim) if re.match(r'^\s*throw\b', vt[i])]
    tipo = next((i for i, l in enumerate(vt) if re.match(r'^export interface PreparacaoDoVinculo', l)), None)
    tipo_trecho = [l.rstrip() for l in vt[tipo: tipo + 8]] if tipo is not None else None
    d1 = {
        'pergunta': 'prepararVinculoDaTela tem algum caminho que devolve preparacao SEM vinculo?',
        'escopo': f'{VINCULO_TS}:{ini}-{fim}, na base {BASE}',
        'tipoDeRegistro': 'LEITURA DE CODIGO',
        'retornos': retornos,
        'lancamentosDeExcecao': lancamentos,
        'tipoDaPreparacao': {'localizador': f'{VINCULO_TS}:{tipo + 1}' if tipo is not None else None, 'trecho': tipo_trecho},
        'resposta': 'NAO: a funcao tem exatamente os retornos listados e todos devolvem o objeto `vinculo`; nenhum caminho devolve preparacao sem ele, e nenhum lanca excecao' if retornos and all(r['devolveOObjetoVinculo'] for r in retornos) and not lancamentos else 'HA retorno sem vinculo, ou lancamento: ver os campos acima',
        'estadosQueOVinculoPodeTer': 'indisponivel e invalido (sem conjunto utilizavel), vinculado e divergente (com conjunto): o campo vai ao modelo em todos, e o bloco vazio so ocorre quando o campo NAO chega',
        'limite': 'o valor devolvido e tipado como objeto; `undefined` so resultaria se a funcao fosse substituida ou se a preparacao nao fosse usada',
    }
    exigir(d1['resposta'].startswith('NAO'), 'prepararVinculoDaTela tem retorno sem vinculo')

    pag = linhas_numeradas(fontes['pagina'])
    ini_f = achar_unico(pag, 'const runAiReview = async () => {', 'page.tsx: runAiReview')
    fim_f = achar_unico(pag, "const response = await fetch('/api/ai-reviewer', {", 'page.tsx: fetch')
    saidas = [(i + 1, pag[i].strip()) for i in range(ini_f - 1, fim_f) if re.match(r'^\s*(return|throw)\b', pag[i])]
    achadas = {n: t for n, t in saidas}
    exigir(set(achadas) == set(SAIDAS_DE_RUNAIREVIEW), f'as saidas de runAiReview antes do fetch mudaram: achadas {sorted(achadas)} esperadas {sorted(SAIDAS_DE_RUNAIREVIEW)}')
    try_l = [i + 1 for i in range(ini_f - 1, fim_f) if re.match(r'^\s*try\s*\{', pag[i])]
    catch_l = [i + 1 for i in range(fim_f, len(pag)) if re.match(r'^\s*\}\s*catch\b', pag[i])][:1]
    # o `try` aninhado: cobre SO a chamada a /api/response-quality e termina antes do preparo do vinculo; o unico `catch` que cobre o trecho do preparo ao fetch e o externo
    exigir(try_l == [try_l[0], try_l[0] + 9] if len(try_l) == 2 else False, f'os `try` de runAiReview antes do fetch nao sao os dois esperados (externo e o de /api/response-quality): {try_l}')
    catch_interno = achar_unico(pag, '} catch (qualityError) {', 'page.tsx: catch interno')
    fecha_interno = catch_interno + 2
    exigir(pag[fecha_interno - 1].strip() == '}', f'a linha {fecha_interno} nao fecha o catch interno: {pag[fecha_interno - 1]!r}')
    linha_preparo = achar_unico(pag, 'const preparoDoVinculo = prepararVinculoDaTela({', 'page.tsx: preparo do vinculo')
    chamada_interna = achar_unico(pag, "const qualityResponse = await fetch('/api/response-quality', {", 'page.tsx: fetch interno de qualidade')
    exigir(try_l[1] < chamada_interna < catch_interno < fecha_interno < linha_preparo, 'o try aninhado nao termina antes do preparo do vinculo')
    linha_payload = achar_unico(pag, 'const payload = {', 'page.tsx: const payload')
    linha_final = achar_unico(pag, 'const finalPayload = {', 'page.tsx: const finalPayload')
    linha_campo = achar_linha_exata(pag, 'vinculoDaExecucao,', 'page.tsx: vinculoDaExecucao, no payload')
    linha_spread = next((i + 1 for i in range(linha_final - 1, linha_final + 4) if pag[i].strip() == '...payload,'), None)
    d2 = {
        'pergunta': 'page.tsx:1247 inclui o campo em TODOS os caminhos que chegam ao fetch de :1350?',
        'escopo': f'{PAGINA}:{ini_f}-{fim_f} (de `runAiReview` ate o fetch), na base {BASE}',
        'tipoDeRegistro': 'LEITURA DE CODIGO',
        'caminhosExaminados': [
            {'linha': n, 'texto': achadas[n], 'classificacao': SAIDAS_DE_RUNAIREVIEW[n]} for n in sorted(achadas)
        ],
        'lancamentosDeExcecaoNoTrecho': [n for n, t in saidas if t.startswith('throw')],
        'tryAbertoNoTrecho': try_l,
        'tryAninhado': {'try': try_l[1], 'chamadaCoberta': f'{PAGINA}:{chamada_interna} (fetch de /api/response-quality)', 'catch': catch_interno, 'fechaNaLinha': fecha_interno, 'preparoDoVinculoNaLinha': linha_preparo, 'terminaAntesDoPreparoDoVinculo': fecha_interno < linha_preparo, 'tipoDeRegistro': 'LEITURA'},
        'catchQueSegueOFetch': catch_l,
        'ondeOPayloadEMontado': {'const payload': linha_payload, 'vinculoDaExecucao no literal': linha_campo, 'const finalPayload': linha_final, '...payload no finalPayload': linha_spread},
        'resposta': 'SIM, por leitura: entre `runAiReview` e o fetch o unico retorno de funcao esta ANTES do payload (:952, e nao chega ao fetch); os demais sao retornos de callback; o payload e montado numa unica expressao literal que traz `vinculoDaExecucao` sem condicao, e o `finalPayload` o espalha (`...payload`); o unico `try` que cobre codigo entre o preparo do vinculo e o fetch e o externo, cujo `catch` vem DEPOIS do fetch (uma excecao ali vai ao `catch`, e nao ao fetch); o `try` aninhado cobre so a chamada a /api/response-quality e termina antes do preparo',
        'limite': 'leitura do texto da base; a tela NAO e executada por teste algum, e nada aqui diz o que uma versao antiga publicada enviava',
    }
    exigir(linha_campo is not None and linha_spread is not None and linha_payload < linha_campo < linha_final < linha_spread < fim_f, 'a ordem payload / campo / finalPayload / spread / fetch nao e a esperada')
    return {'natureza': 'Fase D, partes de LEITURA DE CODIGO assistidas por maquina (localizadores computados; a classificacao de cada saida e leitura).', 'base': BASE, 'D1_prepararVinculoDaTela': d1, 'D2_payloadDaTela': d2}


def conferir_identidade(D):
    """A identidade que a sonda gravou, contra o que existe AGORA: o codigo medido e o da base, e o instrumento arquivado e o executado."""
    ident = ler_json(os.path.join(D, 'identidade.json'))
    res = {'commitDeBaseDeclarado': ident['codigo']['commitDeBase'], 'arquivosDeProducao': {}, 'instrumento': {}}
    exigir(ident['codigo']['commitDeBase'] == BASE, 'identidade.json: o commit de base declarado nao e o esperado')
    exigir(ident['codigo']['statusPorcelainAntesDaExecucao'] == '', 'identidade.json: havia alteracao no diretorio antes da execucao da sonda')
    for rel, esperado in ident['codigo']['sha256DosArquivosDeProducao'].items():
        atual = sha(subprocess.check_output(['git', 'show', f'{BASE}:{rel}']))
        res['arquivosDeProducao'][rel] = {'sha256NaBase': atual, 'sha256DaIdentidade': esperado, 'iguais': atual == esperado}
        exigir(atual == esperado, f'identidade.json: o arquivo de producao {rel} medido nao e o da base')
    arq = sha(ler_bytes(os.path.join(D, 'instrumentos/sonda-sem-vinculo.test.ts.txt')))
    res['instrumento'] = {'sha256DoArquivoArquivado': arq, 'sha256DoArquivoExecutado': ident['codigo']['instrumento']['sha256'], 'iguais': arq == ident['codigo']['instrumento']['sha256']}
    exigir(arq == ident['codigo']['instrumento']['sha256'], 'o instrumento arquivado nao e o que foi executado')
    res['ambiente'] = {k: ident['ambiente'][k] for k in ('node', 'plataforma', 'npm')}
    res['versoesDeJest'] = {'pacotesInstalados': {k: ident['ambiente']['versaoDosPacotesInstalados'][k] for k in ('jest', 'jest-cli', '@jest/core')}, 'impressaPeloCli': ident['ambiente']['jestVersionImpressaPeloCli'], 'contradicao': 'os dois valores e as duas fontes ficam conservados: package.json dos pacotes instalados diz 30.2.0 e `node_modules/.bin/jest --version` imprime 30.1.3; a causa nao foi apurada'}
    res['chamadasDeFetchObservadas'] = ident['rede']['chamadasDeFetchObservadas']
    return res


def analisar_fase_a(D, fontes):
    cap = ler_json(os.path.join(D, 'fase-a/capturas.json'))
    regs = {r['id']: r for r in cap['registros']}
    exigir(len(regs) == 8, f'capturas: {len(regs)} registros, esperado 8')
    saida = {
        'natureza': 'ANALISE da Fase A (captura interrompida): os numeros abaixo sao MEDIDOS por este script sobre os artefatos gravados pela sonda; os campos `leitura` e `classes` sao CLASSIFICACAO POR LEITURA, e nao medicao.',
        'base': BASE,
        'integridade': {},
        'condicoes': {},
    }
    rota_linhas = linhas_numeradas(fontes['rota'])
    lin_tpl = achar_linha_exata(rota_linhas, '${exclusionContext}', 'rota: template do contexto, exclusionContext')
    lin_bloco = achar_unico(rota_linhas, "const blocoDoVinculo = textoDoVinculo === '' ? ''", 'rota: blocoDoVinculo')
    exigir(rota_linhas[lin_tpl].strip() == '${blocoDoVinculo}' and rota_linhas[lin_tpl + 1].strip() == '${fullRespondentList}', 'o template do contexto nao tem as tres linhas esperadas em sequencia')

    # ---- integridade: cada artefato contra o registro da sonda (sha256 e bytes), e a contagem de `vinculo` (Python) contra a da sonda (JS)
    conferidos = 0
    for r in regs.values():
        for chave, rel in (('contexto', r['contexto']['arquivo']), ('jsonEntregue', r['jsonEntregue']['arquivo'])):
            b = ler_bytes(os.path.join(D, rel))
            exigir(sha(b) == r[chave]['sha256'], f'sha256 diverge: {rel}')
            exigir(len(b) == r[chave]['bytes'], f'bytes divergem: {rel}')
            conferidos += 1
        t = ler_texto(os.path.join(D, r['contexto']['arquivo']))
        exigir(len(PALAVRA.findall(t)) == r['contexto']['mencoesAoRadicalVinculo'], f'contagem de "vinculo" diverge entre a sonda (JS) e este script (Python): {r["id"]}')
        exigir(len(t.split('\n')) == r['contexto']['linhas'], f'linhas divergem: {r["id"]}')
        exigir(len(t.encode('utf-8')) == r['contexto']['bytes'], f'bytes do contexto divergem: {r["id"]}')
        exigir(os.path.exists(os.path.join(D, r['objetoPreparado']['arquivo'])), f'objeto preparado ausente: {r["id"]}')
    saida['integridade'] = {'arquivosConferidosContraORegistroDaSonda': conferidos, 'problemas': []}
    saida['identidadeConferida'] = conferir_identidade(D)

    # ---- o transporte: o controle de linguagem (JSON.stringify omite `undefined`), executado, e nao recordado
    p = subprocess.run(['node', '-e', "console.log(process.version); console.log(JSON.stringify({a:1,b:undefined,c:null}))"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    exigir(p.returncode == 0, 'node falhou no controle de JSON.stringify')
    versao_node, texto_stringify = (p.stdout.decode('utf-8').strip().split('\n') + ['', ''])[:2]
    saida['controleDeJsonStringify'] = {
        'comando': 'node -e "console.log(JSON.stringify({a:1,b:undefined,c:null}))"',
        'versaoDoNode': versao_node,
        'saida': texto_stringify,
        'leitura_do_resultado': 'a propriedade com valor undefined e OMITIDA; a com valor null e mantida',
        'confere': texto_stringify == '{"a":1,"c":null}',
    }
    exigir(texto_stringify == '{"a":1,"c":null}', f'JSON.stringify nao omitiu undefined como esperado: {texto_stringify!r}')

    # ---- o instrumento: onde o transporte e exercido (localizadores verificados no texto arquivado)
    instr = ler_texto(os.path.join(D, 'instrumentos/sonda-sem-vinculo.test.ts.txt')).split('\n')
    saida['instrumentoLocalizadores'] = {
        'arquivo': 'instrumentos/sonda-sem-vinculo.test.ts.txt',
        'jsonStringifyDoPayload': achar_unico(instr, 'const jsonEntregue = JSON.stringify(payload);', 'instrumento: JSON.stringify'),
        'requestComOTextoComoCorpo': achar_unico(instr, "const request = new Request('http://localhost/api/ai-reviewer', {", 'instrumento: new Request'),
        'textoLidoDoRequest': achar_unico(instr, 'const textoLido = await request.clone().text();', 'instrumento: clone().text()'),
        'chamadaAoTratadorReal': achar_unico(instr, 'const res = await POST(request as any);', 'instrumento: POST'),
        'leituraDoCorpoPeloTratador': f'{ROTA}:{achar_unico(rota_linhas, "await request.json()", "rota: request.json()")}',
        'declaracao': 'o texto serializado vira o corpo de um `Request` real e o tratador o le com `await request.json()`; NAO ha simulado de `request.json()` que devolva o objeto JavaScript, de modo que a omissao da propriedade `undefined` NAO foi contornada',
    }

    for cond in CONDICOES:
        r = {v: regs[f'{cond}__{v}'] for v in VARIANTES}
        ctx = {v: ler_texto(os.path.join(D, r[v]['contexto']['arquivo'])) for v in VARIANTES}
        jsn = {v: ler_bytes(os.path.join(D, r[v]['jsonEntregue']['arquivo'])) for v in VARIANTES}
        obj = {v: ler_bytes(os.path.join(D, r[v]['objetoPreparado']['arquivo'])) for v in VARIANTES}
        out = {}

        # -- tudo o mais identico em cada par: o JSON entregue do controle, sem a chave do vinculo, e o do caso ausente
        pj = {v: json.loads(jsn[v].decode('utf-8')) for v in VARIANTES}
        sem_chave = {k: x for k, x in pj['controle'].items() if k != 'vinculoDaExecucao'}
        out['todoOMaisIdenticoNoPar'] = {
            'controleSemAChaveIgualAChaveAusente': sem_chave == pj['chave-ausente'],
            'nullSemAChaveIgualAChaveAusente': {k: x for k, x in pj['null'].items() if k != 'vinculoDaExecucao'} == pj['chave-ausente'],
            'chavesDoControle': list(pj['controle'].keys()),
            'chavesDaChaveAusente': list(pj['chave-ausente'].keys()),
            'valorDeNullNoJson': pj['null'].get('vinculoDaExecucao', '<chave ausente>'),
        }
        exigir(sem_chave == pj['chave-ausente'], f'{cond}: o par controle/chave ausente difere em mais do que a chave do vinculo')

        # -- contagens distintas, e as classes de equivalencia, DEPOIS do transporte
        def classes_de(pares):
            grupos = {}
            for v in VARIANTES:
                grupos.setdefault(pares[v], []).append(v)
            return list(grupos.values())

        sha_ctx = {v: sha(ctx[v].encode('utf-8')) for v in VARIANTES}
        sha_jsn = {v: sha(jsn[v]) for v in VARIANTES}
        sha_obj = {v: sha(obj[v]) for v in VARIANTES}
        out['contagensDistintas'] = {'objetosPreparados': len(set(sha_obj.values())), 'jsonsEntreguesAoTratador': len(set(sha_jsn.values())), 'contextos': len(set(sha_ctx.values()))}
        out['classesDeEquivalencia'] = {'objetosPreparados': classes_de(sha_obj), 'jsonsEntregues': classes_de(sha_jsn), 'contextos': classes_de(sha_ctx)}
        out['sha256'] = {'contextos': sha_ctx, 'jsonsEntregues': sha_jsn, 'objetosPreparados': sha_obj}
        out['transporte'] = {
            'chaveAusenteIgualAUndefinedExplicito': {
                'objetoPreparadoDifere': sha_obj['chave-ausente'] != sha_obj['undefined-explicito'],
                'objetoPreparadoDeUndefinedTemAChave': r['undefined-explicito']['objetoPreparado']['temAChaveVinculoDaExecucao'],
                'objetoPreparadoDeChaveAusenteTemAChave': r['chave-ausente']['objetoPreparado']['temAChaveVinculoDaExecucao'],
                'jsonEntregueByteAByteIgual': jsn['chave-ausente'] == jsn['undefined-explicito'],
                'jsonEntregueDeUndefinedContemAChave': r['undefined-explicito']['jsonEntregue']['contemAChaveVinculoNoTexto'],
                'contextoByteAByteIgual': ctx['chave-ausente'] == ctx['undefined-explicito'],
            },
            'nullNoJsonDifereDaChaveAusente': {
                'jsonEntregueDeNullContemAChave': r['null']['jsonEntregue']['contemAChaveVinculoNoTexto'],
                'trechoDoCampoNoJson': r['null']['jsonEntregue']['trechoDoCampo'],
                'bytesAMaisQueAChaveAusente': len(jsn['null']) - len(jsn['chave-ausente']),
                'bytesDoTrechoMaisAVirgula': len('"vinculoDaExecucao":null,'.encode('utf-8')),
                'contextoByteAByteIgualAoDaChaveAusente': ctx['null'] == ctx['chave-ausente'],
            },
            'textoLidoDoRequestIgualAoSerializado': {v: r[v]['jsonEntregue']['textoLidoDoRequestIgualAoSerializado'] for v in VARIANTES},
        }
        exigir(jsn['chave-ausente'] == jsn['undefined-explicito'], f'{cond}: o JSON de undefined nao e byte a byte igual ao da chave ausente')
        exigir(not r['undefined-explicito']['jsonEntregue']['contemAChaveVinculoNoTexto'], f'{cond}: o JSON de undefined contem a chave')
        exigir(len(jsn['null']) - len(jsn['chave-ausente']) == len('"vinculoDaExecucao":null,'.encode('utf-8')), f'{cond}: o JSON de null nao difere so pelo trecho do campo')

        # -- o diff do controle contra CADA variante ausente (GNU diff, formato normal), gravado uma vez por condicao
        diffs, hashes = {}, {}
        for v in AUSENTES:
            codigo, texto = diff_normal(os.path.join(D, r['controle']['contexto']['arquivo']), os.path.join(D, r[v]['contexto']['arquivo']))
            exigir(codigo == 1, f'{cond}: diff controle x {v} saiu {codigo}, esperado 1 (diferem)')
            diffs[v] = texto
            hashes[v] = sha(texto.encode('utf-8'))
        exigir(len(set(hashes.values())) == 1, f'{cond}: os tres diffs do controle contra as variantes ausentes nao sao iguais')
        arq_diff = f'fase-a/diffs/{cond}__controle_x_ausente.diff'
        out['diff'] = {
            'comando': 'diff <contexto do controle> <contexto da variante>   (GNU diffutils, formato normal; calculado uma vez por variante ausente)',
            'arquivo': arq_diff,
            'sha256DoDiffPorVariante': hashes,
            'osTresDiffsSaoIguais': len(set(hashes.values())) == 1,
            'hunks': hunks_do_diff(diffs['chave-ausente']),
            'linhasRemovidasNoAusente': sum(1 for l in diffs['chave-ausente'].split('\n') if l.startswith('< ')),
            'linhasAcrescentadasNoAusente': sum(1 for l in diffs['chave-ausente'].split('\n') if l.startswith('> ')),
        }
        saida_diff = diffs['chave-ausente']

        # -- as linhas que existem SO no caso ausente (multiconjunto de linhas nao brancas), com o localizador no contexto medido
        lc, la = ctx['controle'].split('\n'), ctx['chave-ausente'].split('\n')
        so_a, so_c = bag(la) - bag(lc), bag(lc) - bag(la)
        achadas, restantes = [], Counter(so_a)
        for i, l in enumerate(la, 1):
            if l.strip() == '' or restantes[l] <= 0:
                continue
            restantes[l] -= 1
            alvo = [f for f in FRASES if cond in f['cond'] and l.startswith(f['prefixo'])]
            exigir(len(alvo) == 1, f'{cond}: a linha {i} do contexto ausente tem {len(alvo)} entradas na tabela de leitura: {l[:80]!r}')
            if len(alvo) != 1:
                continue
            f = alvo[0]
            achadas.append({
                'id': f['id'],
                'linhaNoContextoDaCaptura': i,
                'arquivoDoContexto': r['chave-ausente']['contexto']['arquivo'],
                'texto': l,
                'localizadorNaFonte': f'{ROTA}:{f["linha"]}',
                'classesDeLeitura': f['classes'],
                'leitura': f['leitura'],
                'tipoDoRegistro': 'LEITURA (classificacao), nao medicao',
            })
        esperadas = sorted(f['id'] for f in FRASES if cond in f['cond'])
        exigir(sorted(a['id'] for a in achadas) == esperadas, f'{cond}: frases medidas {sorted(a["id"] for a in achadas)} != tabela {esperadas}')
        out['frasesSoNoCasoAusente'] = achadas
        out['contagemDeLinhasNaoBrancas'] = {'soNoAusente': sum(so_a.values()), 'soNoControle': sum(so_c.values()), 'doControle': sum(bag(lc).values()), 'doAusente': sum(bag(la).values())}
        out['linhasDoControleQueSaemNoAusente'] = {'total': sum(so_c.values()), 'doBlocoDoVinculo': None}

        # -- o bloco do vinculo, e o que ele deixa no texto quando vem vazio
        idx_marc = next((i for i, l in enumerate(lc) if l.startswith(MARCADOR_DO_BLOCO)), None)
        idx_lista_c = next(i for i, l in enumerate(lc) if l.startswith(CABECALHO_DA_LISTA))
        idx_lista_a = next(i for i, l in enumerate(la) if l.startswith(CABECALHO_DA_LISTA))
        fim_bloco = next((i for i in range(idx_marc, len(lc)) if lc[i].startswith('⚠ Limites: este bloco')), None) if idx_marc is not None else None
        n_bloco = (fim_bloco - idx_marc + 1) if fim_bloco is not None else None
        out['linhasDoControleQueSaemNoAusente']['doBlocoDoVinculo'] = n_bloco
        n_a, ultima_a, texto_a = corrida_de_brancos_antes(la, idx_lista_a)
        n_c, ultima_c, texto_c = corrida_de_brancos_antes(lc, idx_marc)
        entre = la[ultima_a:idx_lista_a]
        out['blocoDoVinculo'] = {
            'ausente': {
                'marcadorDoBlocoOcorrencias': ctx['chave-ausente'].count(MARCADOR_DO_BLOCO),
                'linhaDoCabecalhoDaLista': idx_lista_a + 1,
                'linhasEmBrancoConsecutivasAntesDoCabecalhoDaLista': n_a,
                'ultimaLinhaNaoBrancaAntes': {'linha': ultima_a, 'inicio': texto_a[:80]},
                'linhasEntreEssaLinhaEOCabecalho': len(entre),
                'todasEmBranco': all(x.strip() == '' for x in entre),
            },
            'controle': {
                'marcadorDoBlocoOcorrencias': ctx['controle'].count(MARCADOR_DO_BLOCO),
                'linhaDoMarcador': (idx_marc + 1) if idx_marc is not None else None,
                'linhasDoBloco': n_bloco,
                'linhasEmBrancoConsecutivasAntesDoMarcador': n_c,
                'ultimaLinhaNaoBrancaAntes': {'linha': ultima_c, 'inicio': texto_c[:80]},
            },
            'leitura': 'o bloco vem VAZIO e aparece no texto so como linhas em branco: nenhuma palavra, nenhum marcador, nenhum aviso de que o campo nao veio',
            'leituraDoCodigo': f'{ROTA}:{lin_tpl}-{lin_tpl + 2} monta "${{exclusionContext}}\\n${{blocoDoVinculo}}\\n${{fullRespondentList}}", e {ROTA}:{lin_bloco} faz blocoDoVinculo = "" quando o texto do vinculo e vazio',
        }
        exigir(out['blocoDoVinculo']['ausente']['marcadorDoBlocoOcorrencias'] == 0, f'{cond}: o marcador do bloco aparece no contexto ausente')
        exigir(out['blocoDoVinculo']['ausente']['todasEmBranco'], f'{cond}: ha texto entre a ultima linha nao branca e o cabecalho da lista, no contexto ausente')
        exigir(out['blocoDoVinculo']['controle']['marcadorDoBlocoOcorrencias'] == 1, f'{cond}: o marcador do bloco nao aparece exatamente uma vez no controle')

        # -- as mencoes a `vinculo`, uma a uma: as que o SISTEMA escreve, e a do titulo sintetico que a propria sonda forneceu
        out['mencoesAVinculo'] = {}
        for v in ('controle', 'chave-ausente'):
            m = mencoes_por_linha(ctx[v])
            total = sum(x['ocorrencias'] for x in m)
            do_titulo = sum(x['ocorrencias'] for x in m if x['origem'].startswith('titulo'))
            out['mencoesAVinculo'][v] = {'total': total, 'doTituloSinteticoDaSonda': do_titulo, 'doTextoDoSistema': total - do_titulo, 'porLinha': m}
        exigir(out['mencoesAVinculo']['chave-ausente']['doTextoDoSistema'] == 0, f'{cond}: o sistema escreve "vinculo" no contexto do caso ausente')
        out['mencoesAVinculo']['observacao'] = 'a contagem 1 que a sonda registra para o contexto ausente e a do TITULO do projeto, que a propria sonda forneceu ("Projeto da sonda sem vinculo", linha 4): nao e mencao do sistema'

        # -- o prompt de sistema nao varia com o campo
        saida['condicoes'][cond] = out
        gravar = os.path.join(D, arq_diff)
        saida['condicoes'][cond]['_gravar'] = (gravar, saida_diff)

    systems = {(x['chamadaAoCliente']['systemSha256'], x['chamadaAoCliente']['systemBytes']) for x in regs.values()}
    saida['promptDeSistema'] = {'valoresDistintosDeSha256ETamanhoNasOitoCapturas': len(systems), 'sha256': sorted(systems)[0][0], 'bytes': sorted(systems)[0][1], 'leitura': 'o prompt de sistema NAO varia com o campo'}
    exigir(len(systems) == 1, 'o prompt de sistema varia entre as capturas')
    saida['mensagensDoCliente'] = {'numeroDeChamadasPorCaptura': sorted({x['chamadaAoCliente']['n'] for x in regs.values()}), 'chamadasDeRede': sorted({x['chamadasDeRede'] for x in regs.values()})}
    saida['determinismoEntreDuasPassadas'] = {'todasAsOitoCapturasIguaisNasDuasPassadas': all(d['contextoIgualNasDuasPassadas'] and d['jsonEntregueIgualNasDuasPassadas'] for d in cap['determinismoEntreDuasPassadas']), 'capturas': len(cap['determinismoEntreDuasPassadas'])}

    # -- agregado entre as condicoes
    todos_ctx = {sha(ler_bytes(os.path.join(D, r['contexto']['arquivo']))) for r in regs.values()}
    todos_json = {r['jsonEntregue']['sha256'] for r in regs.values()}
    saida['totaisDasOitoCapturas'] = {'contextosDistintos': len(todos_ctx), 'jsonsEntreguesDistintos': len(todos_json), 'objetosPreparadosDistintos': len({sha(ler_bytes(os.path.join(D, r['objetoPreparado']['arquivo']))) for r in regs.values()})}
    return saida


def projetar_sem_timestamp_texto(texto):
    """Projecao TEXTUAL: troca SOMENTE o valor de `metadata.timestamp` (uma unica ocorrencia no corpo), sem reserializar."""
    achados = re.findall(r'"timestamp":"[^"]*"', texto)
    exigir(len(achados) == 1, f'o corpo tem {len(achados)} ocorrencias de "timestamp"; esperado 1')
    return re.sub(r'"timestamp":"[^"]*"', '"timestamp":"<EXCLUIDO>"', texto), (achados[0] if achados else None)


def caminhos_de_folha(obj, prefixo='', acc=None):
    """Os caminhos de chave de um valor JSON, na MESMA convencao da sonda (`caminhosDeChave`, no instrumento): cada chave entra como
    `pai.chave`; os elementos de um array entram sob `pai[]`; um array vazio acrescenta `pai[]` e um objeto vazio acrescenta `pai{}`."""
    acc = [] if acc is None else acc
    if isinstance(obj, list):
        if len(obj) == 0:
            acc.append(f'{prefixo}[]')
        for x in obj:
            caminhos_de_folha(x, f'{prefixo}[]', acc)
    elif isinstance(obj, dict):
        if len(obj) == 0:
            acc.append(f'{prefixo}{{}}')
        for k, v in obj.items():
            p = f'{prefixo}.{k}' if prefixo else k
            acc.append(p)
            caminhos_de_folha(v, p, acc)
    return acc


def folhas(obj, prefixo=''):
    """Dicionario caminho -> valor, so das folhas (listas indexadas), para comparar dois corpos campo a campo."""
    saida = {}
    if isinstance(obj, dict):
        if not obj and prefixo:
            saida[prefixo] = {}
        for k, v in obj.items():
            saida.update(folhas(v, f'{prefixo}.{k}' if prefixo else k))
    elif isinstance(obj, list):
        if not obj:
            saida[prefixo] = []
        for i, v in enumerate(obj):
            saida.update(folhas(v, f'{prefixo}[{i}]'))
    else:
        saida[prefixo] = obj
    return saida


def diferencas_de_folhas(a, b):
    fa, fb = folhas(a), folhas(b)
    return [{'caminho': k, 'a': fa.get(k, '<ausente>'), 'b': fb.get(k, '<ausente>')} for k in sorted(set(fa) | set(fb)) if fa.get(k, '<ausente>') != fb.get(k, '<ausente>')]


def analisar_fase_b(D, fase_a):
    exe = ler_json(os.path.join(D, 'fase-b/execucoes.json'))
    regs = {r['id']: r for r in exe['registros']}
    exigir(len(regs) == 4, f'execucoes: {len(regs)} registros, esperado 4')
    ident = ler_json(os.path.join(D, 'identidade.json'))
    saida = {
        'natureza': 'ANALISE da Fase B (texto fixado, tratador concluindo): numeros MEDIDOS por este script sobre os corpos integrais gravados pela sonda.',
        'base': BASE,
        'limites': [
            'o texto fixado e o MESMO nos quatro ensaios, e nenhum modelo foi chamado: nada aqui diz o que um modelo geraria',
            'dos tres estados da extracao (padrao_reconhecido, nenhum_padrao_reconhecido, nao_executada_por_suspensao) so dois foram exercidos: padrao_reconhecido (nos dois ensaios nao suspensos) e nao_executada_por_suspensao (nos dois suspensos); nenhum_padrao_reconhecido NAO foi variado',
            'uma so causa de suspensao foi exercida (contradicao interna, regra V5); as demais nao foram variadas',
            'a condicao de exclusao ficou fixa (sem exclusao) nos quatro ensaios',
        ],
    }

    corpos, textos, objs = {}, {}, {}
    for i, r in regs.items():
        b = ler_bytes(os.path.join(D, r['corpo']['arquivo']))
        exigir(sha(b) == r['corpo']['sha256'], f'sha256 do corpo diverge: {i}')
        exigir(len(b) == r['corpo']['bytes'], f'bytes do corpo divergem: {i}')
        exigir(b.count(b'\n') == 0, f'o corpo {i} tem quebra de linha: nao e o JSON compacto do tratador')
        textos[i] = b.decode('utf-8')
        objs[i] = json.loads(textos[i])
        corpos[i] = b
        j = ler_bytes(os.path.join(D, r['jsonEntregue']['arquivo']))
        exigir(sha(j) == r['jsonEntregue']['sha256'], f'sha256 do JSON entregue diverge: {i}')

    # ---- o texto fixado: o mesmo nos quatro, e e o `review` de cada corpo
    reviews = {i: objs[i]['review'] for i in regs}
    unico = set(reviews.values())
    exigir(len(unico) == 1, 'o campo review difere entre os quatro corpos')
    texto = next(iter(unico))
    saida['textoFixado'] = {
        'sha256Utf8': sha(texto.encode('utf-8')),
        'sha256DeIdentidadeJson': ident['dados']['textoFixadoDaFaseB']['sha256'],
        'confere': sha(texto.encode('utf-8')) == ident['dados']['textoFixadoDaFaseB']['sha256'],
        'caracteresEmUnidadesUtf16': len(texto.encode('utf-16-le')) // 2,
        'caracteresDeIdentidadeJson': ident['dados']['textoFixadoDaFaseB']['caracteres'],
        'pontosDeCodigo': len(texto),
        'bytesUtf8': len(texto.encode('utf-8')),
        'observacao': 'o JavaScript conta unidades UTF-16 (os tres emojis dos titulos valem 2 cada) e o Python conta pontos de codigo: 356 e 353 sao o mesmo texto',
        'iguaisNosQuatroCorpos': len(unico) == 1,
        'texto': texto,
    }
    exigir(saida['textoFixado']['confere'], 'o sha256 do texto fixado nao confere com identidade.json')
    exigir(saida['textoFixado']['caracteresEmUnidadesUtf16'] == saida['textoFixado']['caracteresDeIdentidadeJson'], 'comprimento UTF-16 do texto fixado diverge de identidade.json')

    # ---- por ensaio: o resumo medido
    ensaios = []
    for i, r in regs.items():
        o = objs[i]
        ensaios.append({
            'id': i, 'classificacao': r['classificacao'], 'variante': r['variante'],
            'corpo': {'arquivo': r['corpo']['arquivo'], 'sha256': r['corpo']['sha256'], 'bytes': r['corpo']['bytes'], 'status': r['corpo']['status']},
            'jsonEntregueContemAChave': r['jsonEntregue']['contemAChaveVinculoNoTexto'],
            'nota': o['nota'], 'veredicto': o['veredicto'],
            'estadoDaExtracao': o['metadata']['estadoDaExtracao'],
            'notaSuspensa': o['notaSuspensa'] if o['notaSuspensa'] is None else {k: o['notaSuspensa'][k] for k in ('suspensa', 'causa', 'rotulo', 'motivo')},
            'validacaoA27': {k: o['validation'][k] for k in ('version', 'estado', 'isValid')} | {'nIssues': len(o['validation']['issues']), 'nWarnings': len(o['validation']['warnings']), 'nInconclusivos': len(o['validation']['inconclusivos'])},
            'avaliacaoDeQualidade': o['metadata']['avaliacaoDeQualidade'],
            'timestamp': o['metadata']['timestamp'],
        })
    saida['ensaios'] = ensaios
    susp = next(e for e in ensaios if e['classificacao'] == 'suspensa-contradicao')['notaSuspensa']
    saida['causaDaSuspensao'] = {'causa': susp['causa'], 'motivo': susp['motivo'], 'comoFoiProduzida': None}

    # a causa produzida: o que difere entre o payload elegivel e o suspenso (campo a campo, dos JSON entregues)
    pj = {i: json.loads(ler_texto(os.path.join(D, regs[i]['jsonEntregue']['arquivo']))) for i in regs}
    dif_payload = {v: diferencas_de_folhas(pj[f'elegivel__{v}'], pj[f'suspensa-contradicao__{v}']) for v in ('controle', 'chave-ausente')}
    saida['causaDaSuspensao']['comoFoiProduzida'] = {'diferencasDoPayloadElegivelParaOSuspenso': dif_payload, 'iguaisNasDuasVariantes': dif_payload['controle'] == dif_payload['chave-ausente']}
    exigir(dif_payload['controle'] == dif_payload['chave-ausente'], 'a alteracao que produz a suspensao nao e a mesma nas duas variantes')

    # ---- a enumeracao das chaves, e a pergunta direta, POR ENUMERACAO
    enum = {}
    for i in regs:
        o = objs[i]
        caminhos = caminhos_de_folha(o)
        exigir(caminhos == regs[i]['caminhosDeChave'], f'caminhos de chave divergem do registro da sonda: {i}')
        valores_de_texto = [(p, v) for p, v in folhas(o).items() if isinstance(v, str)]
        nas_chaves = [p for p in caminhos if RADICAL.search(p)]
        nos_valores = [p for p, v in valores_de_texto if RADICAL.search(v)]
        enum[i] = {
            'chavesDeNivelPrincipal': list(o.keys()),
            'chavesDeMetadata': list(o['metadata'].keys()),
            'totalDeCaminhosDeChave': len(caminhos),
            'caminhosComRadicalDoVinculoNoNome': nas_chaves,
            'valoresDeTextoComRadicalDoVinculo': nos_valores,
            'totalDeValoresDeTexto': len(valores_de_texto),
            'caminhosDeChave': caminhos,
        }
        exigir(not nas_chaves and not nos_valores, f'{i}: ha mencao ao vinculo no corpo: {nas_chaves} {nos_valores}')
    iguais_nivel = len({tuple(e['chavesDeNivelPrincipal']) for e in enum.values()}) == 1
    iguais_meta = len({tuple(e['chavesDeMetadata']) for e in enum.values()}) == 1
    saida['enumeracaoDeChaves'] = {
        'chavesDeNivelPrincipalIguaisNosQuatro': iguais_nivel,
        'chavesDeMetadataIguaisNosQuatro': iguais_meta,
        'chavesDeNivelPrincipal': enum['elegivel__controle']['chavesDeNivelPrincipal'],
        'chavesDeMetadata': enum['elegivel__controle']['chavesDeMetadata'],
        'porEnsaio': {i: {k: v for k, v in e.items() if k != 'caminhosDeChave'} for i, e in enum.items()},
        'caminhosDeChavePorEnsaio': {i: e['caminhosDeChave'] for i, e in enum.items()},
    }
    exigir(iguais_nivel and iguais_meta, 'as chaves de nivel principal ou de metadata diferem entre os ensaios')
    # os dois caminhos que mais se aproximariam do assunto, com os valores medidos (para que a resposta nao dependa so do radical)
    proximos = {i: {'metadata.avaliacaoDeQualidade': objs[i]['metadata']['avaliacaoDeQualidade'], 'metadata.estadoDaExtracao': objs[i]['metadata']['estadoDaExtracao']} for i in regs}
    saida['perguntaDireta'] = {
        'pergunta': 'existe algum campo do corpo que diga o estado do vinculo, ou que diga que o vinculo veio ausente?',
        'tecnica': 'ENUMERACAO: os caminhos de chave dos quatro corpos (nivel principal e `metadata`), buscando o radical "vincul" no nome de cada caminho e no valor de cada texto, mais a comparacao campo a campo entre controle e ausente (abaixo)',
        'resposta': 'NAO. Nos quatro corpos, zero caminhos de chave e zero valores de texto contem o radical do vinculo, e nenhum campo tem valor diferente entre controle e chave ausente alem de metadata.timestamp.',
        'caminhosComRadicalNoNome': sum(len(e['caminhosComRadicalDoVinculoNoNome']) for e in enum.values()),
        'valoresComRadical': sum(len(e['valoresDeTextoComRadicalDoVinculo']) for e in enum.values()),
        'camposMaisProximosDoAssunto': proximos,
        'limite': 'a resposta vale para estes quatro corpos, com o texto fixado e a extracao em dois dos tres estados; nao diz o que um corpo traria em outro estado da extracao',
    }

    # ---- o diff bruto, byte a byte, e a projecao sem `metadata.timestamp`
    comparacoes = {}
    for cl in CLASSES:
        c, a = f'{cl}__controle', f'{cl}__chave-ausente'
        bc, ba = corpos[c], corpos[a]
        exigir(len(bc) == len(ba), f'{cl}: os corpos tem tamanhos diferentes ({len(bc)} x {len(ba)})')
        pos = [k for k in range(min(len(bc), len(ba))) if bc[k] != ba[k]]
        inicio_ts = textos[c].encode('utf-8').find(b'"timestamp":"') + len(b'"timestamp":"')
        fim_ts = textos[c].encode('utf-8').find(b'"', inicio_ts)
        pc, tc = projetar_sem_timestamp_texto(textos[c])
        pa, ta = projetar_sem_timestamp_texto(textos[a])
        proj_json_c = json.loads(textos[c]); proj_json_c['metadata'].pop('timestamp')
        proj_json_a = json.loads(textos[a]); proj_json_a['metadata'].pop('timestamp')
        comparacoes[cl] = {
            'diffBruto': {
                'corposByteAByteIdenticos': bc == ba,
                'sha256': {'controle': sha(bc), 'chaveAusente': sha(ba)},
                'bytes': {'controle': len(bc), 'chaveAusente': len(ba)},
                'posicoesQueDiferem': [{'posicaoBase1': k + 1, 'controle': chr(bc[k]), 'chaveAusente': chr(ba[k])} for k in pos],
                'numeroDePosicoesQueDiferem': len(pos),
                'valorDoTimestampNoControle': tc,
                'valorDoTimestampNaChaveAusente': ta,
                'intervaloDoValorDoTimestampNoCorpo': {'inicioBase1': inicio_ts + 1, 'fimBase1': fim_ts},
                'todasAsPosicoesQueDiferemEstaoDentroDoValorDoTimestamp': all(inicio_ts <= k < fim_ts for k in pos),
                'comando_equivalente': 'cmp -l <corpo do controle> <corpo da chave ausente>',
            },
            'projecaoSemOTimestamp': {
                'campoExcluido': 'metadata.timestamp (route.ts:1512, `new Date().toISOString()`), E MAIS NENHUM OUTRO',
                'projecaoTextual': {'tecnica': 'troca do valor do unico "timestamp" do corpo por um marcador fixo, sem reserializar', 'igual': pc == pa, 'sha256': {'controle': sha(pc.encode('utf-8')), 'chaveAusente': sha(pa.encode('utf-8'))}},
                'projecaoDeJson': {'tecnica': 'JSON analisado, `metadata.timestamp` removido, comparacao dos objetos', 'igual': proj_json_c == proj_json_a, 'diferencasCampoACampo': diferencas_de_folhas(proj_json_c, proj_json_a)},
            },
            'diferencasQueRestamAposAProjecao': diferencas_de_folhas(proj_json_c, proj_json_a),
        }
        exigir(not bc == ba, f'{cl}: os corpos sao byte a byte iguais (esperado: so o timestamp difere)')
        exigir(all(inicio_ts <= k < fim_ts for k in pos), f'{cl}: ha diferenca bruta FORA do valor de metadata.timestamp')
        exigir(pc == pa, f'{cl}: a projecao textual sem timestamp difere')
        exigir(proj_json_c == proj_json_a, f'{cl}: a projecao de JSON sem timestamp difere')
    saida['comparacaoControleXAusente'] = comparacoes

    # ---- interacao com a suspensao: no corpo e no contexto
    def projetado(i):
        o = json.loads(textos[i]); o['metadata'].pop('timestamp'); return o
    efeito_corpo = {v: diferencas_de_folhas(projetado(f'elegivel__{v}'), projetado(f'suspensa-contradicao__{v}')) for v in ('controle', 'chave-ausente')}
    # contextos: os elegiveis sao os da Fase A, sem exclusao (sha256 igual ao registrado na Fase B); os suspensos sao os da propria Fase B
    ctx_b = {}
    for i, r in regs.items():
        ctx_b[i] = ler_texto(os.path.join(D, r['contexto']['arquivo']))
        exigir(sha(ctx_b[i].encode('utf-8')) == r['contexto']['sha256'], f'sha256 do contexto da Fase B diverge: {i}')
    equivalencia_com_a = {}
    for v, vA in (('controle', 'controle'), ('chave-ausente', 'chave-ausente')):
        shaA = fase_a['condicoes']['sem-exclusao']['sha256']['contextos'][vA]
        equivalencia_com_a[f'elegivel__{v}'] = sha(ctx_b[f'elegivel__{v}'].encode('utf-8')) == shaA
        exigir(equivalencia_com_a[f'elegivel__{v}'], f'o contexto elegivel {v} da Fase B nao e o da captura sem exclusao da Fase A')
    L = lambda i: ctx_b[i].split('\n')
    efeito_contexto, delta_suspensao = {}, {}
    for v in ('controle', 'chave-ausente'):
        e, s = L(f'elegivel__{v}'), L(f'suspensa-contradicao__{v}')
        delta_suspensao[v] = (bag(s) - bag(e), bag(e) - bag(s))
    for cl in CLASSES:
        c, a = L(f'{cl}__controle'), L(f'{cl}__chave-ausente')
        efeito_contexto[cl] = (bag(a) - bag(c), bag(c) - bag(a))
    saida['interacaoComASuspensao'] = {
        'pergunta': 'a ausencia do campo interage com a suspensao, ou os dois eixos sao independentes?',
        'noCorpo': {
            'efeitoDaSuspensaoNoCorpoProjetado': {v: [d['caminho'] for d in efeito_corpo[v]] for v in efeito_corpo},
            'osDoisEfeitosSaoIguais': efeito_corpo['controle'] == efeito_corpo['chave-ausente'],
            'efeitoDaAusenciaNoCorpoProjetadoDentroDeCadaClasse': {cl: [d['caminho'] for d in comparacoes[cl]['diferencasQueRestamAposAProjecao']] for cl in CLASSES},
            'projecaoExcluiSomente': 'metadata.timestamp',
        },
        'noContexto': {
            'contextosElegiveisDaFaseBSaoOsDaFaseASemExclusao': equivalencia_com_a,
            'efeitoDaSuspensaoSoNoSuspenso_linhasAcrescentadas': {v: sum(delta_suspensao[v][0].values()) for v in delta_suspensao},
            'efeitoDaSuspensaoSoNoElegivel_linhasRetiradas': {v: sum(delta_suspensao[v][1].values()) for v in delta_suspensao},
            'oEfeitoDaSuspensaoNoContextoETaoIgualNasDuasVariantes': delta_suspensao['controle'] == delta_suspensao['chave-ausente'],
            'efeitoDaAusenciaDentroDaClasseElegivel_linhasSoNoAusente_e_soNoControle': [sum(efeito_contexto['elegivel'][0].values()), sum(efeito_contexto['elegivel'][1].values())],
            'efeitoDaAusenciaDentroDaClasseSuspensa_linhasSoNoAusente_e_soNoControle': [sum(efeito_contexto['suspensa-contradicao'][0].values()), sum(efeito_contexto['suspensa-contradicao'][1].values())],
            'oEfeitoDaAusenciaNoContextoEIgualNasDuasClasses': efeito_contexto['elegivel'] == efeito_contexto['suspensa-contradicao'],
        },
        'leitura': None,
    }
    inter = saida['interacaoComASuspensao']
    independentes = inter['noCorpo']['osDoisEfeitosSaoIguais'] and inter['noContexto']['oEfeitoDaSuspensaoNoContextoETaoIgualNasDuasVariantes'] and inter['noContexto']['oEfeitoDaAusenciaNoContextoEIgualNasDuasClasses']
    inter['leitura'] = ('nos quatro ensaios, os dois eixos sao independentes: o efeito da suspensao e o mesmo conjunto de campos (corpo projetado) e de linhas (contexto) com e sem o campo, e o efeito da ausencia e o mesmo conjunto de linhas de contexto com e sem suspensao; '
                        'o corpo, nas duas classes, so difere entre controle e ausente em metadata.timestamp' if independentes else 'HA INTERACAO: ver os conjuntos acima')
    saida['conclusaoDaIndependencia'] = independentes
    return saida


def analisar_fase_c(D, fase_b, fontes):
    ren = ler_json(os.path.join(D, 'fase-c/renderizacoes.json'))
    regs = {r['id']: r for r in ren['registros']}
    exigir(len(regs) == 4, f'renderizacoes: {len(regs)} registros, esperado 4')
    saida = {
        'natureza': 'ANALISE da Fase C: RENDERIZACAO DO COMPONENTE real `components/ParecerAISection.tsx` com os quatro corpos da Fase B. NAO e a pagina no navegador, NAO demonstra o conteudo que um modelo geraria e NAO demonstra o comportamento da pagina completa.',
        'base': BASE,
    }
    # ---- o aiReview montado como a tela monta (page.tsx:1363-1371), conferido contra o fonte da base
    pag = linhas_numeradas(fontes['pagina'])
    ini = achar_unico(pag, '// Setar objeto completo com nota, veredicto e review', 'page.tsx: comentario que precede o setAiReview do sucesso') + 1
    exigir(pag[ini - 1].strip() == 'setAiReview({', f'a linha seguinte ao comentario nao e setAiReview({{: {pag[ini - 1]!r}')
    trecho = pag[ini - 1: ini + 9]
    chaves_da_tela = [m.group(1) for l in trecho for m in [re.match(r'^\s*(nota|veredicto|notaSuspensa|mensagemDaExtracao|review|validation|metadata)\b', l)] if m]
    chaves_da_sonda = regs['elegivel__controle']['aiReview']['chaves']
    saida['aiReviewMontado'] = {
        'fonteDaMontagem': f'{PAGINA}:{ini}-{ini + 8}',
        'chavesNaOrdemDaTela': chaves_da_tela,
        'chavesDoAiReviewDaSonda': chaves_da_sonda,
        'iguais': chaves_da_tela == chaves_da_sonda,
        'regraDe_notaSuspensa_e_mensagemDaExtracao': 'ambos com `?? null`, como na tela',
        'textoDasLinhasDaTela': [l.strip() for l in trecho],
    }
    exigir(chaves_da_tela == chaves_da_sonda and len(chaves_da_sonda) == 7, f'o aiReview da sonda nao tem as chaves da tela: {chaves_da_tela} x {chaves_da_sonda}')
    # ---- o portao do destaque (as tres condicoes), lido no componente
    comp = linhas_numeradas(fontes['componente'])
    linha_portao = achar_unico(comp, 'presentation?.estado', 'componente: portao do destaque')
    saida['portaoDoDestaque'] = {'localizador': f'{COMPONENTE}:{linha_portao}', 'linhaLida': comp[linha_portao - 1].strip(), 'condicoes': ['classificacao nao suspensa', "presentation?.estado === 'aprovado'", 'nota ou veredicto nao nulos']}

    # ---- por ensaio
    ensaios = []
    for i, r in regs.items():
        h_arquivo = ler_bytes(os.path.join(D, r['renderizacao']['html']['arquivo']))
        exigir(h_arquivo.endswith(b'\n') and not h_arquivo.endswith(b'\n\n'), f'o arquivo HTML de {i} nao termina em exatamente um LF')
        h = h_arquivo[:-1] if h_arquivo.endswith(b'\n') else h_arquivo   # a sonda grava `html + LF` e registra o sha256 de `html`, sem o LF
        exigir(sha(h) == r['renderizacao']['html']['sha256'], f'sha256 do HTML (sem o LF final que a sonda acrescenta ao arquivo) diverge: {i}')
        ht = h.decode('utf-8')
        ensaios.append({
            'id': i, 'classificacao': r['classificacao'], 'variante': r['variante'],
            'estadoDeA27': r['estadoDeA27'],
            'textoFixadoQueProduziuOEstado': {'sha256': fase_b['textoFixado']['sha256Utf8'], 'caracteresEmUnidadesUtf16': fase_b['textoFixado']['caracteresEmUnidadesUtf16']},
            'portaoDoDestaque': r['portaoDoDestaque'],
            'oQueSeExibe': {k: r['renderizacao'][k] for k in ('destaque', 'avisoDeQuarentena', 'avisosDaVerificacao', 'cartaoDeSuspensao', 'mensagemDaExtracao', 'titulosDeBlocosDeStatus', 'corpoDoTexto')},
            'html': {'arquivo': r['renderizacao']['html']['arquivo'], 'sha256': sha(h), 'bytes': len(h)},
            'mencoesAVinculoNoHtml': len(PALAVRA.findall(ht)),
            'mencoesAoRadicalAmploNoHtml': len(RADICAL.findall(ht)),
        })
        exigir(r['estadoDeA27']['estado'] == 'aprovado', f'{i}: A.27 nao esta aprovado')
        exigir(len(PALAVRA.findall(ht)) == r['renderizacao']['mencoesAoRadicalVinculoNoHtml'], f'{i}: contagem de "vinculo" no HTML diverge entre a sonda e o script')
    saida['ensaios'] = ensaios
    exigir(any(e['portaoDoDestaque']['condicao1_classificacaoNaoSuspensa'] and e['portaoDoDestaque']['condicao2_apresentacaoAprovada'] and e['portaoDoDestaque']['condicao3_notaOuVeredictoNaoNulos'] for e in ensaios), 'o portao do destaque esta fechado em todos os ensaios (criterio de bloqueio 7)')
    saida['portaoAbertoEm'] = [e['id'] for e in ensaios if all(e['portaoDoDestaque'].values())]

    # ---- a comparacao controle x ausente, por classe, sobre os HTML (sha256 recomputado dos arquivos)
    comp_html = {}
    for cl in CLASSES:
        c = next(e for e in ensaios if e['id'] == f'{cl}__controle')
        a = next(e for e in ensaios if e['id'] == f'{cl}__chave-ausente')
        hc = ler_bytes(os.path.join(D, c['html']['arquivo']))[:-1]
        ha = ler_bytes(os.path.join(D, a['html']['arquivo']))[:-1]
        comp_html[cl] = {'htmlByteAByteIgual': hc == ha, 'sha256Controle': sha(hc), 'sha256ChaveAusente': sha(ha), 'bytes': len(hc),
                         'oQueSeExibeIgual': c['oQueSeExibe'] == a['oQueSeExibe'], 'estadoDeA27Igual': c['estadoDeA27'] == a['estadoDeA27']}
    saida['comparacaoControleXAusente'] = comp_html
    saida['respostaDireta'] = {
        'redacaoDoAlcanceMedido': 'nos quatro ensaios com texto fixado, a renderizacao do componente NAO DISTINGUE a presenca da ausencia do vinculo',
        'base': 'o HTML renderizado e byte a byte igual entre controle e chave ausente, nas duas classificacoes; os quatro ensaios tem A.27 aprovado; o portao do destaque esta aberto no ensaio elegivel',
        'naoDemonstra': ['o conteudo que um modelo geraria', 'o comportamento da pagina completa', 'o que outro texto fixado, outro estado da extracao ou outro estado de A.27 exibiria'],
        'valeSe': all(v['htmlByteAByteIgual'] for v in comp_html.values()),
    }
    exigir(saida['respostaDireta']['valeSe'], 'o HTML difere entre controle e ausente: a resposta direta teria de ser outra')

    # ---- a busca declarada por mencao ao vinculo no componente, com CONTROLES POSITIVOS (a busca precisa achar onde ha)
    def buscar(caminho, texto):
        linhas = texto.split('\n')
        achadas = [(i + 1) for i, l in enumerate(linhas) if RADICAL.search(l)]
        return {'arquivo': caminho, 'linhasComOPadrao': len(achadas), 'ocorrencias': len(RADICAL.findall(texto)), 'primeirasLinhas': achadas[:5]}
    busca = {
        'padrao': 'v[ií]ncul (expressao regular, case-insensitive, Unicode; casa vinculo, vínculo, VÍNCULO, vinculado, vinculoDaExecucao)',
        'ferramenta': 'python3, modulo `re`, sobre o texto de `git show <base>:<arquivo>`',
        'escopo': f'{COMPONENTE} na base {BASE}',
        'resultado': buscar(COMPONENTE, fontes['componente']),
        'controlesPositivos': [buscar(VINCULO_TS, fontes['vinculo_ts']), buscar(PAGINA, fontes['pagina'])],
        'leituraDoResultado': None,
        'observacaoDeMetodo': 'uma primeira busca com `grep -E "v[ií]nculo"` no locale POSIX do ambiente (bytes, nao caracteres) nao casa a grafia acentuada: o "sem resultado" dela nao informava sobre "vínculo"; esta busca, com controles positivos que ACHAM, e a que vale',
    }
    busca['leituraDoResultado'] = ('SEM RESULTADO (nenhuma ocorrencia), e a busca acha onde ha: ' + ', '.join(f'{c["arquivo"]}: {c["ocorrencias"]}' for c in busca['controlesPositivos'])) if busca['resultado']['ocorrencias'] == 0 and all(c['ocorrencias'] > 0 for c in busca['controlesPositivos']) else 'HA OCORRENCIA NO COMPONENTE, ou o controle positivo nao achou: investigar'
    exigir(busca['resultado']['ocorrencias'] == 0, 'o componente menciona o vinculo')
    exigir(all(c['ocorrencias'] > 0 for c in busca['controlesPositivos']), 'um controle positivo da busca nao achou o radical: a busca nao e informativa')
    saida['buscaPorMencaoAoVinculoNoComponente'] = busca
    # ---- o tipo da propriedade `aiReview` no componente: lido
    ini_tipo = next((i for i, l in enumerate(comp) if re.search(r'aiReview\s*:\s*\{', l) or re.search(r'interface\s+\w*Props', l)), None)
    saida['tipoDasPropriedadesDoComponente'] = {'localizadorDaPrimeiraDeclaracaoEncontrada': (ini_tipo + 1) if ini_tipo is not None else None, 'trecho': [l.rstrip() for l in comp[ini_tipo: ini_tipo + 24]] if ini_tipo is not None else None, 'tipoDeRegistro': 'LEITURA'}
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dados', default='docs/dados/a12-sem-vinculo')
    ap.add_argument('--so-conferir', action='store_true', help='nao grava; so confere e imprime o resumo')
    args = ap.parse_args()
    D = args.dados
    head = subprocess.check_output(['git', 'rev-parse', BASE]).decode().strip()
    exigir(head == BASE, 'o commit-base nao esta no repositorio')
    fontes = {'rota': git_show(ROTA), 'pagina': git_show(PAGINA), 'componente': git_show(COMPONENTE), 'vinculo_ts': git_show(VINCULO_TS)}

    A = analisar_fase_a(D, fontes)
    B = analisar_fase_b(D, A)
    C = analisar_fase_c(D, B, fontes)
    DD = analisar_fase_d(fontes)
    ANC = verificar_ancoras(fontes)
    DD['ancorasDoPedido'] = ANC

    # os diffs sao gravados a parte (texto), e saem do JSON
    diffs = {}
    for cond in CONDICOES:
        gravar, texto = A['condicoes'][cond].pop('_gravar')
        diffs[gravar] = texto

    print(f'base: {BASE}')
    print('== FASE A')
    for cond in CONDICOES:
        o = A['condicoes'][cond]
        print(f'  [{cond}] distintos (preparados/JSON entregues/contextos): {o["contagensDistintas"]}')
        print(f'  [{cond}] classes de equivalencia dos contextos: {o["classesDeEquivalencia"]["contextos"]}')
        print(f'  [{cond}] classes de equivalencia dos JSON entregues: {o["classesDeEquivalencia"]["jsonsEntregues"]}')
        print(f'  [{cond}] undefined == chave ausente no transporte (JSON byte a byte): {o["transporte"]["chaveAusenteIgualAUndefinedExplicito"]["jsonEntregueByteAByteIgual"]}; null difere por {o["transporte"]["nullNoJsonDifereDaChaveAusente"]["bytesAMaisQueAChaveAusente"]} bytes')
        print(f'  [{cond}] diff: hunks={o["diff"]["hunks"]} removidas={o["diff"]["linhasRemovidasNoAusente"]} acrescentadas={o["diff"]["linhasAcrescentadasNoAusente"]} tres iguais={o["diff"]["osTresDiffsSaoIguais"]}')
        print(f'  [{cond}] frases so no ausente: {[(f["id"], f["linhaNoContextoDaCaptura"], f["localizadorNaFonte"]) for f in o["frasesSoNoCasoAusente"]]}')
        print(f'  [{cond}] bloco: {o["blocoDoVinculo"]["ausente"]["linhasEmBrancoConsecutivasAntesDoCabecalhoDaLista"]} brancas antes do cabecalho (ausente) | controle: bloco de {o["blocoDoVinculo"]["controle"]["linhasDoBloco"]} linhas, {o["blocoDoVinculo"]["controle"]["linhasEmBrancoConsecutivasAntesDoMarcador"]} brancas antes do marcador')
        print(f'  [{cond}] mencoes a "vinculo": controle {o["mencoesAVinculo"]["controle"]["total"]} (sistema {o["mencoesAVinculo"]["controle"]["doTextoDoSistema"]}), ausente {o["mencoesAVinculo"]["chave-ausente"]["total"]} (sistema {o["mencoesAVinculo"]["chave-ausente"]["doTextoDoSistema"]})')
    print(f'  prompt de sistema: valores distintos {A["promptDeSistema"]["valoresDistintosDeSha256ETamanhoNasOitoCapturas"]}; totais: {A["totaisDasOitoCapturas"]}')
    print('== FASE B')
    print(f'  texto fixado: {B["textoFixado"]["caracteresEmUnidadesUtf16"]} unidades UTF-16 / {B["textoFixado"]["pontosDeCodigo"]} pontos de codigo, sha256 {B["textoFixado"]["sha256Utf8"]}')
    for e in B['ensaios']:
        print(f'  {e["id"]}: nota={e["nota"]} veredicto={e["veredicto"]} extracao={e["estadoDaExtracao"]} A27={e["validacaoA27"]["estado"]} susp={(e["notaSuspensa"] or {}).get("causa")}')
    for cl in CLASSES:
        c = B['comparacaoControleXAusente'][cl]
        print(f'  [{cl}] bruto: identicos={c["diffBruto"]["corposByteAByteIdenticos"]} posicoes={[(p["posicaoBase1"], p["controle"], p["chaveAusente"]) for p in c["diffBruto"]["posicoesQueDiferem"]]} dentro do timestamp={c["diffBruto"]["todasAsPosicoesQueDiferemEstaoDentroDoValorDoTimestamp"]}; projecao sem timestamp: textual={c["projecaoSemOTimestamp"]["projecaoTextual"]["igual"]} json={c["projecaoSemOTimestamp"]["projecaoDeJson"]["igual"]}; restantes={len(c["diferencasQueRestamAposAProjecao"])}')
    print(f'  pergunta direta: caminhos com radical no nome={B["perguntaDireta"]["caminhosComRadicalNoNome"]}, valores com radical={B["perguntaDireta"]["valoresComRadical"]}')
    print(f'  independencia dos eixos: {B["conclusaoDaIndependencia"]}')
    print('== FASE C')
    for e in C['ensaios']:
        print(f'  {e["id"]}: A27={e["estadoDeA27"]["estado"]} portao={e["portaoDoDestaque"]} destaque={e["oQueSeExibe"]["destaque"]["exibido"]} cartao={e["oQueSeExibe"]["cartaoDeSuspensao"]["exibido"]} mencoes no HTML={e["mencoesAVinculoNoHtml"]}')
    print(f'  HTML igual controle x ausente: { {k: v["htmlByteAByteIgual"] for k, v in C["comparacaoControleXAusente"].items()} }')
    print(f'  busca no componente: {C["buscaPorMencaoAoVinculoNoComponente"]["leituraDoResultado"]}')

    print('== FASE D (leitura de codigo)')
    print(f'  D1: {DD["D1_prepararVinculoDaTela"]["resposta"][:110]}; retornos={[r["linha"] for r in DD["D1_prepararVinculoDaTela"]["retornos"]]}')
    print(f'  D2: saidas antes do fetch={[c["linha"] for c in DD["D2_payloadDaTela"]["caminhosExaminados"]]}; payload/campo/finalPayload/spread={DD["D2_payloadDaTela"]["ondeOPayloadEMontado"]}')
    nao = [a for a in ANC if not a['confere']]
    print(f'== ANCORAS DO PEDIDO: {len(ANC) - len(nao)} de {len(ANC)} conferem' + ('' if not nao else '; NAO conferem: ' + '; '.join(a['localizador'] + ' (' + a['linhaLida'][:60] + ')' for a in nao)))
    if problemas:
        print('\nPROBLEMAS (o script nao grava e sai 1):')
        for p in problemas:
            print('  -', p)
        sys.exit(1)
    if not args.so_conferir:
        gravar_json(os.path.join(D, 'fase-a/analise.json'), A)
        gravar_json(os.path.join(D, 'fase-b/analise.json'), B)
        gravar_json(os.path.join(D, 'fase-c/analise.json'), C)
        gravar_json(os.path.join(D, 'fase-d/analise.json'), DD)
        for caminho, texto in diffs.items():
            gravar_texto(caminho, texto)
        print('\ngravado: fase-a/analise.json, fase-a/diffs/*.diff, fase-b/analise.json, fase-c/analise.json, fase-d/analise.json')
    else:
        print('\n(--so-conferir: nada gravado)')
    print('TUDO CONFERE')


if __name__ == '__main__':
    main()
