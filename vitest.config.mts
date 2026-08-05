import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Two things vitest can't infer on its own: the `@/` path alias tsconfig
 * declares, and the JSX transform (tsconfig says `preserve` because Next
 * compiles JSX itself — the test runner has to be told to actually do it, or
 * the newsletter email can't be imported and rendered).
 *
 * `.mts` rather than `.ts` only so the config loads as ESM without a warning;
 * the package is CommonJS for Next's sake.
 *
 * Tests stay pure-function only: no database, no network, no setup file.
 */
export default defineConfig({
  oxc: { jsx: 'react-jsx' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
  },
})
