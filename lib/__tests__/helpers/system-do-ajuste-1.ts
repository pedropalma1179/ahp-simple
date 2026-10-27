/**
 * lib/__tests__/helpers/system-do-ajuste-1.ts
 *
 * **O `system` do Parecer IA nos três estados do Ajuste 1.** Uma só fonte para os testes que fixam o `sha256` do `system` renderizado, para que a próxima
 * alteração do prompt mude UM arquivo de apoio e não cinco literais.
 *
 *   ANTES        `f3f2410c…` (34170 bytes): o de `35a1506`, da referência de F07, de A.33 e da primeira etapa do Ajuste 1.
 *   APÓS ETAPA 2 `d56267e9…` (34073 bytes): os exemplos do H-CR-S (três pontos). Predição P-SP-1.
 *   DEPOIS       `0d8bc15e…` (34924 bytes): a linha «% que atende», o trecho de IPC e a regra de comparações completas (cinco pontos). Predição P-IPC-1.
 *
 * As predições estão em `docs/imprecisoes-parecer-ia.md`, escritas ANTES de cada alteração de `app/api/ai-reviewer/system-prompt.ts`: o valor de cada
 * estado foi DERIVADO aplicando as substituições, em memória, ao `system` capturado, e o arquivo editado o reproduziu byte a byte.
 *
 * ⚠ **Por que há as substituições aqui, e não só o hash novo.** Um hash novo diz que o `system` mudou, e não que mudou SÓ naqueles pontos.
 * `reverterEtapa3` desfaz as cinco substituições da terceira etapa (o resultado tem de ter o `sha256` de `APÓS ETAPA 2`), e `reverterOsExemplos` desfaz as
 * das duas etapas (o resultado tem de ter o `sha256` ANTES). É o que liga o `system` de hoje à medição de `35a1506`, da referência de F07 e de A.33: nenhuma
 * outra linha do prompt mudou. Cada âncora tem de ocorrer UMA vez, senão a função falha (uma substituição que casasse em dois lugares, ou em nenhum, não
 * desfaria o que foi feito).
 */
import crypto from 'node:crypto';

/** O `system` ANTES: o de `35a1506`, da referência de F07 (`f07-entrada-antes.json`), de A.33 e do Ajuste 1 (primeira etapa). */
export const SYSTEM_ANTES = {
  sha256: 'f3f2410c65c2919a477a5b2ee2c9b1628315effa85c906a71468ecf53eb36f98',
  bytes: 34170,
} as const;

/** O `system` depois da SEGUNDA etapa (exemplos do H-CR-S). */
export const SYSTEM_APOS_ETAPA_2 = {
  sha256: 'd56267e90f98bd5e474b2e2b2a823bf544e28cecb6e0186780fd074945f8f5da',
  bytes: 34073,
} as const;

/** O `system` DEPOIS da TERCEIRA etapa: medido na rota real, e igual ao previsto antes da edição. */
export const SYSTEM_DEPOIS = {
  sha256: '0d8bc15eecac50fcd5d19cc1fc7c20543f89735f22b3bb94fd5fef8707fbb441',
  bytes: 34924,
} as const;

type Par = readonly [depois: string, antes: string];

/** Segunda etapa. [texto de DEPOIS, texto de ANTES], na ordem do arquivo. */
export const SUBSTITUICOES_ETAPA_2: ReadonlyArray<Par> = [
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

/** Terceira etapa. [texto de DEPOIS, texto de ANTES], na ordem do arquivo: linha 102, itens 4 e 5 da consistência, DIRETRIZ 4 e item 4 do checklist. */
export const SUBSTITUICOES_ETAPA_3: ReadonlyArray<Par> = [
  [
    "- ❌ Sugerir que o MÉTODO AHP exige comparações obrigatoriamente completas — Harker (1987) e Saaty & Ozdemir (2003) justificam comparações incompletas para reduzir fadiga cognitiva. Isto vale para o método na literatura: ESTE instrumento aceita somente respostas completas (propriedade do percurso de cálculo, nos termos do bloco do vínculo, quando o contexto o traz). Descreva a completude como escolha do instrumento, e não como exigência do AHP",
    "- ❌ Sugerir que todas as comparações devem ser obrigatoriamente completas — Harker (1987) e Saaty & Ozdemir (2003) justificam comparações incompletas para reduzir fadiga cognitiva",
  ],
  [
    "4. CR individual, POR MATRIZ (o limiar de 0.10 de Saaty (1977) é critério de aceitação de uma MATRIZ, e o contexto não classifica respondentes): use a seção de consistência individual do contexto e reporte a contagem com o denominador, no formato \"N de M matrizes com CR > 0.10\", copiando N e M do contexto (M = respondentes enviados com CR recalculado × 6 matrizes não triviais: BOCR, Magnitude e os quatro blocos de subcritérios; as vinte matrizes de alternativas 2×2 ficam fora, porque o CR delas é zero por construção). Não converta a contagem em \"% de respondentes que atendem\" e não troque M pelo número de respondentes. Se o contexto disser que o CR individual não está disponível ou que as contagens não são apresentadas, diga isso e não estime → impacto na agregação (Saaty, 1990)",
    "4. CR individual: distribuição → % que atende Saaty (1977) → impacto na agregação (Saaty, 1990)",
  ],
  [
    "5. Respondentes com alguma matriz com CR > 0.20: listar o respondente, a matriz e o CR dela (valores do contexto, sem classificar a pessoa) → citar Saaty & Ergu (2015) sobre confiabilidade",
    "5. Respondentes com CR > 0.20: listar → citar Saaty & Ergu (2015) sobre confiabilidade",
  ],
  [
    "### DIRETRIZ 4 — Interpretação de CR = 0%\nEste instrumento aceita somente respostas completas (propriedade do percurso de cálculo, nos termos do bloco do vínculo, quando o contexto o traz, inclusive quanto ao que não foi conferido nesta execução), e o sistema NÃO completa comparações faltantes por transitividade, nem por IPC ou LLSM. Portanto, quando uma matriz de ordem 3 ou maior apresentar CR = 0.00%, esse valor é o resultado calculado dos julgamentos do respondente: não o atribua a IPC, a comparações completadas pelo sistema ou a artefato do método, e não invoque Bozóki, Fülöp e Rónyai (2010) para explicá-lo.\n\nDuas ressalvas: (1) matriz 2×2 tem CR = 0 por construção, e esse zero não informa consistência; (2) CR = 0.00% é um valor calculado, e não prova \"qualidade excepcional\" nem \"artefato\": relate-o com o respondente e a matriz, e não infira uma causa que o contexto não traga.\n\nFormato padrão da redação:\n\"A matriz [matriz] do respondente [id] apresenta CR = 0.00%, valor calculado a partir dos julgamentos do respondente; o sistema não completa comparações faltantes.\"",
    "### DIRETRIZ 4 — Interpretação de CR = 0% em contexto IPC\nQuando uma matriz apresentar CR = 0.00% e o estudo tiver declarado uso de Incomplete Pairwise Comparison (IPC) conforme Bozóki, Fülöp e Rónyai (2010), não reporte como \"consistência perfeita\" sem qualificação.\n\nMotivo: no método IPC, quando o respondente fornece apenas o número mínimo de comparações (n-1), as comparações faltantes são completadas deterministicamente pela relação de transitividade a_ij = a_ik × a_kj. Isso gera matrizes artificialmente consistentes com CR = 0 por construção, não por qualidade dos julgamentos.\n\nFormato padrão da redação:\n\"A matriz agregada de [dimensão] apresenta CR = 0.00% com λmax = n. Este valor indica consistência matemática perfeita, mas deve ser interpretado no contexto do método IPC adotado (Bozóki et al., 2010): quando o respondente fornece apenas as (n-1) comparações mínimas necessárias para a conectividade do grafo, as [C(n,2) - (n-1)] comparações restantes são completadas por transitividade algébrica. Nesta configuração, CR = 0 é propriedade estrutural da matriz completada, não indicador de qualidade excepcional dos julgamentos individuais do respondente.\"\n\nQuando CR = 0 é sinal de qualidade: se o respondente fornece a matriz completa C(n,2) e ainda assim obtém CR = 0, isso indica consistência cognitiva rigorosa. O parecer deve distinguir esses dois cenários com base nos metadados IPC do sistema.",
  ],
  [
    "4. **CR = 0%:** se há CR = 0.00% em alguma matriz, relatei-o como valor calculado dos julgamentos do respondente, sem atribuí-lo a IPC nem a comparações completadas pelo sistema, e disse que o zero de uma matriz 2×2 é por construção?",
    "4. **CR = 0% + IPC:** se há CR = 0 em alguma matriz, verifiquei se foi gerado por IPC antes de reportar como \"consistência perfeita\"?",
  ],
];

/** As duas etapas, na ordem em que foram aplicadas. */
export const SUBSTITUICOES_DOS_EXEMPLOS: ReadonlyArray<Par> = [...SUBSTITUICOES_ETAPA_2, ...SUBSTITUICOES_ETAPA_3];

/** As frases que o `system` ANTIGO ensinava, e que o de DEPOIS não pode conter. */
export const FRASES_RETIRADAS = [
  // segunda etapa
  'todos os 12 respondentes atendem o limiar',
  'Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar.',
  '1,1% e 9,6%',
  // terceira etapa
  '% que atende Saaty (1977)',
  'Respondentes com CR > 0.20: listar',
  'Interpretação de CR = 0% em contexto IPC',
  'metadados IPC do sistema',
  'completadas por transitividade algébrica',
  'verifiquei se foi gerado por IPC',
  'Sugerir que todas as comparações devem ser obrigatoriamente completas',
] as const;

export const sha256DoTexto = (s: string): string => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const ocorrencias = (texto: string, trecho: string): number => texto.split(trecho).length - 1;

function reverter(system: string, pares: ReadonlyArray<Par>): string {
  let s = system;
  for (const [depois, antes] of [...pares].reverse()) {
    const n = ocorrencias(s, depois);
    if (n !== 1) throw new Error(`âncora com ${n} ocorrência(s), e deveria ter exatamente 1: ${depois.slice(0, 80)}`);
    s = s.replace(depois, () => antes);
  }
  return s;
}

/** Desfaz as cinco substituições da terceira etapa: o resultado é o `system` APÓS A ETAPA 2. Falha se alguma âncora não ocorrer exatamente uma vez. */
export const reverterEtapa3 = (systemDeDepois: string): string => reverter(systemDeDepois, SUBSTITUICOES_ETAPA_3);

/** Desfaz as oito substituições (das duas etapas): o resultado é o `system` ANTES. Falha se alguma âncora não ocorrer exatamente uma vez. */
export const reverterOsExemplos = (systemDeDepois: string): string => reverter(systemDeDepois, SUBSTITUICOES_DOS_EXEMPLOS);

const medida = (t: string) => ({ sha256: sha256DoTexto(t), bytes: Buffer.byteLength(t, 'utf8') });

/** O que o `system` de DEPOIS tem de satisfazer, de uma vez: o hash e o tamanho medidos, e a equivalência com cada estado anterior fora dos pontos alterados. */
export function conferirSystemDeDepois(system: string) {
  const etapa2 = medida(reverterEtapa3(system));
  const antes = medida(reverterOsExemplos(system));
  return {
    ...medida(system),
    sha256AposReverterEtapa3: etapa2.sha256,
    bytesAposReverterEtapa3: etapa2.bytes,
    sha256AposReverter: antes.sha256,
    bytesAposReverter: antes.bytes,
  };
}

/** O resultado esperado de `conferirSystemDeDepois`. */
export const SYSTEM_ESPERADO = {
  sha256: SYSTEM_DEPOIS.sha256,
  bytes: SYSTEM_DEPOIS.bytes,
  sha256AposReverterEtapa3: SYSTEM_APOS_ETAPA_2.sha256,
  bytesAposReverterEtapa3: SYSTEM_APOS_ETAPA_2.bytes,
  sha256AposReverter: SYSTEM_ANTES.sha256,
  bytesAposReverter: SYSTEM_ANTES.bytes,
} as const;
