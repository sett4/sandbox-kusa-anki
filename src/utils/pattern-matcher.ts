import sharp from "sharp";
import { logger } from "./logger";
import { LayoutPattern, Area } from "../types/layout-types";

export class PatternMatcher {
  async matchPattern(imagePath: string): Promise<LayoutPattern | null> {
    try {
      logger.info(`Starting pattern matching for: ${imagePath}`);

      // エッジ検出を実行
      const edges = await this.detectEdges(imagePath);
      const metadata = await sharp(imagePath).metadata();

      // 各パターンとのマッチング度を計算
      const scores: { pattern: LayoutPattern; score: number }[] = [];

      for (const pattern of patterns) {
        const score = await this.calculatePatternScore(
          { edges, metadata },
          pattern
        );
        scores.push({ pattern, score });
        logger.info(`Pattern ${pattern.code}: score = ${score}`);
      }

      // 最低スコアのパターンを選択（エッジが少ない = 空白領域に適切にマッチ）
      scores.sort((a, b) => a.score - b.score);
      const bestMatch = scores[0];

      // 閾値チェック（スコアが高すぎる場合は null を返す）
      const threshold = 0.05;
      if (bestMatch.score > threshold) {
        logger.warn(
          `No pattern matched below threshold ${threshold}. Best score: ${bestMatch.score}`
        );
        return null;
      }

      logger.info(
        `Pattern matched: ${bestMatch.pattern.code} (score: ${bestMatch.score})`
      );
      return bestMatch.pattern;
    } catch (error) {
      logger.error("Pattern matching failed:", error);
      return null;
    }
  }

  private async detectEdges(imagePath: string): Promise<Buffer> {
    try {
      // Sobelフィルタでエッジ検出
      // const sobelKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];

      const edges = await sharp(imagePath)
        .greyscale()
        // .convolve({
        // width: 3,
        // height: 3,
        // kernel: sobelKernel,
        // })
        .negate()
        .raw()
        .toBuffer();

      return edges;
    } catch (error) {
      throw new Error(`Edge detection failed: ${error}`);
    }
  }

  private async calculatePatternScore(
    params: { edges: Buffer; metadata: sharp.Metadata },
    pattern: LayoutPattern
  ): Promise<number> {
    try {
      // 画像サイズを取得
      const { metadata, edges } = params;

      if (!metadata.width || !metadata.height) {
        throw new Error("Could not get image dimensions");
      }

      let totalScore = 0;
      let boxCount = 0;

      // 各ボックスの境界線スコアを計算
      for (const box of pattern.boxes) {
        const boxScore = this.calculateBoxBoundaryScore(
          edges,
          box,
          metadata.width,
          metadata.height
        );
        totalScore += boxScore;
        boxCount++;
      }

      return boxCount > 0 ? totalScore / boxCount : 0;
    } catch (error) {
      logger.error("Pattern score calculation failed:", error);
      return 0;
    }
  }

  private calculateBoxBoundaryScore(
    edges: Buffer,
    box: Area,
    imageWidth: number,
    imageHeight: number
  ): number {
    // 境界線上のエッジピクセル密度を計算
    let edgePixelCount = 0;
    let totalPixelCount = 0;

    // 上下の境界線をチェック
    for (let x = box.x; x < box.x + box.width && x < imageWidth; x++) {
      // 上の境界線
      if (box.y >= 0 && box.y < imageHeight) {
        const topIndex = box.y * imageWidth + x;
        if (topIndex < edges.length) {
          if (edges[topIndex] > 10) edgePixelCount++; // 閾値10でエッジ判定
          totalPixelCount++;
        }
      }

      // 下の境界線
      const bottomY = box.y + box.height - 1;
      if (bottomY >= 0 && bottomY < imageHeight) {
        const bottomIndex = bottomY * imageWidth + x;
        if (bottomIndex < edges.length) {
          if (edges[bottomIndex] > 10) edgePixelCount++;
          totalPixelCount++;
        }
      }
    }

    // 左右の境界線をチェック
    for (let y = box.y; y < box.y + box.height && y < imageHeight; y++) {
      // 左の境界線
      if (box.x >= 0 && box.x < imageWidth) {
        const leftIndex = y * imageWidth + box.x;
        if (leftIndex < edges.length) {
          if (edges[leftIndex] > 10) edgePixelCount++;
          totalPixelCount++;
        }
      }

      // 右の境界線
      const rightX = box.x + box.width - 1;
      if (rightX >= 0 && rightX < imageWidth) {
        const rightIndex = y * imageWidth + rightX;
        if (rightIndex < edges.length) {
          if (edges[rightIndex] > 10) edgePixelCount++;
          totalPixelCount++;
        }
      }
    }

    return totalPixelCount > 0 ? edgePixelCount / totalPixelCount : 0;
  }
}

export const patterns: LayoutPattern[] = [
  {
    code: "ODD_3ROWS",
    boxes: [
      { x: 225 + 15, y: 119, width: 1110, height: 567 },
      { x: 225 + 15, y: 702, width: 1110, height: 577 },
      { x: 225 + 15, y: 1298, width: 1110, height: 573 },
    ],
    photoSection: { x: 628 - 20, width: 482 + 20 },
    descriptionSection: { x: 0, width: 628 - 20 },
  },
  {
    code: "EVEN_3ROWS",
    boxes: [
      { x: 288 + 20, y: 83 + 30, width: 1096, height: 577 },
      { x: 288 + 20, y: 678 + 30, width: 1096, height: 569 },
      { x: 288 + 20, y: 1267 + 30, width: 1096, height: 569 },
    ],
    photoSection: { x: 0, width: 463 + 20 },
    descriptionSection: { x: 463 + 20, width: 633 - 20 },
  },
  {
    code: "ODD_2ROWS",
    boxes: [
      { x: 215 + 15, y: 90 + 25, width: 1096, height: 843 },
      { x: 215 + 15, y: 979 + 25, width: 1096, height: 843 },
    ],
    photoSection: { x: 628 + 10, width: 468 - 10 },
    descriptionSection: { x: 0, width: 628 + 10 },
  },
];
