export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Plant {
  name: string;
  photoAreas: Area[];
  descriptionAreas: Area[];
  descriptionText: string;
}

export interface LayoutResult {
  page: string;
  plants: Plant[];
}

export interface ExtractLayoutOptions {
  pngDirectory: string;
  retryCount?: number;
  rateLimit?: number; // milliseconds between API calls
}

export interface ProcessingResult {
  success: boolean;
  filename: string;
  error?: string;
  skipped?: boolean;
}

export interface GenerateLayoutImageOptions {
  input: string; // file or directory path
  layoutDir?: string; // layout JSON files directory (default: same as input)
  outputDir?: string; // output directory (default: same as input)
}

export interface ImageProcessingResult {
  success: boolean;
  filename: string;
  outputPath?: string;
  error?: string;
  errorType?:
    | "json_missing"
    | "json_invalid"
    | "image_error"
    | "processing_error";
}

export interface LayoutPattern {
  code: string;
  boxes: Area[];
  photoSection: { x: number; width: number };
  descriptionSection: { x: number; width: number };
}

export interface SplitResult {
  box: Area;
  photoArea: Area;
  descriptionArea: Area;
  photoBuffer: Buffer;
  descriptionBuffer: Buffer;
}

export interface OCRResult {
  fullText: string;
  plantName: string;
}
