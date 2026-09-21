import path from "path";
import { defineConfig } from "vitest/config";

// Unit tests for pure logic in lib/. Tests live next to the code as *.test.ts.
export default defineConfig({
    resolve: {
        alias: { "@": path.resolve(__dirname) },
    },
    test: {
        include: ["lib/**/*.test.ts"],
        environment: "node",
    },
});
