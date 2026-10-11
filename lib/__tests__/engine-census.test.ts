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
// A.21 retirou o IPC: o instrumento aceita somente respostas completas, e não há
// módulo autorizado a implementar o LLSM. Lista VAZIA — autorizar em qualquer
// arquivo inverteria a garantia.
const AUTORIZADO_LLSM: string[] = [];

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

// ---------------------------------------------------------------------------
// Censo de GRAVADORES das coleções de execução (F07).
//
// ⚠ **F07 A1 substituiu o enunciado anterior**, "apenas /api/calculate grava em calculations", que
//   verificava um único gravador em uma única coleção. Com F07 a rota deixa de gravar em
//   `calculations`, e as coleções novas têm categorias DISTINTAS, cada uma com a sua lista
//   autorizada. O que o teste anterior exigia (a rota como único gravador) deixa de valer, e o que
//   ele protegia (que ninguém mais grave na coleção) passa a ser a categoria 1, com lista VAZIA.
//
// ⚠ **IGUALDADE EXATA, nunca inclusão.** Cada categoria compara o mapa `arquivo -> ocorrências`
//   inteiro. Uma segunda ocorrência no mesmo arquivo reprova, como um arquivo novo.
//
// ⚠ **O QUE ESTE CENSO NÃO ALCANÇA.** Procura ASSINATURAS no texto (`doc(db, 'nome', ...)` como
//   primeiro argumento de uma escrita). Não segue uma referência guardada em variável e depois
//   gravada em outra linha, nem um nome de coleção montado em tempo de execução, nem escritas por
//   fora do código versionado (console do Firebase, scripts de manutenção, regras permissivas). A
//   categoria 3 (referências literais a `calculations`) existe para estreitar o primeiro buraco: um
//   gravador novo precisa citar o nome, e a citação nova reprova a igualdade.
// ---------------------------------------------------------------------------

/** `arquivo -> número de OCORRÊNCIAS` do padrão, sobre o código sem comentários. */
function ocorrenciasPorArquivo(padrao: RegExp): Record<string, number> {
  const global = new RegExp(padrao.source, padrao.flags.includes('g') ? padrao.flags : padrao.flags + 'g');
  const saida: Record<string, number> = {};
  for (const f of FONTES) {
    if (FORA_DO_CENSO_DE_CODIGO.test(f)) continue;
    const n = (removerComentarios(readFileSync(join(RAIZ, f), 'utf8')).match(global) ?? []).length;
    if (n > 0) saida[f] = n;
  }
  return Object.fromEntries(Object.entries(saida).sort(([a], [b]) => a.localeCompare(b)));
}

/** Ocorrências do padrão em um TRECHO, com os comentários removidos como no censo. */
function ocorrenciasNoTrecho(padrao: RegExp, trecho: string): number {
  const global = new RegExp(padrao.source, padrao.flags.includes('g') ? padrao.flags : padrao.flags + 'g');
  return (removerComentarios(trecho).match(global) ?? []).length;
}

const DB = String.raw`db(?:\s+as\s+any)?`;
const CALC = String.raw`['"]calculations['"]`;
const EXEC = String.raw`(?:['"]executions['"]|COLECAO_EXECUCOES\b)`;
const PEDIDO = String.raw`(?:['"]executionRequests['"]|COLECAO_PEDIDOS\b)`;
const REFER = String.raw`(?:['"]projectReference['"]|COLECAO_REFERENCIA\b)`;
const HISTO = String.raw`(?:['"]referenceChanges['"]|COLECAO_HISTORICO\b)`;

/** Os padrões, UM por categoria. Cada um tem controle positivo abaixo. */
const PADROES = {
  // 1. calculations: criação ou atualização
  calculationsCriaOuAtualiza: new RegExp(
    String.raw`(?:\b(?:setDoc|updateDoc|addDoc)\(|\.(?:set|update)\()\s*(?:doc|collection)\(\s*${DB}\s*,\s*${CALC}`
  ),
  // 2. calculations: exclusão
  calculationsExclui: new RegExp(String.raw`(?:\bdeleteDoc\(|\.delete\()\s*doc\(\s*${DB}\s*,\s*${CALC}`),
  // 3. calculations: qualquer referência literal ao nome da coleção em chamada de doc/collection
  calculationsReferencia: new RegExp(String.raw`\b(?:doc|collection)\(\s*${DB}\s*,\s*${CALC}`),
  // 4. executions: criação
  executionsCria: new RegExp(String.raw`\.set\(\s*doc\(\s*${DB}\s*,\s*${EXEC}`),
  // 5. executionRequests: criação
  pedidosCria: new RegExp(String.raw`\.set\(\s*doc\(\s*${DB}\s*,\s*${PEDIDO}`),
  // 6. executions e executionRequests: atualização, exclusão e gravação fora de transação
  execucoesAtualizaOuExclui: new RegExp(
    String.raw`(?:\b(?:setDoc|updateDoc|addDoc|deleteDoc)\(|\.(?:update|delete)\()\s*(?:doc|collection)\(\s*${DB}\s*,\s*(?:${EXEC}|${PEDIDO})`
  ),
  // 7. referenceChanges: criação do registro histórico
  historicoCria: new RegExp(String.raw`\.set\(\s*doc\(\s*${DB}\s*,\s*${HISTO}`),
  // 8. projectReference: CRIAÇÃO (primeira escolha)
  referenciaCria: new RegExp(String.raw`\.set\(\s*doc\(\s*${DB}\s*,\s*${REFER}`),
  // 9. projectReference: ATUALIZAÇÃO (escolhas seguintes), categoria distinta da criação
  referenciaAtualiza: new RegExp(String.raw`\.update\(\s*doc\(\s*${DB}\s*,\s*${REFER}`),
  // 10. referenceChanges e projectReference: qualquer outra gravação (fora de transação, exclusão, atualização do histórico)
  referenciaEHistoricoOutras: new RegExp(
    String.raw`(?:\b(?:setDoc|updateDoc|addDoc|deleteDoc)\(|\.delete\()\s*(?:doc|collection)\(\s*${DB}\s*,\s*(?:${REFER}|${HISTO})|\.update\(\s*doc\(\s*${DB}\s*,\s*${HISTO}`
  ),
};

describe('Censo de gravadores: controle positivo dos padrões', () => {
  // ⚠ Um padrão que nunca casa devolve lista vazia e parece aprovado. Cada padrão é aplicado a um
  //   trecho SINTÉTICO que ele DEVE reconhecer, a um que ele NÃO deve reconhecer, e a um em que o
  //   gravador está só em comentário.
  const casos: [keyof typeof PADROES, string, string, string][] = [
    ['calculationsCriaOuAtualiza',
      `await setDoc(doc(db, 'calculations', projectId), x);`,
      `await getDoc(doc(db, 'calculations', projectId));`,
      `// await setDoc(doc(db, 'calculations', projectId), x);`],
    ['calculationsCriaOuAtualiza',
      `batch.update(doc(db, "calculations", id), { a: 1 });`,
      `batch.delete(doc(db, "calculations", id));`,
      `/* tx.set(doc(db, 'calculations', id), x) */`],
    ['calculationsExclui',
      `finalBatch.delete(doc(db, 'calculations', projectId));`,
      `finalBatch.delete(doc(db, 'respondents', projectId));`,
      `// finalBatch.delete(doc(db, 'calculations', projectId));`],
    ['calculationsReferencia',
      `const r = doc(db, 'calculations', projectId);`,
      `const r = doc(db, 'projects', projectId);`,
      `// const r = doc(db, 'calculations', projectId);`],
    ['executionsCria',
      `tx.set(doc(db as any, COLECAO_EXECUCOES, executionId), execucao);`,
      `await getDoc(doc(db, 'executions', executionId));`,
      `// tx.set(doc(db, 'executions', executionId), execucao);`],
    ['executionsCria',
      `tx.set(doc(db, 'executions', executionId), execucao);`,
      `tx.set(doc(db, 'executionRequests', requestId), p);`,
      `/* tx.set(doc(db, 'executions', executionId), execucao) */`],
    ['pedidosCria',
      `tx.set(refPedido, p); tx.set(doc(db as any, COLECAO_PEDIDOS, requestId), p);`,
      `tx.set(refPedido, p);`,
      `// tx.set(doc(db, 'executionRequests', requestId), p);`],
    ['execucoesAtualizaOuExclui',
      `await updateDoc(doc(db, 'executions', id), { a: 1 });`,
      `await getDocs(collection(db, 'executions'));`,
      `// await updateDoc(doc(db, 'executions', id), { a: 1 });`],
    ['execucoesAtualizaOuExclui',
      `tx.delete(doc(db as any, COLECAO_PEDIDOS, id)); await setDoc(doc(db, 'executionRequests', id), {});`,
      `tx.set(doc(db as any, COLECAO_EXECUCOES, id), x);`,
      `// tx.delete(doc(db, 'executionRequests', id));`],
    ['historicoCria',
      `tx.set(doc(db as any, COLECAO_HISTORICO, operationId), evento);`,
      `tx.set(doc(db as any, COLECAO_REFERENCIA, projectId), r);`,
      `// tx.set(doc(db, 'referenceChanges', operationId), evento);`],
    ['referenciaCria',
      `tx.set(doc(db, 'projectReference', projectId), r);`,
      `tx.update(doc(db as any, COLECAO_REFERENCIA, projectId), r);`,
      `/* tx.set(doc(db as any, COLECAO_REFERENCIA, projectId), r) */`],
    ['referenciaAtualiza',
      `tx.update(doc(db as any, COLECAO_REFERENCIA, projectId), r);`,
      `tx.set(doc(db as any, COLECAO_REFERENCIA, projectId), r);`,
      `// tx.update(doc(db, 'projectReference', projectId), r);`],
    ['referenciaEHistoricoOutras',
      `await deleteDoc(doc(db, 'projectReference', projectId));`,
      `tx.set(doc(db as any, COLECAO_HISTORICO, id), e); tx.update(doc(db as any, COLECAO_REFERENCIA, id), r);`,
      `// await deleteDoc(doc(db, 'projectReference', projectId));`],
    ['referenciaEHistoricoOutras',
      `tx.update(doc(db as any, COLECAO_HISTORICO, id), { justification: 'trocada' });`,
      `tx.get(doc(db as any, COLECAO_HISTORICO, id));`,
      `/* await setDoc(doc(db, 'referenceChanges', id), e) */`],
    ['referenciaEHistoricoOutras',
      `await setDoc(doc(db, 'referenceChanges', id), e);`,
      `await getDoc(doc(db, 'referenceChanges', id));`,
      `// await updateDoc(doc(db, 'projectReference', id), e);`],
  ];

  test.each(casos)('%s: casa no gravador sintético, não casa no vizinho, e ignora comentário', (nome, casa, naoCasa, comentario) => {
    const padrao = PADROES[nome];
    expect(ocorrenciasNoTrecho(padrao, casa)).toBeGreaterThan(0);
    expect(ocorrenciasNoTrecho(padrao, naoCasa)).toBe(0);
    expect(ocorrenciasNoTrecho(padrao, comentario)).toBe(0);
  });

  test('a contagem é por OCORRÊNCIA, e não por linha: duas na mesma linha são duas', () => {
    expect(ocorrenciasNoTrecho(PADROES.calculationsExclui, `a.delete(doc(db, 'calculations', 1)); b.delete(doc(db, 'calculations', 2));`)).toBe(2);
  });
});

describe('Censo de gravadores das coleções de execução', () => {
  test('1. calculations, CRIAÇÃO ou ATUALIZAÇÃO: nenhum gravador (lista autorizada VAZIA)', () => {
    // F07 A1 retirou o `setDoc` da rota. O documento `calculations/{projectId}` deixa de ser escrito
    // por qualquer caminho versionado; os que já existem no banco são resíduo.
    expect(ocorrenciasPorArquivo(PADROES.calculationsCriaOuAtualiza)).toEqual({});
  });

  test('2. calculations, EXCLUSÃO: categoria própria, e F07 NÃO a remove', () => {
    // ⚠ Existe em `app/decisor/projetos/page.tsx` (exclusão e arquivamento de projeto). F07 não toca
    // esses caminhos (frente separada); a igualdade abaixo REGISTRA que continuam existindo, em três
    // ocorrências. Se alguém os remover ou acrescentar um, o teste pede decisão explícita.
    expect(ocorrenciasPorArquivo(PADROES.calculationsExclui)).toEqual({ 'app/decisor/projetos/page.tsx': 3 });
  });

  test('3. calculations, REFERÊNCIAS literais em doc()/collection(): a exclusão acima e a leitura do documento anterior', () => {
    // 3 exclusões (categoria 2) + 1 leitura (`getDoc` em `lib/referencia-leitura.ts`, que a tela de
    // resultados usa; antes de A2 a leitura estava na própria tela). Um gravador novo precisaria
    // citar o nome da coleção, e a citação nova quebra esta igualdade.
    expect(ocorrenciasPorArquivo(PADROES.calculationsReferencia)).toEqual({
      'app/decisor/projetos/page.tsx': 3,
      'lib/referencia-leitura.ts': 1,
    });
  });

  test('4. executions, CRIAÇÃO: exatamente um gravador, em lib/execucoes.ts, dentro da transação', () => {
    expect(ocorrenciasPorArquivo(PADROES.executionsCria)).toEqual({ 'lib/execucoes.ts': 1 });
  });

  test('5. executionRequests, CRIAÇÃO: exatamente um gravador, no MESMO arquivo e na mesma transação', () => {
    expect(ocorrenciasPorArquivo(PADROES.pedidosCria)).toEqual({ 'lib/execucoes.ts': 1 });
    // os dois `tx.set` estão dentro de UMA chamada de `runTransaction` (nascimento conjunto)
    const fonte = removerComentarios(readFileSync(join(RAIZ, 'lib/execucoes.ts'), 'utf8'));
    expect(fonte.split('runTransaction(').length - 1).toBe(1);
    const dentro = fonte.slice(fonte.indexOf('runTransaction(db'));
    expect(ocorrenciasNoTrecho(PADROES.executionsCria, dentro)).toBe(1);
    expect(ocorrenciasNoTrecho(PADROES.pedidosCria, dentro)).toBe(1);
  });

  test('6. executions e executionRequests: nenhuma atualização, exclusão ou gravação fora de transação', () => {
    // Imutáveis: as regras propostas negam `update` e `delete`, e o código versionado não os tenta.
    expect(ocorrenciasPorArquivo(PADROES.execucoesAtualizaOuExclui)).toEqual({});
  });
});

describe('Censo de gravadores da referência do projeto (A2)', () => {
  const ARQUIVO = 'lib/escolha-de-referencia.ts';

  test('7. referenceChanges, CRIAÇÃO do registro histórico: exatamente um gravador', () => {
    expect(ocorrenciasPorArquivo(PADROES.historicoCria)).toEqual({ [ARQUIVO]: 1 });
  });

  test('8. projectReference, CRIAÇÃO (primeira escolha): exatamente um gravador', () => {
    expect(ocorrenciasPorArquivo(PADROES.referenciaCria)).toEqual({ [ARQUIVO]: 1 });
  });

  test('9. projectReference, ATUALIZAÇÃO (escolhas seguintes): exatamente um gravador, categoria distinta da criação', () => {
    expect(ocorrenciasPorArquivo(PADROES.referenciaAtualiza)).toEqual({ [ARQUIVO]: 1 });
  });

  test('10. referenceChanges e projectReference: nenhuma outra gravação (histórico imutável, referência sem exclusão)', () => {
    expect(ocorrenciasPorArquivo(PADROES.referenciaEHistoricoOutras)).toEqual({});
  });

  test('os três gravadores estão na MESMA transação, e o módulo abre uma só', () => {
    const fonte = removerComentarios(readFileSync(join(RAIZ, ARQUIVO), 'utf8'));
    expect(fonte.split('runTransaction(').length - 1).toBe(1);
    const dentro = fonte.slice(fonte.indexOf('runTransaction(db'));
    expect(ocorrenciasNoTrecho(PADROES.historicoCria, dentro)).toBe(1);
    expect(ocorrenciasNoTrecho(PADROES.referenciaCria, dentro)).toBe(1);
    expect(ocorrenciasNoTrecho(PADROES.referenciaAtualiza, dentro)).toBe(1);
    // e as duas escritas da referência são ALTERNATIVAS (if/else), nunca as duas na mesma execução
    expect(dentro).toMatch(/if \(atual === null\) \{[\s\S]*?tx\.set\(doc\(db as any, COLECAO_REFERENCIA[\s\S]*?\} else \{[\s\S]*?tx\.update\(doc\(db as any, COLECAO_REFERENCIA/);
  });
});
