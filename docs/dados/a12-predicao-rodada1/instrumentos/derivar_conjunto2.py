# -*- coding: utf-8 -*-
# D-R, D-D, D-33, D-F, D-E: os contextos de referência dos demais testes. As BASES são capturas do tratador NÃO modificado de 5ad4780 (instrumento fora do repositório), VALIDADAS contra o que o repositório registra:
#   rag-semantic-states: dois sha256 de `messages` registrados | a12-diagnostico: quatro tamanhos registrados | a33-cadeia-rule: três tamanhos de `messages` e o do `system` registrados |
#   a12-estatisticas-dimensao: os 27 sha256, bytes e sha256 de `system` da base de 35a1506, depois da reversão que o PRÓPRIO TESTE aplica (V4, reverter-27.cjs) | fiacao: igualdade entre as entradas da classe A (:254-255, :297-298).
import json, sys, os, re
sys.path.insert(0, '.')
from deriva import *

C1 = D + 'captura-base/saida/'
C2 = D + 'captura-base/saida2/'
C3 = D + 'captura-base/saida3/'
rd = lambda p: open(p, encoding='utf-8').read()


def n_da_lista(ctx):
    return len([l for l in ctx.split('\n') if l.startswith('- ID: ')])


def js_json(x):
    """JSON.stringify do JS para strings/objetos simples: compacto, sem escapar não-ASCII."""
    return json.dumps(x, ensure_ascii=False, separators=(',', ':'))


os.makedirs(DD + 'novos', exist_ok=True)


def salvar(nome, texto):
    open(DD + 'novos/' + nome + '.txt', 'w', encoding='utf-8', newline='').write(texto)


res = {}
print('=== D-R: rag-semantic-states (sem lista, sem exclusão; JSON.stringify(messages))')
rag_rec = {'comResultados': '71d5a2dcd602a83b84806c6b6d27570eaa936ec6da98fe9446a8ce943100860a', 'misto': '71d5a2dcd602a83b84806c6b6d27570eaa936ec6da98fe9446a8ce943100860a',
           'vazio': '4f638afbcf61eecc80b375dc0987671720d399177020f117dcdfaf81c4328f37', 'erro': '4f638afbcf61eecc80b375dc0987671720d399177020f117dcdfaf81c4328f37'}
res['rag'] = []
for nome in ('comResultados', 'vazio', 'erro', 'misto'):
    bj = rd(C1 + f'rag-{nome}-messages.json')
    msgs = json.loads(bj)
    assert len(msgs) == 1 and list(msgs[0].keys()) == ['role', 'content'] and js_json(msgs) == bj, 'o JSON da base não reproduz pela reserialização'
    assert sha(bj) == rag_rec[nome], 'a base capturada não tem o sha256 registrado'
    base = msgs[0]['content']
    assert base == rd(C1 + f'rag-{nome}-conteudo.txt') and n_da_lista(base) == 0
    novo, log = derivar(base, 0)
    salvar(f'rag-{nome}', novo)
    nj = js_json([{'role': msgs[0]['role'], 'content': novo}])
    r = {'condicao': nome, 'N': 0, 'baseJson': {'bytes': nbytes(bj), 'sha256': sha(bj)}, 'baseConteudo': {'bytes': nbytes(base), 'linhas': nlinhas(base)}, 'novoJson': {'bytes': nbytes(nj), 'sha256': sha(nj)},
         'novoConteudo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'deltaConteudo': nbytes(novo) - nbytes(base), 'deltaJson': nbytes(nj) - nbytes(bj), 'substituicoes': log}
    res['rag'].append(r)
    print(f"  {nome:14s} base JSON {r['baseJson']['bytes']} B {r['baseJson']['sha256'][:12]} (== registrado) -> novo JSON {r['novoJson']['bytes']} B {r['novoJson']['sha256'][:12]} | conteúdo Δ {r['deltaConteudo']:+d} B, JSON Δ {r['deltaJson']:+d} B")

print('=== D-D: a12-diagnostico (os quatro casos; `messages` = contents unidos)')
diag_rec = {'C-disponivel': 70188, 'C-ausente': 69444, 'C-incompleta': 70394, 'C-contradicao': 70966}
res['diag'] = []
for nome, b in diag_rec.items():
    base = rd(C1 + f'diag-{nome}-messages.txt')
    assert nbytes(base) == b, 'a base capturada não tem os bytes registrados'
    n = n_da_lista(base)
    novo, log = derivar(base, n)
    salvar(f'diag-{nome}', novo)
    r = {'caso': nome, 'N': n, 'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)}, 'novo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'delta': nbytes(novo) - nbytes(base), 'substituicoes': log}
    res['diag'].append(r)
    print(f"  {nome:14s} N={n} base {r['base']['bytes']} B (== registrado) {r['base']['sha256'][:12]} -> novo {r['novo']['bytes']} B {r['novo']['sha256'][:12]} (Δ {r['delta']:+d} B)")

print('=== D-33: a33-cadeia-rule (C1 a C3; sem lista, sem exclusão)')
a33_rec = {'C1': 71994, 'C2': 70428, 'C3': 70428}
a33_sys = json.load(open(C2 + 'a33-resumo.json'))
res['a33'] = []
for nome, b in a33_rec.items():
    base = rd(C2 + f'a33-{nome}-messages.txt')
    assert nbytes(base) == b and a33_sys[nome]['bytesSystem'] == 34170 and n_da_lista(base) == 0
    novo, log = derivar(base, 0)
    salvar(f'a33-{nome}', novo)
    r = {'caso': nome, 'N': 0, 'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)}, 'novo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'delta': nbytes(novo) - nbytes(base), 'substituicoes': log}
    res['a33'].append(r)
    print(f"  {nome} base {r['base']['bytes']} B (== registrado) {r['base']['sha256'][:12]} -> novo {r['novo']['bytes']} B {r['novo']['sha256'][:12]} (Δ {r['delta']:+d} B)")

print('=== D-F: vinculo-execucao-fiacao (cenários da classe A)')
EXCL = (6, 5, 1, '16.7')
res['fiacao'] = []
bases_f = {nome: rd(C2 + f'fiacao-{nome}.txt') for nome in ('A-sem', 'A-undefined', 'A-null', 'A-outro-nome', 'A-sem-exclusao-ativa', 'A-sem-lista', 'A-sem-lista-exclusao-ativa')}
assert bases_f['A-sem'] == bases_f['A-undefined'] == bases_f['A-null'] == bases_f['A-outro-nome'], 'as quatro entradas da classe A não coincidem na base'
assert 'MARCA-QUE-NAO-DEVE-CHEGAR' not in bases_f['A-outro-nome']
for nome, ex in (('A-sem', None), ('A-sem-exclusao-ativa', EXCL), ('A-sem-lista', None), ('A-sem-lista-exclusao-ativa', EXCL)):
    base = bases_f[nome]
    n = n_da_lista(base)
    novo, log = derivar(base, n, exclusao=ex)
    salvar(f'fiacao-{nome}', novo)
    r = {'cenario': nome, 'N': n, 'exclusao': ex, 'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)}, 'novo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'delta': nbytes(novo) - nbytes(base), 'substituicoes': log}
    res['fiacao'].append(r)
    print(f"  {nome:30s} N={n} base {r['base']['bytes']} B {r['base']['sha256'][:12]} -> novo {r['novo']['bytes']} B {r['novo']['sha256'][:12]} (Δ {r['delta']:+d} B, {r['base']['linhas']} -> {r['novo']['linhas']} linhas)")
    if nome == 'A-sem':
        novo_sem = novo
res['fiacaoIguais'] = ['A-undefined', 'A-null', 'A-outro-nome']

print('=== V3: reconstruir os CONTROLES de classe B da fiacao (capturados) a partir dos contextos de classe A (capturados), pelas mesmas trocas')
S = json.load(open(DD + 'saidas-fiacao.json', encoding='utf-8'))
ok3 = True
for cena_a, cena_b, exb in (('A-sem', 'B-vinculado', None), ('A-sem-exclusao-ativa', 'B-vinculado-exclusao-5-4-4', EXCL)):
    A = bases_f[cena_a]
    Bt = rd(C2 + f'fiacao-{cena_b}.txt')
    s = S[cena_b]
    novo, log = derivar(A, s['n'], exclusao=exb, bloco=s['bloco'], frases_novas=s['frases'], exclusao_nova=s['excl'])
    igual = novo == Bt
    ok3 &= igual
    print(f"  {cena_a} ({nbytes(A)} B) -> derivado ({nbytes(novo)} B, {sha(novo)[:12]}) contra o CONTROLE capturado {cena_b} ({nbytes(Bt)} B, {sha(Bt)[:12]}): {'IGUAL byte a byte' if igual else 'DIFERE'}")
print('  V3 =>', 'VALIDADO' if ok3 else 'NÃO VALIDADO')
assert ok3

print('=== D-E: a12-estatisticas-dimensao (27 cenários da sonda)')
est = json.load(open(C3 + 'est27-resumo.json', encoding='utf-8'))
res['est27'] = []
for nome, r0 in est.items():
    base = rd(C3 + f'est27-{nome}.txt')
    assert nbytes(base) == r0['bytes'] and sha(base) == r0['sha256']
    n = n_da_lista(base)
    if r0['comVinculo']:
        r = {'cenario': nome, 'classe': 'B', 'N': n, 'elegivel': r0['elegivel'], 'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)}, 'novo': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)}, 'delta': 0, 'substituicoes': []}
    else:
        novo, log = derivar(base, n)
        salvar(f'est27-{nome}', novo)
        r = {'cenario': nome, 'classe': 'A', 'N': n, 'elegivel': r0['elegivel'], 'base': {'bytes': nbytes(base), 'linhas': nlinhas(base), 'sha256': sha(base)}, 'novo': {'bytes': nbytes(novo), 'linhas': nlinhas(novo), 'sha256': sha(novo)}, 'delta': nbytes(novo) - nbytes(base), 'substituicoes': log}
    res['est27'].append(r)
for r in res['est27']:
    print(f"  {r['cenario']:48s} {r['classe']} N={r['N']:2d} {'elegível' if r['elegivel'] else 'suspensa':8s} base {r['base']['bytes']} B {r['base']['sha256'][:12]} -> {r['novo']['bytes']} B {r['novo']['sha256'][:12]} (Δ {r['delta']:+d})")
json.dump(res, open(DD + 'derivados-conjunto2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
