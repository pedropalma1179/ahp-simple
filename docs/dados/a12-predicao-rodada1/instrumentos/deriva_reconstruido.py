# -*- coding: utf-8 -*-
# DERIVAÇÃO INDEPENDENTE dos contextos previstos da classe A (rodada 1). NENHUM código de produção modificado é executado: os gabaritos abaixo são TRANSCRIÇÕES POR LEITURA do
# fonte de 5ad4780 (route.ts:931-937, :862-865 para o texto ANTIGO; vinculo-execucao.ts:1273-1296 e :1311-1385 para o texto NOVO, ramo 3 das frases), conferidas contra a saída das
# funções NÃO modificadas (saidas-das-funcoes.json) e contra os contextos registrados. O bloco de ausência é o texto (a) da especificação.
import hashlib, json, re, os

D = os.environ['A12_TRAB'].rstrip('/') + '/'      # RECONSTRUÍDO: o diretório de trabalho vem do ambiente (no executado era um caminho fixo do diretório de trabalho da sessão)
DD = D + 'derivacao/'
REPO = os.environ.get('A12_REPO', '/home/user/ahp-simple').rstrip('/') + '/'      # RECONSTRUÍDO: raiz do clone, do ambiente (padrão: o caminho do executado)


def sha(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def nbytes(s):
    return len(s.encode('utf-8'))


def nlinhas(s):
    return 0 if s == '' else s.count('\n') + 1


# ---------------------------------------------------------------- o bloco (a), do pedido
# RECONSTRUÍDO: o executado lia o bloco (a) do prompt da tarefa (parte1.md), que não faz parte do pacote. Aqui o texto vem do registro versionado, a partir do título do bloco do commit do registro da decisão
# e da especificação; o mesmo laço abaixo, sem alteração, escolhe o primeiro bloco cercado cuja primeira linha começa por '## DADOS DO SISTEMA — VÍNCULO'.
_reg = open(REPO + 'docs/imprecisoes-parecer-ia.md', encoding='utf-8').read().split('\n')
_p1 = _reg[[_k for _k, _l in enumerate(_reg) if _l.startswith('## Registro de 04/10/2026: a decisão pela opção 3')][0]:]
_blocos = []
_i = 0
while _i < len(_p1):
    if _p1[_i].startswith('```'):
        _j = _i + 1
        while not _p1[_j].startswith('```'):
            _j += 1
        _blocos.append(_p1[_i + 1:_j])
        _i = _j + 1
    else:
        _i += 1
BLOCO_A = '\n'.join([b for b in _blocos if b and b[0].startswith('## DADOS DO SISTEMA — VÍNCULO')][0])
assert BLOCO_A.count('\n') == 4 and not BLOCO_A.endswith('\n')
# RECONSTRUÍDO (acréscimo): o texto (a) tem de ser o registrado, 571 bytes e este sha256; sem isto a derivação não prossegue.
assert nbytes(BLOCO_A) == 571 and sha(BLOCO_A) == '267226e55d0e4d031b324c9a8e2961df9be74b50fa6e217cb70e15f39d99872f', 'o bloco (a) lido do registro não é o registrado'

# ---------------------------------------------------------------- gabaritos ANTIGOS (route.ts, lidos)
ANT_CABECALHO = '## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)'
ANT_REGRA = '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista. Se precisar referenciá-los, use o ID hash fornecido.'


def ant_total(n):
    return f'**TOTAL: {n} respondentes (esta lista é COMPLETA — não existem outros)**'


def ant_agregacao(n):
    return (f'**AGREGAÇÃO POR MATRIZ: todos os {n} respondentes responderam à TOTALIDADE das comparações pareadas. Portanto N = {n} em TODAS as matrizes agregadas: '
            f'BOCR, MAGNITUDE e as quatro de subcritérios (Benefícios, Oportunidades, Custos, Riscos).**\n'
            f'⚠ NÃO existe divisão de respondentes por mérito, dimensão ou subcritério. Cada matriz agregada resulta dos {n} julgamentos, sem particionamento.')


def ant_exclusao(total, ativos, excluidos, taxa):
    return {
        'amostra': f'- Amostra original coletada: {total} especialistas',
        'restantes': f'- Respondentes incluídos na análise: {ativos} especialistas',
        'excluidos': f'- Respondentes excluídos: {excluidos} ({taxa}% da amostra original)',
        'qualidade': f'- Os dados de qualidade abaixo referem-se APENAS aos {ativos} respondentes incluídos.',
    }


# ---------------------------------------------------------------- gabaritos NOVOS (vinculo-execucao.ts, lidos): a leitura `ausente` cai no ramo 3
NOV_CABECALHO = '## DADOS DO SISTEMA — RESPONDENTES ENVIADOS A VOCÊ (lista EXAUSTIVA do conjunto enviado)'
NOV_CONTAGENS = 'Contagens por status, sobre os ENVIADOS a você (etapa: envio):\n'
NOV_REGRA = ('⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista COMO PARTICIPANTES DA AVALIAÇÃO ENVIADA: nenhum deles contribuiu para os dados de qualidade acima, e para cada '
             'respondente da lista você usa o ID hash fornecido. '
             'Único caso permitido fora da lista: um identificador registrado no bloco do vínculo como DIVERGÊNCIA REGISTRADA (na avaliação e fora do documento, no documento e fora da '
             'avaliação, ou repetido) pode ser nomeado SOMENTE nesse papel, e nunca como quem contribuiu para os dados de qualidade.')


def nov_total(n):
    return (f'**TOTAL ENVIADO A VOCÊ: {n} respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado; '
            f'a relação entre ele e o conjunto incluído no cálculo NÃO foi comparada.**')


NOV_AGREGACAO = ('**CÁLCULO — a contagem de incluídos no documento de cálculo NÃO está disponível nesta requisição.** '
                 'Nada se afirma aqui sobre quantos respondentes entraram no cálculo, nem sobre a participação em cada célula das matrizes agregadas.\n'
                 '⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N a nenhuma matriz.')


def nov_exclusao(total, ativos, excluidos, taxa, n_enviados):
    return {
        'amostra': ('- Amostra original coletada (população: respostas carregadas pela tela, finalizadas, de respondentes cadastrados e uma por respondente; etapa: coleta): '
                    f'{total} especialistas'),
        'restantes': ('- Restantes após a exclusão do gestor (população: respondentes não excluídos; etapa: exclusão do gestor, anterior a qualquer restrição do vínculo): '
                      f'{ativos} especialistas'),
        'excluidos': f'- Respondentes excluídos pelo gestor (população: excluídos; etapa: exclusão do gestor): {excluidos} ({taxa}% da amostra original)',
        'qualidade': (f'- Os dados de qualidade abaixo referem-se APENAS aos {n_enviados} respondentes ENVIADOS a você (população: enviados; etapa: envio; contagem da lista de respondentes abaixo).'
                      if n_enviados > 0 else
                      '- Nenhum respondente foi ENVIADO a você (população: enviados; etapa: envio; contagem: 0): a lista de respondentes abaixo não existe.'),
    }


ANCORA_DA_LISTA = '\n## DADOS DO SISTEMA — RESPONDENTES'
ANCORA_CONTAGENS = '- CONFIÁVEIS (CR ≤ 10%): '


class Derivacao:
    """Aplica substituições CONTADAS: cada uma exige exatamente `esperado` ocorrências do trecho no texto corrente."""

    def __init__(self, base):
        self.t = base
        self.log = []

    def trocar(self, nome, velho, novo, esperado=1):
        c = self.t.count(velho)
        assert c == esperado, f'{nome}: {c} ocorrências (esperado {esperado}) de {velho[:90]!r}'
        self.t = self.t.replace(velho, novo)
        self.log.append((nome, c))

    def inserir_antes(self, nome, ancora, texto):
        c = self.t.count(ancora)
        assert c == 1, f'{nome}: âncora com {c} ocorrências: {ancora[:90]!r}'
        i = self.t.index(ancora)
        self.t = self.t[:i] + texto + self.t[i:]
        self.log.append((nome, c))


def derivar(base, n, exclusao=None, bloco=BLOCO_A, frases_novas=None, exclusao_nova=None, com_lista=None):
    """base: contexto-base (texto). n: respondentes ENVIADOS (tamanho da lista). exclusao: (total, ativos, excluidos, taxa) ou None.
    `frases_novas`/`exclusao_nova`/`bloco` podem ser dados (para a VALIDAÇÃO contra um controle de classe B); por padrão são os da classe A (ausente)."""
    d = Derivacao(base)
    com_lista = (n > 0) if com_lista is None else com_lista
    if exclusao is not None:
        total, ativos, excluidos, taxa = exclusao
        velha = ant_exclusao(total, ativos, excluidos, taxa)
        nova = exclusao_nova or nov_exclusao(total, ativos, excluidos, taxa, n)
        for k in ('amostra', 'restantes', 'excluidos', 'qualidade'):
            d.trocar(f'exclusão: {k}', velha[k], nova[k])
    if com_lista:
        f = frases_novas or {'cabecalho': NOV_CABECALHO, 'total': nov_total(n), 'agregacao': NOV_AGREGACAO, 'cabecalhoDasContagens': NOV_CONTAGENS, 'regraDeMencao': NOV_REGRA}
        d.trocar('frase: cabeçalho', ANT_CABECALHO, f['cabecalho'])
        d.trocar('frase: total', ant_total(n), f['total'])
        d.trocar('frase: agregação (duas linhas)', ant_agregacao(n), f['agregacao'])
        d.trocar('frase: cabeçalho das contagens (de vazio para o texto novo)', ANCORA_CONTAGENS, f['cabecalhoDasContagens'] + ANCORA_CONTAGENS)
        d.trocar('frase: regra de menção', ANT_REGRA, f['regraDeMencao'])
    # o bloco: T + "\n\n" imediatamente antes da âncora da lista (a montagem `${exclusionContext}\n${blocoDoVinculo}\n${fullRespondentList}`, com blocoDoVinculo = `\n${T}\n`)
    d.inserir_antes('bloco de ausência (T + "\\n\\n" antes da lista)', ANCORA_DA_LISTA, bloco + '\n\n')
    return d.t, d.log
