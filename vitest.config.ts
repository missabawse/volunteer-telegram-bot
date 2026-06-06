import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'development',
      PGLITE_STORAGE: 'memory',
    },
    setupFiles: ['./tests/setup.ts'],
    // Run tests in sequence to avoid PGlite memory issues
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'drizzle/',
        'tests/',
        '**/*.d.ts',
        'vitest.config.ts'
      ]
    }
  }
});
