import sharp from "sharp";
import { logger } from "./logger";
import { LayoutPattern, SplitResult, Area } from "../types/layout-types";
import { patterns } from "./pattern-matcher";

export class ImageSplitter {
  async splitByPattern(
    imagePath: string,
    pattern: LayoutPattern
  ): Promise<SplitResult[]> {
    try {
      logger.info(`Starting image splitting for pattern: ${pattern.code}`);

      // パターンに対応する分割ルールを取得

      const splitRule = patterns.find((rule) => rule.code === pattern.code);
      if (!splitRule) {
        throw new Error(`No split rule found for pattern: ${pattern.code}`);
      }

      const results: SplitResult[] = [];

      // 各ボックスを分割
      for (const box of pattern.boxes) {
        const splitResult = await this.splitBox(imagePath, box, splitRule);
        results.push(splitResult);
      }

      logger.info(
        `Image splitting completed: ${results.length} boxes processed`
      );
      return results;
    } catch (error) {
      logger.error("Image splitting failed:", error);
      throw error;
    }
  }

  private async splitBox(
    imagePath: string,
    box: Area,
    pattern: LayoutPattern
  ): Promise<SplitResult> {
    try {
      // 写真部分の座標を計算
      const photoArea: Area = {
        x: box.x + pattern.photoSection.x,
        y: box.y,
        width: pattern.photoSection.width,
        height: box.height,
      };

      // 説明部分の座標を計算
      const descriptionArea: Area = {
        x: box.x + pattern.descriptionSection.x,
        y: box.y,
        width: pattern.descriptionSection.width,
        height: box.height,
      };

      // 写真部分を切り出し
      const photoBuffer = await sharp(imagePath)
        .extract({
          left: photoArea.x,
          top: photoArea.y,
          width: photoArea.width,
          height: photoArea.height,
        })
        .png()
        .toBuffer();

      // 説明部分を切り出し
      const descriptionBuffer = await sharp(imagePath)
        .extract({
          left: descriptionArea.x,
          top: descriptionArea.y,
          width: descriptionArea.width,
          height: descriptionArea.height,
        })
        .png()
        .toBuffer();

      logger.debug(
        `Box split completed: photo=${photoArea.width}x${photoArea.height}, description=${descriptionArea.width}x${descriptionArea.height}`
      );

      return {
        box,
        photoArea,
        descriptionArea,
        photoBuffer,
        descriptionBuffer,
      };
    } catch (error) {
      throw new Error(`Failed to split box: ${error}`);
    }
  }

  async saveBufferAsFile(buffer: Buffer, outputPath: string): Promise<void> {
    try {
      await sharp(buffer).png().toFile(outputPath);
      logger.debug(`Buffer saved to: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to save buffer to file: ${error}`);
    }
  }
}
