# F07: recuperação da cadeia e registro das inserções documentais — registro datado

**18/10/2026.** Ramo `claude/loving-shannon-661fy9`, que ao fim do ciclo está em
`948e91a4a2c25662794321621e7521b2e04b123f`, com pai `cd4cbcd`.

Ciclo operacional de um dia. Três estatutos, marcados linha a linha: **medido
nesta bancada** significa comando rodado na bancada de análise; **recebido**
significa relato do executor, não reproduzido aqui; **derivado** significa conta
sobre valores medidos.

## O que aconteceu

O ambiente do executor foi recriado a partir do remoto e não continha os commits
locais de F07. O HEAD estava em `317767a`, que é ancestral de `cd4cbcd` a 35
commits [medido]. As duas inserções foram inicialmente aplicadas sobre
`317767a`. Depois, a cadeia F07 foi recuperada em duas etapas, preservando essas
modificações, e as inserções foram commitadas sobre A8.

## Estado ao fim do ciclo

- ramo `claude/loving-shannon-661fy9` em `948e91a4a2c25662794321621e7521b2e04b123f` [recebido];
- árvore limpa [recebido];
- ref `refs/heads/f07-a8-recuperado` em `cd4cbcd`, agora um commit atrás do ramo [recebido];
- nenhum push ou publicação foi relatado pelo executor [recebido]; essas ações
  não foram autorizadas no ciclo. Ausência de autorização não demonstra ausência
  de execução.

## Recuperação, em duas etapas

**Artefato:** bundle consolidado `f07-consolidado-317767a-cd4cbcd.bundle`,
357.418 bytes, SHA-256
`a6c68839611c20eca2e121a27cff971cc46ed94a8e43dc8df7df1385cca07786`, gerado na
bancada de análise [medido]. Pré-requisito `317767a`, ref apontando para
`cd4cbcd`. Comando, registrado em forma equivalente porque o caminho literal de
saída não foi preservado no registro da sessão:

    git bundle create f07-consolidado-317767a-cd4cbcd.bundle 317767a..a8-auditoria

**Etapa 1**, importar sem mover nada: a ref nova recebeu `cd4cbcd`, com 35
commits sobre a base e `git fsck --full --strict` saindo 0 [recebido]. HEAD,
ramo e os dois arquivos modificados ficaram intactos [recebido].

⚠ **Divergência da etapa 1, e sua causa.** O critério pedia 387 commits desde a
raiz, e o ambiente reportou 222. A causa é o **clone raso** daquele ambiente,
condição anterior à tarefa: 187 commits visíveis na base do destino [recebido],
contra 352 na bancada de análise com história completa [medido], e 187 + 35 = 222
[derivado]. O critério foi mal especificado, e a propriedade que vale é a dos 35
commits sobre o pré-requisito.
⚠ Isso não é regra geral: vale porque a fronteira rasa está **antes** de
`317767a`; fronteira dentro do intervalo afetaria a contagem.

**Etapa 2**, avanço rápido: `git merge --ff-only`, com hooks desabilitados por
`core.hooksPath` em diretório vazio, mais `--no-autostash` e
`--no-overwrite-ignore`, saindo 0 [recebido]. O avanço moveu 54 arquivos, com
15.472 inserções e 263 remoções [recebido], números que coincidem com o
`shortstat` do intervalo medido na bancada de análise [medido].

A premissa que tornou o avanço seguro: **nenhum commit do intervalo toca
`CLAUDE.md` nem `docs/objetivo-estados-caminho.md`**, e os blobs dos dois são
idênticos nas duas pontas [medido]. Por isso as modificações não commitadas
sobreviveram ao avanço.

## As duas inserções, e o commit

- âncora, seção «Recebimento de revisão», +45 linhas, 0 removidas;
- `CLAUDE.md`, seção 10, «Skills instaladas: precedência e limites», +59 linhas,
  0 removidas;
- commit `948e91a4a2c25662794321621e7521b2e04b123f`, pai `cd4cbcd`, tocando
  exatamente esses dois caminhos [recebido].

Os arquivos resultantes têm SHA-256
`46f8a1551c00ca4174138a47d161e70e7dbfc62d89972377f7d1ad7a36baa3e1` e
`4ab767868f9e9621d6c32ef6e8c2f02c62f94cbbf6ad2afbf748116e4865cd90`, construídos e
conferidos na bancada de análise antes do envio [medido] e reportados iguais no
destino [recebido].

## Testes

`lib/__tests__/vinculo-execucao-fiacao.test.ts` sobre `cd4cbcd` com as duas
inserções aplicadas: saída 0, 1 suíte, 87 testes, 87 passando; e o controle
`-t "R3: o achado do fallback"` executou e passou. Medido na bancada de análise
antes do envio, como predição registrada [medido], e reproduzido no destino
[recebido].

⚠ O arquivo de teste **mudou no intervalo**, com 6 linhas acrescentadas e 1
removida [medido], logo a execução anterior no destino, sobre `317767a`,
exercitou outra versão.

## O servidor, por consulta datada

| Instante | Ramo | SHA |
|---|---|---|
| 18/10/2026, 18:33:54 UTC | `refs/heads/claude/loving-shannon-661fy9` | `bbeae3979fe58f43d99b53ed14b18fecf83ed572` |

Leitura por `git ls-remote`, sem alterar ref local [medido]. Uma consulta anterior
no mesmo dia deu o mesmo valor.

⚠ **Alcance.** A consulta diz onde a ponta está naquele instante, e **não quando
ela mudou**. A referência de rastreamento do ambiente do executor aponta para
`317767a`, 12 commits antes, e por isso os relatos de lá dizem «à frente do
remoto» contando a partir dela.

**Distâncias:** `cd4cbcd` está 23 commits à frente de `bbeae39` [medido]; o ramo,
com o commit documental, está 24 [derivado, porque o objeto não existe na bancada
de análise]. Estar à frente da ref local **não demonstra ineditismo no servidor**:
12 dos 35 commits já são alcançáveis a partir de `bbeae39` [medido].

## O que este registro não decide

Push, publicação e instalação do plugin, que seguem sem autorização; a condição
de clone raso daquele ambiente, achado aberto; o destino da ref
`f07-a8-recuperado`; e as correções das seções 2.3 e 1.6 do âncora, que são
tarefa própria e não entram aqui.
