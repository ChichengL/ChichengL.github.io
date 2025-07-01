import { defineConfig } from "rspress/config";
import * as path from "path";

import mermaid from "rspress-plugin-mermaid";
import readingTime from "rspress-plugin-reading-time";
import katex from "rspress-plugin-katex";
import live2d from "rspress-plugin-live2d";
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
    lastUpdated: true,
    outlineTitle: "页面导航",
  },
  plugins: [
    mermaid(),
    readingTime(),
    katex(),
    live2d({
      models: [
        {
          path: "https://model.oml2d.com/bilibili-22/index.json",
          position: [0, 60],
          scale: 0.25,
          stageStyle: { height: 365 },
        },
      ],
    }),
    alignImage(),
    vercelAnalytics(),
    fileTree(),
    supersub(),
  ],
});
