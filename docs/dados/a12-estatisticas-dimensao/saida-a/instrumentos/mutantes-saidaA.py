import subprocess, json, hashlib, os, sys
RAIZ = '/home/user/ahp-simple'
SP = '/tmp/claude-0/-home-user-ahp-simple/c289e01b-f054-5819-8bb1-15650f3800a3/scratchpad/t/dim2'
os.chdir(RAIZ)
ROTA = 'app/api/ai-reviewer/route.ts'
MOD = 'lib/ai-reviewer/vinculo-execucao.ts'
TESTES = ['lib/__tests__/a12-estatisticas-dimensao.test.ts', 'lib/__tests__/a12-estatisticas-dimensao-consumidor-latente.test.ts', 'lib/__tests__/vinculo-execucao-fiacao.test.ts', 'lib/__tests__/vinculo-execucao.test.ts']
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
antes = {p: sha(p) for p in [ROTA, MOD]}
orig = {p: open(p, encoding='utf8').read() for p in [ROTA, MOD]}

S1 = "⚠️ Contagem por dimensão BOCR: não disponível nesta requisição (respostas totais, válidas, warning e críticas por dimensão)."
FRASE_EXISTENTE = "⚠️ Não disponíveis: a qualidade individual não foi avaliada. Nenhum percentual por dimensão é apresentado."
TAXA_SB = "'**Taxa de Validade Geral:** não calculada — nenhuma das contagens agregadas recebidas nesta requisição (por status, resumo ou totais gerais) traz total positivo.'"
QUARTO_RAMO = """  } else if (avaliada) {
    totalResponses = data.individualStats.Benefits.total +
      data.individualStats.Opportunities.total +
      data.individualStats.Costs.total +
      data.individualStats.Risks.total;

    validResponses = data.individualStats.Benefits.valid +
      data.individualStats.Opportunities.valid +
      data.individualStats.Costs.valid +
      data.individualStats.Risks.valid;
  }
"""
DIVISAO = """  let individualStats = rawData.individualStats || rawData.criteriaStats;
  if (individualStats && !individualStats.Benefits) {
    const a = individualStats;
    const q = (x: number) => Math.floor(x / 4) || 0;
    individualStats = { Benefits: { total: q(a.total), valid: q(a.valid), warning: q(a.warning), critical: q(a.critical) }, Opportunities: { total: q(a.total), valid: q(a.valid), warning: q(a.warning), critical: q(a.critical) }, Costs: { total: q(a.total), valid: q(a.valid), warning: q(a.warning), critical: q(a.critical) }, Risks: { total: q(a.total), valid: q(a.valid), warning: q(a.warning), critical: q(a.critical) } };
  }
  if (!individualStats) individualStats = { Benefits: { total: 0, valid: 0, warning: 0, critical: 0 }, Opportunities: { total: 0, valid: 0, warning: 0, critical: 0 }, Costs: { total: 0, valid: 0, warning: 0, critical: 0 }, Risks: { total: 0, valid: 0, warning: 0, critical: 0 } };
"""
ANCORA_DIV = "  // Normalizar bocrWeights - converter array em objeto\n"

# (nome, arquivo, [(velho, novo), ...], o que se espera que o reprove)
MUT = [
 ('M1 bloco elegível volta a trazer DÍGITO (um número no lugar da ausência)', ROTA,
  [("(respostas totais, válidas, warning e críticas por dimensão). Os totais deste contexto", "(respostas totais, válidas, warning e críticas por dimensão, 0). Os totais deste contexto")],
  'ensaios 1, 2, 3, 8, 9'),
 ('M2 Taxa SEM base volta a ser 0.0% (o zero no lugar da ausência)', ROTA,
  [("const overallValidPercent = totalResponses > 0 ? (validResponses / totalResponses) * 100 : null;", "const overallValidPercent = totalResponses > 0 ? (validResponses / totalResponses) * 100 : 0;")],
  'controle do consumidor latente (Taxa sem base)'),
 ('M3 Taxa MEDIDA em 0% trocada por "não calculada" (base = válidas > 0)', ROTA,
  [("const overallValidPercent = totalResponses > 0 ? (validResponses / totalResponses) * 100 : null;", "const overallValidPercent = validResponses > 0 ? (validResponses / totalResponses) * 100 : null;")],
  'ensaios 2b, 5 e o controle "com base medida"'),
 ('M4 pedido NÃO avaliado passa a imprimir a frase NOVA (a existente é trocada)', ROTA,
  [("const blocoPorDimensao = !avaliada\n    ? '" + FRASE_EXISTENTE + "'", "const blocoPorDimensao = !avaliada\n    ? '" + S1 + "'")],
  'ensaio 4'),
 ('M5 a frase EXISTENTE muda um caractere (mesma causa)', ROTA,
  [("Nenhum percentual por dimensão é apresentado.'\n    : '⚠️ Contagem", "Nenhum percentual por dimensão e apresentado.'\n    : '⚠️ Contagem")],
  'ensaio 4 e a linha de base por sha256'),
 ('M6 pedido ELEGÍVEL passa a imprimir a frase EXISTENTE (que seria falsa)', ROTA,
  [("const blocoPorDimensao = !avaliada\n    ? '", "const blocoPorDimensao = avaliada\n    ? '")],
  'ensaios 1, 2, 3, 4, 8, 9'),
 ('M7a QUARTO RAMO reinstalado, com o `individualStats` passado tal como veio (sem divisão)', ROTA,
  [("    validResponses = data.overallStats.valid || 0;\n  }\n", "    validResponses = data.overallStats.valid || 0;\n" + QUARTO_RAMO),
   ("    projectDescription: rawData.projectDescription || rawData.description,\n    bocrWeights,", "    projectDescription: rawData.projectDescription || rawData.description,\n    individualStats: rawData.individualStats,\n    bocrWeights,")],
  'controle do consumidor latente'),
 ('M7b QUARTO RAMO reinstalado E a divisão por quatro reinstalada (o defeito completo, sem o bloco)', ROTA,
  [("    validResponses = data.overallStats.valid || 0;\n  }\n", "    validResponses = data.overallStats.valid || 0;\n" + QUARTO_RAMO),
   ("    projectDescription: rawData.projectDescription || rawData.description,\n    bocrWeights,", "    projectDescription: rawData.projectDescription || rawData.description,\n    individualStats: (rawData as any).__individualStats,\n    bocrWeights,"),
   (ANCORA_DIV, DIVISAO.replace("let individualStats", "let individualStats").replace("individualStats = rawData", "individualStats = rawData") + "  (rawData as any).__individualStats = individualStats;\n" + ANCORA_DIV)],
  'controle do consumidor latente (a Taxa volta a sair do quociente)'),
 ('M8 Taxa COM base perde precisão (toFixed(2))', ROTA,
  [("`**Taxa de Validade Geral:** ${overallValidPercent.toFixed(1)}% das respostas", "`**Taxa de Validade Geral:** ${overallValidPercent.toFixed(2)}% das respostas")],
  'ensaios 2, 2b, 5 e controle "com base medida"'),
 ('M9 um byte de OUTRA parte do contexto muda (fora dos cinco pontos)', ROTA,
  [("**Ratio Máximo/Mínimo:**", "**Ratio Máximo/Mínimo :**")],
  'ensaio 9 (byte a byte) e os 27 cenários'),
 ('M10 item da chave: o item ANTIGO volta (descreve a divisão)', MOD,
  [("""  '  - "Estatísticas por Dimensão" BOCR: nenhuma contagem por dimensão é apresentada neste contexto, e nenhuma deve ser derivada dos totais agregados, ' +
    'que NÃO são contagem por dimensão nem participação por dimensão nas matrizes.',""",
    """  '  - os totais por dimensão BOCR de "Estatísticas por Dimensão" NÃO medem a participação por dimensão e NÃO são o N de matriz alguma ' +
    '(quando a requisição traz o total agregado, como a da tela, a rota o reparte por quatro, arredondando para baixo).',""")],
  'ensaios 7, 9, fiação :730'),
 ('M11 item da chave novo, mas com um DÍGITO e "por quatro"', MOD,
  [("que NÃO são contagem por dimensão nem participação por dimensão nas matrizes.',", "que NÃO são contagem por dimensão nem participação por dimensão nas matrizes (por quatro).',")],
  'ensaios 7, 9, fiação'),
 ('M12 bloco elegível volta a dizer "não existe" em lugar de "não disponível nesta requisição"', ROTA,
  [("Contagem por dimensão BOCR: não disponível nesta requisição (", "Contagem por dimensão BOCR: não existe (")],
  'ensaios 1, 2, 3, 8, 9'),
 ('M13 a Taxa sem base sobrevive, mas o base passa a valer com total ZERO (base = total >= 0)', ROTA,
  [("const overallValidPercent = totalResponses > 0 ? (validResponses / totalResponses) * 100 : null;", "const overallValidPercent = totalResponses >= 0 && avaliada && totalResponses === 0 ? 0 : (totalResponses > 0 ? (validResponses / totalResponses) * 100 : null);")],
  'controle do consumidor latente'),
]

resultado = []
try:
    for nome, arq, trocas, esperado in MUT:
        t = orig[arq]
        novo = t
        ok = True
        for velho, nv in trocas:
            if novo.count(velho) != 1:
                resultado.append((nome, 'PADRAO-NAO-ENCONTRADO', novo.count(velho), velho[:70])); ok = False; break
            novo = novo.replace(velho, nv)
        if not ok: continue
        open(arq, 'w', encoding='utf8').write(novo)
        r = subprocess.run(['npx', 'jest'] + TESTES + ['--silent', '--json', '--outputFile=' + SP + '/mut.json'], capture_output=True, text=True)
        j = json.load(open(SP + '/mut.json'))
        compilou = j['numRuntimeErrorTestSuites'] == 0
        falhas = j['numFailedTests']
        nomes = []
        for tr in j['testResults']:
            arqn = tr['name'].split('/lib/__tests__/')[-1].replace('.test.ts', '')
            for a in tr['assertionResults']:
                if a['status'] == 'failed':
                    nomes.append(f"{arqn}::{a['title'][:70]}")
        estado = 'ERRO-DE-COMPILACAO' if not compilou else ('MORTO' if falhas > 0 else 'SOBREVIVEU')
        resultado.append((nome, estado, falhas, esperado, nomes[:6]))
        open(arq, 'w', encoding='utf8').write(t)
finally:
    for arq, t in orig.items():
        open(arq, 'w', encoding='utf8').write(t)
depois = {p: sha(p) for p in [ROTA, MOD]}
print('arquivos restaurados, sha256 igual ao de antes:', depois == antes)
for r in resultado:
    print('-', r[0]); print('   ', r[1:4] if len(r) > 3 else r[1:])
    if len(r) > 4:
        for n in r[4]: print('      x', n)
json.dump(resultado, open(SP + '/mutantes-resultado.json', 'w'), ensure_ascii=False, indent=1)
