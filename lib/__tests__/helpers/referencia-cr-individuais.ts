/**
 * lib/__tests__/helpers/referencia-cr-individuais.ts
 *
 * **A tabela de referência dos CRs individuais**, copiada À MÃO de `docs/referencia-cr-individuais.md`, seção 2 (computada em 09/09/2026
 * pelo motor unificado a partir dos 864 julgamentos de `fixtures/panel-2026.json`). Valores em PORCENTAGEM, com duas casas; as vírgulas do
 * documento viram ponto. ⚠ É o ORÁCULO dos testes do Ajuste 1: não é calculada por nenhum módulo do repositório, e os testes a comparam com o
 * que o módulo de consistência individual recalcula dos julgamentos.
 */

export type LinhaDeReferencia = {
  BOCR: number;
  MAGNITUDE: number;
  'SUB-B': number;
  'SUB-O': number;
  'SUB-C': number;
  'SUB-R': number;
  medio: number;
  governante: number;
  matriz: string;
};

/** Tabela 2 de `docs/referencia-cr-individuais.md`, em %, copiada à mão. Ordem do documento: por CR governante decrescente. */
export const REFERENCIA: Record<string, LinhaDeReferencia> = {
  R03: { BOCR: 27.21, MAGNITUDE: 109.27, 'SUB-B': 7.18, 'SUB-O': 0.0, 'SUB-C': 13.11, 'SUB-R': 17.36, medio: 29.02, governante: 109.27, matriz: 'MAGNITUDE' },
  R05: { BOCR: 19.96, MAGNITUDE: 52.31, 'SUB-B': 46.58, 'SUB-O': 26.43, 'SUB-C': 63.59, 'SUB-R': 57.2, medio: 44.34, governante: 63.59, matriz: 'SUB-C' },
  R04: { BOCR: 48.02, MAGNITUDE: 59.03, 'SUB-B': 7.8, 'SUB-O': 9.44, 'SUB-C': 18.71, 'SUB-R': 10.35, medio: 25.56, governante: 59.03, matriz: 'MAGNITUDE' },
  R06: { BOCR: 46.1, MAGNITUDE: 19.32, 'SUB-B': 17.23, 'SUB-O': 28.47, 'SUB-C': 30.08, 'SUB-R': 27.71, medio: 28.15, governante: 46.1, matriz: 'BOCR' },
  R02: { BOCR: 21.69, MAGNITUDE: 18.76, 'SUB-B': 9.07, 'SUB-O': 37.47, 'SUB-C': 37.47, 'SUB-R': 26.13, medio: 25.1, governante: 37.47, matriz: 'SUB-O' },
  R09: { BOCR: 25.97, MAGNITUDE: 31.58, 'SUB-B': 0.0, 'SUB-O': 0.0, 'SUB-C': 9.68, 'SUB-R': 18.65, medio: 14.31, governante: 31.58, matriz: 'MAGNITUDE' },
  R10: { BOCR: 18.0, MAGNITUDE: 21.99, 'SUB-B': 7.52, 'SUB-O': 8.8, 'SUB-C': 26.34, 'SUB-R': 3.08, medio: 14.29, governante: 26.34, matriz: 'SUB-C' },
  R12: { BOCR: 6.94, MAGNITUDE: 6.25, 'SUB-B': 0.0, 'SUB-O': 3.23, 'SUB-C': 25.25, 'SUB-R': 13.11, medio: 9.13, governante: 25.25, matriz: 'SUB-C' },
  R07: { BOCR: 9.36, MAGNITUDE: 25.19, 'SUB-B': 19.6, 'SUB-O': 12.08, 'SUB-C': 9.56, 'SUB-R': 15.85, medio: 15.28, governante: 25.19, matriz: 'MAGNITUDE' },
  R11: { BOCR: 8.45, MAGNITUDE: 14.41, 'SUB-B': 5.22, 'SUB-O': 11.14, 'SUB-C': 18.88, 'SUB-R': 24.02, medio: 13.68, governante: 24.02, matriz: 'SUB-R' },
  R08: { BOCR: 19.62, MAGNITUDE: 13.43, 'SUB-B': 22.09, 'SUB-O': 5.31, 'SUB-C': 23.44, 'SUB-R': 10.27, medio: 15.69, governante: 23.44, matriz: 'SUB-C' },
  R01: { BOCR: 1.21, MAGNITUDE: 5.72, 'SUB-B': 8.45, 'SUB-O': 0.3, 'SUB-C': 11.39, 'SUB-R': 0.51, medio: 4.6, governante: 11.39, matriz: 'SUB-C' },
};
