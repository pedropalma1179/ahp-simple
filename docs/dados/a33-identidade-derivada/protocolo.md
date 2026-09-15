# A.33: protocolo de medição da identidade derivada

Declarado em 15/09/2026, antes do cálculo. Snapshot de entrada:
`745b4966727e2c507b162570e5fbec11d149b1e3`, na branch
`integra/a30-registros`. O conjunto é o de
`docs/dados/a33-etapa4/evidencias.json`: 165 unidades, 101 claims e 64 adicionais.
Os endereços da base guardados nesse conjunto apontam para `344d631`; os dois
SHAs serão preservados, sem apresentar o endereço histórico como SHA desta rodada.

## Limite e proibição de adoção

Esta rodada mede e avalia um candidato. Não adota o esquema, não preenche
`trechoId`, não altera a base de artigos e não executa geração ou reingestão.

O candidato identifica, quando consegue discriminar, **uma versão do trecho
representado pelo quote e seu localizador no snapshot**. **Não é identidade de
claim estável**. **Não é atestado de fidelidade à publicação**. Campos fora da
composição, incluindo página, claim, condições e outros textos formatados, não
ficam versionados por esse candidato. Essa limitação será considerada na avaliação.

## Composição fixada

1. Ler `articleId` da unidade.
2. Ler `dadosOriginais.evidence.locator_type`.
3. Ler `dadosOriginais.evidence.locator_id`.
4. Ler `dadosOriginais.evidence.quote`; quando for string, calcular SHA-256 de
   seus bytes UTF-8 e usar o resumo hexadecimal completo de 64 caracteres.

**Não há fallback para `verbatim_quote`**, nem escolha do campo considerado fiel.
Essa leitura fixa o campo avaliado; não reconcilia as divergências de A.16.
Nos benchmarks, não se inventa quote a partir dos números da tabela. Nos outros
campos, não se substitui ausência por página, ID de fórmula ou endereço posicional.

## Serialização fixada antes do cálculo

Cada campo recebe um marcador explícito:

- propriedade ausente: `["ausente"]`;
- propriedade presente com `null`: `["nulo"]`;
- string, inclusive vazia: `["texto", valorExato]`.

Tipo diferente desses interrompe a medição, sem coerção. Sequência UTF-16 com
surrogate isolado também interrompe, para impedir substituição silenciosa na
conversão UTF-8. Ausência de `evidence` torna ausentes seus campos filhos;
`evidence: null` é registrada na rastreabilidade e tratada da mesma forma quanto
à inexistência de propriedades filhas, sem alegar igualdade do objeto inteiro.

O quarto campo conserva os marcadores de ausente e nulo; para string, inclusive
vazia, o valor serializado é seu SHA-256. String vazia tem resumo próprio e não é
confundida com ausência.

Preimagem, nesta ordem:

1. prefixo literal ASCII `A33-candidato-v1`;
2. componente `JSON.stringify(["articleId", marcador])`;
3. componente `JSON.stringify(["locator_type", marcador])`;
4. componente `JSON.stringify(["locator_id", marcador])`;
5. componente `JSON.stringify(["quote_sha256", marcador])`.

**Separador:** um byte RS (`0x1E`, U+001E) entre componentes, sem separador final.
Ele não pode ocorrer cru dentro de um componente: `JSON.stringify` escapa os
caracteres de controle, inclusive U+001E como `\u001e`. Um RS no texto de entrada
não vira fronteira de campo. Não se usa concatenação ambígua com `|` ou vírgula.

**Codificação:** UTF-8, sem BOM e sem quebra final acrescentada à preimagem.
**Algoritmo:** SHA-256, resumo completo de 256 bits, 64 caracteres hexadecimais
minúsculos, tanto para quote quanto para candidato. O resumo candidato ficará
somente no campo `candidatoSha256` do registro de medição; nunca em `trechoId`.

**Nenhuma normalização:** sem `trim`, dobra de espaços, mudança de caixa,
normalização Unicode, remoção de acentos, aspas ou quebras de linha. O escape JSON
é representação reversível declarada, não alteração do valor. Os textos enviados
serão copiados dos templates e dados já fixados, com as transformações de
apresentação existentes identificadas por origem, sem incorporá-las escondidas
na identidade candidata.

## Medições e denominadores

Executar para claims (101), adicionais (64) e total (165), declarando em cada
resultado o denominador. Grupos são calculados dentro de cada população; o total
também detecta coincidências entre as duas partes. Listar os membros por endereço.

- Localizadores: contar propriedade ausente, `null` e string vazia separadamente,
  para cada campo e para ambos. Informar também a união de campos indisponíveis
  (ausente, nulo ou vazio), sem chamar vazio de propriedade ausente.
- Candidato repetido: número de grupos, unidades envolvidas e excedente sobre
  uma unidade por grupo. Comparar a preimagem para distinguir entrada igual de
  eventual colisão criptográfica; não chamar toda repetição de colisão do hash.
- Quote repetido: comparar os bytes UTF-8 diretamente, sem depender só do resumo.
  Ausente e `null` não são conteúdo e ficam fora dessa contagem; vazio é conteúdo
  de zero bytes e tem contagem própria. Informar grupos e unidades envolvidas.
- Indistinguíveis pela composição: mesmos valores tipados de artigo, localizador
  e quote. Nomear grupos e unidades; distinguir os que possuem quote textual
  daqueles com informação ausente. Isso não afirma igualdade de todos os campos
  da unidade. Não acrescentar índice, tipo ou contador para desfazer coincidências.

## Critério de avaliação fixado antes dos números

Uma unidade pode ser discriminada por este candidato como **versão do quote**
quando os quatro campos forem strings não vazias, o candidato for único no
conjunto total e o template de sua origem usar efetivamente `evidence.quote`
como trecho de evidência. Claims e limiares têm esse caminho; a conferência
verificará o valor realmente usado. Fórmulas usam LaTeX, descrição, variáveis e
condições; benchmarks usam uma linha de dados. Um quote da base que não é a
unidade de texto fornecida não basta para identificar a versão desses materiais.

Relatar também completude e unicidade antes deste último filtro, para que as
razões de exclusão não se confundam. Listar cada excluída e seus motivos.
Uma divergência de A.16 não impede medir a identidade de um valor, mas permanece
pendente de conferência; não é resolvida pelo candidato.

## Rastreabilidade e controles

Cada linha liga candidato, campos tipados e preimagem ao endereço na base,
endereço no arquivo de preparação, SHA do snapshot e **texto formatado disponível
para fornecimento** em cada origem/caso. Não houve geração nem captura de chamada
real nesta rodada. **Endereço não é identidade** e não entra na preimagem.
`empirical_data` é objeto, não vetor; seu índice será marcado como não aplicável,
e não inventado. O texto pode ocorrer em mais de uma seção sem criar nova unidade.

Conferir manualmente o grupo de repetição mais visível e as três formas de texto
adicional. Controles do instrumento devem distinguir ausente/nulo/vazio, proteger
o separador, conservar diferenças de espaços/acentos/quebras, preservar entradas,
nomear duplicidades e recusar falsa cobertura de fórmulas e benchmarks.
Havendo código novo de medição, executar `tsc --noEmit` e a suíte; registrar seus
resultados medidos. Não executar lint nem scripts de RAG.

As 161 pendências de publicação e as 19 divergências de campos permanecem como
estão. A conferência das publicações é frente separada e pode ser executada por
quem tiver acesso, inclusive pelo agente; não se transfere integralmente ao
pesquisador. Adoção do esquema e geração real dependem de decisões posteriores.
