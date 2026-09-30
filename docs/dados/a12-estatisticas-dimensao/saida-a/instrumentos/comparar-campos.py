import json, sys

def folhas(v, caminho=(), saida=None):
    """Caminhos das folhas; vetor ou objeto vazio conta como folha."""
    if saida is None:
        saida = {}
    if isinstance(v, dict) and v:
        for k, x in v.items():
            folhas(x, caminho + (str(k),), saida)
    elif isinstance(v, list) and v:
        for i, x in enumerate(v):
            folhas(x, caminho + (f'[{i}]',), saida)
    else:
        saida[caminho] = v
    return saida

def rot(c):
    s = ''
    for p in c:
        s += p if p.startswith('[') else ('.' + p if s else p)
    return s

antes = folhas(json.load(open(sys.argv[1], encoding='utf8')))
depois = folhas(json.load(open(sys.argv[2], encoding='utf8')))
perdidos = [c for c in antes if c not in depois]
novos = [c for c in depois if c not in antes]
mudados = [c for c in antes if c in depois and antes[c] != depois[c]]
print(f'campos antes: {len(antes)} | depois: {len(depois)} | perdidos: {len(perdidos)} | novos: {len(novos)} | mudados: {len(mudados)}')
if perdidos:
    print('PERDIDOS:'); [print('  ', rot(c)) for c in perdidos]
print('NOVOS (%d):' % len(novos))
prefixos = {}
for c in novos:
    prefixos.setdefault(rot(c[:4]) if len(c) > 4 else rot(c), 0)
    prefixos[rot(c[:4]) if len(c) > 4 else rot(c)] += 1
for k, n in prefixos.items(): print('  ', k, n)
print('MUDADOS (%d):' % len(mudados))
for c in mudados:
    a, d = antes[c], depois[c]
    a = a if not isinstance(a, str) or len(a) < 90 else a[:88] + '…'
    d = d if not isinstance(d, str) or len(d) < 90 else d[:88] + '…'
    print('  ', rot(c), ':', a, '->', d)
