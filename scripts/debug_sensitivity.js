
const SENSITIVITY_THRESHOLDS = {
    robust: 50,
    moderate: 20,
    sensitive: 10,
    critical: 0
};

function calculateSensitivity(
    alternatives,
    personalWeights,
    altScoresByMerit
) {
    const meritNames = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
    const results = [];

    // Mock getWinner: score = b*B + o*O - c*C - r*R (Subtractive)
    // Simplified for test
    const getWinner = (testWeights) => {
        const [b, o, c, r] = testWeights;

        const scores = alternatives.map(alt => {
            const B = altScoresByMerit[alt.code].B;
            const O = altScoresByMerit[alt.code].O;
            const C = altScoresByMerit[alt.code].C;
            const R = altScoresByMerit[alt.code].R;
            const score = b * B + o * O - c * C - r * R;
            return { code: alt.code, score };
        });

        scores.sort((a, b) => b.score - a.score);
        return scores[0].code;
    };

    const currentWinner = getWinner(personalWeights);
    console.log(`Current Winner (weights ${personalWeights}): ${currentWinner}`);

    personalWeights.forEach((weight, meritIdx) => {
        const merit = meritNames[meritIdx];
        // Function to make test weights
        const makeTestWeights = (targetWeight) => {
            const remaining = 1 - targetWeight;
            const otherWeightsSum = personalWeights.reduce((sum, w, i) =>
                i !== meritIdx ? sum + w : sum, 0
            ) || 1;

            return personalWeights.map((w, i) => {
                if (i === meritIdx) return targetWeight;
                return remaining > 0 ? (w / otherWeightsSum) * remaining : 0;
            });
        };

        const winnerAt0 = getWinner(makeTestWeights(0));
        const winnerAt100 = getWinner(makeTestWeights(1));

        let inflectionPoint = null;
        let newWinner = null;

        if (winnerAt0 !== winnerAt100 || winnerAt0 !== currentWinner) {
            let low = 0;
            let high = 100;

            while (high - low > 1) {
                const mid = Math.floor((low + high) / 2);
                const weights = makeTestWeights(mid / 100);
                const winnerAtMid = getWinner(weights);

                if (winnerAtMid === currentWinner) {
                    // Logic in source:
                    // if (winnerAtMid === currentWinner) low = mid;
                    // else high = mid;  --> This searches for UPPER flip?
                    // If winnerAt0 != currentWinner, current is NOT at 0.
                    // But if Current IS at 0 (weight 0), then winnerAt0 == currentWinner.
                    // So this block only runs if winnerAt100 != currentWinner.
                    low = mid;
                } else {
                    high = mid;
                    newWinner = winnerAtMid;
                }
            }
            inflectionPoint = high;
        }

        console.log(`Merit: ${merit}, Weight: ${weight}, Inflection: ${inflectionPoint}%`);
    });
}

// TEST CASE 1: Cost is 0, but Critical
// A: High Benefit, High Cost
// B: Low Benefit, Low Cost
// If Cost is considered (C>0), A loses (because High Cost is bad).
// If Cost is ignored (C=0), A wins.
const alts = [{ code: 'A' }, { code: 'B' }];
const scores = {
    'A': { B: 0.9, O: 0.5, C: 0.9, R: 0.5 }, // A likes to spend money
    'B': { B: 0.5, O: 0.5, C: 0.1, R: 0.5 }  // B is cheap
};

// Current weights: Ignore Cost
const weights = [0.5, 0.0, 0.0, 0.5]; // B=0.5, R=0.5. C=0.
// Formula: 0.5*B - 0.5*R.
// A: 0.5*0.9 - 0.5*0.5 = 0.45 - 0.25 = 0.20
// B: 0.5*0.5 - 0.5*0.5 = 0.25 - 0.25 = 0.00
// A wins.

// If C increases...
// Test C=1 (100%).
// A: -0.9. B: -0.1.
// B wins (less negative).
// So there is a flip.

console.log('--- Running Simulation ---');
calculateSensitivity(alts, weights, scores);
