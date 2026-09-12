# Prompts de tarefas

Cada tarefa de saneamento é especificada num prompt antes de ser executada, no
formato da skill `prompt-de-saneamento`. Este diretório guarda o histórico.

⚠ **Esta é uma mudança de decisão.** Em `c9fc46f` os quatro documentos de
conteúdo foram versionados e os prompts ficaram fora, por se considerar discutível
guardar prompt executado. A mudança está registrada na seção 0.4 do âncora.

**Por que versionar:** os prompts das primeiras vinte tarefas ficaram fora do
repositório, e alguns se perderam. O prompt registra **como a tarefa foi
especificada**, incluindo os valores medidos na Fase 1 e os critérios de aceite,
o que permite conferir depois se o que foi entregue era o que foi pedido.

Nomeie por tarefa: `A19-parte1.txt`, `A21.txt`.

**Enquanto o prompt não foi executado**, corrigi-lo é substituir o arquivo.

⚠ **Depois de executado, NÃO substitua sem preservar a identificação.** A versão
que rodou é o que explica o commit e o resultado: sobrescrevê-la apaga a
correspondência entre o que foi pedido e o que foi entregue.

**Vincule cada versão executada ao commit e ao resultado:**

```
A21.txt              <- versao vigente, ainda nao executada
A21--501b19a.txt     <- versao que produziu o commit 501b19a
```

Quando um prompt é descartado antes de rodar, apague e registre a razão no âncora.
Foi o caso de `A19-parte2`, descartado porque o defeito que o motivava não existia:
o `notes` do artigo declarava que as páginas eram de outra edição.
