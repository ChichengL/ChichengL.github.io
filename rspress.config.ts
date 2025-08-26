import { defineConfig } from "rspress/config";
import * as path from "path";

import mermaid from "rspress-plugin-mermaid";
import readingTime from "rspress-plugin-reading-time";
import katex from "rspress-plugin-katex";
import alignImage from "rspress-plugin-align-image";
import vercelAnalytics from "rspress-plugin-vercel-analytics";
import fileTree from "rspress-plugin-file-tree";
import supersub from "rspress-plugin-supersub";
export default defineConfig({
  // 文档根目录
  root: path.join(__dirname, "docs"),

  globalStyles: path.resolve(__dirname, "./docs/public/public.scss"),
  logo: "https://avatars.githubusercontent.com/u/118503661?v=4",
  icon: "https://avatars.githubusercontent.com/u/118503661?v=4",
  themeConfig: {
    outlineTitle: "页面导航",
  },
  plugins: [
    mermaid(),
    readingTime(),
    katex(),
    alignImage(),
    vercelAnalytics(),
    fileTree(),
    supersub(),
  ],
});
