export interface GenerateApkgOptions {
  srcDirectory: string;
  apkgFile: string;
  deckName?: string;
}

export interface ApkgProcessingResult {
  success: boolean;
  filename: string;
  cardsCreated: number;
  error?: string;
}

export interface ApkgStatistics {
  totalLayoutFiles: number;
  totalCardsCreated: number;
  totalErrors: number;
  processedFiles: number;
  skippedFiles: number;
}

export interface PlantCard {
  name: string;
  photoPath: string;
  descriptionPath: string;
  descriptionText: string;
}

export interface LayoutFileInfo {
  filePath: string;
  baseName: string;
  plants: PlantCard[];
}