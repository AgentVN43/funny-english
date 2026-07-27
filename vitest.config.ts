import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Cố định múi giờ để test định dạng ngày/giờ không phụ thuộc máy chạy.
// Dùng đúng múi của người dùng thật thay vì UTC.
process.env.TZ = "Asia/Ho_Chi_Minh";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "Asia/Ho_Chi_Minh" },
  },
});
