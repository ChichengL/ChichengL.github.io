import { defineConfig } from "rspress/config";
import path from "path";

export default defineConfig({
  // 文档根目录
  root: "docs",
  globalStyles: path.resolve(__dirname, "./docs/public/public.scss"),
  logo: "https://avatars.githubusercontent.com/u/118503661?v=4",
  icon: "https://avatars.githubusercontent.com/u/118503661?v=4",
  themeConfig: {
    lastUpdated: true,
  },
});
