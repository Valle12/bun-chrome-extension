type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
type OnlyKnown<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : K]: T[K];
};
type CleanManifest = OnlyKnown<chrome.runtime.ManifestV3>;
type ContentScript = Omit<
  NonNullable<CleanManifest["content_scripts"]>[number],
  "js"
>;
type OmitManifest = Omit<CleanManifest, "content_scripts">;
type CustomContentScript = ContentScript & {
  run_at?: "document_start" | "document_end" | "document_idle";
  matches?: string[] | ["<all_urls>"];
  ts?: string[];
};
export type FullManifest = OmitManifest & {
  content_scripts?: CustomContentScript[];
};
export type Manifest = Omit<FullManifest, "manifest_version">;
