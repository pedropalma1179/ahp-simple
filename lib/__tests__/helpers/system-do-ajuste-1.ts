/**
 * lib/__tests__/helpers/system-do-ajuste-1.ts
 *
 * **O `system` do Parecer IA antes e depois dos exemplos do H-CR-S (Ajuste 1, segunda etapa).** Uma só fonte para os testes que fixam o
 * `sha256` do `system` renderizado, para que a próxima alteração do prompt mude UM arquivo de teste de apoio e não cinco literais.
 *
 * A predição está em `docs/imprecisoes-parecer-ia.md` (P-SP-1 a P-SP-4), escrita ANTES da alteração de `app/api/ai-reviewer/system-prompt.ts`:
 * o valor `DEPOIS` foi DERIVADO aplicando as três substituições, em memória, ao `system` capturado, e o arquivo editado o reproduziu byte a byte.
 *
 * ⚠ **Por que há as substituições aqui, e não só o hash novo.** Um hash novo diz que o `system` mudou, e não que mudou SÓ naqueles três pontos.
 * `reverterOsExemplos` desfaz as três substituições no `system` atual; o resultado tem de ter o `sha256` ANTIGO. É o que liga o `system` de hoje à
 * medição de `35a1506`, da referência de F07 e de A.33: nenhuma outra linha do prompt mudou. Cada âncora tem de ocorrer UMA vez, senão a função falha
 * (uma substituição que casasse em dois lugares, ou em nenhum, não desfaria o que foi feito).
 */
import crypto from 'node:crypto';

/** O `system` ANTES: o de `35a1506`, da referência de F07 (`f07-entrada-antes.json`), de A.33 e do Ajuste 1 (primeira etapa). */
export const SYSTEM_ANTES = {
  sha256: 'f3f2410c65c2919a477a5b2ee2c9b1628315effa85c906a71468ecf53eb36f98',
  bytes: 34170,
} as const;

/** O `system` DEPOIS dos exemplos: medido na rota real, e igual ao previsto antes da edição. */
export const SYSTEM_DEPOIS = {
  sha256: 'd56267e90f98bd5e474b2e2b2a823bf544e28cecb6e0186780fd074945f8f5da',
  bytes: 34073,
} as const;

/** [texto de DEPOIS, texto de ANTES], na ordem do arquivo. */
export const SUBSTITUICOES_DOS_EXEMPLOS: ReadonlyArray<readonly [depois: string, antes: string]> = [
  [
    'Exemplo proibido: "configura conformidade integral do CR agregado"',
    'Exemplo proibido: "configura conformidade integral da amostra"',
  ],
  [
    'Exemplo correto: "o CR agregado atende o limiar"',
    'Exemplo correto: "todos os 12 respondentes atendem o limiar"',
  ],
  [
    'Todos os valores são inferiores ao limiar CR ≤ 0,10 proposto por Saaty (1977).',
    'Todos os valores são inferiores ao limiar CR ≤ 0,10 proposto por Saaty (1977). Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar.',
  ],
];

/** As frases que o `system` ANTIGO ensinava sobre os respondentes individuais, e que o de DEPOIS não pode conter. */
export const FRASES_RETIRADAS = [
  'todos os 12 respondentes atendem o limiar',
  'Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar.',
  '1,1% e 9,6%',
] as const;

export const sha256DoTexto = (s: string): string => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const ocorrencias = (texto: string, trecho: string): number => texto.split(trecho).length - 1;

/** Desfaz as três substituições. Falha se alguma âncora de DEPOIS não ocorrer exatamente uma vez. */
export function reverterOsExemplos(systemDeDepois: string): string {
  let s = systemDeDepois;
  for (const [depois, antes] of SUBSTITUICOES_DOS_EXEMPLOS) {
    const n = ocorrencias(s, depois);
    if (n !== 1) throw new Error(`âncora com ${n} ocorrência(s), e deveria ter exatamente 1: ${depois.slice(0, 80)}`);
    s = s.replace(depois, () => antes);
  }
  return s;
}

/** O que o `system` de DEPOIS tem de satisfazer, de uma vez: o hash e o tamanho medidos, e a equivalência com o ANTIGO fora dos três pontos. */
export function conferirSystemDeDepois(system: string): {
  sha256: string;
  bytes: number;
  sha256AposReverter: string;
  bytesAposReverter: number;
} {
  const revertido = reverterOsExemplos(system);
  return {
    sha256: sha256DoTexto(system),
    bytes: Buffer.byteLength(system, 'utf8'),
    sha256AposReverter: sha256DoTexto(revertido),
    bytesAposReverter: Buffer.byteLength(revertido, 'utf8'),
  };
}

/** O resultado esperado de `conferirSystemDeDepois`. */
export const SYSTEM_ESPERADO = {
  sha256: SYSTEM_DEPOIS.sha256,
  bytes: SYSTEM_DEPOIS.bytes,
  sha256AposReverter: SYSTEM_ANTES.sha256,
  bytesAposReverter: SYSTEM_ANTES.bytes,
} as const;
