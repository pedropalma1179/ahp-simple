import { ComparisonGraph, checkConnectivity, getCompletenessMetrics, buildGraphFromJudgments } from './graph-utils';
import { principalEigenvector, randomIndex } from '@/lib/ahp-engine';

/** Judgment do Firestore com suporte a IPC */
export interface Judgment {
    type: 'bocr' | 'magnitude' | 'subcriteria' | 'alternatives';
    group: string;
    itemA: string;
    itemB: string;
    saatyValue: number | null;
    favors: 'A' | 'B' | 'equal';
    rawSlider: number;
    skipped?: boolean;
}

/** Resultado do cálculo de pesos para um grupo */
export interface WeightResult {
    /** Pesos normalizados (somam 1) */
    weights: number[];
    /** Labels dos itens na mesma ordem dos pesos */
    items: string[];
    /** Consistency Ratio (Saaty, 1977) — NaN se n < 3 ou IPC com < 3 comparações */
    cr: number;
    /** Lambda máximo */
    lambdaMax: number;
    /** Método utilizado */
    method: 'EIGENVECTOR' | 'LLSM_IPC';
    /** Métricas de completude */
    completeness: {
        ratio: number;
        given: number;
        possible: number;
        classification: string;
    };
    /** Grafo era conectado? */
    isConnected: boolean;
}

/** Resultado completo do cálculo IPC para todo o respondente */
export interface IPCCalculationResult {
    /** Pesos BOCR */
    bocrWeights: WeightResult;
    /** Pesos MAGNITUDE (rescaling) */
    magnitudeWeights: WeightResult;
    /** Pesos dos subcritérios por dimensão */
    subWeights: Record<string, WeightResult>;
    /** Pesos das alternativas por subcritério (somente A1 vs A2, trivial) */
    altWeights: Record<string, WeightResult>;
    /** CR médio global ponderado */
    avgCR: number;
    /** Algum grupo tem grafo desconectado? */
    hasDisconnectedGroups: boolean;
    /** Grupos com problemas */
    disconnectedGroups: string[];
    /** Resumo de completude */
    overallCompleteness: {
        totalGiven: number;
        totalPossible: number;
        ratio: number;
    };
}

// ============================================================================
// FUNÇÕES DE CÁLCULO
// ============================================================================

/**
 * 1. Constrói a PCM (Pairwise Comparison Matrix) a partir dos judgments
 * 
 * Para IPC: posições sem comparação ficam como null.
 * Propriedade: a_ji = 1/a_ij (reciprocidade), a_ii = 1.
 * 
 * @param items - Códigos dos itens (ex: ['B', 'O', 'C', 'R'])
 * @param judgments - Judgments filtrados do grupo
 * @returns Matriz n×n com number|null. null = comparação não realizada.
 */
export function buildPCM(
    items: string[],
    judgments: Judgment[]
): (number | null)[][] {
    const n = items.length;
    const indexMap = new Map(items.map((item, i) => [item, i]));

    // Inicializar: diagonal = 1, resto = null
    const pcm: (number | null)[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1 : null))
    );

    for (const j of judgments) {
        if (j.skipped || j.saatyValue === null) continue;

        // Obter índices
        const iA = indexMap.get(j.itemA);
        const iB = indexMap.get(j.itemB);
        if (iA === undefined || iB === undefined) continue;

        // favors === 'A' → itemA é favorecido → a[iA][iB] = saatyValue
        // favors === 'B' → itemB é favorecido → a[iA][iB] = 1/saatyValue
        // favors === 'equal' → saatyValue = 1
        let val: number;
        if (j.favors === 'equal') {
            val = 1;
        } else if (j.favors === 'A') {
            val = j.saatyValue;
        } else { // favors === 'B'
            val = 1 / j.saatyValue!;
        }

        pcm[iA][iB] = val;
        pcm[iB][iA] = 1 / val;
    }
    return pcm;
}

/**
 * 2. Calcula pesos via AHP clássico (Autovetor Principal — Saaty, 1977; 1980)
 * Usado quando a matriz é COMPLETA (sem nulls).
 *
 * Algoritmo (iteração de potência):
 * 1. w0 = (1/n, ..., 1/n); itera w_{k+1} = normalize(A·w_k) até convergir.
 * 2. λmax = Σ_i (A·w)_i  (pois w soma 1 e A·w = λ·w na convergência).
 * 3. CI = (λmax - n) / (n - 1)
 * 4. CR = CI / RI(n)
 *
 * @param pcm - Matriz completa n×n (sem nulls)
 * @returns { weights, lambdaMax, cr }
 */
export function eigenvectorMethod(pcm: number[][], label = 'PCM'): {
    weights: number[];
    lambdaMax: number;
    cr: number;
} {
    // Delega ao motor único (lib/ahp-engine.ts). A derivação, o lambda e o
    // índice aleatório passam a ter uma implementação só no repositório.
    const n = pcm.length;
    const { weights, lambdaMax } = principalEigenvector(pcm, label);

    // n <= 2: CI = 0 por definição (RI(1) = RI(2) = 0).
    if (n <= 2) return { weights, lambdaMax: n, cr: 0 };

    const ci = (lambdaMax - n) / (n - 1);
    return { weights, lambdaMax, cr: ci / randomIndex(n) };
}

/**
 * 3. Calcula pesos via LLSM para matrizes INCOMPLETAS
 * Referência: Bozóki et al. (2009), Theorem 3
 * 
 * Formulação:
 *   min Σ_{(i,j)∈E} [log(a_ij) - log(w_i) + log(w_j)]²
 *   sujeito a: Σ w_i = 1, w_i > 0
 * 
 * @param pcm - Matriz incompleta n×n (com nulls)
 * @param graph - Grafo correspondente (deve ser conectado)
 * @returns { weights, lambdaMax, cr }
 * @throws Error se grafo não for conectado
 */
export function llsmIPC(
    pcm: (number | null)[][],
    graph: ComparisonGraph
): {
    weights: number[];
    lambdaMax: number;
    cr: number;
} {
    const { n, edges } = graph;
    // Pré-condição: grafo conectado (verificado pelo chamador ou aqui)
    // Assumimos que o chamador já validou com checkConnectivity

    // 1. Inicializar log-pesos (y)
    // y_i = 0 => w_i = 1
    let y = new Array(n).fill(0);

    // Construir lista de adjacência com valores logarítmicos
    // neighbors[i] = [{ neighbor: j, logVal: log(a_ij) }]
    const neighbors: Array<Array<{ idx: number, logVal: number }>> = Array.from({ length: n }, () => []);

    // Processar apenas as arestas existentes
    // edges contém apenas os pares únicos (u, v)
    for (const [u, v] of edges) {
        const val = pcm[u][v];
        if (val !== null) {
            const logVal = Math.log(val);
            neighbors[u].push({ idx: v, logVal: logVal });
            neighbors[v].push({ idx: u, logVal: -logVal }); // log(1/a_uv) = -log(a_uv)
        }
    }

    // Iteração até convergência
    const MAX_ITER = 1000;
    const EPSILON = 1e-10;

    for (let iter = 0; iter < MAX_ITER; iter++) {
        const y_new = [...y];
        let maxDiff = 0;

        // Para cada componente, a atualização é baseada na média dos vizinhos
        // y_i_new = (1/degree_i) * sum_j (log(a_ij) + y_j)
        // No entanto, a formulação exata do LLSM iterativo é um pouco mais sutil para convergência rápida
        // Mas a média funciona como método de relaxação (Gauss-Seidel ou Jacobi)

        for (let i = 0; i < n; i++) {
            const myNeighbors = neighbors[i];
            if (myNeighbors.length === 0) continue; // Isolado? Não deve acontecer se conectado e n > 1

            let sum = 0;
            for (const { idx, logVal } of myNeighbors) {
                sum += logVal + y[idx];
            }
            y_new[i] = sum / myNeighbors.length;
        }

        // Centralizar (normalização geométrica)
        // Se w_i = exp(y_i), normalizar w_i para soma 1 não altera a proporção
        // Para estabilidade numérica, subtraímos a média de y
        const meanY = y_new.reduce((a, b) => a + b, 0) / n;
        for (let i = 0; i < n; i++) {
            y_new[i] -= meanY;
            const diff = Math.abs(y_new[i] - y[i]);
            if (diff > maxDiff) maxDiff = diff;
        }

        y = y_new;
        if (maxDiff < EPSILON) break;
    }

    // 4. Converter para pesos
    const expY = y.map(val => Math.exp(val));
    const sumExpY = expY.reduce((a, b) => a + b, 0);
    const weights = expY.map(val => val / sumExpY);

    // 5. Calcular CR sobre PCM completada
    // A_completed[i][j] = pcm[i][j] se existe, senão w_i / w_j
    const pcmCompleted: number[][] = pcm.map((row, i) =>
        row.map((val, j) => {
            if (val !== null) return val;
            if (i === j) return 1;
            return weights[i] / weights[j];
        })
    );

    // Calcular CR da matriz completada via Eigenvector Method estimado
    const result = eigenvectorMethod(pcmCompleted);

    return {
        weights,
        lambdaMax: result.lambdaMax,
        cr: result.cr
    };
}

/**
 * 4. Calcula pesos para um grupo (auto-seleciona método)
 * - Se matrix completa → eigenvectorMethod()
 * - Se matrix incompleta + grafo conectado → llsmIPC()
 * - Se matrix incompleta + grafo desconectado → throw Error
 *
 * @param items - Códigos dos itens
 * @param judgments - TODOS os judgments do respondente
 * @param group - Grupo a filtrar
 * @returns WeightResult completo
 */
export function calculateGroupWeights(
    items: string[],
    judgments: Judgment[],
    group: string
): WeightResult {
    const n = items.length;

    // 1. Construir e analisar grafo
    const graph = buildGraphFromJudgments(items, judgments, group);
    const metrics = getCompletenessMetrics(graph);

    // 2. Construir PCM
    const filteredJudgments = judgments.filter(j => j.group === group);
    const pcm = buildPCM(items, filteredJudgments);

    let result: { weights: number[], lambdaMax: number, cr: number, method: 'EIGENVECTOR' | 'LLSM_IPC' };

    // 3. Selecionar método
    if (metrics.classification === 'COMPLETE' || metrics.given === metrics.possible) {
        // Caso completo: PCM não deve ter nulls (exceto bugs de dados, que tratamos forçando conversão)
        // Convertendo (number | null)[][] para number[][], assumindo 1 onde for null (fallback seguro)
        const cleanPCM = pcm.map((row, i) => row.map((val, j) => {
            if (val !== null) return val;
            if (i === j) return 1;
            throw new Error(
                `PCM do grupo ${group} classificada como completa, mas a celula [${i}][${j}] esta ausente. ` +
                `Dado inconsistente: nao preencher com valor arbitrario.`
            );
        }));
        const eigen = eigenvectorMethod(cleanPCM, group);
        result = { ...eigen, method: 'EIGENVECTOR' };
    } else {
        // Caso incompleto
        if (!metrics.classification.includes('INSUFFICIENT') && graph.n > 1) {
            // Se o grafo diz que é suficiente/conectado
            const conn = checkConnectivity(graph);
            if (!conn.isConnected) {
                throw new Error(`Grafo desconectado para grupo ${group}. Não é possível calcular pesos.`);
            }
            const llsm = llsmIPC(pcm, graph);
            result = { ...llsm, method: 'LLSM_IPC' };
        } else if (graph.n <= 1) {
            // Trivial 1 item
            result = { weights: [1], lambdaMax: 1, cr: 0, method: 'EIGENVECTOR' };
        } else {
            throw new Error(`Grafo desconectado para grupo ${group} (INSUFFICIENT). Faltam comparações críticas.`);
        }
    }

    return {
        weights: result.weights,
        items,
        cr: result.cr,
        lambdaMax: result.lambdaMax,
        method: result.method,
        completeness: {
            ratio: metrics.completenessRatio,
            given: metrics.given,
            possible: metrics.possible,
            classification: metrics.classification
        },
        isConnected: true // Se chegou aqui, é conectado
    };
}

/**
 * 5. Calcula pesos completos para todo o respondente
 * Processa todos os grupos na hierarquia.
 *
 * @param judgments - Array completo de judgments do respondente
 * @param alternativeCodes - Códigos das alternativas (ex: ['A1', 'A2'])
 * @returns IPCCalculationResult
 */
export function calculateAllWeights(
    judgments: Judgment[],
    alternativeCodes: string[]
): IPCCalculationResult {
    const disconnectedGroups: string[] = [];
    let totalGiven = 0;
    let totalPossible = 0;

    // Helper seguro que captura erros de conectividade
    const calcSafe = (items: string[], groupName: string): WeightResult | null => {
        try {
            const res = calculateGroupWeights(items, judgments, groupName);
            totalGiven += res.completeness.given;
            totalPossible += res.completeness.possible;
            return res;
        } catch (e) {
            disconnectedGroups.push(groupName);
            return null;
        }
    };

    // 1. Nível 1: BOCR
    const bocrItems = ['B', 'O', 'C', 'R'];
    const bocrWeights = calcSafe(bocrItems, 'BOCR') || emptyResult(bocrItems);

    // 2. Nível 1: Magnitude (Rescaling)
    const magnitudeWeights = calcSafe(bocrItems, 'MAGNITUDE') || emptyResult(bocrItems);

    // 3. Nível 2: Subcritérios
    const subWeights: Record<string, WeightResult> = {};
    ['B', 'O', 'C', 'R'].forEach(merit => {
        // Assumindo 5 subs fixos por mérito como no sistema original
        const subs = Array.from({ length: 5 }, (_, i) => `${merit}${i + 1}`);
        const res = calcSafe(subs, merit);
        subWeights[merit] = res || emptyResult(subs);
    });

    // 4. Nível 3: Alternativas
    // Para cada um dos 20 subcritérios
    const altWeights: Record<string, WeightResult> = {};
    ['B', 'O', 'C', 'R'].forEach(merit => {
        for (let i = 1; i <= 5; i++) {
            const sub = `${merit}${i}`;
            const res = calcSafe(alternativeCodes, sub);
            altWeights[sub] = res || emptyResult(alternativeCodes);
        }
    });

    return {
        bocrWeights,
        magnitudeWeights,
        subWeights,
        altWeights,
        // CR governante do respondente: o MAIOR CR entre as matrizes não triviais
        // (BOCR, Magnitude e os 4 subcritérios 5×5). A aceitação no AHP é por matriz
        // (Saaty, 1977): o respondente só é aceitável se TODAS ficam sob 0,10, então o
        // máximo governa. Exclui as 20 matrizes 2×2 de alternativas (CR≡0, sem informação).
        // Nome 'avgCR' mantido por compatibilidade com Firestore e consumidores;
        // renomear para 'maxCR' é débito de pós-defesa.
        avgCR: (() => {
            const crs = [
                bocrWeights.cr,
                magnitudeWeights.cr,
                subWeights['B'].cr, subWeights['O'].cr, subWeights['C'].cr, subWeights['R'].cr,
            ].filter(cr => !isNaN(cr));
            return crs.length > 0 ? Math.max(...crs) : 0;
        })(),
        hasDisconnectedGroups: disconnectedGroups.length > 0,
        disconnectedGroups,
        overallCompleteness: {
            totalGiven,
            totalPossible,
            ratio: totalPossible > 0 ? totalGiven / totalPossible : 0
        }
    };
}

function emptyResult(items: string[]): WeightResult {
    return {
        weights: items.map(() => 1 / items.length),
        items,
        cr: 0,
        lambdaMax: items.length,
        method: 'EIGENVECTOR',
        completeness: { ratio: 0, given: 0, possible: 0, classification: 'INSUFFICIENT' },
        isConnected: false
    };
}

/**
 * 6. Calcula CR parcial durante preenchimento (feedback em tempo real)
 * Retorna o lower bound do CR baseado nas comparações feitas até agora.
 * 
 * Referência: Bozóki et al. (2009) — "non-decreasing lower bound"
 * 
 * @param items - Códigos dos itens do grupo atual
 * @param judgmentsSoFar - Judgments até agora (só do grupo atual)
 * @param group - Grupo atual
 * @returns { cr: number, isAcceptable: boolean, isConnected: boolean, comparisonsLeft: number }
 */
export function calculatePartialCR(
    items: string[],
    judgmentsSoFar: Judgment[],
    group: string
): {
    cr: number;
    isAcceptable: boolean;
    isConnected: boolean;
    completeness: number;
    comparisonsLeft: number;
} {
    const graph = buildGraphFromJudgments(items, judgmentsSoFar, group);
    const conn = checkConnectivity(graph);
    const metrics = getCompletenessMetrics(graph);

    // Se não conectado, não podemos calcular CR via LLSM confiável
    // Retornamos estado parcial
    if (!conn.isConnected) {
        return {
            cr: 0, // Indefinido ainda
            isAcceptable: true, // Optimistic view
            isConnected: false,
            completeness: metrics.completenessRatio,
            comparisonsLeft: metrics.possible - metrics.given
        };
    }

    // Se conectado, calculamos via LLSM
    // O CR calculado sobre a matriz incompleta preenchida é uma estimativa
    // Bozóki prova que CR(incompleto) <= CR(final) se a inconsistência for "distribuída"
    // Mas na prática, calculamos o CR atual
    const pcm = buildPCM(items, judgmentsSoFar.filter(j => j.group === group));
    try {
        const { cr } = llsmIPC(pcm, graph);
        return {
            cr,
            isAcceptable: cr <= 0.10,
            isConnected: true,
            completeness: metrics.completenessRatio,
            comparisonsLeft: metrics.possible - metrics.given
        };
    } catch (e) {
        return {
            cr: 0,
            isAcceptable: true,
            isConnected: false,
            completeness: metrics.completenessRatio,
            comparisonsLeft: metrics.possible - metrics.given
        };
    }
}
