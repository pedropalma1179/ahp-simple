# Deploy da Página de Resultados AHP-BOCR

## Problema Comum
A página `/decisor/resultados/[projectId]` não existe ainda no projeto. Você precisa criar a estrutura de pastas.

## Passo a Passo (Windows PowerShell ou CMD)

### 1. Abrir o terminal na pasta do projeto
```cmd
cd C:\AHP-BOCR\ahp-simple
```

### 2. Criar a estrutura de pastas (se não existir)
```cmd
mkdir app\decisor\resultados
mkdir "app\decisor\resultados\[projectId]"
```

### 3. Copiar o arquivo
```cmd
copy "C:\Users\SEU_USUARIO\Downloads\resultados-page.tsx" "app\decisor\resultados\[projectId]\page.tsx"
```

**IMPORTANTE:** O arquivo deve se chamar `page.tsx` (não `resultados-page.tsx`)

### 4. Verificar se o arquivo foi copiado
```cmd
dir "app\decisor\resultados\[projectId]"
```
Deve mostrar: `page.tsx`

### 5. Fazer o build
```cmd
npm run build
```

### 6. Se houver erros, verificar o arquivo
O erro mais comum é o path do arquivo. Certifique-se que:
- O diretório é `app/decisor/resultados/[projectId]/`
- O arquivo é `page.tsx`

### 7. Deploy para produção (Vercel)
```cmd
npx vercel --prod
```

## Estrutura Final Esperada
```
app/
└── decisor/
    ├── page.tsx                    (login)
    ├── projetos/
    │   └── page.tsx                (lista de projetos)
    └── resultados/
        └── [projectId]/
            └── page.tsx            ← ESTE ARQUIVO
```

## Verificação
Após o deploy, acesse:
```
https://seu-dominio.vercel.app/decisor/resultados/ID_DO_PROJETO
```

Substitua `ID_DO_PROJETO` pelo ID real de um projeto no Firebase.

## Tabs Implementadas
1. **Visão Geral** - Cards, vencedor, barras BOCR, perfil alternativas, gráfico radar
2. **Consistência** - Dashboard CR com sinalização vermelho >10%
3. **Pesos** - Vetor BOCR + Pizza + Pesos globais subcritérios
4. **Ranking** - Tabela 5 métodos + fórmulas
5. **Sensibilidade** - Pontos inflexão + gráfico visual
6. **Exportar** - CSV, LaTeX (6 tabelas), XLSX

## Solução de Problemas

### Erro: "Module not found"
Verifique se `@/lib/data` e `@/lib/firebase` existem e exportam `BOCR_CRITERIA` e `SUBCRITERIA`.

### Erro: "Property 'X' does not exist"
O arquivo espera que `calculation` tenha esta estrutura:
```typescript
{
  bocrWeights: number[];
  bocrConsistency: { cr: number; lambda: number; ci: number };
  subWeights: Record<string, number[]>;
  subConsistency: Record<string, { cr: number; lambda: number }>;
  altScores: Record<string, Record<string, number>>;
  finalScores: any[];
  sensitivityInflections: Record<string, number | null>;
  responseCount: number;
}
```

### Página em branco
Verifique se existe um documento em `calculations/{projectId}` no Firebase com os dados calculados.
