import type { BuildConfig } from "bun";

export type OnlyKnown<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : K]: T[K];
};

// Manifest
export type CleanManifest = OnlyKnown<chrome.runtime.ManifestV3>;

export type OmitManifest = Omit<
  CleanManifest,
  "content_scripts" | "icons" | "action"
>;

export type ContentScript = Omit<
  NonNullable<CleanManifest["content_scripts"]>[number],
  "js"
>;

export type CustomContentScript = ContentScript & {
  run_at?: "document_start" | "document_end" | "document_idle";
  matches?: string[] | ["<all_urls>"];
  ts?: string[];
};

export type Icons = Partial<{
  16: string;
  32: string;
  48: string;
  128: string;
  [key: string]: string;
}>;

export type Action = Omit<NonNullable<CleanManifest["action"]>, "default_icon">;

export type CustomAction = Action & {
  default_icon?: Icons | string;
};

export type FullManifest = OmitManifest & {
  content_scripts?: CustomContentScript[];
  icons?: Icons | string;
  action?: CustomAction;
};

export type Manifest = Omit<FullManifest, "manifest_version">;

export function defineManifest(manifest: Manifest): FullManifest {
  return {
    manifest_version: 3,
    ...manifest
  };
}

// BCE Config
export type BCEConfig = Omit<
  BuildConfig,
  | "entrypoints"
  | "target"
  | "format"
  | "splitting"
  | "plugins"
  | "external"
  | "packages"
  | "naming"
  | "root"
  | "publicPath"
  | "define"
  | "loader"
  | "conditions"
  | "ignoreDCEAnnotations"
  | "emitDCEAnnotations"
  | "bytecode"
  | "banner"
  | "footer"
  | "experimentalCss"
  | "env"
  | "drop"
  | "throw"
>;

export function defineConfig(config: BCEConfig): BCEConfig {
  return config;
}

// WebSocket
export type WebSocketType = "reload" | "close";

// Chrome Messaging
export type ChromeMessage = "activate"
