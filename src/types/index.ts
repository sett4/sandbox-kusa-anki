export interface ExtractPageOptions {
  cdpUrl: string;
  destDir: string;
}

export interface ExtractLayoutOptions {
  pngDirectory: string;
}

export interface BuildDeckOptions {
  pngDirectory: string;
  layoutFile: string;
}

export interface KindlePageInfo {
  asin: string;
  pageNum: number;
  url: string;
}