import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // The app serves Kerala hospitals and buckets predictions in IST. Pin the
    // runner's zone so date assertions don't depend on the developer's machine.
    env: { TZ: "Asia/Kolkata" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
