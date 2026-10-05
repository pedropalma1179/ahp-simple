# -*- coding: utf-8 -*-
# D-A: os SETE contextos de a12-nota-veredicto-fase2 (base = Fase 1 + as DUAS trocas do teste, reimplementadas aqui) e D-B: os dois contextos de classe A do pacote de 02/10.
import json, sys
sys.path.insert(0, '.')
from deriva import *

TITULO_DO_BLOCO = '**Referência Automatizada (apenas contexto — NÃO use como sua decisão):**\n'
ULTIMA_DO_BLOCO = '- IMPORTANTE: Sua DECISÃO EDITORIAL na seção 🎯 deve ser baseada na SUA análise dos dados, NÃO nesta referência automática.\n'
PREFIXO_ANTIGO = 'SUSPENSA: Nota não calculada: '

PRED = {x['condicao']: x for x in json.load(open(REPO + 'docs/dados/a12-nota-veredicto-fase2/predicao-contextos.json', encoding='utf-8'))}
F1 = REPO + 'docs/dados/a12-nota-veredicto-fase1/contextos-capturados/'
# (id, N enviados, suspensa)
CONDICOES = [
    ('elegivel-auto-A', 4, False), ('elegivel-auto-F', 4, False), ('disponibilidade-ausente', 0, True), ('disponibilidade-incompleta', 2, True),
    ('contradicao', 4, True), ('coerencia-nao-concluida', 4, True), ('coerencia-nao-avaliada-CONSTRUIDA', 4, True),
]


def esperado_do_antigo(antigo, suspensa):
    assert antigo.count(TITULO_DO_BLOCO) == 1 and antigo.count(ULTIMA_DO_BLOCO) == 1
    i = antigo.index(TITULO_DO_BLOCO)
    fim = antigo.index(ULTIMA_DO_BLOCO, i) + len(ULTIMA_DO_BLOCO)
    texto = antigo[:i] + antigo[fim:]
    n = texto.count(PREFIXO_ANTIGO)
    assert n == (1 if suspensa else 0)
    if suspensa:
        texto = texto.replace(PREFIXO_ANTIGO, 'SUSPENSA: ', 1)
    return texto


os.makedirs(DD + 'novos', exist_ok=True)


def salvar(nome, texto):
    open(DD + 'novos/' + nome + '.txt', 'w', encoding='utf-8', newline='').write(texto)


linhas_de = lambda t, s: [i + 1 for i, l in enumerate(t.split('\n')) if s in l]
res = {'fase2': [], 'pacote': []}
print('D-A: os sete contextos de a12-nota-veredicto-fase2')
for cid, n, susp in CONDICOES:
    antigo = open(F1 + f'ctx-{cid}.txt', encoding='utf-8').read()
    assert sha(antigo) == PRED[cid]['antigo']['sha256'], cid          # a Fase 1 está intacta (sha registrado na predição)
    base = esperado_do_antigo(antigo, susp)
    p = PRED[cid]['previsto']
    assert (sha(base), nbytes(base), nlinhas(base)) == (p['sha256'], p['bytes'], p['linhas']), (cid, sha(base), p)     # contexto-base == previsto da Fase 2 (pré-registrado)
    novo, log = derivar(base, n)
    salvar(f'fase2-{cid}', novo)
    salvar(f'fase2-base-{cid}', base)
    reg = {'condicao': cid, 'N': n, 'suspensa': susp, 'lista': n > 0,
           'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)},
           'novo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'delta': nbytes(novo) - nbytes(base),
           'substituicoes': log}
    if susp:
        mt = PRED[cid]['motivo']['texto']
        reg['motivo'] = {'texto': mt[:60], 'ocorrenciasBase': novo.count(mt) if False else base.count(mt), 'linhasBase': linhas_de(base, mt), 'ocorrenciasNovo': novo.count(mt), 'linhasNovo': linhas_de(novo, mt)}
        assert reg['motivo']['linhasBase'] == PRED[cid]['motivo']['linhasNoPrevisto'], (cid, reg['motivo'])      # as linhas do motivo na base == as pré-registradas
    res['fase2'].append(reg)
    print(f"  {cid:36s} N={n} base {reg['base']['bytes']} B / {reg['base']['linhas']} L / {reg['base']['sha256'][:12]}  ->  novo {reg['novo']['bytes']} B / {reg['novo']['linhas']} L / {reg['novo']['sha256'][:12]}  (Δ {reg['delta']:+d} B)", ('| motivo ' + str(reg['motivo']['linhasBase']) + ' -> ' + str(reg['motivo']['linhasNovo'])) if susp else '')

print('D-B: os dois contextos de classe A do pacote de 02/10 (fase A)')
P = REPO + 'docs/dados/a12-sem-vinculo/fase-a/contextos/'
for cond, n, ex in (('sem-exclusao', 4, None), ('com-exclusao', 4, (6, 4, 2, '33.3'))):
    base = open(P + f'ctx-{cond}__chave-ausente.txt', encoding='utf-8').read()
    novo, log = derivar(base, n, exclusao=ex)
    salvar(f'pacote-{cond}', novo)
    reg = {'condicao': cond, 'N': n, 'exclusao': ex, 'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)},
           'novo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'delta': nbytes(novo) - nbytes(base), 'substituicoes': log}
    res['pacote'].append(reg)
    print(f"  {cond:14s} N={n} base {reg['base']['bytes']} B / {reg['base']['linhas']} L / {reg['base']['sha256'][:12]}  ->  novo {reg['novo']['bytes']} B / {reg['novo']['linhas']} L / {reg['novo']['sha256'][:12]}  (Δ {reg['delta']:+d} B)")
json.dump(res, open(DD + 'derivados-conjunto1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
