# lib/rag/ — RAG de Artigos Científicos (AHP-BOCR)

## Estrutura

lib/rag/
├── types.ts → Tipagem compartilhada (ArticleRAG, indexes)
├── index.ts → Importa artigos + constrói indexes temáticos
├── articles/
│ ├── _template.ts → Template vazio para novos artigos
│ ├── saaty1977.ts → Extração: Saaty (1977)
│ └── ... → 1 arquivo por artigo
└── README.md → Este arquivo


## Fluxo de adição de artigo

1. Extrair artigo com prompt de extração LLM → gera objeto TypeScript
2. Criar `lib/rag/articles/autorAno.ts` baseado no `_template.ts`
3. Colar o objeto extraído
4. Adicionar import + registro em `lib/rag/index.ts` (2 linhas)
5. Rodar `npm run build` para validar tipagem

## Como o sistema consome

```typescript
import { RAG, getThresholdsByMetric, getClaimsByUsage } from '@/lib/rag';

// Todos os thresholds de CR
const crThresholds = getThresholdsByMetric('CR');

// Claims citáveis como recomendação
const recommendations = getClaimsByUsage('recommendation');

// Benchmarks de pesos BOCR para comparação
const weightBenchmarks = getBenchmarksByType('bocr_weights');
```

## Convenções

*   **id do artigo**: autorAno minúsculo (ex: saaty1977, wijnmalen2007)
*   **Quotes**: verbatim em inglês, ≤25 palavras (claims/thresholds), ≤50 (fórmulas)
*   **Campos descritivos**: inglês
*   **notes**: português permitido
*   **null**: quando dado não encontrado no artigo (NUNCA inventar)

## INSTRUÇÕES DE VALIDAÇÃO (obrigatório)

Após criar:

*   Confirmar que os arquivos existem:
    *   `lib/rag/types.ts`
    *   `lib/rag/index.ts`
    *   `lib/rag/articles/_template.ts`
    *   `lib/rag/README.md`
*   Rodar `npm run build` e garantir 0 erros.

## NÃO ALTERAR

*   lib/knowledge.ts
*   app/api/ai-reviewer/route.ts
*   app/api/calculate/route.ts
*   app/api/audit-decision/route.ts
*   Qualquer outro arquivo existente
