import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    exclude: ["node_modules", "prisma/generated"],
    setupFiles: ["./test/setup.ts"],
    passWithNoTests: true,
    fileParallelism: false,
  },
});
