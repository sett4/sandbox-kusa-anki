import { Command } from "commander";
import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
  writeFileSync,
} from "fs";
import { join, basename } from "path";
import { logger } from "../utils/logger";
import {
  GenerateApkgOptions,
  ApkgStatistics,
  ApkgProcessingResult,
} from "../types/apkg-types";
import { LayoutResult, Plant } from "../types/layout-types";
import AnkiExport from "anki-apkg-export";

export function createGenerateApkgCommand(): Command {
  const command = new Command("generate-apkg");

  command
    .description(
      "layout.jsonファイルから標準的なAnki Package (.apkg) ファイルを生成します"
    )
    .argument("<srcDirectory>", "処理対象のディレクトリパス")
    .argument("<apkgFile>", "出力するAPKGファイルのパス")
    .option("-d, --deck-name <name>", "デッキ名", "草木図鑑")
    .action(async (srcDirectory: string, apkgFile: string, options) => {
      const generateOptions: GenerateApkgOptions = {
        srcDirectory,
        apkgFile,
        deckName: options.deckName,
      };

      try {
        await generateApkg(generateOptions);
      } catch (error) {
        logger.error("Generate APKG command failed:", error);
        process.exit(1);
      }
    });

  return command;
}

async function generateApkg(options: GenerateApkgOptions): Promise<void> {
  logger.info("Starting generate-apkg process");
  logger.info(`Source directory: ${options.srcDirectory}`);
  logger.info(`Output APKG file: ${options.apkgFile}`);
  logger.info(`Deck name: ${options.deckName}`);

  // ディレクトリの存在確認
  if (!existsSync(options.srcDirectory)) {
    throw new Error(`Source directory does not exist: ${options.srcDirectory}`);
  }

  if (!statSync(options.srcDirectory).isDirectory()) {
    throw new Error(`Source path is not a directory: ${options.srcDirectory}`);
  }

  // layout.jsonファイルを検索
  const layoutFiles = findLayoutFiles(options.srcDirectory);
  logger.info(`Found ${layoutFiles.length} layout files`);

  if (layoutFiles.length === 0) {
    logger.warn("No layout files found");
    return;
  }

  // 統計情報の初期化
  const statistics: ApkgStatistics = {
    totalLayoutFiles: layoutFiles.length,
    totalCardsCreated: 0,
    totalErrors: 0,
    processedFiles: 0,
    skippedFiles: 0,
  };

  // Anki exportインスタンスの初期化
  const apkg = new AnkiExport(options.deckName || "草木図鑑");

  // 各layout.jsonファイルを処理
  for (const layoutFile of layoutFiles) {
    try {
      const result = await processLayoutFile(
        layoutFile,
        apkg,
        options.srcDirectory
      );

      if (result.success) {
        statistics.totalCardsCreated += result.cardsCreated;
        statistics.processedFiles++;
        logger.info(
          `Processed ${result.filename}: ${result.cardsCreated} cards created`
        );
      } else {
        statistics.totalErrors++;
        logger.error(`Failed to process ${result.filename}: ${result.error}`);
      }
    } catch (error) {
      statistics.totalErrors++;
      logger.error(`Error processing ${layoutFile}:`, error);
    }
  }

  // APKGファイルの保存
  try {
    const blob = await apkg.save();
    console.log(blob);
    writeFileSync(options.apkgFile, blob, "binary");
    logger.info(`APKG file saved: ${options.apkgFile}`);
  } catch (error) {
    throw new Error(`Failed to save APKG file: ${error}`);
  }

  // 処理結果のサマリー
  logger.info("Generate-apkg process completed");
  logger.info(`Total layout files: ${statistics.totalLayoutFiles}`);
  logger.info(`Processed files: ${statistics.processedFiles}`);
  logger.info(`Total cards created: ${statistics.totalCardsCreated}`);
  logger.info(`Errors: ${statistics.totalErrors}`);

  if (statistics.totalErrors > 0) {
    logger.warn(
      "Some files failed to process. Check the logs above for details."
    );
  }
}

function findLayoutFiles(directory: string): string[] {
  const files = readdirSync(directory);
  return files
    .filter((file) => file.endsWith("_layout.json"))
    .map((file) => join(directory, file));
}

async function processLayoutFile(
  layoutFilePath: string,
  apkg: AnkiExport,
  srcDirectory: string
): Promise<ApkgProcessingResult> {
  const filename = basename(layoutFilePath);

  try {
    // layout.jsonファイルの読み込み
    const layoutData: LayoutResult = JSON.parse(
      readFileSync(layoutFilePath, "utf8")
    );

    if (!layoutData.plants || !Array.isArray(layoutData.plants)) {
      return {
        success: false,
        filename,
        cardsCreated: 0,
        error: "Invalid layout data: plants array not found",
      };
    }

    // ベースファイル名の取得
    const baseName = basename(filename, "_layout.json");
    let cardsCreated = 0;

    // 各植物に対してカードを作成
    for (let index = 0; index < layoutData.plants.length; index++) {
      const plant = layoutData.plants[index];

      // 対応する画像ファイルのパスを構築
      const photoPath = join(srcDirectory, `${baseName}_${index}_photo.png`);
      const descriptionPath = join(
        srcDirectory,
        `${baseName}_${index}_description.png`
      );

      // 画像ファイルの存在確認
      if (!existsSync(photoPath)) {
        logger.warn(`Missing photo file: ${photoPath}`);
        continue;
      }

      if (!existsSync(descriptionPath)) {
        logger.warn(`Missing description file: ${descriptionPath}`);
        continue;
      }

      // Ankiカードの作成
      try {
        await createAnkiCard(
          apkg,
          plant,
          photoPath,
          descriptionPath,
          baseName,
          index
        );
        cardsCreated++;
      } catch (error) {
        logger.error(`Failed to create card for ${plant.name}:`, error);
      }
    }

    return {
      success: true,
      filename,
      cardsCreated,
    };
  } catch (error) {
    return {
      success: false,
      filename,
      cardsCreated: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createAnkiCard(
  apkg: AnkiExport,
  plant: Plant,
  photoPath: string,
  descriptionPath: string,
  baseName: string,
  index: number
): Promise<void> {
  // 画像ファイルの読み込み
  const photoBuffer = readFileSync(photoPath);
  const descriptionBuffer = readFileSync(descriptionPath);

  // メディアファイル名の生成
  const photoFileName = `${baseName}_${index}_photo.png`;
  const descriptionFileName = `${baseName}_${index}_description.png`;

  // メディアファイルをAPKGに追加
  apkg.addMedia(photoFileName, photoBuffer);
  apkg.addMedia(descriptionFileName, descriptionBuffer);

  // カードのHTML生成
  const frontHtml = `<img src="${photoFileName}" style="max-width: 100%; height: auto;" />`;

  const backHtml = `
    <img src="${descriptionFileName}" style="max-width: 100%; height: auto;" />
    <br><br>
    <div style="text-align: left; font-family: 'Noto Sans JP', sans-serif; font-size: 14px; line-height: 1.5;">
      ${formatDescriptionText(plant.descriptionText || "")}
    </div>
  `;

  // カードを追加
  apkg.addCard(frontHtml, backHtml);
}

function formatDescriptionText(text: string): string {
  if (!text || text.trim() === "") {
    return "";
  }

  // 改行を<br>タグに変換
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("<br>");
}
