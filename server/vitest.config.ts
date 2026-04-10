import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/test/**", "src/index.ts", "src/config/index.ts", "src/db/migrations/**", "src/db/schema.ts", "src/db/index.ts"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
    include: ["src/**/*.test.ts"],
  },
});
