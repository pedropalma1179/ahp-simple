# Executor dos 20 mutantes da linha 'Cobertura enviada' (so lib/ai-reviewer/vinculo-execucao.ts). Roda a suite INTEIRA em cada um,
# restaura a fonte e confere o sha256 no fim. ATENCAO: `RAIZ` e `SP` sao caminhos da sessao em que foi executado; ajuste-os.
# Os padroes `velho` valem para o texto de vinculo-execucao.ts DEPOIS desta rodada (cada um ocorre UMA vez; senao o mutante e relatado).
import subprocess, json, hashlib, os
RAIZ = '/home/user/ahp-simple'
SP = '/tmp/claude-0/-home-user-ahp-simple/c289e01b-f054-5819-8bb1-15650f3800a3/scratchpad/cob'
os.chdir(RAIZ)
MOD = 'lib/ai-reviewer/vinculo-execucao.ts'
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
antes = sha(MOD)
orig = open(MOD, encoding='utf8').read()

OLD_CALL = "  linhas.push(linhaDaCobertura(cob, leitura));\n"
ANTIGA = """  linhas.push(
    cob?.restringiu === true
      ? '- Cobertura enviada: o conjunto avaliado foi RESTRINGIDO aos identificadores presentes no documento de cálculo, e ' +
          (leitura.conferencia !== null && !leitura.conferencia.correspondeAosEnviados
            ? `o vínculo declara que a lista de respondentes que segue é a dos ${numero(cob?.enviados)} enviados (a linha da lista APRESENTADA, abaixo, compara essa declaração com a lista).`
            : `a lista de respondentes que segue é a dos ${numero(cob?.enviados)} enviados.`)
      : '- Cobertura enviada: nenhuma restrição foi aplicada; o conjunto enviado é o avaliado.'
  );
"""

# (nome, [(velho, novo)])  -- cada `velho` tem de ocorrer UMA vez na fonte
MUT = [
 ('C1 com retirada lida como SEM retirada (c vira b)',
  [("    if (diferem === true && enviados < avaliados) return { estado: 'com-retirada' };", "    if (diferem === true && enviados < avaliados) return { estado: 'sem-retirada' };")]),
 ('C2 SEM retirada lida como com retirada (b vira c): o defeito original em (b)',
  [("    if (diferem === false && enviados === avaliados) return { estado: 'sem-retirada' };", "    if (diferem === false && enviados === avaliados) return { estado: 'com-retirada' };")]),
 ('C3 `<` trocado por `<=` em (c): iguais com o booleano verdadeiro viram (c)',
  [("if (diferem === true && enviados < avaliados)", "if (diferem === true && enviados <= avaliados)")]),
 ('C4 (b) ignora a igualdade das contagens: menor com o booleano falso vira (b)',
  [("if (diferem === false && enviados === avaliados)", "if (diferem === false)")]),
 ('C5 (c) ignora a desigualdade das contagens: iguais com o booleano verdadeiro vira (c)',
  [("if (diferem === true && enviados < avaliados)", "if (diferem === true)")]),
 ('C6 a condição 1 nunca é nomeada',
  [("  const condicao =\n    contagensValidas && enviados > avaliados\n", "  const condicao =\n    false\n")]),
 ('C7 as condições 2 e 3 trocadas de ordem (duas valem ao mesmo tempo)',
  [("""      : typeof diferem !== 'boolean'
        ? 'o vínculo não declara se a lista mudou'
        : !contagensValidas
          ? 'as contagens declaradas não permitem decidir'
          : 'o booleano e as contagens declarados discordam';""",
    """      : !contagensValidas
        ? 'as contagens declaradas não permitem decidir'
        : typeof diferem !== 'boolean'
          ? 'o vínculo não declara se a lista mudou'
          : 'o booleano e as contagens declarados discordam';""")]),
 ('C8 o motivo exibe `String(...)` em lugar de `numero(...)` nas duas contagens',
  [("`avaliadosAntesDaRestricao = ${numero(cob?.avaliadosAntesDaRestricao)}, enviados = ${numero(cob?.enviados)}`;", "`avaliadosAntesDaRestricao = ${String(cob?.avaliadosAntesDaRestricao)}, enviados = ${String(cob?.enviados)}`;")]),
 ('C9 o booleano é exibido por `String(b)`',
  [("${b === true ? 'true' : b === false ? 'false' : 'não informado'}", "${String(b)}")]),
 ('C10 a cláusula "declara" some em (b): só a forma simples',
  [("nenhum elemento da lista avaliada foi retirado, e ${clausula}`;", "nenhum elemento da lista avaliada foi retirado, e a lista de respondentes que segue é a dos ${numero(cob?.enviados)} enviados.`;")]),
 ('C11 (a) ganha a cláusula de R4',
  [("    return '- Cobertura enviada: nenhuma restrição foi aplicada; o conjunto enviado é o avaliado.';", "    return '- Cobertura enviada: nenhuma restrição foi aplicada; o conjunto enviado é o avaliado.' + ' a lista de respondentes que segue é a dos ' + numero(cob?.enviados) + ' enviados.';")]),
 ('C12 contagem negativa passa por válida',
  [("typeof x === 'number' && Number.isInteger(x) && x >= 0;", "typeof x === 'number' && Number.isInteger(x);")]),
 ('C13 contagem fracionária (e infinita) passa por válida',
  [("typeof x === 'number' && Number.isInteger(x) && x >= 0;", "typeof x === 'number' && x >= 0;")]),
 ('C14 `restringiu` lido por veracidade, e não por `=== true`',
  [("if (cob?.restringiu !== true) return { estado: 'nao-aplicado' };", "if (!cob?.restringiu) return { estado: 'nao-aplicado' };")]),
 ('C15 a abertura de (d) com um caractere a menos de acento',
  [("NÃO se pode determinar se algum elemento da lista avaliada foi retirado (", "Nao se pode determinar se algum elemento da lista avaliada foi retirado (")]),
 ('C16 a abertura de (c) perde um acento (a de antes tem de ficar palavra por palavra)',
  [("RESTRINGIDO aos identificadores presentes no documento de cálculo, e ${clausula}`;", "RESTRINGIDO aos identificadores presentes no documento de calculo, e ${clausula}`;")]),
 ('C17 a correção INTEIRA revertida (o defeito original: toda restrição diz RESTRINGIDO)',
  [(OLD_CALL, ANTIGA)]),
 ('C18 o rótulo do motivo muda ("lidos:")',
  [("; lido: ${lido}), e ${clausula}`;", "; lidos: ${lido}), e ${clausula}`;")]),
 ('C19 a cláusula "declara" passa a depender da retirada (só com retirada)',
  [("    leitura.conferencia !== null && !leitura.conferencia.correspondeAosEnviados\n      ? `o vínculo declara", "    leitura.conferencia !== null && !leitura.conferencia.correspondeAosEnviados && retirada.estado === 'com-retirada'\n      ? `o vínculo declara")]),
 ('C20 a validade das contagens deixa de entrar em (b) e (c) (duas contagens em texto e iguais viram (b))',
  [("if (typeof diferem === 'boolean' && contagensValidas) {", "if (typeof diferem === 'boolean') {")]),
]

TESTES_RELEVANTES = []   # a suíte INTEIRA roda em cada mutante: nenhum arquivo é escolhido por mim
resultado = []
try:
    for nome, trocas in MUT:
        novo = orig
        achou = True
        for velho, nv in trocas:
            if novo.count(velho) != 1:
                resultado.append({'mutante': nome, 'estado': 'PADRAO-NAO-ENCONTRADO', 'ocorrencias': novo.count(velho), 'padrao': velho[:80]})
                achou = False
                break
            novo = novo.replace(velho, nv)
        if not achou:
            continue
        open(MOD, 'w', encoding='utf8').write(novo)
        subprocess.run(['npx', 'jest', '--silent', '--json', '--outputFile=' + SP + '/mut.json'], capture_output=True, text=True)
        j = json.load(open(SP + '/mut.json'))
        compilou = j['numRuntimeErrorTestSuites'] == 0
        falhas = j['numFailedTests']
        quem = []
        for tr in j['testResults']:
            arq = tr['name'].split('/lib/__tests__/')[-1].replace('.test.ts', '')
            for a in tr['assertionResults']:
                if a['status'] == 'failed':
                    quem.append(arq + '::' + a['title'][:90])
        estado = 'ERRO-DE-COMPILACAO' if not compilou else ('MORTO' if falhas > 0 else 'SOBREVIVEU')
        resultado.append({'mutante': nome, 'estado': estado, 'testesReprovados': falhas, 'quem': quem[:8]})
        open(MOD, 'w', encoding='utf8').write(orig)
finally:
    open(MOD, 'w', encoding='utf8').write(orig)
depois = sha(MOD)
saida = {'fonteRestauradaComSha256Igual': antes == depois, 'sha256': antes, 'resultado': resultado}
json.dump(saida, open(SP + '/mutantes-resultado.json', 'w'), ensure_ascii=False, indent=1)
print('fonte restaurada, sha256 igual ao de antes:', antes == depois)
for r in resultado:
    print('-', r['mutante'], '=>', r['estado'], r.get('testesReprovados', ''))
