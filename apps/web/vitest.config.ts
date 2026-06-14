import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
})
