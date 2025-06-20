import { defineConfig } from "rspress/config";
import path from "path";

export default defineConfig({
  // 文档根目录
  root: "docs",
  globalStyles: path.resolve(__dirname, "./docs/public/public.css"),
});
