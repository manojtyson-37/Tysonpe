import { defineConfig } from "vitest/config";
import path from "node:path";
import { TEST_DB_URL } from "./src/test/db-path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./src/test/global-setup.ts"],
    env: {
      DATABASE_URL: TEST_DB_URL,
      SESSION_SECRET: "test-secret-test-secret-test-secret-123",
      PAYMENTS_MODE: "mock",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      RAZORPAY_WEBHOOK_SECRET: "",
      EASEBUZZ_KEY: "",
      EASEBUZZ_SALT: "",
      PAYMENTS_PROVIDER: "",
    },
    fileParallelism: false,
  },
});
