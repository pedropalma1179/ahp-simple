/**
 * lib/__tests__/engine-census.test.ts
 *
 * Censo por comportamento, não por nome.
 *
 * Motivo de existir: a correção de 16/06/2026 procurou por identificador e
 * acertou dois dos cinco derivadores de prioridade. Escaparam
 * `simulate/route.ts:203` e `validate/route.ts:64`, ambos chamados
 * `calculateEigenvector...` e ambos calculando média geométrica das linhas.
 *
 * Este teste varre o código-fonte procurando as ASSINATURAS das operações
 * matemáticas, não os nomes das funções, e falha quando uma delas aparece fora
 * da lista autorizada. É a rede que teria pego a omissão de junho.
 *
 * Como usar: quando um arquivo entra ou sai legitimamente de uma lista, a lista
 * é atualizada no mesmo commit da mudança, com justificativa na mensagem.
 * Atualizar a lista para silenciar o teste, sem a mudança correspondente,
 * derrota o propósito.
 *
 * O censo varre apenas CÓDIGO. Comentários são removidos antes da busca, para
 * que a documentação de um defeito eliminado não seja confundida com o defeito.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const RAIZ = join(__dirname, '..', '..');

const DIRETORIOS = ['app', 'lib', 'components'];

const IGNORAR = [
  /node_modules/,
  /\.next/,
  /_backup/,
  /\.backup/,
  /\.bak$/,
  /\.REMOVED$/,
  /__tests__/,
];

/**
 * `lib/rag/articles/` guarda extrações de literatura. Os artigos citam os
 * índices aleatórios de Saaty como conteúdo, não como implementação, e por isso
 * ficam fora do censo de código.
 */
const FORA_DO_CENSO_DE_CODIGO = /^lib\/rag\/articles\//;

function listarFontes(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const e of entradas) {
    const caminho = join(dir, e);
    const rel = relative(RAIZ, caminho);
    if (IGNORAR.some(p => p.test(rel))) continue;
    if (statSync(caminho).isDirectory()) {
      listarFontes(caminho, acc);
    } else if (/\.tsx?$/.test(caminho)) {
      acc.push(rel.replace(/\\/g, '/'));
    }
  }
  return acc;
}

const FONTES = DIRETORIOS.flatMap(d => listarFontes(join(RAIZ, d)));

/**
 * Remove comentários de linha e de bloco, preservando o conteúdo de strings.
 *
 * Necessário porque o censo procura assinaturas de código. Sem esta limpeza,
 * um comentário que DOCUMENTA a remoção de um defeito é acusado como o próprio
 * defeito. Foi o que aconteceu com `Math.max(val, 0.001)` em
 * `app/api/calculate/route.ts`: o piso já tinha sido removido e o teste falhava
 * por causa da frase que registrava a remoção.
 */
export function removerComentarios(codigo: string): string {
  let saida = '';
  let i = 0;
  let delimitador: string | null = null; // aspa simples, dupla ou crase em curso

  while (i < codigo.length) {
    const c = codigo[i];
    const prox = codigo[i + 1];

    if (delimitador) {
      if (c === '\\') {
        saida += c + (prox ?? '');
        i += 2;
        continue;
      }
      if (c === delimitador) delimitador = null;
      saida += c;
      i++;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      delimitador = c;
      saida += c;
      i++;
      continue;
    }

    if (c === '/' && prox === '/') {
      while (i < codigo.length && codigo[i] !== '\n') i++;
      continue;
    }

    if (c === '/' && prox === '*') {
      i += 2;
      while (i < codigo.length && !(codigo[i] === '*' && codigo[i + 1] === '/')) i++;
      i += 2;
      // preserva a quebra de linha para não colar tokens de linhas distintas
      saida += ' ';
      continue;
    }

    saida += c;
    i++;
  }
  return saida;
}

function arquivosComPadrao(padrao: RegExp): string[] {
  return FONTES.filter(f => {
    if (FORA_DO_CENSO_DE_CODIGO.test(f)) return false;
    const codigo = removerComentarios(readFileSync(join(RAIZ, f), 'utf8'));
    return padrao.test(codigo);
  }).sort();
}

// ---------------------------------------------------------------------------
// Listas autorizadas. Estado ALVO do retrofit, não o estado atual.
// Enquanto as fases não são executadas, estes testes falham de propósito e a
// falha é o placar do trabalho pendente.
// ---------------------------------------------------------------------------

const AUTORIZADO_DERIVACAO = ['lib/ahp-engine.ts'];
const AUTORIZADO_MEDIA_GEOMETRICA_LINHAS: string[] = [];
const AUTORIZADO_TABELA_RI = ['lib/ahp-engine.ts'];
const AUTORIZADO_LLSM = ['lib/ahp-ipc.ts'];

describe('Censo do motor de derivação', () => {
  test('apenas o motor implementa iteração de potência', () => {
    // Assinatura: multiplicação matriz por vetor dentro de laço de convergência.
    const encontrados = arquivosComPadrao(/for\s*\([^)]*iter[^)]*\)[\s\S]{0,400}?reduce\([\s\S]{0,120}?\*\s*w/i);
    expect(encontrados).toEqual(AUTORIZADO_DERIVACAO);
  });

  test('nenhum arquivo deriva prioridades por média geométrica das linhas', () => {
    // Assinatura: produtório de uma linha elevado a 1/n.
    const encontrados = arquivosComPadrao(/Math\.pow\(\s*product\s*,\s*1\s*\/\s*n\s*\)|geometricMeans/);
    expect(encontrados).toEqual(AUTORIZADO_MEDIA_GEOMETRICA_LINHAS);
  });

  test('existe uma única tabela de índice aleatório', () => {
    // Assinatura: a sequência 0.58, 0.90, 1.12 de Saaty (1977), em array ou mapa.
    const encontrados = arquivosComPadrao(/0\.58[\s\S]{0,40}?(0\.9|0\.90)[\s\S]{0,40}?1\.12/);
    expect(encontrados).toEqual(AUTORIZADO_TABELA_RI);
  });

  test('nenhum fallback silencioso de índice aleatório', () => {
    // `RI[n] || 1.49` aplica o índice de n=10 a qualquer ordem maior, sem aviso.
    const encontrados = arquivosComPadrao(/RI\s*\[[^\]]+\]\s*\|\|/);
    expect(encontrados).toEqual([]);
  });

  test('o LLSM permanece confinado ao módulo de matrizes incompletas', () => {
    const encontrados = arquivosComPadrao(/llsmIPC|LLSM_IPC/).filter(
      f => !f.startsWith('app/api/ai-reviewer/')
    );
    expect(encontrados).toEqual(AUTORIZADO_LLSM);
  });
});

describe('Censo de guardas silenciosas', () => {
  test('nenhum epsilon aditivo nas fórmulas de síntese', () => {
    const encontrados = arquivosComPadrao(/\+\s*epsilon\s*\)|\+\s*EPSILON\s*\)/);
    expect(encontrados).toEqual([]);
  });

  test('nenhum clamp inferior sobre julgamento agregado', () => {
    const encontrados = arquivosComPadrao(/Math\.max\(\s*val\s*,\s*0\.001\s*\)/);
    expect(encontrados).toEqual([]);
  });

  test('lambda máximo não descarta termos por peso pequeno', () => {
    const encontrados = arquivosComPadrao(/if\s*\(\s*\w*[eE]igenvector\w*\[i\]\s*>\s*0?\.\d+\s*\)|if\s*\(\s*weights\[i\]\s*>\s*EPSILON\s*\)/);
    expect(encontrados).toEqual([]);
  });
});

describe('Censo de arquivos que não deveriam existir', () => {
  test('nenhum arquivo de backup versionado sob app, lib ou components', () => {
    const suspeitos = DIRETORIOS.flatMap(d => {
      const varrer = (dir: string, acc: string[] = []): string[] => {
        let entradas: string[];
        try {
          entradas = readdirSync(dir);
        } catch {
          return acc;
        }
        for (const e of entradas) {
          const caminho = join(dir, e);
          if (/node_modules|\.next/.test(caminho)) continue;
          if (statSync(caminho).isDirectory()) varrer(caminho, acc);
          else if (/\.(bak|backup|backup-[\w-]+|REMOVED|old|disabled)$/.test(e))
            acc.push(relative(RAIZ, caminho).replace(/\\/g, '/'));
        }
        return acc;
      };
      return varrer(join(RAIZ, d));
    });
    expect(suspeitos).toEqual([]);
  });

  test('lib/ahp.ts não existe mais', () => {
    expect(FONTES).not.toContain('lib/ahp.ts');
  });

  test('a rota de compatibilidade v641 não existe mais', () => {
    expect(FONTES).not.toContain('app/api/ai-reviewer/route-v641-compatible.ts');
  });
});

describe('Censo de gravadores da chave de produção', () => {
  test('apenas /api/calculate grava em calculations', () => {
    const encontrados = arquivosComPadrao(/setDoc\(\s*doc\(\s*db\s*,\s*['"]calculations['"]/);
    expect(encontrados).toEqual(['app/api/calculate/route.ts']);
  });
});
