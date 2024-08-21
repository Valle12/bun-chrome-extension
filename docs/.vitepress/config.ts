import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Bun Chrome Extension",
  description: "A VitePress Site",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [{ text: "Home", link: "/" }],
    sidebar: [
      {
        text: "Quickstart",
        link: "/quickstart",
      },
      {
        text: "Config",
        link: "/config",
      },
    ],
  },
});
