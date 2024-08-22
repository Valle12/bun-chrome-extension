import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Bun Chrome Extension",
  description: "A VitePress Site",
  cleanUrls: true,
  lastUpdated: true,
  base: "/bun-chrome-extension/",
  themeConfig: {
    nav: [{ text: "Home", link: "/" }],
    sidebar: [
      {
        text: "Reference",
        items: [
          {
            text: "Quickstart",
            link: "/quickstart",
          },
          {
            text: "Config",
            link: "/config",
          },
          {
            text: "Manifest",
            link: "/manifest",
          },
          {
            text: "Usage",
            link: "/",
            base: "/usage",
            items: [
              {
                text: "Dev",
                link: "/dev",
              },
              {
                text: "Build",
                link: "/build",
              },
            ],
          },
          {
            text: "BCE",
            link: "/bce",
          },
        ],
      },
    ],
    outline: [2, 6],
    search: {
      provider: "local",
    },
  },
});
