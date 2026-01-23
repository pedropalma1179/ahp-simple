# Deploy - Sistema AHP-BOCR Completo v3.0

## Arquivos para Deploy

| Arquivo | Destino | Função |
|---------|---------|--------|
| `projetos-page-v6.tsx` | `app/decisor/projetos/page.tsx` | Página de projetos simplificada |
| `resultados-page.tsx` | `app/decisor/resultados/[projectId]/page.tsx` | Página de resultados (8 tabs) |
| `calculate-route.ts` | `app/api/calculate/route.ts` | API de cálculo AHP-BOCR |
| `audit-decision-route.ts` | `app/api/audit-decision/route.ts` | API de validação científica v3.0 |
| `generate-academic-route.ts` | `app/api/generate-academic/route.ts` | API de geração de texto Q1/A1 |

## Pré-requisitos

### 1. Instalar SDK Anthropic
```cmd
cd C:\AHP-BOCR\ahp-simple
npm install @anthropic-ai/sdk
```

### 2. Configurar API Key
Adicione no arquivo `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...sua-chave...
```

Ou configure na Vercel:
- Acesse: https://vercel.com/seu-projeto/settings/environment-variables
- Adicione: `ANTHROPIC_API_KEY` com sua chave

## Comandos de Deploy

```cmd
cd C:\AHP-BOCR\ahp-simple

REM 1. Criar pastas necessárias
mkdir app\api\calculate
mkdir app\api\generate-academic
mkdir app\api\audit-decision
mkdir "app\decisor\resultados\[projectId]"

REM 2. Copiar arquivos
copy projetos-page-v6.tsx app\decisor\projetos\page.tsx
copy resultados-page.tsx "app\decisor\resultados\[projectId]\page.tsx"
copy calculate-route.ts app\api\calculate\route.ts
copy audit-decision-route.ts app\api\audit-decision\route.ts
copy generate-academic-route.ts app\api\generate-academic\route.ts

REM 3. Build
npm run build

REM 4. Deploy
npx vercel --prod
```

## Estrutura de Tabs na Página de Resultados

```
📋 Visão Geral
   └─ Cards resumo, vencedor, gráfico BOCR, radar

✓ Consistência  
   └─ Dashboard CR, alertas de inconsistência

⚖️ Pesos
   └─ Vetor BOCR, pizza, pesos globais

🏆 Ranking
   └─ Tabela com 5 métodos de síntese

📈 Sensibilidade
   └─ Pontos de inflexão, gráfico visual

🤖 Parecer IA (v3.0)
   └─ Validação científica com 6 critérios
   └─ Adequação para 5 periódicos A1

✍️ Texto A1 (v2.0)
   └─ Gerador de texto acadêmico Q1/A1
   └─ Mín. 1.500 palavras + 350 conclusão

📥 Exportar
   └─ CSV, LaTeX, XLSX
```

## Sistema de Validação v3.0

### Periódicos Avaliados

| Periódico | IF | n mínimo | Score mínimo |
|-----------|-----|----------|--------------|
| PPC | 12.5 | 6 | 85 |
| IJPE | 12.0 | 12 | 85 |
| JCP | 10.0 | 10 | 75 |
| IMM | 10.4 | 8 | 75 |
| OMR | 6.9 | 7 | 65 |

### Sistema de Pontuação (100 pts)

| Critério | Pontos |
|----------|--------|
| Consistência (CR) | 25 |
| Tamanho da Amostra | 20 |
| Concordância entre Métodos | 20 |
| Análise de Sensibilidade | 15 |
| Poder de Discriminação | 10 |
| Qualidade dos Dados | 10 |

## Gerador de Texto Acadêmico v2.0

### Características

- **Estilo:** Energy Policy, Omega, IJPE
- **Resultados:** Mínimo 1.500 palavras
- **Conclusão:** Mínimo 350 palavras
- **Formato:** Prosa acadêmica sem bullets
- **Precisão:** 4 casas decimais

### Estrutura do Texto Gerado

1. **Validação Metodológica (2 parágrafos)** - CR e confiabilidade
2. **Análise BOCR (3 parágrafos)** - Cada dimensão
3. **Síntese Global (2 parágrafos)** - Ranking e concordância
4. **Sensibilidade (4 parágrafos)** - Cenários "E se?"
5. **Trade-offs (1 parágrafo)** - Tensões gerenciais
6. **Conclusão (4 parágrafos)** - Veredito + futuro

## Troubleshooting

### Erro: "API key não configurada"
- Verifique se `ANTHROPIC_API_KEY` está no `.env.local`
- Na Vercel, adicione nas Environment Variables

### Erro: "Nenhuma resposta completa"
- Verifique se especialistas finalizaram a pesquisa
- Confira no Firebase se `responses` tem `completedAt`

### Texto gerado muito curto
- A API foi configurada para max_tokens=8192
- Temperature=0.4 para rigor acadêmico
- Se persistir, verifique os logs da API
