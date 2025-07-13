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