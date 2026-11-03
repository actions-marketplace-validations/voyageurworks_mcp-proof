import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { testTimeout: 120_000, maxWorkers: 2, globalSetup: ["./test/globalSetup.ts"], exclude: ["dist/**", "node_modules/**", ".scratch/**"] },
});
