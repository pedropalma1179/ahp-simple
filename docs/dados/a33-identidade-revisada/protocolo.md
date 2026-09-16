# A.33: duas composições de identidade de versão, antes dos cálculos

Declarado em 16/09/2026. Snapshot medido:
`b3fe3d7a0c78b8129e185cbce0099ef606fb844e`. Adoção não autorizada nesta
rodada. Nenhum `trechoId` será preenchido. Base, índice, configuração e `main`
não serão alterados; não haverá geração nem conferência de publicações.

## Universos e pergunta

O universo principal é `docs/dados/a33-etapa4/evidencias.json`, vetor
`porTrecho`: 165 unidades, 101 claims, 18 limiares, 36 fórmulas e dez benchmarks.
`limitations` e `recommendations` não estão nele. Os endereços históricos da base
continuam registrados em `344d631`; posição não será identidade.

Um universo complementar inventariará os cinco vetores dos 36 artigos no
snapshot: `key_claims`, `thresholds`, `formulas`, `limitations`,
`recommendations`. Seu denominador será contado separadamente, sem somá-lo às
165 unidades, porque os conjuntos se sobrepõem. Ele permite testar os dois
vetores de strings que não entram na preparação. Benchmark é uma projeção
preparada de `empirical_data`, não um sexto vetor fictício da base.

A medição anterior versionava o recorte citado. Suas repetições não provam
registros completos indistinguíveis na base. Nesta rodada o objeto é a unidade:
H-U versiona seu conteúdo completo; H-T versiona uma projeção de conteúdo
explicitamente escolhida por tipo. Quando há evidence, é unidade ancorada num
recorte registrado. Strings de limitations/recommendations e benchmarks não
passam a ter recorte publicado por receberem candidata.

## Estrutura comum das duas candidatas

Ordem dos componentes: prefixo da hipótese (`A33-universal-v2` ou
`A33-por-tipo-v2`), `articleId`, `tipo`, `idNativo`, `versaoSha256`.
Tipos: `key_claims`, `thresholds`, `formulas`, `limitations`,
`recommendations`, `benchmark`. O tipo vem da estrutura, não do índice da linha.

`idNativo` é o valor exato de `id` da unidade, quando existir. Nas fórmulas,
**é ID nativo, preservado literalmente, não recalculado por resumo**. A chave
nativa é `(articleId, tipo, idNativo)`; sua unicidade será medida por artigo e
no conjunto. O resumo é da versão do conteúdo restante, não substitui esse ID.
A candidata completa conserva componentes tipados e o ID legível; não se aplica
um segundo hash que esconda o ID. Para objetos, `id` sai do conteúdo resumido,
pois já ocupa componente próprio. Ausência de ID nativo não recebe substituto.

A chave de comparação é essa composição completa, não apenas o resumo.
O resumo da versão usa SHA-256 completo, 256 bits, 64 caracteres hexadecimais
minúsculos. Também serão comparadas preimagens para discriminar igualdade de
entrada de eventual colisão criptográfica. A representação serializada completa
fica na rastreabilidade com SHA do snapshot, endereço e texto preparado.

## Serialização, antes de medir

Componentes são `JSON.stringify([nome, valorTipado])`, separados por RS
(U+001E, byte 0x1E), prefixo literal primeiro, sem separador final. RS dentro de
texto é escapado pelo JSON e não ocorre cru dentro de componente. O conteúdo
resumido é o JSON de sua representação tipada. Ambos usam UTF-8, sem BOM e sem
quebra acrescentada.

Valores tipados: ausente `["ausente"]`; null `["nulo"]`; string
`["texto", valor]`; boolean `["booleano", valor]`; número finito
`["numero", representação]`, usando String(valor), com `-0` explícito;
array `["vetor", valoresTipadosNaOrdem]`; objeto
`["objeto", paresDeChaveEValorTipado]`. Chaves de objetos são ordenadas pelo
`sort()` de strings do JavaScript, ordem UTF-16, antes da serialização; a ordem
material de propriedades não é conteúdo. Arrays conservam a ordem de seus
valores. A posição de uma unidade no vetor da base nunca entra na candidata.

Ausente difere de null, string vazia, objeto vazio e vetor vazio. Valores
undefined, não finitos, lacunas de arrays, tipos não previstos e substitutos
UTF-16 isolados são recusados. A medição é de valores extraídos, não da grafia
numérica no TypeScript: `1` e `1.0` são o mesmo número JavaScript. Isso não é
identidade do arquivo fonte.

**Nenhuma normalização textual:** sem trim, dobra de espaços, mudança de caixa,
acentos, aspas, quebras de linha ou normalização Unicode. A ordenação de chaves é
normalização estrutural declarada, para não tornar ordem de propriedades um
campo volátil. Cada hipótese declara abaixo o que inclui e o que deixa fora.

## H-U: composição única, conteúdo completo

O mesmo procedimento para todos os tipos: resumir `dadosOriginais` inteiro,
retirando somente a propriedade `id`, já preservada no componente nativo.
Nas strings do universo complementar, resumir a string inteira. Objeto é
serializado com as chaves em ordem, sem selecionar campos por tipo.

Esta candidata identifica a versão de toda a unidade de dados original,
ancorada em seu recorte quando ele existe. Qualquer mudança de valor no objeto,
inclusive `usable_as`, `label` ou futuro campo editorial, muda sua versão.
Endereço, SHA, estado de conferência, origens, score e índices da preparação
não são parte de `dadosOriginais` e não entram. Se um futuro campo volátil for
introduzido dentro dele, H-U será sensível: este é um custo a medir, não garantia
de estabilidade semântica.

## H-T: projeção por tipo

Depois dos componentes comuns, resumir um vetor de pares de campo/valor tipado
na ordem da tabela. Campos ausentes ficam presentes como marcador de ausência.

| Tipo | Campos, em ordem |
|---|---|
| `key_claims` | `claim`, `verbatim_quote`, `evidence` |
| `thresholds` | `metric`, `operator`, `value`, `unit`, `context`, `evidence` |
| `formulas` | `latex`, `description`, `variables`, `conditions`, `evidence` |
| `limitations` | valor textual integral, nomeado `texto` |
| `recommendations` | valor textual integral, nomeado `texto` |
| `benchmark` | `source_year`, `domain`, `n_respondents`, `n_alternatives`, `n_criteria_total`, `bocr_weights`, `concordance_rate`, `cr_aggregated`, `weight_ratio` |

Objetos e vetores dentro de um campo usam a representação tipada comum.
`evidence` entra inteiro, incluindo página, localizador e quote, sem privilegiar
nenhum dos dois campos de citação. Página na base continua disponível para
auditoria, sem ser reinserida no parecer. `id` nativo continua fora do resumo.
H-T não versiona `usable_as` da claim nem `label` da fórmula, nem novos campos
fora da lista. São exclusões deliberadas de classificação/rótulo, não promessas
de versão do objeto inteiro. O relatório inventaria todos os campos omitidos.
`source_article` do benchmark é redundante com articleId; igualdade será
verificada e divergência exclui a unidade, sem corrigir o dado.

H-T identifica a versão da afirmação ou conteúdo técnico escolhido, ancorado
no recorte quando disponível. Incluir `claim` faz a versão mudar quando sua
redação mudar; incluir `verbatim_quote` registra o campo como dado, não o elege
fiel à publicação. Correção de redação não conserva identidade de versão.
**Nenhuma hipótese é identidade estável de claim ou certificado de fidelidade.**

## Critérios de cobertura

Mesmos mínimos para ambas: artigo e tipo não vazios; claim textual não vazia;
limiar com metric/operator/unit/context não vazios e value numérico finito;
fórmula com ID nativo e latex não vazios; limitation/recommendation textual não
vazia; benchmark com pelo menos um dos sete campos quantitativos não nulo e
com source_article igual ao artigo. Ausência de localizador ou quote é contada
e preservada; não impede versionar conteúdo que existe e não vira conferência.

Candidatas repetidas no respectivo universo são excluídas como associação não
unívoca. Fórmula com chave nativa repetida entre registros do mesmo artigo é
ambígua e fica excluída mesmo que os resumos de versão sejam diferentes.
Isso impede usar a versão para esconder conflito do ID nativo.

Cobertura significa discriminação pelos dados e critérios desta proposta.
Não significa aprovação pelo instrumento em produção, que não será alterado,
nem liberação da etapa 4. Comparar com 107/165, explicitando a mudança de objeto
e o abandono do requisito anterior de quote efetivamente fornecido.

## Controles e resultados exigidos

Os seis grupos da rodada anterior são controles positivos. Para cada um:
comparar claim e verbatim_quote separadamente (ausentes não são diferenças),
listar outros campos que diferem, e medir as duas candidatas. Ausência de claim
nas fórmulas não prova que fórmulas com latex/ID diferentes são indistinguíveis.
Indistinguível na base exige mesmo artigo, tipo e todo dado original igual,
independentemente de endereço. Listar os grupos, sem acrescentar posição.

Controle negativo: duplicar uma unidade de cada tipo, sem alterar conteúdo,
mas mudando endereço, SHA de rastreabilidade, índice, origem e estado de
conferência. As duas cópias devem continuar com candidata igual nas duas
hipóteses. São controles sintéticos identificados, fora dos denominadores.
Reordenar propriedades, vetores de unidades e recomputar também não deve mudar
as candidatas. Se não houver repetição natural, registrar a ausência e
investigar sensibilidade, sem fabricar repetição dentro do conjunto real.

Controles de volatilidade: mudar claim, verbatim_quote, conteúdo do limiar,
latex e texto muda a versão; mudar usable_as ou label muda H-U e não H-T;
mudar metadados de rastreabilidade não muda nenhuma. ID nativo de fórmula
permanece legível e igual quando muda só o conteúdo versionado.

Medir ausência/null/vazio de todos os campos usados, IDs nativos, repetições,
indistinguíveis completos, cobertura e exclusões por tipo e total. Nomear
membros por endereço, separando rastreabilidade de identidade. Medir C1 à parte,
inclusive sua claim de Wijnmalen. Nada será gravado em trechoId.

Código novo exige tsc e suíte, com números medidos. Registro documental vem
após verificação, sem repetir suíte por mudança só documental. Não há previsão
de build, geração, serviço externo, reingestão ou reconciliação de A.16.
