/**
 * Graph utilities for Incomplete Pairwise Comparison (IPC).
 * Based on Bozóki, Fülöp & Rónyai (2009): "On optimal completion of incomplete pairwise comparison matrices".
 * Theorem 1: The solution is unique if and only if the graph of comparisons is connected.
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Representação de grafo para matrizes de comparação pareada.
 * Cada vértice é um critério/alternativa, cada aresta é uma comparação realizada.
 */
export interface ComparisonGraph {
    /** Número de vértices (n critérios/alternativas) */
    n: number;
    /** Arestas presentes: cada [i, j] indica que a comparação a_ij foi realizada (i < j) */
    edges: [number, number][];
}

export interface ConnectivityResult {
    /** Grafo é conectado? (Teorema 1: solução única ↔ conectado) */
    isConnected: boolean;
    /** Número de componentes conectados */
    componentCount: number;
    /** Vértices em cada componente */
    components: number[][];
}

export interface CompletenessMetrics {
    /** Comparações realizadas */
    given: number;
    /** Total possível: n(n-1)/2 */
    possible: number;
    /** Mínimo para solução única: n-1 */
    minimum: number;
    /** Ratio: given/possible */
    completenessRatio: number;
    /** Classificação */
    classification: 'COMPLETE' | 'NEAR_COMPLETE' | 'PARTIAL' | 'MINIMAL' | 'INSUFFICIENT';
}

export interface SkipValidation {
    /** Pode pular esta comparação sem quebrar conectividade? */
    canSkip: boolean;
    /** Se não pode, motivo */
    reason?: string;
    /** Comparações que são "pontes" (remoção desconecta o grafo) */
    bridgeEdges: [number, number][];
    /** Quantas comparações ainda podem ser puladas mantendo conectividade */
    remainingSkippable: number;
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * 1. Verifica conectividade do grafo (BFS)
 * Referência: Bozóki et al. (2009), Theorem 1
 * 
 * @param graph - Grafo de comparações
 * @returns Resultado com componentes conectados
 */
export function checkConnectivity(graph: ComparisonGraph): ConnectivityResult {
    const { n, edges } = graph;
    if (n === 0) return { isConnected: true, componentCount: 0, components: [] };
    if (n === 1) return { isConnected: true, componentCount: 1, components: [[0]] };

    // 1. Criar lista de adjacência
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
        adj[u].push(v);
        adj[v].push(u);
    }

    // 2. Encontrar componentes via BFS
    const visited = new Set<number>();
    const components: number[][] = [];

    for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
            const component: number[] = [];
            const queue: number[] = [i];
            visited.add(i);

            while (queue.length > 0) {
                const u = queue.shift()!;
                component.push(u);

                for (const v of adj[u]) {
                    if (!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                }
            }
            components.push(component.sort((a, b) => a - b));
        }
    }

    return {
        isConnected: components.length === 1,
        componentCount: components.length,
        components
    };
}

/**
 * 2. Calcula métricas de completude
 * Referência: Bozóki et al. (2009), Section II
 * 
 * Classificação:
 * - COMPLETE: given === possible (100%)
 * - NEAR_COMPLETE: given >= 80% de possible
 * - PARTIAL: given >= 50% de possible E grafo conectado
 * - MINIMAL: given === n-1 (spanning tree) E grafo conectado
 * - INSUFFICIENT: grafo NÃO conectado
 *
 * @param graph - Grafo de comparações
 * @returns Métricas de completude
 */
export function getCompletenessMetrics(graph: ComparisonGraph): CompletenessMetrics {
    const { n, edges } = graph;
    const given = edges.length;
    const possible = (n * (n - 1)) / 2;
    const minimum = n - 1;
    const completenessRatio = possible > 0 ? given / possible : 1;

    const { isConnected } = checkConnectivity(graph);

    let classification: CompletenessMetrics['classification'];

    if (!isConnected) {
        classification = 'INSUFFICIENT';
    } else if (given === possible) {
        classification = 'COMPLETE';
    } else if (given === minimum) {
        classification = 'MINIMAL';
    } else if (completenessRatio >= 0.8) {
        classification = 'NEAR_COMPLETE';
    } else {
        // Se está conectado e não é minimal nem near complete, consideramos partial
        // Isso cobre tanto >= 50% quanto casos entre minimal e 50% (ex: n=10, given=10, ratio=0.22)
        classification = 'PARTIAL';
    }

    return {
        given,
        possible,
        minimum,
        completenessRatio,
        classification
    };
}

/**
 * 3. Gera spanning tree mínima (comparações mínimas necessárias)
 * Para n vértices, retorna n-1 arestas que garantem conectividade.
 * Usa estratégia de "corrente" (chain): 0-1, 1-2, 2-3, ..., (n-2)-(n-1)
 * Esta é a estratégia mais simples e intuitiva para o respondente.
 *
 * @param n - Número de vértices
 * @returns Array de arestas [i, j] que formam spanning tree
 */
export function getMinimumSpanningChain(n: number): [number, number][] {
    if (n <= 1) return [];
    const chain: [number, number][] = [];
    for (let i = 0; i < n - 1; i++) {
        chain.push([i, i + 1]);
    }
    return chain;
}

/**
 * 4. Identifica "pontes" (bridge edges) — arestas cuja remoção desconecta o grafo
 * Referência: Algoritmo de Tarjan para bridge finding
 *
 * Uma aresta é ponte se removê-la aumenta o número de componentes.
 * Se uma comparação é ponte, o respondente NÃO PODE pulá-la.
 *
 * @param graph - Grafo de comparações
 * @returns Array de arestas que são pontes
 */
export function findBridgeEdges(graph: ComparisonGraph): [number, number][] {
    const { n, edges } = graph;
    // Otimização para grafos pequenos (n <= 20): força bruta é O(E * (V+E))
    // Para n=10, E=45, operações ~ 45 * 55 = 2475 (negligenciável)

    const bridges: [number, number][] = [];

    // Grau base de conectividade
    const baseConn = checkConnectivity(graph);
    // Se já desconectado, todas as arestas existentes que mantêm componentes juntos são "pontes" locais
    // Mas a definição estrita de ponte é AUMENTAR o número de componentes

    for (let i = 0; i < edges.length; i++) {
        // Remover aresta i
        const remainingEdges = [...edges.slice(0, i), ...edges.slice(i + 1)];
        const subGraph: ComparisonGraph = { n, edges: remainingEdges };

        // Verificar nova conectividade
        const subConn = checkConnectivity(subGraph);

        // Se número de componentes aumentou, é ponte
        if (subConn.componentCount > baseConn.componentCount) {
            bridges.push(edges[i]);
        }
    }

    return bridges;
}

/**
 * 5. Valida se uma comparação pode ser pulada
 * Chamada ANTES de permitir "Pular" no formulário.
 * 
 * Lógica:
 * - Se a comparação [i,j] NÃO está no grafo → trivialmente pode pular (já não existe)
 * - Se a comparação [i,j] ESTÁ no grafo → verificar se é ponte
 *   - Se é ponte E grafo ficaria com < n-1 arestas → NÃO pode pular
 *   - Se NÃO é ponte → pode pular
 *
 * @param graph - Grafo atual (comparações já realizadas + esta)
 * @param edge - Aresta que o respondente quer pular
 * @returns Validação com motivo
 */
export function validateSkip(graph: ComparisonGraph, edge: [number, number]): SkipValidation {
    const [u, v] = edge;

    // Verificar se aresta existe no grafo
    const edgeIndex = graph.edges.findIndex(e =>
        (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u)
    );

    // Se não existe, não há o que validar (já está "pulada" ou não feita)
    if (edgeIndex === -1) {
        const bridges = findBridgeEdges(graph);
        // Calcular quantas podem ser puladas
        // Total atual - (Mínimo n-1)
        const excess = Math.max(0, graph.edges.length - (graph.n - 1));
        return {
            canSkip: true,
            bridgeEdges: bridges,
            remainingSkippable: excess
        };
    }

    // Se existe, verificar se é ponte
    const bridges = findBridgeEdges(graph);
    const isBridge = bridges.some(b =>
        (b[0] === u && b[1] === v) || (b[0] === v && b[1] === u)
    );

    if (isBridge) {
        return {
            canSkip: false,
            reason: 'Esta comparação é uma ponte necessária para a conectividade do grafo (Teorema 1, Bozóki et al. 2009). Removê-la tornaria impossível calcular uma solução única.',
            bridgeEdges: bridges,
            remainingSkippable: Math.max(0, graph.edges.length - (graph.n - 1))
        };
    }

    return {
        canSkip: true,
        bridgeEdges: bridges,
        remainingSkippable: Math.max(0, graph.edges.length - (graph.n - 1))
    };
}

/**
 * 6. Constrói grafo a partir de array de judgments do Firestore
 * Mapeia o formato do Firestore para ComparisonGraph.
 *
 * @param items - Array de códigos dos itens (ex: ['B', 'O', 'C', 'R'])
 * @param judgments - Array de judgments do Firestore (com itemA, itemB, saatyValue)
 * @param group - Grupo a filtrar (ex: 'BOCR', 'B', 'O', 'C', 'R', 'B1', etc.)
 * @returns ComparisonGraph para o grupo especificado
 * 
 * Um judgment com saatyValue === null (ou campo skipped === true) 
 * NÃO gera aresta no grafo.
 */
export function buildGraphFromJudgments(
    items: string[],
    judgments: Array<{
        itemA: string;
        itemB: string;
        group: string;
        saatyValue: number | null;
        skipped?: boolean;
    }>,
    group: string
): ComparisonGraph {
    // 1. Mapa de índices
    const indexMap = new Map<string, number>();
    items.forEach((item, idx) => indexMap.set(item, idx));

    const edges: [number, number][] = [];

    // 2. Filtrar e mapear
    judgments.forEach(j => {
        // Filtrar por grupo
        if (j.group !== group) return;

        // Ignorar pulados ou nulos
        if (j.skipped || j.saatyValue === null) return;

        const idxA = indexMap.get(j.itemA);
        const idxB = indexMap.get(j.itemB);

        if (idxA !== undefined && idxB !== undefined && idxA !== idxB) {
            // Normalizar ordem [min, max]
            const u = Math.min(idxA, idxB);
            const v = Math.max(idxA, idxB);

            // Evitar duplicatas
            if (!edges.some(e => e[0] === u && e[1] === v)) {
                edges.push([u, v]);
            }
        }
    });

    return {
        n: items.length,
        edges
    };
}
