import { Command } from "commander";
import { readdirSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";
import { config } from "dotenv";
import { logger } from "../utils/logger";
import { GeminiClient } from "../utils/gemini-client";
import { JsonValidator } from "../utils/json-validator";
import { RateLimiter } from "../utils/rate-limiter";
import { ExtractLayoutOptions, ProcessingResult } from "../types/layout-types";

config(); // .env ファイルを読み込み

export function createExtractLayoutCommand(): Command {
  const command = new Command("extract-layout");

  command
    .description(
      "PNGファイルのレイアウト解析を行い、草木の写真と説明文の領域を抽出します"
    )
    .argument("<pngDirectory>", "PNGファイルが格納されたディレクトリ")
    .option("-r, --retry <count>", "リトライ回数", "3")
    .option("-i, --interval <ms>", "API呼び出し間隔(ミリ秒)", "2000")
    .action(async (pngDirectory: string, options) => {
      const extractOptions: ExtractLayoutOptions = {
        pngDirectory,
        retryCount: parseInt(options.retry),
        rateLimit: parseInt(options.interval),
      };

      try {
        await extractLayout(extractOptions);
      } catch (error) {
        logger.error("Extract layout command failed:", error);
        process.exit(1);
      }
    });

  return command;
}

async function extractLayout(options: ExtractLayoutOptions): Promise<void> {
  logger.info("Starting extract-layout process");
  logger.info(`Input directory: ${options.pngDirectory}`);
  logger.info(`Retry count: ${options.retryCount}`);
  logger.info(`Rate limit: ${options.rateLimit}ms`);

  // Gemini API キーの確認
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  // クライアント初期化
  const geminiClient = new GeminiClient(apiKey);
  const rateLimiter = new RateLimiter(options.rateLimit);

  // PNGファイルの取得
  const pngFiles = getPngFiles(options.pngDirectory);
  logger.info(`Found ${pngFiles.length} PNG files`);

  if (pngFiles.length === 0) {
    logger.warn("No PNG files found");
    return;
  }

  // 処理結果の追跡
  const results: ProcessingResult[] = [];
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const pngFile of pngFiles) {
    const pngPath = join(options.pngDirectory, pngFile);
    const layoutPath = getLayoutFilePath(options.pngDirectory, pngFile);

    try {
      // 既存ファイルのチェック
      if (JsonValidator.validateExistingLayoutFile(layoutPath)) {
        logger.info(`Skipping ${pngFile} - valid layout file already exists`);
        results.push({
          success: true,
          filename: pngFile,
          skipped: true,
        });
        skippedCount++;
        continue;
      }

      // レート制限の適用
      await rateLimiter.waitIfNeeded();

      // レイアウト解析の実行
      const result = await processWithRetry(
        () => geminiClient.analyzeLayout(pngPath),
        options.retryCount || 3,
        pngFile
      );

      // バリデーション
      if (!JsonValidator.validateLayoutResult(result)) {
        throw new Error("Generated layout data failed validation");
      }

      // 結果の保存
      writeFileSync(layoutPath, JSON.stringify(result, null, 2), "utf8");

      logger.info(
        `Successfully processed ${pngFile} -> ${basename(layoutPath)}`
      );
      results.push({
        success: true,
        filename: pngFile,
      });
      processedCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process ${pngFile}: ${errorMessage}`);

      results.push({
        success: false,
        filename: pngFile,
        error: errorMessage,
      });
      errorCount++;
    }
  }

  // 処理結果のサマリー
  logger.info("Extract-layout process completed");
  logger.info(`Total files: ${pngFiles.length}`);
  logger.info(`Processed: ${processedCount}`);
  logger.info(`Skipped: ${skippedCount}`);
  logger.info(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    logger.warn(
      "Some files failed to process. Check the logs above for details."
    );
  }
}

function getPngFiles(directory: string): string[] {
  try {
    const files = readdirSync(directory);
    return files.filter((file) => extname(file).toLowerCase() === ".png");
  } catch (error) {
    throw new Error(`Failed to read directory ${directory}: ${error}`);
  }
}

function getLayoutFilePath(directory: string, pngFileName: string): string {
  const baseName = basename(pngFileName, ".png");
  return join(directory, `${baseName}_layout.json`);
}

async function processWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  filename: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000); // exponential backoff
        logger.warn(
          `Attempt ${attempt} failed for ${filename}, retrying in ${delay}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
