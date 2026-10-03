# Parecer IA, o caminho sem `vinculoDaExecucao` (rodada só de medição): dados da medição

**02/10/2026.** Base do código `ad2ad0afdc1a972570d3733ccc582d65a719397a`. A leitura, as medições e as conclusões ficam em
`docs/imprecisoes-parecer-ia.md`, na seção "Diagnóstico: o caminho sem `vinculoDaExecucao`, rodada só de medição, em 02/10/2026".
⚠ **Esta rodada não altera código nem teste, não corrige o caminho sem o campo, não decide o comportamento esperado para ele, não gera parecer, não faz
chamada de rede e não consulta produção.** O cliente do modelo é **simulado** (chave falsa), e o `fetch` global, substituído por uma função que lança e
conta, registrou **0 chamadas**. Nenhum modelo foi chamado.

## As quatro técnicas, e o que cada uma mede

| Fase | Técnica | O que mede | O que NÃO mede | Onde |
|---|---|---|---|---|
| **A** | **captura interrompida**: o cliente simulado registra o contexto e lança um erro sentinela antes da geração; o `POST` real responde 500 | o **contexto** que seria enviado ao modelo, e só ele | resposta, apresentação | `fase-a/` |
| **B** | **texto fixado, tratador concluindo**: o cliente simulado devolve um texto fixado e o `POST` real conclui (extração, validação de A.27, corpo) | o **corpo** da resposta | o que um modelo geraria; o estado `nenhum_padrao_reconhecido` da extração; outras causas de suspensão | `fase-b/` |
| **C** | **renderização do componente** real `components/ParecerAISection.tsx` (`renderToStaticMarkup`) com os quatro corpos da Fase B | o HTML que o componente produz com esses corpos | a página no navegador; o conteúdo que um modelo geraria; o comportamento da página completa | `fase-c/` |
| **D** | **leitura** de código e buscas (`git grep`, `grep`, `sed -n`), com o código assistido por máquina onde indicado | a alcançabilidade dentro da árvore de `ad2ad0a` | clientes externos, versão antiga publicada, campo perdido em trânsito: **não avaliado** | `fase-d/` |

⚠ **O transporte é o real, até onde o instrumento alcança:** o payload preparado é serializado com `JSON.stringify` (como a tela, em `page.tsx:1353`), o
**texto** vira o corpo de um `Request` real, e o `POST` real lê `await request.json()`. O instrumento **não** usa simulado de `request.json()` que devolva o
objeto: a omissão da propriedade `undefined` **não é contornada**. Ficam fora do alcance a rede, o `fetch` do navegador e o roteamento do Next.

## O que há aqui

| Arquivo ou pasta | O que é |
|---|---|
| `identidade.json` | a identidade da execução da sonda: `sha256` dos sete arquivos de produção lidos e do instrumento, ambiente, versões instaladas, parâmetros da chamada capturada, natureza dos dados, rede e as ausências declaradas |
| `fase-a/capturas.json` | as **8 capturas** (2 condições de exclusão × 4 variantes do campo): para cada uma, o objeto preparado, o JSON entregue (`sha256`, bytes, se contém a chave), a resposta do tratador à captura, o contexto (`sha256`, bytes, linhas), a chamada ao cliente e a contagem de chamadas de rede |
| `fase-a/contextos/` | o **texto integral** do contexto de cada captura (`ctx-<condição>__<variante>.txt`) |
| `fase-a/jsons-entregues/` | o **JSON que chegou ao tratador**, como texto, por captura |
| `fase-a/objetos-preparados/` | o **objeto preparado**, antes da serialização (`util.inspect`), por captura |
| `fase-a/diffs/` | o `diff` (GNU, formato normal) do contexto do controle contra a variante ausente, por condição (os três diffs de cada condição são idênticos) |
| `fase-a/analise.json` | análise **derivada**: integridade, contagens distintas, classes de equivalência, transporte, diff, frases só do caso ausente (com a **leitura** de cada uma), bloco vazio, menções ao vínculo, identidade conferida |
| `fase-b/corpos/` | o **corpo integral** da resposta nos quatro ensaios (JSON compacto, uma linha) |
| `fase-b/jsons-entregues/`, `fase-b/contextos/` | o JSON entregue e o contexto de cada ensaio. ⚠ Os dois contextos elegíveis são **byte a byte iguais** aos da Fase A sem exclusão (mesmo `sha256`), e ficam repetidos para que o caminho gravado em `execucoes.json` exista |
| `fase-b/execucoes.json` | os quatro ensaios: corpo (`sha256`, bytes, `status`, `timestamp`), enumeração de chaves, mensagem e estado da extração, A.27, contexto |
| `fase-b/analise.json` | análise **derivada**: texto fixado, causa da suspensão, enumeração de chaves, pergunta direta, diff bruto **por byte**, projeção sem `metadata.timestamp`, interação com a suspensão |
| `fase-c/renderizacoes.json` | os quatro ensaios renderizados: `aiReview` montado, estado de A.27, portão do destaque (três condições), o que se exibe |
| `fase-c/html/` | o HTML renderizado de cada ensaio. ⚠ Cada arquivo é a string renderizada **mais um LF final**; o `sha256` de `renderizacoes.json` é o da string, sem o LF |
| `fase-c/analise.json` | análise **derivada**: `aiReview` conferido contra a tela, comparação controle × ausente, resposta direta, busca por menção ao vínculo no componente (com controles positivos), tipo das propriedades |
| `fase-d/analise.json` | leitura de código **assistida por máquina**: os retornos de `prepararVinculoDaTela`, as saídas de `runAiReview` antes do `fetch`, e as **23 âncoras** do pedido, cada uma lida na linha indicada |
| `fase-d/buscas.txt` | a saída, **busca a busca**, de quem chama `POST /api/ai-reviewer` (D3a a D3j), com comando, escopo e código de saída; **sem resultado** (saída 1) separado de **falha de comando** (saída 2 ou mais) |
| `guardas/buscas-6-4.txt` | a saída das buscas da seção 6.4 do pedido (quem lê o registro e o diretório novo): B1 a B7 |
| `guardas/aplicacao.txt` | a aplicação de **cada guarda de redação** ao trecho que o teste examina, com fonte (teste:linhas), escopo nomeado e resultado. ⚠ **Datada de 02/10/2026**: feita com `ad2ad0a` em checkout e o registro alterado na árvore de trabalho, antes do commit; ver o passo 7 de *Como reexecutar* |
| `instrumentos/` | a **sonda** (`sonda-sem-vinculo.test.ts.txt`) e a **configuração isolada** de jest (`jest.sem-vinculo.config.cjs.txt`), o **analisador** (`analisar-fases.py`), o **aplicador de guardas** (`aplicar-guardas.py`) e os dois **roteiros** de busca (`buscas-fase-d.sh.txt`, `buscas-guardas.sh.txt`). O sufixo `.txt` mantém a sonda e a configuração fora do `tsc` e do jest. ⚠ O **aplicador de guardas** e o roteiro `buscas-guardas.sh.txt` são **amarrados à rodada de 02/10/2026** (`BASE` fixo em `ad2ad0a`): ver o passo 7 de *Como reexecutar* |

## Como reexecutar (ambiente observado: Linux x64, Node v22.22.2, npm 10.9.7)

⚠ **Roteiro corrigido em 03/10/2026.** A versão publicada em `c8e1da0` mandava executar "com o commit `ad2ad0a` em checkout" e copiar a sonda de
`docs/dados/a12-sem-vinculo/instrumentos/`. **Esse diretório não existe em `ad2ad0a`:** `git ls-tree -r --name-only ad2ad0a -- docs/dados/a12-sem-vinculo` não devolve nenhuma
entrada, porque o instrumento foi publicado depois do código que ele mede. O roteiro abaixo separa **três coisas**, não leva a árvore principal a outro commit e foi executado
**como está escrito**, a partir de árvore limpa, com `c8e1da0` em checkout e, outra vez, com `ad2ad0a`; a execução e o que ela mostrou estão no registro, na seção "Correção do roteiro
de reprodução", de 03/10/2026.

| Coisa | O que é | Onde fica | Como se obtém |
|---|---|---|---|
| **Código medido** | a produção que a sonda lê: o commit `ad2ad0afdc1a972570d3733ccc582d65a719397a` | um **worktree auxiliar**, criado e removido pelo roteiro; **a árvore de trabalho principal não muda de commit** | `git worktree add --detach`, depois `npm ci` |
| **Instrumento publicado** | a sonda, a configuração isolada, o analisador, o aplicador de guardas e os dois roteiros de busca, **como publicados** em `c8e1da0e3bb34c08a55c8ffb76dc6cae78d9b2cc` | um diretório **externo** ao repositório | `git show c8e1da0…:<caminho>`, arquivo a arquivo, **antes de qualquer execução**; não depende do commit em checkout |
| **Resultados novos** | o que a sonda grava nesta execução | um diretório **separado**, também externo | a própria sonda; conferidos com `--so-conferir`; o pacote publicado não é tocado |

⚠ **Nada disto é versionado como teste, e nada fica em caminho coletado pela suíte.** A sonda roda **fora** de `lib/`, com configuração **isolada**: a
`jest.config.js` do projeto não é editada, só reaproveitada (mesmo `preset` ts-jest, mesmo `transform`, mesmo mapeamento de `@/`), com `roots` e `testMatch`
apontando só para o diretório da sonda.

⚠ **`analisar-fases.py` sem `--so-conferir` REGRAVA** `fase-a/analise.json`, `fase-b/analise.json`, `fase-c/analise.json`, `fase-d/analise.json` e `fase-a/diffs/*.diff` **no
diretório dado em `--dados`**, e o padrão de `--dados` é o pacote publicado (`docs/dados/a12-sem-vinculo`). Quando o alvo é o pacote publicado, use **sempre** `--so-conferir`,
que só confere e imprime. Os passos abaixo usam a opção em todas as chamadas.

Os blocos formam **um só roteiro**: execute-os em ordem, **no mesmo shell** (as variáveis do passo 1 valem nos seguintes). Se o espaço em disco ou a rede para o `npm ci` do
passo 2 não estiverem disponíveis, **pare e registre**: não leve a árvore principal a `ad2ad0a`. Se interromper o roteiro no meio, rode o passo 8 mesmo assim.

### Passo 1. Variáveis, e o instrumento publicado extraído antes de qualquer execução

A partir da raiz do repositório, com **qualquer** commit em checkout. O repositório precisa ter os dois commits (um clone raso não basta). A extração lê o commit publicado com
`git show <commit>:<caminho>`, arquivo a arquivo, e **não depende do que está em checkout**; o `LEIA-ME.md` fica de fora, porque é este arquivo.

```bash
REPO=$(git rev-parse --show-toplevel)                  # o checkout desta árvore NÃO muda em nenhum passo
MEDIDO=ad2ad0afdc1a972570d3733ccc582d65a719397a         # o código medido
PUBLICADO=c8e1da0e3bb34c08a55c8ffb76dc6cae78d9b2cc      # o instrumento e os resultados publicados
PACOTE=docs/dados/a12-sem-vinculo
TMP=$(mktemp -d)                                        # o roteiro cria tudo aqui, FORA do repositório (os caches do jest e do Node ficam no diretório temporário do sistema)
PUB=$TMP/publicado; INSTR=$PUB/$PACOTE/instrumentos
cd "$REPO"
for c in "$MEDIDO" "$PUBLICADO"; do git cat-file -e "$c^{commit}" && echo "ok: $c" || echo "FALTA o commit $c"; done
for caminho in $(git ls-tree -r --name-only "$PUBLICADO" -- "$PACOTE" | grep -v -F -x "$PACOTE/LEIA-ME.md"); do
  mkdir -p "$PUB/$(dirname "$caminho")" && git show "$PUBLICADO:$caminho" > "$PUB/$caminho"
done
echo "extraídos: $(find "$PUB" -type f | wc -l) arquivos, $(ls "$INSTR" | wc -l) no instrumento"
```

Esperado: `ok` para os dois commits e `extraídos: 59 arquivos, 6 no instrumento`.

### Passo 2. O código medido, num worktree auxiliar

O commit `ad2ad0a` vai para um **worktree auxiliar**; a árvore principal continua onde estava. Nele **não há** `docs/dados/a12-sem-vinculo/` (o passo 1 já tirou o instrumento
de `c8e1da0`). A sonda grava em `identidade.json` o `git rev-parse HEAD` e o `git status --porcelain` desse worktree, e o analisador (passo 4) exige `ad2ad0a` e árvore sem alteração.

```bash
MED=$TMP/medido
git worktree add --detach "$MED" "$MEDIDO"              # worktree auxiliar: criado aqui, removido no passo 8
cd "$MED"
echo "HEAD: $(git rev-parse HEAD); alterações: $(git status --porcelain | wc -l)"
[ -e "$PACOTE" ] && echo "ATENÇÃO: o pacote existe aqui" || echo "o pacote NÃO existe neste commit (esperado)"
npm ci --no-audit --no-fund                             # precisa de rede (registro npm)
du -sh node_modules
```

Esperado: `HEAD` igual a `ad2ad0a…`, `alterações: 0` e `o pacote NÃO existe neste commit (esperado)`; o `npm ci` instala 618 pacotes e o `node_modules` ocupa 893 MB (medido em 03/10/2026).

### Passo 3. A sonda: código medido como diretório atual, resultados novos em outro diretório

```bash
SONDA=$TMP/sonda; SAIDA=$TMP/saida; mkdir -p "$SONDA" "$SAIDA"
cp "$INSTR/sonda-sem-vinculo.test.ts.txt"   "$SONDA/sonda-sem-vinculo.test.ts"
cp "$INSTR/jest.sem-vinculo.config.cjs.txt" "$SONDA/jest.sem-vinculo.config.cjs"
SONDA_DIR=$SONDA SONDA_SAIDA=$SAIDA npx jest --config "$SONDA/jest.sem-vinculo.config.cjs" --runInBand      # diretório atual: $MED
echo "arquivos gravados: $(find "$SAIDA" -type f | wc -l)"
```

A sonda grava em `$SAIDA` a mesma árvore de `fase-a/`, `fase-b/`, `fase-c/` e `identidade.json`, e nada no repositório. Esperado: `PASS`, `Tests: 1 passed, 1 total` e
`arquivos gravados: 44` (1 de `identidade.json`, 25 de `fase-a/`, 13 de `fase-b/` e 5 de `fase-c/`).

### Passo 4. O analisador, só conferindo

O analisador procura a sonda em `<--dados>/instrumentos/sonda-sem-vinculo.test.ts.txt` (`analisar-fases.py:318` e `:372`); por isso o diretório de resultados novos ganha uma
**cópia extraída** dela. Lê os artefatos e o `git show` do commit medido, sai 1 e diz o que diverge. A segunda chamada confere o pacote **publicado**: o do repositório, se a árvore
principal o tem, ou a cópia extraída no passo 1, se o checkout é anterior a `c8e1da0`.

```bash
mkdir -p "$SAIDA/instrumentos" && cp "$INSTR/sonda-sem-vinculo.test.ts.txt" "$SAIDA/instrumentos/"
python3 "$INSTR/analisar-fases.py" --dados "$SAIDA" --so-conferir            # resultados novos; diretório atual: $MED
cd "$REPO"
if [ -d "$PACOTE" ]; then python3 "$INSTR/analisar-fases.py" --dados "$PACOTE" --so-conferir        # o pacote PUBLICADO, no repositório: só leitura
else python3 "$INSTR/analisar-fases.py" --dados "$PUB/$PACOTE" --so-conferir; fi                    # checkout sem o pacote: a cópia extraída no passo 1
```

Esperado: cada uma das duas chamadas termina em `(--so-conferir: nada gravado)` e `TUDO CONFERE`.

### Passo 5. Comparar os resultados novos com os publicados

```bash
cd "$SAIDA"; n=0; d=0
for f in $(find . -type f -not -path './instrumentos/*' | LC_ALL=C sort); do
  n=$((n+1)); cmp -s "$f" "$PUB/$PACOTE/$f" || { d=$((d+1)); echo "difere do publicado: $f"; }
done
echo "comparados: $n; diferem: $d; idênticos: $((n-d))"
python3 - "$SAIDA" "$PUB/$PACOTE" <<'PY'
import glob, json, os, sys
novo, pub = sys.argv[1:3]
def ler(p): return json.load(open(p, encoding='utf-8'))
def difere(a, b, c=''):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)): yield from difere(a.get(k), b.get(k), f'{c}.{k}')
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)): yield from difere(x, y, f'{c}[{i}]')
    elif a != b: yield c
for f in sorted(glob.glob(f'{novo}/fase-b/corpos/*.json')):        # os quatro corpos: iguais, exceto metadata.timestamp
    a, b = ler(f), ler(f.replace(novo, pub, 1))
    ts = (a['metadata'].pop('timestamp'), b['metadata'].pop('timestamp'))
    print(os.path.basename(f), '| iguais, sem metadata.timestamp:', a == b, '| timestamp novo e publicado:', *ts)
for f in ('identidade.json', 'fase-b/execucoes.json', 'fase-c/renderizacoes.json'):      # os três registros: que campos diferem
    print(f, 'campos que diferem:', list(difere(ler(f'{novo}/{f}'), ler(f'{pub}/{f}'))))
PY
```

Esperado (medido em 03/10/2026): `comparados: 44; diferem: 7; idênticos: 37`. Os sete são os quatro `fase-b/corpos/*.json`, `fase-b/execucoes.json`, `fase-c/renderizacoes.json` e `identidade.json`; os 37
idênticos incluem os 25 de `fase-a/` (as **oito capturas**), os 8 de `fase-b/contextos/` e `fase-b/jsons-entregues/`, e os quatro HTML. Cada um dos quatro corpos traz `iguais, sem
metadata.timestamp: True` (só esse campo difere, com timestamps diferentes); `identidade.json` difere só em `.instanteDaMedicaoUTC`; `execucoes.json`, em `corpo.timestamp` e `corpo.sha256` de cada um
dos quatro registros; `renderizacoes.json`, em `aiReview.sha256DoJson` de cada um dos quatro. Tudo isso deriva do relógio: `corpo.sha256` é o `sha256` de um corpo que contém o timestamp, e
`aiReview.sha256DoJson`, o de um `aiReview` que carrega `metadata` (lido na sonda, que monta o `aiReview` como `page.tsx:1363-1371`), e nela o timestamp. **Mais arquivos, ou outros campos,
divergindo, não é o esperado**: o analisador do passo 4 já conferiu a integridade, e o que sobra a explicar é a comparação.

### Passo 6. Buscas (só leitura; a saída vai para fora do pacote)

Os dois roteiros de busca usam `git grep` sobre `ad2ad0a`. A saída **não** é redirecionada para `fase-d/` nem para `guardas/`: o uso antigo (`> docs/dados/.../buscas.txt`) regravaria o publicado.

```bash
cd "$MED"; mkdir -p "$TMP/buscas"
bash "$INSTR/buscas-fase-d.sh.txt"  > "$TMP/buscas/fase-d.txt"
bash "$INSTR/buscas-guardas.sh.txt" > "$TMP/buscas/guardas.txt"
cmp "$TMP/buscas/fase-d.txt"  "$PUB/$PACOTE/fase-d/buscas.txt"      && echo "fase-d: igual ao publicado"     || echo "fase-d: DIFERE do publicado"
cmp "$TMP/buscas/guardas.txt" "$PUB/$PACOTE/guardas/buscas-6-4.txt" && echo "guardas: igual ao publicado"    || echo "guardas: DIFERE do publicado"
```

Esperado, no ambiente observado: `fase-d: igual ao publicado` e `guardas: igual ao publicado`.

### Passo 7. As guardas: dois usos, que não se confundem

⚠ A versão anterior mandava rodar `aplicar-guardas.py` "depois de qualquer alteração em `docs/`". **Isso não vale.** O aplicador e `buscas-guardas.sh.txt` são **amarrados à rodada de 02/10/2026**, e
extraí-los para fora do repositório não muda isso: o aplicador lê a árvore de trabalho do diretório atual. Ele tem `BASE` fixo em `ad2ad0a` (`aplicar-guardas.py:24`); exige que o **único** arquivo
rastreado alterado seja o registro e que todo arquivo novo esteja sob `docs/dados/a12-sem-vinculo/` (`:85-86`), e que o contrato e o âncora sejam os de `ad2ad0a` (`:91`); e exige, em P2, **inserção
não vazia** no registro em relação a `ad2ad0a` (`:252-253`). Medido em 03/10/2026, com o aplicador extraído de `c8e1da0`: numa árvore limpa de `ad2ad0a` ele sai 1 (P2 falha, 0 linhas inseridas;
10 de 11); numa árvore de `c8e1da0` com o `LEIA-ME.md` alterado, sai 1 por `AssertionError` em `:86`.

**(a) Reprodução histórica**, na árvore **limpa** de `c8e1da0`, onde o aplicador de 02/10 passa como publicado:

```bash
HIST=$TMP/historico
git worktree add --detach "$HIST" "$PUBLICADO"           # árvore limpa de c8e1da0: criada aqui, removida no passo 8
cd "$HIST"
python3 "$INSTR/aplicar-guardas.py" > "$TMP/aplicacao-historica.txt" && echo "aplicador: saída 0" || echo "aplicador: FALHOU, saída $?"
tail -1 "$TMP/aplicacao-historica.txt"
diff "$TMP/aplicacao-historica.txt" "$PUB/$PACOTE/guardas/aplicacao.txt" || true
```

Esperado: `aplicador: saída 0`, `# RESUMO: 11 de 11 aplicações passam` e um `diff` **só nas linhas 2 a 4** (o cabeçalho): em 02/10 estavam em checkout `ad2ad0a`, o registro alterado e os 60 arquivos do
pacote ainda não rastreados (`# HEAD ad2ad0a…`, `# Arquivos ALTERADOS (rastreados): ['docs/imprecisoes-parecer-ia.md']`, `# Arquivos NOVOS (nao rastreados): 60`); na árvore limpa de `c8e1da0` saem
`c8e1da0…`, `[]` e `0`. Os onze resultados e o resto do texto são os mesmos.

**(b) Conferir uma alteração posterior em `docs/`** (inclusive esta correção, de 03/10/2026) **não é o que o aplicador faz**, e o resultado de (a) **não** o substitui. O que vale: (1) uma **busca
própria**, com `git grep` sobre o commit-base **daquela** alteração e com padrão e escopo declarados, de quem lê cada arquivo alterado (`buscas-guardas.sh.txt` serve de **modelo**, não de resultado:
o `BASE` é `ad2ad0a` e a lista de arquivos é a de 02/10); (2) cada guarda achada, aplicada **ao mesmo trecho** que o teste examina, com a fatia calculada pela **expressão do teste** e
nunca pela posição de um título; (3) os testes reais, `npm test`, depois. Se uma guarda ficar incompatível com o que foi escrito, **para-se e relata-se**: não se afrouxa a guarda, não se
altera o teste, não se reescreve o trecho.

### Passo 8. Limpar

```bash
cd "$REPO"
git worktree remove --force "$HIST"; git worktree remove --force "$MED"   # --force: o worktree auxiliar tem node_modules; nada a ver com push
rm -rf "$TMP"
git worktree list; echo "alterações no pacote publicado: $(git status --porcelain -- "$PACOTE" | wc -l)"
```

Esperado: a lista de worktrees volta ao que era antes do passo 2, e `alterações no pacote publicado: 0`.

**Dependências:** Node (medido com v22.22.2; o CI usa 24.x), npm, os pacotes do `package-lock.json` **de `ad2ad0a`** (jest, ts-jest 29.4.6, `react` e `react-dom` 18.3.1,
`@anthropic-ai/sdk` 0.95.1; o `@/` é resolvido pelo próprio `jest.config.js`), **Python 3** (medido com 3.11), `git` **com `git worktree`**, **GNU `diff`** (diffutils), `cmp`, `grep`, `find`, `bash` (os
blocos usam `heredoc`) e `node` (o analisador executa um controle de `JSON.stringify`). A sonda e o analisador não fazem chamada de rede e não usam chave real; **só** o
`npm ci` do passo 2 usa a rede. Disco: 893 MB para o `node_modules` do worktree auxiliar.

## Metadados: disponíveis, ausentes e não aplicáveis

| Metadado | Estado |
|---|---|
| código medido, instrumento, ambiente, versões instaladas | **disponíveis** em `identidade.json` (e conferidos contra a base pelo analisador) |
| versão do jest | **contraditória, e conservada**: os `package.json` de `jest`, `jest-cli` e `@jest/core` instalados dizem `30.2.0`, e `node_modules/.bin/jest --version` imprime `30.1.3`; a causa não foi apurada |
| modelo, versão do modelo real | **não aplicável**: o cliente foi simulado. O rótulo "Análise por …" no HTML vem de `metadata.model` do corpo, que é a configuração da rota |
| `temperature`, `top_p`, `top_k` | **não são enviados** (conferido na lista de chaves da chamada capturada); `seed` não existe na chamada |
| latência, custo, tokens | **não se aplicam** (nenhuma chamada de inferência) |
| dados | **sintéticos**: quatro respondentes (CR 0,05), documento de cálculo sintético, resumos derivados de etiquetas; a tela não foi executada |
| execução 1 da sonda | **não arquivada** (versão anterior do instrumento, sem as versões de pacote em `identidade.json`); a comparação entre as três execuções está no registro |

## Ao ler os artefatos

- **A palavra "vinculo" nos contextos:** o título sintético do projeto, que a sonda forneceu, é "Projeto da sonda sem vinculo" (linha 4 de todos os contextos). A contagem
  de menções que a sonda registra em `capturas.json` (`mencoesAoRadicalVinculo`: 1 no contexto ausente, 8 e 9 no controle) **inclui** essa ocorrência; `fase-a/analise.json`
  separa, linha a linha, o texto do sistema (0 no ausente, 7 e 8 no controle).
- **Comprimentos:** os campos `caracteres` da sonda são unidades UTF-16 (o `length` do JavaScript); o analisador, em Python, conta pontos de código quando diz `pontosDeCodigo`
  (os três emojis dos títulos do texto fixado valem 2 no JavaScript: 356 contra 353).
- **Os corpos da Fase B são JSON compacto de uma só linha.** Um diff por linha só diria "a linha difere"; a comparação bruta de `fase-b/analise.json` é **por byte**. Os corpos
  **não são byte a byte idênticos** entre controle e chave ausente: diferem só em `metadata.timestamp`, e a igualdade vale para a **projeção** que exclui esse campo e nenhum outro.
- **Os `.diff`** são a saída de `diff` entre dois contextos longos, com muitas linhas em branco; **qual linha em branco o `diff` alinha é escolha dele**. As frases
  "só no caso ausente" de `fase-a/analise.json` vêm da diferença de multiconjuntos de linhas **não brancas**, que não depende desse alinhamento.
- **O `aiReview` e os HTML:** `Análise por <modelo>` e "baseada em 138 referências científicas de 36 artigos (RAG)" vêm de `metadata.model` e `metadata.knowledgeBase` do corpo
  (configuração da rota e da base estática). O texto da revisão é o **texto fixado** pelo instrumento, e não saída de modelo.

## Limites (todos repetidos no registro)

- A tela **não é executada**: o componente é **renderizado**, com `aiReview` montado como a tela monta (`page.tsx:1363-1371`). **Não** é a página no navegador, e quatro renderizações com texto
  fixado **não** sustentam nenhuma afirmação sobre o que o gestor vê na página completa.
- Os textos e os dados são **construídos**: nada aqui diz o que um modelo geraria com o contexto ausente ou com o do controle.
- Dos três estados da extração só dois foram exercidos; uma só causa de suspensão; a condição com exclusão só na Fase A; só `vinculado`, `undefined`, `null` e chave ausente para o campo.
- A Fase D é **leitura**: o que existe fora da árvore (cliente externo, versão antiga publicada, campo perdido em trânsito) fica **não avaliado**, e não ausente.
- ⚠ Os instrumentos tiveram **defeitos de primeira execução**, achados e corrigidos antes de aceitar o agregado: ver o registro ("Achados sobre os instrumentos desta rodada").
