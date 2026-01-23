# Copilot Instructions: AHP-BOCR Peer Review System

**Version:** 6.5.0 | **Stack:** Next.js 14 + TypeScript + Firebase | **Domain:** Multi-Criteria Decision Analysis (MCDM)

## Project Overview

This is a **manuscript validation system** implementing the Analytic Hierarchy Process with Benefits-Opportunities-Costs-Risks (AHP-BOCR) framework, grounded in peer-reviewed literature (Wijnmalen 2007, Demirtas 2008, Lee 2009, Petrillo 2023 - 961 citations total).

**Core Purpose:** Aggregate expert judgments on research papers using rigorous BOCR synthesis to determine manuscript quality scores.

## Critical Business Logic: BOCR Synthesis Methods

### ⚠️ FOUNDATIONAL KNOWLEDGE - READ FIRST

The project implements **two correct synthesis formulas** from Wijnmalen (2007). This is **NOT generic AHP**—traditional BOCR methods are mathematically flawed.

**Incorrect Methods (NEVER USE):**
- Traditional Multiplicative: `(B^wb * O^wo) / (C^wc * R^wr)` — causes incommensurability
- Additive with Reciprocals: `wb*B + wo*O + wc*(1/C) + wr*(1/R)` — always positive, misses unprofitability

**Correct Methods (MUST USE):**

1. **Revised Multiplicative** (Quotient of Sums): `(sb*B + so*O) / (sc*C + sr*R)`
   - Weights rescaled: `sb = B_total / sum(all)`
   - Break-even point = 1.0
   - Reference: [app/api/calculate/route.ts](app/api/calculate/route.ts) lines 150–200

2. **Additive with Subtraction**: `sb*B + so*O - sc*C - sr*R`
   - Can show negative values (unprofitable)
   - Break-even point = 0.0
   - Reference: [app/api/calculate/route.ts](app/api/calculate/route.ts) lines 210–230

**Key Rule:** For Costs and Risks, LOWER values indicate BETTER performance. Never describe lower costs as "worse."

## Data Flow Architecture

```
Expert Evaluation → Firebase (responses/) → Aggregate (API) → BOCR Synthesis → Results Dashboard
     ↓                                              ↓
  [avaliacao/]                          [app/api/calculate/]
  Pairwise comparisons                   - Eigenvector calculation
  (20 subcriteria)                       - Consistency Ratio (CR)
  + BOCR weights                         - Geometric mean aggregation
```

### Collections in Firestore

- **projects**: Project metadata, alternatives, status
- **respondents**: Expert demographics, access codes
- **responses**: Individual expert judgments + timestamps
  - `judgments[]`: Pairwise comparisons for each merit (B, O, C, R) + BOCR level
  - `bocrConsistency`: CR (target ≤ 0.10)
  - `completedAt`: Timestamp (null if incomplete)

## Code Organization & Key Patterns

### 1. Backend API Routes

- **[app/api/calculate/route.ts](app/api/calculate/route.ts)** — Main calculation engine
  - Aggregates responses using geometric mean (Group Analytic Hierarchy Process)
  - Computes eigenvectors for priority weights
  - Calculates Consistency Ratio (RI table from Saaty 1980)
  - **Key function:** `aggregateMatrix()` uses geometric mean per Wijnmalen

- **[app/api/generate-academic/route.ts](app/api/generate-academic/route.ts)** — AI-powered manuscript section generation
  - Uses Anthropic Claude API
  - Generates "Results & Discussion" + "Managerial Implications" + "Conclusion"
  - Mandatory style: Omega/EJOR academic tone (no laudatory adjectives)
  - **Critical:** 4 decimal places for coefficients (e.g., 0.5523), 2 for percentages

- **[app/api/simulate/route.ts](app/api/simulate/route.ts)** — Synthetic expert generation
  - Creates realistic response patterns: consistent, moderate, biased_benefits, biased_costs, extreme, random
  - Used for testing robustness across response distributions

### 2. Frontend Components

- **[components/AIReviewCard.tsx](components/AIReviewCard.tsx)** — Quality assessment UI
  - Displays official values (diferença, concordancia, consistencia)
  - Filters responses by consistency (CR ≤ 0.10 → "Consistente")
  - Shows multiple synthesis methods for comparison

- **[components/QualityDashboard.tsx](components/QualityDashboard.tsx)** — Results aggregation
  - Exports analysis to Excel (xlsx)
  - Real vs. simulated response counts
  - CR statistics

### 3. Core Math Library

- **[lib/ahp.ts](lib/ahp.ts)** — AHP calculations
  - `buildMatrix()`: Converts pairwise judgments to comparison matrix
  - `calculatePriorityVector()`: Power method (100 iterations, ε=0.0001)
  - `calculateConsistency()`: Returns λ, CI, CR
  - `aggregateMatrices()`: Geometric mean of n matrices

- **[lib/data.ts](lib/data.ts)** — Type definitions
  - `BOCR_CRITERIA`: 4 merits, each with 5 subcriteria = 20 total
  - `Respondent`: Demographics, experience, role
  - `Project`: Alternatives, status, timestamps

## Development Workflows

### Build & Run
```bash
npm run dev        # Next.js dev server (http://localhost:3000)
npm run build      # Production build
npm run lint       # TypeScript + linter
```

### Adding New Features

**Database changes:** Update Firestore paths in components/routes + add types in [lib/data.ts](lib/data.ts)

**Calculation changes:** Modify [app/api/calculate/route.ts](app/api/calculate/route.ts) → test with [app/api/simulate/route.ts](app/api/simulate/route.ts)

**UI changes:** React Client Components (`'use client'`) in [components/](components/) or [app/](app/) pages

## Project-Specific Conventions

### BOCR Structure
- **Merits:** B (Benefits), O (Opportunities), C (Costs), R (Risks)
- **Subcriteria:** Each merit has exactly 5 subcriteria for Industry 4.0 decisions
- **Saaty Scale:** 1–9 with reciprocals (1/9 to 1)

### Response Quality Gates
- **Consistency Ratio (CR):** Must be ≤ 0.10 (10%) for valid response
- **Geometric Mean:** Used for aggregating multiple expert matrices (Demirtas 2008)
- **Missing data:** Incomplete responses excluded; only use `completedAt !== null`

### Numeric Formatting Rules
- **Weights & priorities:** 4 decimals (0.5523)
- **Percentages & CR:** 2 decimals (18.94%, 0.10)
- **Comparison values:** 1 decimal (e.g., 1.5, 0.7)

### Domain Language
Use MCDM terminology:
- "Consistency Ratio" not "consistency score"
- "Trade-off" for B/O vs C/R analysis
- "Priority weight" not "importance"
- "Pairwise comparison" not "ranking"
- "Incommensurability" when describing flawed traditional BOCR

## Integration Points

### Firebase
- Initialized in routes via `import { db } from '@/lib/firebase'`
- Always filter responses by `projectId` + check `completedAt` exists
- Use geometric mean for multi-expert aggregation

### Claude API (Anthropic)
- Endpoint: [app/api/generate-academic/route.ts](app/api/generate-academic/route.ts)
- Model: `claude-3-5-sonnet` (adjust if newer available)
- Input: Calculation results JSON + subcriteria metadata
- Output: 2500+ word academic text with citations

### Excel Export
- Library: `xlsx` (18.5+)
- Rows: Project metadata, BOCR weights, alternative scores, response details
- Used in [components/QualityDashboard.tsx](components/QualityDashboard.tsx)

## Common Pitfalls

| Issue | Fix |
|-------|-----|
| Response count mismatch | Check `completedAt` not null; exclude simulated responses for real-only counts |
| CR calculation wrong | Use RI table from Saaty; normalize eigenvector after power method |
| Weights sum ≠ 1.0 | Missing normalization; call `normalizeVector()` |
| Synthesis gives wrong ranking | Verify using Revised Multiplicative formula, not traditional |
| Demographic data missing | Check `respondents` collection; new fields should migrate safely |

## Key Files at a Glance

| Path | Purpose |
|------|---------|
| [README.md](README.md) | 5-paper knowledge base + correct BOCR formulas |
| [bocr-peer-review-api.ts](bocr-peer-review-api.ts) | Validation engine + quality benchmarks |
| [app/avaliacao/[projectId]/page.tsx](app/avaliacao/[projectId]/page.tsx) | Expert evaluation UI |
| [app/decisor/resultados/[projectId]/page.tsx](app/decisor/resultados/[projectId]/page.tsx) | Results dashboard |
| [knowledge.ts](knowledge.ts) | Academic references + BOCR knowledge base |

---

**Last Updated:** January 23, 2026  
**Contact:** Consult README.md for citation references
