type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type OnlyKnown<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : K]: T[K];
};
export type CleanManifest = OnlyKnown<chrome.runtime.ManifestV3>;
export type ContentScript = Omit<
  NonNullable<CleanManifest["content_scripts"]>[number],
  "js"
>;
export type OmitManifest = Omit<CleanManifest, "content_scripts">;
export type CustomContentScript = ContentScript & {
  run_at?: "document_start" | "document_end" | "document_idle";
  matches?: string[] | ["<all_urls>"];
  ts?: string[];
};
export type FullManifest = OmitManifest & {
  content_scripts?: CustomContentScript[];
};
export type Manifest = Omit<FullManifest, "manifest_version">;

export type HTMLType = {
  originalURL: string;
  distURL?: string;
  property: "action.default_popup" | "options_page" | "options_ui.page";
  resolvedScripts?: string[];
  scripts?: string[];
};

export type Attributes = {
  src: string;
};

export type Properties = {
  "background.service_worker"?: boolean;
  "content_scripts.ts"?: boolean;
  "action.default_popup"?: boolean;
  options_page?: boolean;
  "options_ui.page"?: boolean;
};
