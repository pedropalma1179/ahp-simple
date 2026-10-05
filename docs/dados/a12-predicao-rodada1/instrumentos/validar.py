# -*- coding: utf-8 -*-
import json, sys
sys.path.insert(0, '.')
from deriva import *

S = json.load(open(DD + 'saidas-das-funcoes.json', encoding='utf-8'))

# ---------------------------------------------------- V1: os gabaritos NOVOS, transcritos por leitura, contra as funções NÃO modificadas, para vários N e várias exclusões
ok1 = True
for n, f in S['ausente'].items():
    n = int(n)
    esp = {'cabecalho': NOV_CABECALHO, 'total': nov_total(n), 'agregacao': NOV_AGREGACAO, 'cabecalhoDasContagens': NOV_CONTAGENS, 'regraDeMencao': NOV_REGRA}
    for k in esp:
        if f[k] != esp[k]:
            ok1 = False
            print('V1 DIVERGE: frase', k, 'N =', n)
for chave, l in S['exclusaoAusente'].items():
    tot, act, exc, env = map(int, chave.split('/'))
    taxa = f'{exc / tot * 100:.1f}'
    esp = nov_exclusao(tot, act, exc, taxa, env)
    for k in esp:
        if l[k] != esp[k]:
            ok1 = False
            print('V1 DIVERGE: exclusão', k, chave)
print('V1 (gabaritos novos x funções não modificadas): N =', sorted(int(x) for x in S['ausente']), '| exclusões', list(S['exclusaoAusente']), '=>', 'IGUAIS' if ok1 else 'DIVERGEM')

# ---------------------------------------------------- V2: reconstruir o CONTROLE (classe B, registrado) a partir do contexto de CLASSE A (registrado) pelas mesmas trocas
P = REPO + 'docs/dados/a12-sem-vinculo/fase-a/contextos/'
ok2 = True
for cond in ('sem-exclusao', 'com-exclusao'):
    A = open(P + f'ctx-{cond}__chave-ausente.txt', encoding='utf-8').read()
    Bt = open(P + f'ctx-{cond}__controle.txt', encoding='utf-8').read()
    c = S['controles'][cond]
    ex = None
    if c['exclusionInfo']:
        e = c['exclusionInfo']
        ex = (e['totalCollected'], e['activeCount'], e['excludedCount'], f"{e['excludedCount'] / e['totalCollected'] * 100:.1f}")
    novo, log = derivar(A, c['n'], exclusao=ex, bloco=c['bloco'], frases_novas=c['frases'], exclusao_nova=c['excl'])
    igual = novo == Bt
    ok2 &= igual
    print(f'V2 {cond}: A ({nbytes(A)} bytes, sha {sha(A)[:12]}) -> derivado ({nbytes(novo)} bytes, sha {sha(novo)[:12]}) contra o CONTROLE registrado ({nbytes(Bt)} bytes, sha {sha(Bt)[:12]}): {"IGUAL byte a byte" if igual else "DIFERE"}')
    print('    substituições:', [(n_, k) for n_, k in log])
    if not igual:
        import difflib
        a, b = novo.split('\n'), Bt.split('\n')
        for l in list(difflib.unified_diff(a, b, 'derivado', 'controle', lineterm='', n=0))[:30]:
            print('   ', l[:200])
print('V2 =>', 'VALIDADO' if ok2 else 'NÃO VALIDADO')
