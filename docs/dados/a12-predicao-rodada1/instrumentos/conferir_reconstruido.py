# -*- coding: utf-8 -*-
# CONFERIDOR COM O REGISTRO. INSTRUMENTO RECONSTRUÍDO: escrito para a entrega deste pacote, NÃO foi executado em 05/10/2026 e não é o instrumento que produziu os valores publicados.
# O que faz: lê as tabelas publicadas no registro (docs/imprecisoes-parecer-ia.md, bloco da predição datada da rodada 1) e compara, uma a uma, com o que as BASES e os INSTRUMENTOS produzem:
#   (1) as 38 previsões: base (bytes, sha256), previsto (bytes, sha256), diferença de bytes e linhas, a partir dos contextos derivados que os instrumentos gravaram no diretório de trabalho;
#   (2) os 22 controles de preservação (bytes, linhas, sha256), a partir das capturas e dos dois controles registrados do pacote de 02/10;
#   (3) as diferenças das cinco frases e das linhas de exclusão, e as linhas do motivo (64, 79, 81, 81 e 81).
# O que NÃO faz: não escreve valor algum no registro, não atualiza hash previsto e não ajusta nada. Divergência é IMPRESSA, e o valor publicado fica como está. Sai 0 só se tudo coincide.
# Ambiente: A12_TRAB (diretório de trabalho, com captura-base/ e derivacao/novos/ já produzidos) e A12_REPO (raiz do clone; padrão /home/user/ahp-simple).
import hashlib, importlib, json, os, re, sys

TRAB = os.environ['A12_TRAB'].rstrip('/') + '/'
REPO = os.environ.get('A12_REPO', '/home/user/ahp-simple').rstrip('/') + '/'
NOVOS = TRAB + 'derivacao/novos/'
CAP = TRAB + 'captura-base/'
sys.path.insert(0, TRAB + 'derivacao')
deriva = importlib.import_module('deriva')

sha = lambda b: hashlib.sha256(b).hexdigest()
nlin = lambda b: 0 if not b else b.count(b'\n') + 1
lerb = lambda p: open(p, 'rb').read()

reg = open(REPO + 'docs/imprecisoes-parecer-ia.md', encoding='utf-8').read().split('\n')
i0 = [n for n, l in enumerate(reg) if l.startswith('## Registro de 04/10/2026: a predição datada da rodada 1')]
assert len(i0) == 1, i0
i1 = [n for n, l in enumerate(reg) if n > i0[0] and l.startswith('### O inventário levantado nesta rodada')][0]
bloco = reg[i0[0]:i1]


def secao(ini, fim=None):
    a = [n for n, l in enumerate(bloco) if l.startswith(ini)]
    assert len(a) == 1, (ini, a)
    if fim is None:
        return bloco[a[0]:]
    b = [n for n, l in enumerate(bloco) if n > a[0] and l.startswith(fim)][0]
    return bloco[a[0]:b]


total = 0
falhas = []


def conferir(rotulo, publicado, medido):
    global total
    total += 1
    ok = publicado == medido
    if not ok:
        falhas.append((rotulo, publicado, medido))
        print(f'  DIVERGE  {rotulo}: publicado {publicado!r} | produzido {medido!r}')
    return ok


# ------------------------------------------------------------------ (1) as 38 previsões
MARCAS = [('F2', '**F2. `fase2:437-450`'), ('P', '**P. Pacote'), ('R', '**R. `rag-states:427-431`'), ('D', '**D. `diag:1128-1136`'), ('33', '**33. `a33-cadeia`'), ('F', '**F. `fiacao`'), ('E', '**E. `estatisticas:887-921`')]
pos = {}
for k, m in MARCAS:
    a = [n for n, l in enumerate(bloco) if l.startswith(m)]
    assert len(a) == 1, (k, a)
    pos[k] = a[0]
fim_b = [n for n, l in enumerate(bloco) if l.startswith('### 6. Os resultados que contrariariam')][0]
ordem = sorted(pos.values()) + [fim_b]
limites = {k: (pos[k], ordem[ordem.index(pos[k]) + 1]) for k, _ in MARCAS}
LINHA = re.compile(r'^\| `([^`]+)` \| (\d+) \| (\d+) \| `([0-9a-f]{64})` \| (\d+) \| `([0-9a-f]{64})` \| ([+-]\d+) \| (\d+) → (\d+) \|\s*$')
LINHA_R = re.compile(r'^\| `([^`]+)` \| (\d+) \| (\d+) \| `([0-9a-f]{64})` \| (\d+) \| `([0-9a-f]{64})` \| (\d+) B, `([0-9a-f]{64})` \|\s*$')
pub = {}
for k, _ in MARCAS:
    a, b = limites[k]
    for l in bloco[a:b]:
        m = (LINHA_R if k == 'R' else LINHA).match(l)
        if m:
            pub[(k, m.group(1))] = m.groups()
n_pub = {k: len([1 for (kk, _) in pub if kk == k]) for k, _ in MARCAS}
assert n_pub == {'F2': 7, 'P': 2, 'R': 4, 'D': 4, '33': 3, 'F': 4, 'E': 14}, n_pub
print('previsões lidas do registro:', n_pub, '| total', sum(n_pub.values()))

PREFIXO = {'F2': 'fase2-', 'P': 'pacote-', 'R': 'rag-', 'D': 'diag-', '33': 'a33-', 'F': 'fiacao-', 'E': 'est27-'}
ROLE_JSON = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
BASES_REPO = '5ad478086d0aa4dadd42b6116cb9b96fecb7afe8'


def base_de(k, i):
    """Os bytes da base de cada previsão: do repositório (F2, P) ou da captura."""
    if k == 'F2':
        return lerb(REPO + f'docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/ctx-{i}.txt')
    if k == 'P':
        return lerb(REPO + f'docs/dados/a12-sem-vinculo/fase-a/contextos/ctx-{i}__chave-ausente.txt')
    if k == 'R':
        return lerb(CAP + f'saida/rag-{i}-messages.json')
    if k == 'D':
        return lerb(CAP + f'saida/diag-{i}-messages.txt')
    if k == '33':
        return lerb(CAP + f'saida2/a33-{i}-messages.txt')
    if k == 'F':
        return lerb(CAP + f'saida2/fiacao-{i}.txt')
    return lerb(CAP + f'saida3/est27-{i}.txt')


for (k, i), g in pub.items():
    base = base_de(k, i)
    novo = lerb(NOVOS + PREFIXO[k] + i + '.txt')
    if k == 'R':
        # R publica o JSON de `messages` (os bytes que o teste hasheia) e, à parte, o conteúdo
        _, n, bb, bs, pb, ps, cb, cs = g
        papel = json.loads(base.decode('utf-8'))[0]['role']
        nj = ROLE_JSON([{'role': papel, 'content': novo.decode('utf-8')}]).encode('utf-8')
        conferir(f'{k}/{i} base JSON (bytes, sha256)', (int(bb), bs), (len(base), sha(base)))
        conferir(f'{k}/{i} previsto JSON (bytes, sha256)', (int(pb), ps), (len(nj), sha(nj)))
        conferir(f'{k}/{i} previsto conteúdo (bytes, sha256)', (int(cb), cs), (len(novo), sha(novo)))
    else:
        _, n, bb, bs, pb, ps, dl, la, lb_ = g
        conferir(f'{k}/{i} base (bytes, sha256)', (int(bb), bs), (len(base), sha(base)))
        conferir(f'{k}/{i} previsto (bytes, sha256)', (int(pb), ps), (len(novo), sha(novo)))
        conferir(f'{k}/{i} diferença de bytes', int(dl), len(novo) - len(base))
        conferir(f'{k}/{i} linhas (base → previsto)', (int(la), int(lb_)), (nlin(base), nlin(novo)))
print(f'(1) as 38 previsões: {total} valores comparados, {len(falhas)} divergências')

# ------------------------------------------------------------------ (2) os controles de preservação
t0 = total
s3 = secao('### 3. Os controles de preservação', '### 4. Cada teste')
CTRL = re.compile(r'^\| (.+?) \| ((?:B|C)[^|]*) \| (\d+) \| (\d+) \| `([0-9a-f]{64})` \|\s*$')
CTRL_E = re.compile(r'^\| `([^`]+-comVinculo)` \| (\d+) \| (\d+) \| (\d+) \| `([0-9a-f]{64})` \|\s*$')
CTRL_P = re.compile(r'^\| `(ctx-(?:sem|com)-exclusao__controle\.txt)` \| (\d+) \| `([0-9a-f]{64})` \|\s*$')
fi = [m.groups() for m in map(CTRL.match, s3) if m]
es = [m.groups() for m in map(CTRL_E.match, s3) if m]
pk = [m.groups() for m in map(CTRL_P.match, s3) if m]
assert (len(fi), len(es), len(pk)) == (7, 13, 2), (len(fi), len(es), len(pk))
arquivos_fi = {n: lerb(CAP + 'saida2/' + n) for n in sorted(os.listdir(CAP + 'saida2')) if n.startswith('fiacao-B-') or n.startswith('fiacao-C-')}
for cenario, classe, bb, ll, ss in fi:
    iguais = [n for n, b in arquivos_fi.items() if (len(b), nlin(b), sha(b)) == (int(bb), int(ll), ss)]
    esperados = 5 if classe.startswith('C') else 1          # a linha da classe C vale para os cinco formatos não reconhecidos
    conferir(f'controle fiacao {classe.strip()} ({bb} B): capturas com os mesmos bytes, linhas e sha256', esperados, len(iguais))
for nome, n, bb, ll, ss in es:
    b = lerb(CAP + f'saida3/est27-{nome}.txt')
    conferir(f'controle estatisticas {nome} (bytes, linhas, sha256)', (int(bb), int(ll), ss), (len(b), nlin(b), sha(b)))
for arq, bb, ss in pk:
    b = lerb(REPO + f'docs/dados/a12-sem-vinculo/fase-a/contextos/{arq}')
    conferir(f'controle do pacote {arq} (bytes, sha256)', (int(bb), ss), (len(b), sha(b)))
print(f'(2) os 22 controles de preservação (7 + 13 + 2): {total - t0} valores comparados')

# ------------------------------------------------------------------ (3) diferenças das frases, das linhas de exclusão e linhas do motivo
t0 = total
s2 = secao('### 2. As mudanças esperadas', '### 3. Os controles')
b = lambda s: len(s.encode('utf-8'))
ROW5 = re.compile(r'^\| (\d) \| `(cabecalho|total|agregacao|cabecalhoDasContagens|regraDeMencao)`[^|]* \|.*\| ([+-]\d+) \|\s*$')
ROW4 = re.compile(r'^\| (4\'|\d) \| `(amostra|restantes|excluidos|qualidade)`[^|]*\|.*\| ([+-]\d+) \|\s*$')
f5 = {m.group(2): int(m.group(3)) for m in map(ROW5.match, s2) if m}
f4 = {(m.group(1), m.group(2)): int(m.group(3)) for m in map(ROW4.match, s2) if m}
assert len(f5) == 5 and len(f4) == 5, (f5, f4)
N = 4
medido5 = {
    'cabecalho': b(deriva.NOV_CABECALHO) - b(deriva.ANT_CABECALHO),
    'total': b(deriva.nov_total(N)) - b(deriva.ant_total(N)),
    'agregacao': b(deriva.NOV_AGREGACAO) - b(deriva.ant_agregacao(N)),
    'cabecalhoDasContagens': b(deriva.NOV_CONTAGENS),
    'regraDeMencao': b(deriva.NOV_REGRA) - b(deriva.ANT_REGRA),
}
for ch, v in medido5.items():
    conferir(f'frase {ch}: diferença de bytes (N = {N})', f5[ch], v)
conferir('as cinco frases somam +619 (N = 4)', 619, sum(medido5.values()))
ant = deriva.ant_exclusao(6, 5, 1, '16.7')
nov = deriva.nov_exclusao(6, 5, 1, '16.7', 4)
nov0 = deriva.nov_exclusao(6, 5, 1, '16.7', 0)
for chave, rotulo in (('amostra', '1'), ('restantes', '2'), ('excluidos', '3'), ('qualidade', '4')):
    conferir(f'linha de exclusão {chave}: diferença de bytes', f4[(rotulo, chave)], b(nov[chave]) - b(ant[chave]))
conferir("linha de exclusão qualidade com 0 enviados (4'): diferença de bytes", f4[("4'", 'qualidade')], b(nov0['qualidade']) - b(ant['qualidade']))
conferir('as quatro linhas de exclusão somam +396', 396, sum(b(nov[c]) - b(ant[c]) for c in ('amostra', 'restantes', 'excluidos', 'qualidade')))
conferir('as quatro linhas de exclusão sem lista somam +367', 367, sum(b(nov0[c]) - b(ant[c]) for c in ('amostra', 'restantes', 'excluidos', 'qualidade')))
conferir('o bloco de ausência: 571 bytes e duas quebras = +573', 573, b(deriva.BLOCO_A) + 2)
# decomposição observada nos contextos de fiacao (derivados e base): +573 (sem lista), +619 (lista), +396 e +367 (exclusão)
D = lambda cen: len(lerb(NOVOS + 'fiacao-' + cen + '.txt')) - len(lerb(CAP + 'saida2/fiacao-' + cen + '.txt'))
conferir('fiacao A-sem-lista: +573', 573, D('A-sem-lista'))
conferir('fiacao A-sem − A-sem-lista: +619', 619, D('A-sem') - D('A-sem-lista'))
conferir('fiacao A-sem-exclusao-ativa − A-sem: +396', 396, D('A-sem-exclusao-ativa') - D('A-sem'))
conferir('fiacao A-sem-lista-exclusao-ativa − A-sem-lista: +367', 367, D('A-sem-lista-exclusao-ativa') - D('A-sem-lista'))
d1 = json.load(open(NOVOS + '../derivados-conjunto1.json', encoding='utf-8'))
motivo = {r['condicao']: (r['motivo']['linhasBase'], r['motivo']['linhasNovo']) for r in d1['fase2'] if 'motivo' in r}
txt = '\n'.join(bloco)
m = re.search(r'58 passa a 64 \(sem lista, \+6\) e 72, 74, 74 e 74 passam a 79, 81, 81 e 81 \(com lista, \+7\)', txt)
assert m, 'a frase das linhas do motivo não foi encontrada no registro'
conferir('linhas do motivo, base (disponibilidade-ausente, -incompleta, contradicao, coerencia-nao-concluida, coerencia-nao-avaliada-CONSTRUIDA)', [[58], [72], [74], [74], [74]], [motivo[c][0] for c in ('disponibilidade-ausente', 'disponibilidade-incompleta', 'contradicao', 'coerencia-nao-concluida', 'coerencia-nao-avaliada-CONSTRUIDA')])
conferir('linhas do motivo, previsto', [[64], [79], [81], [81], [81]], [motivo[c][1] for c in ('disponibilidade-ausente', 'disponibilidade-incompleta', 'contradicao', 'coerencia-nao-concluida', 'coerencia-nao-avaliada-CONSTRUIDA')])
print(f'(3) frases, linhas de exclusão e linhas do motivo: {total - t0} valores comparados')

print()
print(f'CONFERÊNCIA COM O REGISTRO: {total} valores publicados comparados; {total - len(falhas)} coincidem; {len(falhas)} divergem.')
if falhas:
    print('DIVERGÊNCIAS (o valor publicado fica como está; a divergência é relatada):')
    for r, p, o in falhas:
        print('  -', r, '| publicado', p, '| produzido', o)
sys.exit(1 if falhas else 0)
