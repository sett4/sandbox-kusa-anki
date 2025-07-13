export interface ExtractPageOptions {
  cdpUrl: string;
  destDir: string;
  maxPages?: number;
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