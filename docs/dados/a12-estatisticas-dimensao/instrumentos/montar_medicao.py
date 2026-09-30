#!/usr/bin/env python3
"""
Monta docs/dados/a12-estatisticas-dimensao/medicao.json a partir das saidas dos quatro instrumentos
(testes temporarios NAO versionados, arquivados em instrumentos/ como texto).

Uso: montar_medicao.py <diretorio das saidas> <diretorio de destino>

Nada aqui e medicao NOVA: cada valor vem de um arquivo de saida dos instrumentos, ou e uma
CONTAGEM derivada deles com o criterio declarado no proprio campo. Nenhum acesso a rede ou a producao.
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

SAIDA = Path(sys.argv[1])
DEST = Path(sys.argv[2])
DEST.mkdir(parents=True, exist_ok=True)


def ler(nome):
    return json.loads((SAIDA / nome).read_text(encoding='utf8'))


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


DIMS = [('B', 'crBenefits', 'Benefits'), ('O', 'crOpportunities', 'Opportunities'), ('C', 'crCosts', 'Costs'), ('R', 'crRisks', 'Risks')]

# ---------------------------------------------------------------- (a) o produtor sobre o painel de 12
painel = ler('painel-12-produtor.json')
motor = ler('motor-painel-12.json')
motor_por_id = {m['id']: m for m in motor}

linhas = []
for l in painel['linhas']:
    m = motor_por_id[l['id']]
    linha = {'id': l['id'], 'status': l['status'], 'cr': l['cr'], 'crBOCR': l['crBOCR'], 'avgCR': l['avgCR'],
             'maquinaGovernante': m['governingMatrix']}
    for k, campo, _ in DIMS:
        valor = l[campo]
        no_motor = m[k]['valor']
        # natureza do valor no MOTOR (antes do `|| 0` do produtor) e no PAYLOAD (depois)
        if valor == 0:
            forma = 'zero_exato'
        elif valor < 0:
            forma = 'residuo_negativo_de_ponto_flutuante'
        else:
            forma = 'positivo'
        linha[campo] = {
            'valorNoPayload': valor,
            'valorNoMotor': no_motor,
            'motorPresenteENumerico': bool(m[k]['presente'] and m[k]['tipo'] == 'number' and not m[k]['ehNaN']),
            'iguaisNoMotorEDepoisDoOrZero': valor == m[k]['apos_ou_zero'],
            'natureza': 'calculado agora pelo motor a partir dos julgamentos (o fixture nao traz cache gravado)',
            'forma': forma,
        }
    linhas.append(linha)

# contagem por dimensao, com os limiares dos ROTULOS do bloco (<= 0.10, (0.10, 0.20], > 0.20)
contagem = {}
for k, campo, nome in DIMS + [('BOCR', 'crBOCR', 'BOCR (4x4; NAO tem bloco no contexto)')]:
    v = w = c = 0
    for l in painel['linhas']:
        x = l[campo]
        if x <= 0.10:
            v += 1
        elif x <= 0.20:
            w += 1
        else:
            c += 1
    contagem[k] = {'dimensao': nome, 'validas_ate_0_10': v, 'warning_0_10_a_0_20': w, 'criticas_acima_de_0_20': c, 'denominador': v + w + c}

celulas_nao_positivas = [
    {'id': l['id'], 'dimensao': k, 'valor': l[campo]}
    for l in painel['linhas'] for k, campo, _ in DIMS if l[campo] <= 0
]

# conferencia contra docs/referencia-cr-individuais.md (tabela em porcentagem, 2 casas)
ref = {}
for ln in Path('docs/referencia-cr-individuais.md').read_text(encoding='utf8').splitlines():
    if re.match(r'\|\s*R\d\d\s*\|', ln):
        cel = [c.strip() for c in ln.strip().strip('|').split('|')]
        num = lambda s: float(s.replace(',', '.'))
        ref[cel[0]] = {'BOCR': num(cel[1]), 'B': num(cel[3]), 'O': num(cel[4]), 'C': num(cel[5]), 'R': num(cel[6]), 'gov': num(cel[9])}
diverg = []
total_celulas = 0
for l in painel['linhas']:
    got = {'BOCR': l['crBOCR'], 'B': l['crBenefits'], 'O': l['crOpportunities'], 'C': l['crCosts'], 'R': l['crRisks'], 'gov': l['cr']}
    for k, v in got.items():
        total_celulas += 1
        esperado = ref[l['id']][k]
        if not (abs(round(v * 100, 2) - esperado) < 0.0051 or (abs(v) < 1e-9 and esperado == 0)):
            diverg.append({'id': l['id'], 'coluna': k, 'produtor': round(v * 100, 2), 'referencia': esperado})

a_produtor = {
    'fonte': 'POST /api/response-quality (handler real), sobre lib/__tests__/fixtures/panel-2026.json, so com {respondentId, judgments}',
    'estatisticasDoProdutor': painel['estatisticas'],
    'linhas': linhas,
    'contagemPorDimensao': {
        'criterio': 'CR <= 0.10 valida; 0.10 < CR <= 0.20 warning; CR > 0.20 critica (os ROTULOS do bloco, route.ts:1152-1154). E contagem de PESSOAS com CR naquela dimensao, medida sobre os 12; NAO e o que o bloco imprime hoje.',
        'porDimensao': contagem,
    },
    'celulasComValorNaoPositivo': celulas_nao_positivas,
    'todasAsCelulasDoMotorPresentesENumericas': all(l[c]['motorPresenteENumerico'] for l in linhas for _, c, _ in DIMS),
    'todasIguaisNoMotorEDepoisDoOrZero': all(l[c]['iguaisNoMotorEDepoisDoOrZero'] for l in linhas for _, c, _ in DIMS),
    'conferenciaContraReferencia': {
        'arquivo': 'docs/referencia-cr-individuais.md, secao 2',
        'colunasComparadas': ['BOCR', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R', 'governante'],
        'celulas': total_celulas,
        'divergentes': diverg,
        'nota': 'a coluna MAGN da referencia nao tem correspondente em metrics (o produtor nao a transporta)',
    },
}

naturezas = ler('naturezas-produtor.json')

# ---------------------------------------------------------------- (a) os doze pelo caminho GRAVADO, DERIVADO do IPC de abril-maio de 2026
ipc = ler('ipc-4437b3c-painel-12.json')
gravado = ler('painel-12-gravado-derivado.json')
# valores que o log de producao da execucao 7 registrou ("Bias: CRs mapeados: CR=..."), transcritos de docs/imprecisoes-parecer-ia.md, Anexo 3
logados = [0.010504514795322372, 0.035945896757571656, 0.020820121915492394]
correspondencia_log = {repr(v): [x['id'] for x in ipc if x['avgCRdoIPC'] == v] for v in logados}

def categoria(x):
    return 'valida' if x <= 0.10 else ('warning' if x <= 0.20 else 'critica')

celulas_ipc = []
for x in ipc:
    for k, nome in (('B', 'crBenefits'), ('O', 'crOpportunities'), ('C', 'crCosts'), ('R', 'crRisks')):
        valor_motor = next(l for l in painel['linhas'] if l['id'] == x['id'])[nome]
        celulas_ipc.append({'id': x['id'], 'dimensao': k, 'gravadoDerivado': x[k]['ipc'], 'calculadoAgora': valor_motor,
                            'diferencaAbsoluta': abs(x[k]['ipc'] - valor_motor),
                            'mesmaCategoria': categoria(x[k]['ipc']) == categoria(valor_motor)})
contagem_gravado = {}
for k in 'BOCR':
    v = w = c = 0
    for x in ipc:
        cat = categoria(x[k]['ipc'])
        v += cat == 'valida'; w += cat == 'warning'; c += cat == 'critica'
    contagem_gravado[k] = {'validas_ate_0_10': v, 'warning_0_10_a_0_20': w, 'criticas_acima_de_0_20': c, 'denominador': v + w + c}

avg = [x['avgCRdoIPC'] for x in ipc]
a_gravado = {
    'natureza': 'DERIVADO: o IPC de 4437b3c (blob e4cde7af7ec21841418f0c2b149f2d38946ec738, igual em 7f46e3a e em 9f2284c^; graph-utils 02da7b069e80136edf464e814a691345aea0c71e) rodou sobre os julgamentos do fixture. NAO sao os documentos de producao.',
    'porQueEsteEOCaminhoDaProducao': 'o gravador de abril-maio (7f46e3a a 4437b3c) grava avgCR e subConsistency pelo IPC; a coleta foi de 2026-04-22 a 2026-05-06 (meta do fixture); o IPC nao mudou ate 2026-06-16 (9f2284c); o produtor recupera esses campos por retorno antecipado (route.ts:75-78), e o calculo pelos julgamentos nao dispara',
    'confirmacaoIndependente': {
        'fonte': 'log de producao da execucao 7 (2026-09-13T01:59:11Z), transcrito em docs/imprecisoes-parecer-ia.md, Anexo 3, "Payload, no que o log revela"',
        'valoresLogados': logados,
        'igualdadeExataComOAvgCRDerivadoDe': correspondencia_log,
        'observacao': 'o log nao nomeia os respondentes: a correspondencia e por IGUALDADE EXATA dos 17 digitos. Confirma tres dos doze; os outros nove NAO tem confirmacao independente.',
        'linhaDoLog': 'Usando statistics.byStatus: 12✅ 0⚠️ 0❌ 0❓ → Validade: 100.0%',
        'reproduzidoPelaCadeia': {'byStatus': gravado['estatisticasDoProdutor']['byStatus'], 'individualStatsDaTela_achatado': gravado['individualStatsDaTela_achatado'], 'taxa': gravado['taxaSemVinculo']},
        'faixaDoAvgCRDerivado_pct': [round(min(avg) * 100, 4), round(max(avg) * 100, 4)],
        'faixaDeclaradaEmReferenciaCRIndividuais': '1,05% a 9,64% (docs/referencia-cr-individuais.md, secao 3.1)',
    },
    'metodoDoIPC': {'todosEIGENVECTOR': all(x[k]['ipcMetodo'] == 'EIGENVECTOR' for x in ipc for k in 'BOCR'), 'todosCOMPLETE': all(x[k]['ipcCompletude'] == 'COMPLETE' for x in ipc for k in 'BOCR'),
                    'algumGrupoDesconectado': any(x['temGrupoDesconectado'] for x in ipc), 'gruposContadosNoAvgCR': sorted({x['gruposContados'] for x in ipc}),
                    'alternativasTodasComCRZero': all(x['alternativasTodasComCRZero'] for x in ipc),
                    'nota': 'o IPC deriva os pesos pela MEDIA GEOMETRICA das linhas, e nao pelo autovetor principal do motor atual; os CRs diferem'},
    'linhas': ipc,
    'contagemPorDimensao_valoresGravadosDerivados': contagem_gravado,
    'celulasGravadoContraCalculadoAgora': {
        'celulas': len(celulas_ipc),
        'maiorDiferencaAbsoluta': max(celulas_ipc, key=lambda c: c['diferencaAbsoluta']),
        'celulasComDiferencaAcimaDe_0_005': [c for c in celulas_ipc if c['diferencaAbsoluta'] > 0.005],
        'celulasComCategoriaDiferente': [c for c in celulas_ipc if not c['mesmaCategoria']],
        'zerosExatosNoGravadoDerivado': [(c['id'], c['dimensao']) for c in celulas_ipc if c['gravadoDerivado'] == 0],
        'zerosExatosNoCalculadoAgora': [(c['id'], c['dimensao']) for c in celulas_ipc if c['calculadoAgora'] == 0],
    },
    'pelaCadeiaReal': gravado,
}

# ---------------------------------------------------------------- (b) a cadeia ate o payload
cadeia = ler('cadeia-produtor-ate-payload.json')
cadeia_resumo = {k: cadeia[k] for k in ('respondentes', 'camposPorRespondente', 'celulas', 'iguaisNoPayload', 'avaliacao', 'estatisticasDaTela', 'nomesNoContexto', 'metricsNoContexto', 'taxa', 'totalDaLista', 'bloco')}

# ---------------------------------------------------------------- (c) o consumidor agregado
grade = ler('grade-elegibilidade.json')
eleg = [g for g in grade if g['elegivel']]
c_consumidor = {
    'grade32': {
        'o_que_varia': 'presenca de statistics.byStatus, statistics.total, summary, overallStats e respondents (2^5 = 32), sempre com valores coerentes; avaliacaoDeQualidade declarada disponivel e individualStats presente',
        'limite': 'o campo ramoDosTotais vem de uma TRANSCRICAO da cadeia de route.ts:840-865 feita no instrumento, e nao do tratador; a grade nao varia VALORES, so presenca',
        'combinacoes': len(grade),
        'elegiveis': len(eleg),
        'elegiveisQueAlcancamORamoQueSomaAsQuatroDimensoes': sum(1 for g in eleg if g['ramoDosTotais'] == 4),
        'ramosAlcancadosPorElegiveis': sorted({str(g['ramoDosTotais']) for g in eleg}),
        'elegiveisSemByStatus': sum(1 for g in eleg if not g['byStatus']),
        'linhas': grade,
    },
    'elegibilidade': ler('elegibilidade-ramo4.json'),
    'alcancadoPeloTratadorReal_soIndividualStats': ler('ramo4.json'),
    'somaAcidentalComTodosConfiaveis': ler('ramo4-alcancado.json'),
    'forcado': {
        'instrumento': 'jest.mock de elegivelParaClassificacao para devolver elegivel:true (DUPLO DE TESTE declarado), de modo que o codigo REAL de route.ts:855-865 execute',
        'casos': ler('ramo4-forcado.json'),
    },
    'porDimensaoEmPessoas': ler('ramo4-por-dimensao.json'),
}

# ---------------------------------------------------------------- (e) os agregados, pelo tratador real
def bloco_por_dimensao(bloco):
    out = {}
    for parte in re.split(r'### ', bloco)[1:]:
        nome = parte.split('\n')[0].split(' ')[0]
        vals = dict(re.findall(r'- (Respostas totais|Válidas \(CR ≤ 0\.10\)|Warning \(0\.10 < CR ≤ 0\.20\)|Críticas \(CR > 0\.20\)): (\d+)', parte))
        out[nome] = {'total': int(vals['Respostas totais']), 'validas': int(vals['Válidas (CR ≤ 0.10)']),
                     'warning': int(vals['Warning (0.10 < CR ≤ 0.20)']), 'criticas': int(vals['Críticas (CR > 0.20)'])}
    return out


agregados = {}
for nome in ('agregado-5', 'agregado-3', 'agregado-12', 'agregado-5-com-2-desconhecidos'):
    r = ler(f'resumo-{nome}.json')
    sem, com = r['semVinculo'], r['comVinculo']
    por_dim = bloco_por_dimensao(sem['bloco'])
    soma_totais = sum(x['total'] for x in por_dim.values())
    tela = r['estatisticasDaTela']
    agregados[nome] = {
        'respondentes': r['respondentes'],
        'individualStatsDaTela_achatado': {k: tela[k] for k in ('total', 'valid', 'warning', 'critical')},
        'avaliacao': r['avaliacao'],
        'blocoImpressoPorDimensao': por_dim,
        'somaDosQuatroTotais': soma_totais,
        'diferencaAritmeticaParaOTotalDaTela': tela['total'] - soma_totais,
        'aDiferencaNaoEhRespondentesPerdidosNemConservacao': True,
        'blocoIdenticoComESemVinculo': sem['bloco'] == com['bloco'],
        'taxaIdenticaComESemVinculo': sem['taxa'] == com['taxa'],
        'taxa': sem['taxa'],
        'semVinculo': {k: sem[k] for k in ('frasesSobreN', 'totalDaLista', 'resumoDoPainel', 'bloco')},
        'comVinculo': {k: com[k] for k in ('frasesSobreN', 'totalDaLista', 'resumoDoPainel')},
    }

e_cobertura = {
    'parcial-3-de-5': ler('parcial-3-de-5.json'),
    'suspensaoPorContradicao': ler('suspensao-por-contradicao.json'),
    'elegivelSemIndividualStats': ler('bloco-sem-individualStats.json'),
}

a33 = ler('a33-referencia-bloco.json')

# ---------------------------------------------------------------- contextos completos versionados
contextos = []
for nome in ('ctx-agregado-5-semVinculo.txt', 'ctx-agregado-5-comVinculo.txt', 'ctx-agregado-3-semVinculo.txt', 'ctx-agregado-3-comVinculo.txt'):
    origem = SAIDA / nome
    destino = DEST / nome
    shutil.copyfile(origem, destino)
    contextos.append({'arquivo': nome, 'bytes': destino.stat().st_size, 'sha256': sha256(destino)})

# os demais contextos ficam so como sha256 e bytes (nao versionados: sao os mesmos 70 KB com pequenas variacoes)
outros = []
for p in sorted(SAIDA.glob('ctx-*.txt')):
    if p.name in {c['arquivo'] for c in contextos}:
        continue
    outros.append({'arquivo': p.name, 'bytes': p.stat().st_size, 'sha256': sha256(p), 'versionado': False})

medicao = {
    '_meta': {
        'registro': 'A.12: estatisticas por dimensao BOCR, Fase 1 (medir a origem)',
        'data': '2026-09-30',
        'base': 'a07998c953d3c10ed32ef3f436054ba1c12c05a2',
        'ambiente': {'os': 'Linux x86_64', 'node': 'v22.22.2', 'npm': '10.9.7', 'jest': '30.1.3', 'tsc': '5.9.3'},
        'aviso': 'Nenhum byte de producao foi alterado. O cliente do modelo e SIMULADO (chave falsa, texto controlado, sem rede), e a captura interrompe antes da geracao. Nenhuma consulta a producao, nenhum recalculo, nenhum dado de producao. Os instrumentos sao testes temporarios NAO versionados, arquivados como texto em instrumentos/.',
        'instrumentos': ['zz-a12-dim-medicao.test.ts', 'zz-a12-dim-forcado.test.ts', 'zz-a12-dim-motor.test.ts', 'zz-a12-dim-a33.test.ts', 'zz-a12-dim-ipc.test.ts (exige lib/zz-ipc-4437b3c/ahp-ipc.ts e graph-utils.ts, extraidos com git show 4437b3c:lib/ahp-ipc.ts e :lib/graph-utils.ts)', 'montar_medicao.py', 'cobertura-da-suite.json (extraido de `jest --coverage` sobre a suite existente; ver c_cobertura_da_suite_existente)'],
        'reexecucao': 'as 35 saidas dos cinco instrumentos sairam identicas byte a byte em duas execucoes completas seguidas (o arquivo cobertura-da-suite.json, extraido de uma execucao de cobertura a parte, nao entra na contagem)',
        'limites': [
            'a tela NAO e executada por teste algum: o passo da tela no instrumento e uma COPIA LITERAL de page.tsx:1058-1088 (a reducao) e de :1196-1201, :1236-1315 (o payload)',
            'o fixture do painel de 12 traz so julgamentos. Dois caminhos foram exercidos: "calculado agora" (o motor atual, via o calculo de reserva do produtor) e "gravado" (DERIVADO: o IPC de 4437b3c sobre os mesmos julgamentos, montado em documentos no formato do gravador). Os documentos GRAVADOS em producao NAO foram consultados: tres dos doze avgCR derivados coincidem, ate o ultimo digito, com os valores que o log de producao da execucao 7 registrou; os outros nove nao tem confirmacao independente',
            'os casos do agregado 5, 3 e 5-com-2-desconhecidos sao CONSTRUIDOS (itens no formato do produtor), e nao respondentes reais',
            'a grade de 32 varia so a PRESENCA de campos, com valores coerentes',
        ],
    },
    'a_produtor_painel_de_12': a_produtor,
    'a_painel_de_12_pelo_caminho_gravado_DERIVADO_do_IPC': a_gravado,
    'a_naturezas_pelo_produtor_real': naturezas,
    'b_cadeia_ate_o_payload': cadeia_resumo,
    'c_consumidor_agregado': c_consumidor,
    'e_agregados_pelo_tratador_real': agregados,
    'e_cobertura_e_suspensao': e_cobertura,
    'a33_requisicoes_de_referencia_r1_r2': a33,
    'c_cobertura_da_suite_existente': json.loads((SAIDA / 'cobertura-da-suite.json').read_text(encoding='utf8')) if (SAIDA / 'cobertura-da-suite.json').exists() else 'nao avaliada',
    'contextosCompletosVersionados': contextos,
    'contextosNaoVersionados': outros,
}

(DEST / 'medicao.json').write_text(json.dumps(medicao, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
print('escrito', DEST / 'medicao.json', (DEST / 'medicao.json').stat().st_size, 'bytes')
print('celulas conferidas contra a referencia:', total_celulas, 'divergentes:', len(diverg))
print('contagem por dimensao:', {k: (v['validas_ate_0_10'], v['warning_0_10_a_0_20'], v['criticas_acima_de_0_20']) for k, v in contagem.items()})
print('celulas nao positivas:', celulas_nao_positivas)
print('elegiveis na grade:', len(eleg), 'que alcancam o ramo 4:', sum(1 for g in eleg if g['ramoDosTotais'] == 4))
for n, a in agregados.items():
    print(n, a['individualStatsDaTela_achatado'], '->', {k: (v['total'], v['validas'], v['warning'], v['criticas']) for k, v in a['blocoImpressoPorDimensao'].items()}, 'soma', a['somaDosQuatroTotais'], 'dif', a['diferencaAritmeticaParaOTotalDaTela'], 'id.vinculo', a['blocoIdenticoComESemVinculo'], a['taxaIdenticaComESemVinculo'])
