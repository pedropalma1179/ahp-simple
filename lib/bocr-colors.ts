// lib/bocr-colors.ts
/**
 * Cores BOCR do Design System v2.1
 * Padrão científico: Verde, Âmbar, Vermelho, Laranja (ISO Orange)
 * 
 * Uso:
 * - Gráficos Plotly/Recharts
 * - Cards e badges
 * - Visualizações customizadas
 */

// ============================================================
// CORES PRINCIPAIS BOCR
// ============================================================

export const BOCR_COLORS = {
  benefits: {
    main: '#10B981',      // Verde Emerald 500
    light: '#4ADE80',     // Verde claro (dark mode)
    lighter: '#D1FAE5',   // Verde muito claro
    bg: '#F0FDF4',        // Background verde
    text: '#047857',      // Texto sobre fundo claro
  },
  opportunities: {
    main: '#F59E0B',      // Âmbar 500
    light: '#FBBF24',     // Âmbar claro (dark mode)
    lighter: '#FDE68A',   // Âmbar muito claro
    bg: '#FFFBEB',        // Background âmbar
    text: '#B45309',      // Texto sobre fundo claro
  },
  costs: {
    main: '#EF4444',      // Vermelho 500
    light: '#F87171',     // Vermelho claro (dark mode)
    lighter: '#FECACA',   // Vermelho muito claro
    bg: '#FEF2F2',        // Background vermelho
    text: '#B91C1C',      // Texto sobre fundo claro
  },
  risks: {
    main: '#F97316',      // Laranja 500 (ISO Orange)
    light: '#FB923C',     // Laranja claro (dark mode)
    lighter: '#FED7AA',   // Laranja muito claro
    bg: '#FFF7ED',        // Background laranja
    text: '#C2410C',      // Texto sobre fundo claro
  },
} as const;

// ============================================================
// ARRAYS ORDENADOS (para gráficos)
// ============================================================

/**
 * Array de cores principais na ordem BOCR
 * Uso: gráficos Plotly, Recharts, SVG customizado
 */
export const BOCR_COLORS_ARRAY = [
  BOCR_COLORS.benefits.main,
  BOCR_COLORS.opportunities.main,
  BOCR_COLORS.costs.main,
  BOCR_COLORS.risks.main,
] as const;

/**
 * Array de cores de fundo na ordem BOCR
 * Uso: cards, tooltips, highlights
 */
export const BOCR_BG_ARRAY = [
  BOCR_COLORS.benefits.bg,
  BOCR_COLORS.opportunities.bg,
  BOCR_COLORS.costs.bg,
  BOCR_COLORS.risks.bg,
] as const;

/**
 * Array de cores de texto na ordem BOCR
 * Uso: texto sobre fundos claros
 */
export const BOCR_TEXT_ARRAY = [
  BOCR_COLORS.benefits.text,
  BOCR_COLORS.opportunities.text,
  BOCR_COLORS.costs.text,
  BOCR_COLORS.risks.text,
] as const;

// ============================================================
// LABELS E ÍCONES
// ============================================================

export const BOCR_LABELS = {
  B: 'Benefícios',
  O: 'Oportunidades',
  C: 'Custos',
  R: 'Riscos',
} as const;

export const BOCR_LABELS_FULL = {
  benefits: 'Benefícios',
  opportunities: 'Oportunidades',
  costs: 'Custos',
  risks: 'Riscos',
} as const;

export const BOCR_ICONS = {
  B: '📈',
  O: '💡',
  C: '💰',
  R: '⚠️',
} as const;

export const BOCR_ICONS_FULL = {
  benefits: '📈',
  opportunities: '💡',
  costs: '💰',
  risks: '⚠️',
} as const;

export const BOCR_DESCRIPTIONS = {
  benefits: 'Ganhos imediatos e tangíveis',
  opportunities: 'Potencial estratégico futuro',
  costs: 'Investimentos necessários',
  risks: 'Incertezas identificadas',
} as const;

// ============================================================
// HELPERS PARA GRÁFICOS
// ============================================================

/**
 * Retorna cor BOCR baseada no índice (0-3)
 */
export function getBocrColor(index: number, variant: 'main' | 'light' | 'bg' = 'main'): string {
  const keys = ['benefits', 'opportunities', 'costs', 'risks'] as const;
  const key = keys[index];
  return key ? BOCR_COLORS[key][variant] : BOCR_COLORS.benefits[variant];
}

/**
 * Retorna label BOCR baseada no índice (0-3)
 */
export function getBocrLabel(index: number): string {
  const labels = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
  return labels[index] || 'Desconhecido';
}

/**
 * Retorna ícone BOCR baseado no índice (0-3)
 */
export function getBocrIcon(index: number): string {
  const icons = ['📈', '💡', '💰', '⚠️'];
  return icons[index] || '❓';
}

/**
 * Converte array de pesos [B,O,C,R] em dados para gráfico
 */
export function bocrWeightsToChartData(weights: number[]) {
  return [
    { 
      name: 'Benefícios', 
      value: (weights[0] || 0) * 100, 
      fill: BOCR_COLORS.benefits.main,
      icon: '📈'
    },
    { 
      name: 'Oportunidades', 
      value: (weights[1] || 0) * 100, 
      fill: BOCR_COLORS.opportunities.main,
      icon: '💡'
    },
    { 
      name: 'Custos', 
      value: (weights[2] || 0) * 100, 
      fill: BOCR_COLORS.costs.main,
      icon: '💰'
    },
    { 
      name: 'Riscos', 
      value: (weights[3] || 0) * 100, 
      fill: BOCR_COLORS.risks.main,
      icon: '⚠️'
    },
  ];
}

// ============================================================
// CONFIGURAÇÃO PLOTLY
// ============================================================

/**
 * Layout padrão para gráficos Plotly com suporte a tema
 */
export function getPlotlyLayout(isDark: boolean = false) {
  return {
    paper_bgcolor: isDark ? '#0F172A' : '#FFFFFF',
    plot_bgcolor: isDark ? '#1E293B' : '#F9FAFB',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: isDark ? '#F1F5F9' : '#1F2937',
      size: 12,
    },
    margin: { t: 40, r: 20, b: 40, l: 60 },
    showlegend: true,
    legend: {
      bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      bordercolor: isDark ? '#334155' : '#E5E7EB',
      borderwidth: 1,
    },
    xaxis: {
      gridcolor: isDark ? '#334155' : '#E5E7EB',
      zerolinecolor: isDark ? '#475569' : '#D1D5DB',
    },
    yaxis: {
      gridcolor: isDark ? '#334155' : '#E5E7EB',
      zerolinecolor: isDark ? '#475569' : '#D1D5DB',
    },
  };
}

/**
 * Config padrão para gráficos Plotly
 */
export const PLOTLY_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'grafico-bocr',
    height: 1200,
    width: 1600,
    scale: 2,
  },
  locale: 'pt-BR',
} as const;

// ============================================================
// TIPOS TYPESCRIPT
// ============================================================

export type BOCRMerit = 'benefits' | 'opportunities' | 'costs' | 'risks';
export type BOCRIndex = 0 | 1 | 2 | 3;
export type BOCRLetter = 'B' | 'O' | 'C' | 'R';

export interface BOCRWeights {
  benefits: number;
  opportunities: number;
  costs: number;
  risks: number;
}

export interface BOCRChartData {
  name: string;
  value: number;
  fill: string;
  icon: string;
}
