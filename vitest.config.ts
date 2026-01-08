import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      // Test helpers for TAP-style assertions
      { find: '#test-helpers', replacement: path.resolve(__dirname, 'tests/vitest-tap.ts') },
    ],
  },
  test: {
    include: [
      'src/**/*.spec.ts',
      'tests/**/*.spec.ts',
    ],
    environment: 'node',
  },
})
