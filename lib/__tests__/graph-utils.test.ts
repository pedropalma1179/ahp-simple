import {
    checkConnectivity,
    getCompletenessMetrics,
    getMinimumSpanningChain,
    findBridgeEdges,
    validateSkip,
    buildGraphFromJudgments,
    ComparisonGraph
} from '../graph-utils';

describe('Graph Utils for IPC', () => {

    // Teste 1: Grafo completo (4 vértices, 6 arestas)
    test('Complete graph (4 vertices, 6 edges)', () => {
        // BOCR completo: todas as 6 comparações feitas
        const graph: ComparisonGraph = {
            n: 4,
            edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]
        };

        // Conectividade
        const result = checkConnectivity(graph);
        expect(result.isConnected).toBe(true);
        expect(result.componentCount).toBe(1);

        // Métricas
        const metrics = getCompletenessMetrics(graph);
        expect(metrics.classification).toBe('COMPLETE');
        expect(metrics.completenessRatio).toBe(1.0);
        expect(metrics.given).toBe(6);
        expect(metrics.possible).toBe(6);
    });

    // Teste 2: Spanning tree (4 vértices, 3 arestas — mínimo)
    test('Spanning tree (4 vertices, 3 edges - minimal)', () => {
        // BOCR mínimo: B-O, O-C, C-R (cadeia)
        const graph: ComparisonGraph = {
            n: 4,
            edges: [[0, 1], [1, 2], [2, 3]]
        };

        // Conectividade
        const result = checkConnectivity(graph);
        expect(result.isConnected).toBe(true);

        // Métricas
        const metrics = getCompletenessMetrics(graph);
        expect(metrics.classification).toBe('MINIMAL');
        expect(metrics.given).toBe(3);
        expect(metrics.minimum).toBe(3);

        // Todas as arestas são pontes em uma spanning tree
        const bridges = findBridgeEdges(graph);
        expect(bridges.length).toBe(3);
        // Verificar se as pontes são as arestas esperadas
        expect(bridges).toContainEqual([0, 1]);
        expect(bridges).toContainEqual([1, 2]);
        expect(bridges).toContainEqual([2, 3]);
    });

    // Teste 3: Grafo desconectado (4 vértices, 2 arestas)
    test('Disconnected graph (4 vertices, 2 edges)', () => {
        // B-O e C-R, mas nada conectando {B,O} a {C,R}
        const graph: ComparisonGraph = {
            n: 4,
            edges: [[0, 1], [2, 3]]
        };

        // Conectividade
        const result = checkConnectivity(graph);
        expect(result.isConnected).toBe(false);
        expect(result.componentCount).toBe(2);
        // Verificar componentes (ordem pode variar, mas conteúdo não)
        const compSizes = result.components.map(c => c.length).sort();
        expect(compSizes).toEqual([2, 2]);

        // Métricas
        const metrics = getCompletenessMetrics(graph);
        expect(metrics.classification).toBe('INSUFFICIENT');
    });

    // Teste 4: validateSkip — não pode pular ponte
    test('validateSkip - cannot skip bridge edge', () => {
        // Cadeia B-O-C-R
        const graph: ComparisonGraph = {
            n: 4,
            edges: [[0, 1], [1, 2], [2, 3]]
        };

        // Tentar pular O-C (índices 1-2)
        // O-C é uma ponte, pois removê-la desconecta o grafo
        const result = validateSkip(graph, [1, 2]);

        // Deveria identificar que a aresta existe no grafo e é uma ponte
        // Mas espere, validateSkip assume que a aresta *está* no grafo e queremos removê-la?
        // A especificação diz: "Se a comparação [i,j] ESTÁ no grafo -> verificar se é ponte".
        // Sim, a lógica implementada verifica se a aresta existe.

        // No entanto, na minha implementação de findBridgeEdges, eu itero sobre graph.edges.
        // Se [1,2] está em graph.edges, deve ser encontrada.

        // Vamos verificar se validateSkip chama findBridgeEdges corretamente.
        // O teste espera canSkip = false.

        // Mas wait, validateSkip precisa saber se a aresta sendo validada *está* no grafo passado.
        // Se o grafo passado é o "estado atual", e queremos saber se podemos pular *a próxima*,
        // e essa próxima *ainda não está* no grafo...
        // Ah, a especificação diz: "Grafo atual (comparações já realizadas + esta)".
        // Então o chamador deve simular adicionar a aresta ao grafo antes de chamar?
        // Ou o grafo já contém a aresta que o usuário quer "desfazer/pular"?

        // "Chamada ANTES de permitir 'Pular' no formulário."
        // Se o usuário está na tela de comparação X vs Y, e quer clicar "Pular".
        // Se ele ainda não respondeu, a aresta não está no grafo.
        // Se a aresta NÃO está no grafo, validateSkip retorna true (pode pular).

        // MAS, se o usuário *já respondeu* e quer *remover* a resposta (tornar skipped),
        // aí a aresta *está* no grafo.

        // O caso de teste do usuário diz: "Cadeia B-O-C-R: se pular O-C...".
        // Isso implica que O-C *já está* lá e queremos ver se podemos removê-la.
        // Então o grafo de entrada deve ter a aresta.

        expect(result.canSkip).toBe(false);
        expect(result.reason).toContain('ponte'); // deve mencionar ponte/conectividade
    });

    // Teste 5: validateSkip — pode pular aresta redundante
    test('validateSkip - can skip redundant edge', () => {
        // Grafo com ciclo: B-O, O-C, C-R, B-C (redundante)
        // 0-1, 1-2, 2-3, 0-2
        // 0-2 fecha um ciclo 0-1-2-0
        const graph: ComparisonGraph = {
            n: 4,
            edges: [[0, 1], [1, 2], [2, 3], [0, 2]]
        };

        // B-C é 0-2
        const result = validateSkip(graph, [0, 2]);
        expect(result.canSkip).toBe(true);
    });

    // Teste 6: buildGraphFromJudgments — com pulos
    test('buildGraphFromJudgments - handles skipped items', () => {
        const items = ['B', 'O', 'C', 'R'];
        const judgments = [
            { itemA: 'B', itemB: 'O', group: 'BOCR', saatyValue: 3, skipped: false },
            { itemA: 'B', itemB: 'C', group: 'BOCR', saatyValue: null, skipped: true }, // pulou
            { itemA: 'B', itemB: 'R', group: 'BOCR', saatyValue: 5, skipped: false },
            { itemA: 'O', itemB: 'C', group: 'BOCR', saatyValue: 2, skipped: false },
            { itemA: 'O', itemB: 'R', group: 'BOCR', saatyValue: null, skipped: true }, // pulou
            { itemA: 'C', itemB: 'R', group: 'BOCR', saatyValue: 7, skipped: false },
        ];

        const graph = buildGraphFromJudgments(items, judgments, 'BOCR');

        expect(graph.n).toBe(4);
        // 6 possíveis, 2 pulados = 4 arestas
        expect(graph.edges.length).toBe(4);

        // Verificar se as arestas corretas estão lá
        // B-O (0,1), B-R (0,3), O-C (1,2), C-R (2,3)
        const hasEdge = (u: number, v: number) =>
            graph.edges.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));

        expect(hasEdge(0, 1)).toBe(true);
        expect(hasEdge(0, 3)).toBe(true);
        expect(hasEdge(1, 2)).toBe(true);
        expect(hasEdge(2, 3)).toBe(true);

        const conn = checkConnectivity(graph);
        expect(conn.isConnected).toBe(true);
    });

    // Teste 7: Subcritérios (5 itens)
    test('Subcriteria chain (5 items)', () => {
        // 5 subcritérios, n=5
        // Spanning chain deve ter n-1 = 4 arestas
        const chain = getMinimumSpanningChain(5);

        expect(chain.length).toBe(4);
        expect(chain).toEqual([[0, 1], [1, 2], [2, 3], [3, 4]]);
    });

});
