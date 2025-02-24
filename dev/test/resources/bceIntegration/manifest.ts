import { defineManifest } from "../../../types";

export const manifest = defineManifest({
  name: "Test",
  version: "0.0.1",
  background: {
    service_worker: "src/background.ts",
  },
  content_scripts: [
    {
      ts: ["src/solace.ts"],
    },
  ],
});
