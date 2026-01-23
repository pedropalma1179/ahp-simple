# AHP-BOCR Peer Review API v6.5.0

**Complete manuscript validation system with benchmarks from peer-reviewed literature**

## 📊 Knowledge Base

Based on **5 peer-reviewed papers** with **961 total citations**:

1. **Wijnmalen (2007)** - 119 citations ⭐ **CRITICAL METHODOLOGY PAPER**
   - *"Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP–ANP: A critical validation"*
   - Mathematical and Computer Modelling 46 (2007) 892–905
   - **KEY FINDING:** Traditional BOCR synthesis methods are FLAWED due to incommensurability

2. **Demirtas & Ustun (2008)** - 310 citations
   - Supply chain / Supplier selection
   - ANP + Multi-Objective Mixed Integer Linear Programming

3. **Lee (2009)** - 305 citations
   - TFT-LCD backlight unit supplier selection
   - Fuzzy AHP + BOCR (37 criteria - most comprehensive)

4. **Lee et al. (2009)** - 232 citations
   - Wind farm selection in China
   - AHP + BOCR (perfect concordance across 5 methods)

5. **Petrillo et al. (2023)** - State-of-the-art review
   - Analyzed 181 BOCR papers from Scopus database
   - Identified top 10 most cited papers and research gaps

---

## 🚨 CRITICAL FINDINGS FROM WIJNMALEN (2007)

### ❌ **INCORRECT Methods (DO NOT USE)**

#### 1. Traditional Multiplicative

```
Formula: (B^wb * O^wo) / (C^wc * R^wr)
```

**Problems:**
- Weights as POWERS (not coefficients)
- Causes incommensurability
- Can suggest profitability when actually unprofitable
- **Evidence:** Wijnmalen (2007) Table 8 shows correct_ordering=NO, correct_profitability=NO

#### 2. Additive with Reciprocals

```
Formula: wb*B + wo*O + wc*(1/C) + wr*(1/R)
```

**Problems:**
- Reciprocals distort the scale
- Always produces positive values (cannot detect unprofitability)
- Does NOT always produce correct ordering
- **Evidence:** Wijnmalen (2007) Table 5 shows counterexample
- **Cited by:** Millet & Schoner (2005)

---

### ✅ **CORRECT Methods (MUST USE)**

#### 1. Revised Multiplicative (Quotient of Sums)

```
Formula: (sb*B + so*O) / (sc*C + sr*R)
```

**Where:**
```
sb = B_total / (B_total + O_total + C_total + R_total)
so = O_total / (B_total + O_total + C_total + R_total)
sc = C_total / (B_total + O_total + C_total + R_total)
sr = R_total / (B_total + O_total + C_total + R_total)
```

**Properties:**
- ✅ Always correct ordering
- ✅ Always correct profitability indication
- ✅ Break-even point = 1.0
- ✅ 100% validation match with monetary values (Wijnmalen 2007, Table 9)

#### 2. Additive with Subtraction

```
Formula: sb*B + so*O - sc*C - sr*R
```

**Properties:**
- ✅ Always correct ordering
- ✅ Always correct profitability indication
- ✅ Break-even point = 0.0
- ✅ Can show negative values (unprofitable alternatives)
- ✅ Net value interpretation

---

### 📐 Commensurability - THE CORE ISSUE

**Problem:**

Priorities from separate B, O, C, R hierarchies are **NOT commensurate**.

Each hierarchy normalizes to sum=1.0, but represents DIFFERENT absolute magnitudes.

**Example:**
```
Total Benefits = $4,000 → Normalized to 1.0
Total Costs = $8,000 → Normalized to 1.0

But $1 of benefit ≠ $1 of cost!
```

**Consequence:**

Synthesizing incommensurate priorities produces **meaningless or deceiving results**.

**Solution:**

Use **magnitude-based rescaling weights** to make priorities commensurate.

---

## 📊 Benchmarks Extracted

### 1. Structure

| Metric | Min | Max | Mean | Recommended |
|--------|-----|-----|------|-------------|
| **Total Criteria** | 4 | 37 | 16.75 | 10-20 |
| **Subcriteria** | 0 | 37 | - | 2-5 per criterion |

### 2. Concordance (Agreement across methods)

| Study | Methods Tested | Agreement Rate | Note |
|-------|---------------|----------------|------|
| Lee (2009) | 5 | **80%** | 4 of 5 agreed |
| Lee et al. (2009) | 5 | **100%** | Perfect concordance (rare!) |
| Wijnmalen (2007) - Traditional | 3 | **33%** | Only 1 of 3 correct |
| Wijnmalen (2007) - Revised | 2 | **100%** | Both correct methods agree |

**Benchmark:**
- Excellent: ≥80%
- Good: 60-79%
- Moderate: 40-59%
- Poor: <40%

### 3. Robustness (Gap between 1st and 2nd place)

| Study | % Difference | Level |
|-------|-------------|-------|
| Lee (2009) - TFT-LCD | 1.49% | Very close (low robustness) |
| Lee et al. (2009) - Wind | 2.33% | Close (moderate) |
| Lee et al. (2009) - Wind (mult.) | 8.54% | Clear winner (good) |

**Benchmark:**
- Very Robust: ≥10%
- Robust: 5-9.99%
- Moderate: 2-4.99%
- Weak: 0.5-1.99%
- Very Weak: <0.5%

### 4. Sample Size

| Study | N Experts | Assessment |
|-------|-----------|------------|
| Demirtas & Ustun (2008) | Not specified | - |
| Lee (2009) | 5 | Acceptable |
| Lee et al. (2009) | 11 | **Optimal** |

**Recommendation:**
- Minimum: 3
- Optimal: **5-11**
- > 15: Diminishing returns

### 5. BOCR Weight Distribution

| Context | B | O | C | R | Dominant |
|---------|---|---|---|---|----------|
| Manufacturing (Lee 2009) | 35.3% | 17.6% | **37.4%** | 9.7% | **Costs** |
| Energy (Lee et al. 2009) | **33.3%** | 21.7% | 25.3% | 19.8% | **Benefits** |

**Insight:** Costs dominate in manufacturing, Benefits dominate in energy/infrastructure projects.

### 6. Dominant Criteria (>20% global priority)

From Lee (2009) - TFT-LCD:
- On time delivery: 24.4%
- Order lead time: 22.0%
- Product price: **42.1%** (super-dominant)

From Lee et al. (2009) - Wind:
- Mean wind power density: **26.4%**
- Wind turbine cost: **56.0%** (extreme dominance)
- Concept conflict (stakeholder): **56.4%** (extreme dominance)

**Guideline:**
- 20-30%: Normal importance
- 30-50%: High importance
- \>50%: Super-dominant (verify not bias/missing criteria)

---

## 💻 API Usage

### Installation

```bash
npm install --save-dev typescript ts-node @types/node
```

### Basic Usage

```typescript
import { BOCRPeerReviewAPI, ManuscriptData } from './bocr-peer-review-api';

const api = new BOCRPeerReviewAPI();

const manuscriptData: ManuscriptData = {
  title: "Your Study Title",
  authors: ["Author 1", "Author 2"],
  application_area: "Your application area",
  
  total_criteria: 12,
  bocr_distribution: { B: 3, O: 3, C: 3, R: 3 },
  
  n_experts: 7,
  aggregation_method: "Geometric mean",
  
  bocr_weights: { B: 0.3, O: 0.2, C: 0.3, R: 0.2 },
  
  n_alternatives: 4,
  alternative_scores: {
    "Alt_A": { B: 0.25, O: 0.25, C: 0.25, R: 0.25 },
    // ... other alternatives
  },
  
  synthesis_method: 'multiplicative_revised',  // ✅ Use correct method!
  
  rescaling_weights: {  // ⚠️ MANDATORY for commensurability
    sb: 0.25,
    so: 0.25,
    sc: 0.25,
    sr: 0.25
  },
  
  final_ranking: ["Alt_A", "Alt_B", "Alt_C", "Alt_D"],
  
  consistency_ratios_reported: true,
  max_cr_value: 0.08
};

// Analyze
const result = await api.analyzeManuscript(manuscriptData);

// Generate report
const report = api.generateReport(result);
console.log(report);
```

### Running Demo

```bash
ts-node demo.ts
```

This will analyze 4 example manuscripts:
1. ✅ Lee et al. (2009) - Wind (GOOD example)
2. ✅ Lee (2009) - TFT-LCD (GOOD but complex)
3. ❌ Bad Traditional (CRITICAL FLAWS)
4. ❌ Bad Reciprocals (CRITICAL FLAWS)

---

## 📋 Validation Checklist

### ✅ Required

- [ ] Commensurability ensured through magnitude-based rescaling
- [ ] Correct formulas used (quotient of sums OR subtraction)
- [ ] Consistency ratios calculated and acceptable (CR < 0.10)
- [ ] Multiple methods tested for concordance
- [ ] Robustness assessed (1st vs 2nd place gap)
- [ ] Results validated with domain experts
- [ ] Sensitivity analysis performed on key criteria

### 🚩 Red Flags

- 🚨 Using traditional formulas without rescaling
- 🚨 Reciprocals used for costs/risks
- 🚨 Normalization applied after rescaling
- 🚨 No consistency checks performed
- 🚨 Single expert making all judgments
- 🚨 Results contradict obvious monetary analysis
- 🚨 SuperDecisions v1.6.0 or earlier used without verification

---

## 📚 References

### Core Methodology

```
Wijnmalen, D.J.D. (2007). Analysis of benefits, opportunities, costs, and 
risks (BOCR) with the AHP–ANP: A critical validation. Mathematical and 
Computer Modelling, 46, 892–905.
```

### Commensurability Theory

```
Wedley, W.C., Choo, E.U., & Schoner, B. (2001). Magnitude adjustment 
for AHP benefit/cost ratios. European Journal of Operational Research, 
133, 342–351.
```

### Applications

```
Lee, A.H.I., Chen, H.H., & Kang, H-Y. (2009). Multi-criteria decision 
making on strategic selection of wind farms. Renewable Energy, 34, 120–126.

Lee, A.H.I. (2009). A fuzzy supplier selection model with the consideration 
of benefits, opportunities, costs and risks. Expert Systems with Applications, 
36, 2879–2893.

Demirtas, E.A., & Üstün, O. (2008). An integrated multiobjective decision 
making process for supplier selection and order allocation. Omega, 36, 76–90.
```

### Literature Review

```
Petrillo, A., Salomon, V.A.P., & Tramarico, C.L. (2023). State-of-the-Art 
Review on the Analytic Hierarchy Process with Benefits, Opportunities, 
Costs, and Risks. Journal of Risk and Financial Management, 16, 372.
```

---

## 🎯 Key Takeaways

1. **Traditional BOCR methods are FLAWED** - Can produce wrong rankings and false profitability indications

2. **Commensurability is NON-NEGOTIABLE** - Without it, results are meaningless

3. **Always use magnitude-based rescaling** - Makes priorities from different hierarchies comparable

4. **Avoid reciprocals** - They distort scales and cannot detect unprofitability

5. **Quotient of sums preferred** - Preserves units, clearer interpretation

6. **100% concordance is achievable** - When using correct methods (Lee et al. 2009)

7. **Robustness matters** - Close decisions require sensitivity analysis

8. **Sample size 5-11 is optimal** - Balance between perspectives and coordination

---

## 📞 Support

For questions or issues:
- Review knowledge.ts for detailed benchmarks
- Check demo.ts for working examples
- Consult original papers for methodology details

---

## 📄 License

Knowledge base compiled from publicly available peer-reviewed literature.
API implementation © 2026

---

**Version:** 6.5.0  
**Last Updated:** January 2026  
**Status:** Production Ready ✅
