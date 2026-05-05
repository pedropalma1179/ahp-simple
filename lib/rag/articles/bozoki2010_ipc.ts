/**
 * Article Extraction: S. Bozóki, J. Fülöp and L. Rónyai (2010)
 * "On Optimal Completion of Incomplete Pairwise Comparison Matrices"
 *
 * Extracted on: 2026-05-05
 * Extraction prompt version: v4.0
 */

import type { ArticleExtraction } from '../types';

const article: ArticleExtraction = {
  id: "bozoki2010_ipc",
  citation: {
    abnt: "BOZÓKI, Sándor; FÜLÖP, János; RÓNYAI, Lajos. On optimal completion of incomplete pairwise comparison matrices. Mathematical and Computer Modelling, v. 52, n. 1-2, p. 318-333, 2010.",
    bibtex: "@article{bozoki2010optimal,\n  title={On optimal completion of incomplete pairwise comparison matrices},\n  author={Bozóki, Sándor and Fülöp, János and Rónyai, Lajos},\n  journal={Mathematical and Computer Modelling},\n  volume={52},\n  number={1-2},\n  pages={318--333},\n  year={2010},\n  publisher={Elsevier}\n}"
  },
  doi: "10.1016/j.mcm.2010.02.047",
  type: "methodological",
  metadata: {
    year: 2010,
    venue: "Mathematical and Computer Modelling",
    domain: "Multi-Attribute Decision Making / IPC"
  },
  thresholds: [],
  formulas: [
    {
      id: "incomplete_matrix_definition",
      label: "Incomplete Pairwise Comparison Matrix",
      latex: "A(\\mathbf{x}) = A(x_1, x_2, \\ldots, x_d)",
      description: "An incomplete pairwise comparison matrix where d missing entries (above diagonal) are parameterized by variables x_i > 0. Reciprocals 1/x_i appear below diagonal.",
      variables: {
        "A": "n×n incomplete pairwise comparison matrix",
        "x_i": "Positive variable for the i-th missing entry above diagonal",
        "d": "Number of missing entries above diagonal",
        "n": "Order of the matrix"
      },
      conditions: "All diagonal entries are 1; reciprocity is preserved between known entries; total number of missing entries is 2d (d above + d below).",
      evidence: {
        page: 2256,
        locator_type: "equation",
        locator_id: "Section II",
        quote: "Variables x_1, x_2, …, x_d are introduced for the missing elements in the upper triangular part of A"
      }
    },
    {
      id: "eigenvector_minimization",
      label: "Eigenvalue Minimization for IPC",
      latex: "\\min \\{ \\lambda_{max}(A(\\mathbf{x})) \\mid \\mathbf{x} > 0 \\}",
      description: "Generalization of the Eigenvector Method to incomplete matrices: find values of missing entries x that minimize the principal eigenvalue of A(x).",
      variables: {
        "\\lambda_{max}(A(\\mathbf{x}))": "Maximum eigenvalue of A as a function of the missing entries x",
        "\\mathbf{x}": "Vector of missing entry values, x > 0"
      },
      conditions: "Solution exists and is unique if and only if the graph G associated with A is connected (Theorem 1).",
      evidence: {
        page: 2256,
        locator_type: "equation",
        locator_id: "Eq. (5)",
        quote: "min { lambda_max(A(x)) | x > 0 }"
      }
    },
    {
      id: "llsm_incomplete",
      label: "LLSM for Incomplete Matrices",
      latex: "\\min \\sum_{e(i,j) \\in E} [\\log(a_{ij} w_j / w_i)]^2 \\text{ s.t. } \\sum w_i = 1, w_i > 0",
      description: "Logarithmic Least Squares Method generalized to incomplete matrices: minimize log-squared error only over edges (known entries) of graph G.",
      variables: {
        "a_{ij}": "Known entry of incomplete matrix A",
        "w_i, w_j": "Priority weights to be estimated",
        "E": "Edge set of graph G associated with A"
      },
      conditions: "Solution exists and is unique if and only if graph G is connected (Theorem 3). For complete matrices, reduces to geometric mean of rows.",
      evidence: {
        page: 2256,
        locator_type: "equation",
        locator_id: "Eq. (6)",
        quote: "min sum [log(a_{ij} w_j /w_i)]^2"
      }
    },
    {
      id: "graph_representation",
      label: "Graph Representation of IPC Matrix",
      latex: "G = (V, E), \\quad V = \\{1, 2, \\ldots, n\\}, \\quad E = \\{e(i,j) \\mid a_{ij}, a_{ji} \\text{ given, } i \\neq j\\}",
      description: "Undirected graph G associates vertices to alternatives and edges to known pairwise comparisons. Missing comparisons correspond to absent edges.",
      variables: {
        "V": "Vertex set (one per alternative)",
        "E": "Edge set (one per known pairwise comparison)",
        "G": "Undirected graph (V, E)",
        "n": "Order of the matrix"
      },
      conditions: "Connectivity of G is the central structural property. Disconnected G means some alternatives cannot be compared even transitively.",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Section II Methodology",
        quote: "the vertices correspond to the objects to compare and E = the undirected edges correspond to the matrix elements"
      }
    }
  ],
  tables_figures: [],
  empirical_data: {
    n_respondents: null,
    aggregation: null,
    n_alternatives: null,
    n_criteria: { total: null, B: null, O: null, C: null, R: null },
    bocr_weights: null,
    scores_by_method: null,
    rankings_by_method: null,
    concordance: null,
    sensitivity: null,
    cr_values: null,
    weight_ratio_max_min: null
  },
  key_claims: [
    {
      claim: "The optimal solution of the eigenvalue minimization problem for IPC is unique if and only if the graph associated with the matrix is connected.",
      verbatim_quote: "The optimal solution of the problem (5) is unique if and only if the graph corresponding to the incomplete pairwise comparison matrix is connected",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Theorem 1",
        quote: "The optimal solution of the problem (5) is unique if and only if the graph is connected"
      },
      usable_as: "definition"
    },
    {
      claim: "The optimal solution of the incomplete LLSM problem is unique if and only if the graph G associated with the matrix is connected.",
      verbatim_quote: "The optimal solution of the incomplete LLSM problem (6) is unique if and only if graph corresponding to the incomplete pairwise comparison matrix is connected",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Theorem 3",
        quote: "The optimal solution of the incomplete LLSM problem (6) is unique if and only if graph is connected"
      },
      usable_as: "definition"
    },
    {
      claim: "Connectivity of the graph corresponds to the existence of a comparison chain (direct or indirect) between any two alternatives.",
      verbatim_quote: "two criteria, not compared yet, can be in indirect relation, through further criteria and direct relations",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Section II",
        quote: "two criteria, not compared yet, can be in indirect relation, through further criteria and direct relations"
      },
      usable_as: "recommendation"
    },
    {
      claim: "The eigenvalue function lambda_max(A(x)) is non-convex in x, but becomes convex under exponential parameterization x = exp(t).",
      verbatim_quote: "The non-convex function x → λmax(D(x)) is plotted in Fig. 2. However, by using the exponential scaling",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Section III Remark",
        quote: "the non-convex function becomes a convex function by using the exponential scaling"
      },
      usable_as: "definition"
    },
    {
      claim: "When the graph is not connected, the optimal solutions form an (s-1)-dimensional affine set, where s is the number of connected components.",
      verbatim_quote: "the optimal solutions constitute an (s-1)-dimensional affine set, where s is the number of the connected components",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Theorem 2",
        quote: "the optimal solutions constitute an (s-1)-dimensional affine set, where s is the number of connected components"
      },
      usable_as: "limitation"
    },
    {
      claim: "For complete pairwise comparison matrices, the LLSM solution coincides with the geometric mean of rows.",
      verbatim_quote: "In the case of a complete pairwise comparison matrix, the solution of (6) results in the well-known geometrical mean",
      evidence: {
        page: 2257,
        locator_type: "section",
        locator_id: "Theorem 3 Remark",
        quote: "In the case of a complete pairwise comparison matrix, the solution of (6) results in the well-known geometrical mean"
      },
      usable_as: "definition"
    }
  ],
  limitations: [
    "When the graph corresponding to the incomplete matrix is not connected, the optimal solution is not unique, forming an affine set of solutions.",
    "The non-convexity of lambda_max(A(x)) in the original parameterization requires exponential scaling x = exp(t) for convex optimization.",
    "The minimum number of comparisons required for connectivity is (n-1) — fewer comparisons leave the graph disconnected and the priorities not uniquely determined."
  ],
  recommendations: [
    "Always verify graph connectivity before applying IPC methods. A connected graph is the necessary and sufficient condition for unique priorities.",
    "When using IPC, ensure at least (n-1) comparisons are provided to span the spanning tree of the graph.",
    "For incomplete pairwise comparison matrices, apply the generalized eigenvector method (Eq. 5) or LLSM (Eq. 6) and verify convergence."
  ],
  cites: [
    "harker1987_incomplete"
  ],
  cited_by_context: {
    harker1987_incomplete: "Cites Harker (1987) Math Modelling 9, 837-848 as the seminal paper introducing IPC matrices in AHP — the foundation upon which Bozoki et al. extend with rigorous uniqueness conditions."
  },
  notes: [
    "ID 'bozoki2010_ipc' refers to the canonical journal version: Bozóki, Fülöp, Rónyai (2010) Math. Comput. Modelling 52(1-2), 318-333. The PDF in the project knowledge is the IEEE 2009 conference version (Proceedings of 2009 IEEE IEEM, 'Incomplete Pairwise Comparison Matrices in Multi-Attribute Decision Making'), which is a shorter presentation of the same theorems.",
    "Page numbers in evidence (2256-2257) refer to the IEEE 2009 conference proceedings. Equivalent content appears in pages 318-333 of the MCM 2010 paper.",
    "Reference [1] in the IEEE 2009 paper is the Working Paper 2009-1 by the same authors, which became the published MCM 2010 paper.",
    "The paper cites Aupetit & Genest (1993), Crawford & Williams (1985), de Jong (1984), Harker (1987), Kingman (1961), Kwiesielewicz (1996, 2003), Luenberger & Ye (2008), Perron (1907), Saaty (1980), Shiraishi et al. (1998, 2002), van Uden (2002). Of these, only harker1987_incomplete is in the RAG.",
    "Theorem 1 establishes existence and uniqueness for the eigenvector method generalization. Theorem 3 establishes the same for LLSM. Theorem 2 describes the structure of solutions when the graph is disconnected.",
    "The convergence problem (5) was first studied by Shiraishi, Obata & Daigo (1998); Bozóki et al. provide the rigorous uniqueness proof and connectivity condition.",
    "DOI 10.1016/j.mcm.2010.02.047 verified for the MCM 2010 canonical version."
  ]
};

export default article;
