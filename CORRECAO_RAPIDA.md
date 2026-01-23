# 🔧 CORREÇÃO RÁPIDA - Erro de ES Modules

## ❌ Erro que você viu:
```
Error: Cannot find module 'C:\AHP-BOCR\ahp-simple\bocr-peer-review-api'
Did you mean to import "./bocr-peer-review-api.ts"?
```

## ✅ SOLUÇÃO FÁCIL:

### Opção 1: Baixar Arquivos Corrigidos (RECOMENDADO)

Vou disponibilizar os arquivos corrigidos para você baixar novamente.

**Substitua estes 4 arquivos em `C:\AHP-BOCR\ahp-simple`:**

1. `package.json` (corrigido)
2. `demo.ts` (corrigido)
3. `bocr-peer-review-api.ts` (corrigido)
4. `tsconfig.json` (NOVO arquivo)

---

### Opção 2: Corrigir Manualmente

Se preferir, você pode corrigir manualmente:

#### 1. Edite `package.json`

Adicione esta linha depois da linha 3:

```json
"type": "module",
```

E altere os scripts:

```json
"scripts": {
  "demo": "ts-node --esm demo.ts",
  "test": "ts-node --esm bocr-peer-review-api.ts"
},
```

#### 2. Edite `demo.ts`

Linha 7, mude de:
```typescript
import { BOCRPeerReviewAPI, ManuscriptData } from './bocr-peer-review-api';
```

Para:
```typescript
import { BOCRPeerReviewAPI, ManuscriptData } from './bocr-peer-review-api.js';
```

E no final do arquivo (~linha 336), mude de:
```typescript
if (require.main === module) {
```

Para:
```typescript
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
```

#### 3. Edite `bocr-peer-review-api.ts`

Linha 14, mude de:
```typescript
import { BOCR_KNOWLEDGE_BASE, CORRECT_BOCR_FORMULAS } from './knowledge';
```

Para:
```typescript
import { BOCR_KNOWLEDGE_BASE, CORRECT_BOCR_FORMULAS } from './knowledge.js';
```

E no final do arquivo (~linha 1114), mude de:
```typescript
if (require.main === module) {
```

Para:
```typescript
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
```

#### 4. Crie `tsconfig.json` (arquivo novo)

Crie um arquivo chamado `tsconfig.json` com este conteúdo:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./",
    "allowJs": true
  },
  "include": [
    "*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

---

## ▶️ DEPOIS DE CORRIGIR:

Execute novamente:

```cmd
npm run demo
```

Ou tente:

```cmd
npx ts-node --esm demo.ts
```

---

## 🆘 Se ainda não funcionar:

Tente usar **tsx** em vez de ts-node (mais moderno):

```cmd
npm install --save-dev tsx
```

E execute:

```cmd
npx tsx demo.ts
```

---

**Aguarde que vou disponibilizar os arquivos corrigidos para download!**
