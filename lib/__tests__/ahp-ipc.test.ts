import {
    calculateGroupWeights,
    calculateAllWeights,
    calculatePartialCR,
    Judgment,
    WeightResult
} from '../ahp-ipc';

describe('AHP-IPC Engine', () => {

    // Teste 1: Matriz completa (fallback para eigenvector)
    test('Complete matrix (Eigenvector fallback)', () => {
        // Matriz consistente de Saaty: a_ij = w_i/w_j
        // w = [0.5, 0.25, 0.15, 0.10] normalizado aprox
        const judgments: Judgment[] = [
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 2, favors: 'A', rawSlider: -2 }, // B=2*O
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'C', saatyValue: 3.33, favors: 'A', rawSlider: -4 }, // B=3.33*C
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'R', saatyValue: 5, favors: 'A', rawSlider: -6 }, // B=5*R
            { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'C', saatyValue: 1.66, favors: 'A', rawSlider: -1 }, // O=1.66*C
            { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'R', saatyValue: 2.5, favors: 'A', rawSlider: -2 }, // O=2.5*R
            { type: 'bocr', group: 'BOCR', itemA: 'C', itemB: 'R', saatyValue: 1.5, favors: 'A', rawSlider: -1 }, // C=1.5*R
        ];
        // Ajustado valores para simplicidade: B > O > C > R
        // B=2O, O=1.5C, C=1.5R => B=2(1.5(1.5R))=4.5R (aprox 5)

        const result = calculateGroupWeights(['B', 'O', 'C', 'R'], judgments, 'BOCR');

        expect(result.method).toBe('EIGENVECTOR');
        expect(result.completeness.classification).toBe('COMPLETE');
        expect(result.cr).toBeLessThan(0.10); // Matriz consistente
        expect(result.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0);
        expect(result.weights[0]).toBeGreaterThan(result.weights[1]); // B > O
        expect(result.weights[1]).toBeGreaterThan(result.weights[2]); // O > C
        expect(result.weights[2]).toBeGreaterThan(result.weights[3]); // C > R
    });

    // Teste 2: Matriz incompleta com LLSM (4 de 6 comparações)
    test('Incomplete matrix with LLSM (4 of 6)', () => {
        const judgments: Judgment[] = [
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 3, favors: 'A', rawSlider: -2 },
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'C', saatyValue: null, favors: 'equal', rawSlider: 0, skipped: true }, // pulou
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'R', saatyValue: 7, favors: 'A', rawSlider: -6 },
            { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'C', saatyValue: 2, favors: 'A', rawSlider: -1 },
            { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'R', saatyValue: null, favors: 'equal', rawSlider: 0, skipped: true }, // pulou
            { type: 'bocr', group: 'BOCR', itemA: 'C', itemB: 'R', saatyValue: 2, favors: 'A', rawSlider: -1 },
        ];
        // Grafo: B-O, B-R, O-C, C-R (Conectado)

        const result = calculateGroupWeights(['B', 'O', 'C', 'R'], judgments, 'BOCR');

        expect(result.method).toBe('LLSM_IPC');
        expect(result.completeness.given).toBe(4);
        expect(result.completeness.possible).toBe(6);
        expect(result.isConnected).toBe(true);
        expect(result.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0);

        // Verificar consistência básica da ordem: B é o mais importante (3xO, 7xR)
        expect(result.weights[0]).toBeGreaterThan(result.weights[1]);
        expect(result.weights[0]).toBeGreaterThan(result.weights[3]);
    });

    // Teste 3: Grafo desconectado → erro
    test('Disconnected graph throws error', () => {
        const judgments: Judgment[] = [
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 3, favors: 'A', rawSlider: -2 },
            // Faltam conexões entre {B,O} e {C,R}
            { type: 'bocr', group: 'BOCR', itemA: 'C', itemB: 'R', saatyValue: 2, favors: 'A', rawSlider: -1 },
        ];

        expect(() => calculateGroupWeights(['B', 'O', 'C', 'R'], judgments, 'BOCR'))
            .toThrow(/conectado|connected/i);
    });

    // Teste 4: Alternativas (trivial — 2 itens, 1 comparação)
    test('Alternatives trivial case (2 items)', () => {
        const judgments: Judgment[] = [
            { type: 'alternatives', group: 'B1', itemA: 'A1', itemB: 'A2', saatyValue: 5, favors: 'A', rawSlider: -4 },
        ];

        const result = calculateGroupWeights(['A1', 'A2'], judgments, 'B1');

        expect(result.method).toBe('EIGENVECTOR');
        expect(result.weights[0]).toBeGreaterThan(result.weights[1]);
        expect(result.weights[0] + result.weights[1]).toBeCloseTo(1.0);
        // Para n=2 com 1 comparação, CR deve ser 0
        expect(result.cr).toBe(0);
    });

    // Teste 5: calculateAllWeights (mocks partial structure)
    test('calculateAllWeights handles disconnected groups gracefully', () => {
        const judgments: Judgment[] = [
            // BOCR - Conectado
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 1, favors: 'equal', rawSlider: 0 },
            { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'C', saatyValue: 1, favors: 'equal', rawSlider: 0 },
            { type: 'bocr', group: 'BOCR', itemA: 'C', itemB: 'R', saatyValue: 1, favors: 'equal', rawSlider: 0 },
            // MAGNITUDE - Desconectado (apenas 1 julgamento para 4 itens)
            { type: 'magnitude', group: 'MAGNITUDE', itemA: 'B', itemB: 'O', saatyValue: 1, favors: 'equal', rawSlider: 0 }
        ];

        const result = calculateAllWeights(judgments, ['A1', 'A2']);

        expect(result.hasDisconnectedGroups).toBe(true);
        // MAGNITUDE deve estar na lista de desconectados
        expect(result.disconnectedGroups).toContain('MAGNITUDE');

        // BOCR deve ter sido calculado
        expect(result.bocrWeights.isConnected).toBe(true);
        expect(result.bocrWeights.completeness.classification).not.toBe('INSUFFICIENT');
    });

    // Teste 6: calculatePartialCR — feedback em tempo real
    test('calculatePartialCR real-time feedback', () => {
        // Com 3 de 6 comparações (spanning tree)
        const partial: Judgment[] = [
            { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 3, favors: 'A', rawSlider: -2 },
            { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'C', saatyValue: 2, favors: 'A', rawSlider: -1 },
            { type: 'bocr', group: 'BOCR', itemA: 'C', itemB: 'R', saatyValue: 2, favors: 'A', rawSlider: -1 },
        ];
        const result = calculatePartialCR(['B', 'O', 'C', 'R'], partial, 'BOCR');

        expect(result.isConnected).toBe(true);
        expect(result.completeness).toBe(0.5); // 3/6
        expect(result.comparisonsLeft).toBe(3);

        // CR deve ser calculado (e provavelmente aceitável para dados consistentes)
        expect(typeof result.cr).toBe('number');
        expect(result.cr).toBeLessThan(0.15); // Pode ser um pouco alto por ser incompleto, mas calculável
    });

});
