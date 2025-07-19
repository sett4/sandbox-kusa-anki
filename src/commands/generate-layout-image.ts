import { Command } from 'commander';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { logger } from '../utils/logger';
import { JsonValidator } from '../utils/json-validator';
import { ImageProcessor } from '../utils/image-processor';
import { GenerateLayoutImageOptions, ImageProcessingResult, LayoutResult } from '../types/layout-types';

export function createGenerateLayoutImageCommand(): Command {
  const command = new Command('generate-layout-image');

  command
    .description('レイアウト解析結果を視覚的に確認できるPNG画像を生成します')
    .argument('<input>', 'PNGファイルまたはPNGファイルが格納されたディレクトリ')
    .option('--layout-dir <dir>', 'レイアウトJSONファイルの格納ディレクトリ')
    .option('--output-dir <dir>', '出力先ディレクトリ')
    .action(async (input: string, options) => {
      const generateOptions: GenerateLayoutImageOptions = {
        input,
        layoutDir: options.layoutDir,
        outputDir: options.outputDir,
      };

      try {
        await generateLayoutImage(generateOptions);
      } catch (error) {
        logger.error('Generate layout image command failed:', error);
        process.exit(1);
      }
    });

  return command;
}

async function generateLayoutImage(options: GenerateLayoutImageOptions): Promise<void> {
  logger.info('Starting generate-layout-image process');
  logger.info(`Input: ${options.input}`);
  logger.info(`Layout directory: ${options.layoutDir || 'same as input'}`);
  logger.info(`Output directory: ${options.outputDir || 'same as input'}`);

  // 入力パスの検証
  if (!existsSync(options.input)) {
    throw new Error(`Input path does not exist: ${options.input}`);
  }

  // PNGファイルの一覧を取得
  const pngFiles = getPngFiles(options.input);
  logger.info(`Found ${pngFiles.length} PNG files`);

  if (pngFiles.length === 0) {
    logger.warn('No PNG files found');
    return;
  }

  // 画像プロセッサを初期化
  const imageProcessor = new ImageProcessor();

  // 処理結果の追跡
  const results: ImageProcessingResult[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (const pngFile of pngFiles) {
    const pngPath = pngFile.fullPath;
    const pngFileName = pngFile.fileName;
    
    try {
      logger.info(`Processing ${pngFileName}...`);

      // ディレクトリ情報を取得
      const inputDir = statSync(options.input).isDirectory() ? options.input : dirname(options.input);
      const layoutDir = options.layoutDir || inputDir;
      const outputDir = options.outputDir || inputDir;

      // ファイルパスを構築
      const layoutPath = getLayoutFilePath(layoutDir, pngFileName);
      const outputPath = getOutputFilePath(outputDir, pngFileName);

      // レイアウトファイルの読み込み
      const { layoutResult, error, errorType } = loadLayoutFile(layoutPath);

      // 画像処理を実行
      await imageProcessor.processImage(
        pngPath,
        layoutResult,
        outputPath,
        error
      );

      const result: ImageProcessingResult = {
        success: !error,
        filename: pngFileName,
        outputPath,
        error,
        errorType,
      };

      results.push(result);

      if (error) {
        logger.warn(`Processed with error: ${pngFileName} -> ${basename(outputPath)}`);
        errorCount++;
      } else {
        logger.info(`Successfully processed: ${pngFileName} -> ${basename(outputPath)}`);
        processedCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process ${pngFileName}: ${errorMessage}`);

      results.push({
        success: false,
        filename: pngFileName,
        error: errorMessage,
        errorType: 'processing_error',
      });
      errorCount++;
    }
  }

  // 処理結果のサマリー
  logger.info('Generate-layout-image process completed');
  logger.info(`Total files: ${pngFiles.length}`);
  logger.info(`Successfully processed: ${processedCount}`);
  logger.info(`Processed with errors: ${errorCount}`);

  if (errorCount > 0) {
    logger.warn('Some files were processed with errors. Check the logs above for details.');
    
    // エラータイプ別の統計
    const errorStats = results
      .filter(r => !r.success)
      .reduce((acc, r) => {
        const type = r.errorType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    logger.info('Error breakdown:', errorStats);
  }
}

export interface PngFileInfo {
  fileName: string;
  fullPath: string;
}

export function filterPngFiles(files: string[]): string[] {
  return files.filter(file => {
    const ext = extname(file).toLowerCase();
    const name = basename(file, ext);
    return ext === '.png' && !name.endsWith('_layout');
  });
}

export function getPngFiles(inputPath: string): PngFileInfo[] {
  const stat = statSync(inputPath);

  if (stat.isFile()) {
    // 単一ファイルの場合
    if (extname(inputPath).toLowerCase() !== '.png') {
      throw new Error(`Input file is not a PNG: ${inputPath}`);
    }
    return [{
      fileName: basename(inputPath),
      fullPath: inputPath,
    }];
  } else if (stat.isDirectory()) {
    // ディレクトリの場合
    try {
      const files = readdirSync(inputPath);
      const filteredFiles = filterPngFiles(files);
      return filteredFiles.map(file => ({
        fileName: file,
        fullPath: join(inputPath, file),
      }));
    } catch (error) {
      throw new Error(`Failed to read directory ${inputPath}: ${error}`);
    }
  } else {
    throw new Error(`Input path is neither file nor directory: ${inputPath}`);
  }
}

function getLayoutFilePath(layoutDir: string, pngFileName: string): string {
  const baseName = basename(pngFileName, '.png');
  return join(layoutDir, `${baseName}_layout.json`);
}

function getOutputFilePath(outputDir: string, pngFileName: string): string {
  const baseName = basename(pngFileName, '.png');
  return join(outputDir, `${baseName}_layout.png`);
}

interface LoadLayoutResult {
  layoutResult: LayoutResult | null;
  error?: string;
  errorType?: 'json_missing' | 'json_invalid';
}

function loadLayoutFile(layoutPath: string): LoadLayoutResult {
  try {
    if (!existsSync(layoutPath)) {
      return {
        layoutResult: null,
        error: `Layout file not found: ${basename(layoutPath)}`,
        errorType: 'json_missing',
      };
    }

    // JSON読み込みとバリデーション
    if (!JsonValidator.validateExistingLayoutFile(layoutPath)) {
      return {
        layoutResult: null,
        error: `Invalid layout file: ${basename(layoutPath)}`,
        errorType: 'json_invalid',
      };
    }

    // ファイルを再読み込み（バリデーション済み）
    const content = readFileSync(layoutPath, 'utf8');
    const layoutResult = JSON.parse(content) as LayoutResult;

    return {
      layoutResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      layoutResult: null,
      error: `Failed to load layout file: ${errorMessage}`,
      errorType: 'json_invalid',
    };
  }
}