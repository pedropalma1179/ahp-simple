/**
 * jest.config.js
 *
 * Runner de testes do repositório. As dependências `jest` e `ts-jest` já
 * constavam em devDependencies, mas não havia configuração nem script, de modo
 * que `lib/__tests__/ahp-ipc.test.ts` e `lib/__tests__/graph-utils.test.ts`
 * nunca chegaram a rodar.
 *
 * Escopo deliberadamente restrito a `lib/`. As rotas de `app/api/` dependem do
 * Firestore e só entram na cobertura quando o motor for extraído (Fase 1.1).
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          resolveJsonModule: true,
          esModuleInterop: true,
          target: 'ES2019',
          strict: false,
          downlevelIteration: true,
        },
      },
    ],
  },
  collectCoverageFrom: ['lib/**/*.ts', '!lib/**/__tests__/**'],
  verbose: true,
};
