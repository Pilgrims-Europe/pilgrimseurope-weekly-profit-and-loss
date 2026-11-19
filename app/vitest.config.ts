import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // `npm run test:coverage` (CI) fails if coverage falls below these numbers. They are just below
    // the coverage when they were set (lines 82.7 %, wpl.ts 96.8 %). Raise them when tests are added.
    coverage: {
      provider: 'v8',
      include: ['lib/**', 'app/api/**'],
      // lib/sar-sdk is a template copy of the SDK. The app imports the npm package.
      exclude: ['lib/sar-sdk/**'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 90,
        branches: 65,
        // All the app's SQL is in wpl.ts.
        'lib/wpl.ts': { lines: 95, functions: 95 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
