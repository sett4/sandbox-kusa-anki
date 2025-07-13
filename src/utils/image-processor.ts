import sharp from "sharp";
import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";
import { LayoutResult, Area, Plant } from "../types/layout-types";
import { logger } from "./logger";

export interface DrawingOptions {
  photoAreaColor: string;
  descriptionAreaColor: string;
  lineWidth: number;
  labelFontSize: number;
  labelFont: string;
  labelColor: string;
  labelBackgroundColor: string;
  errorBackgroundColor: string;
  errorTextColor: string;
}

export class ImageProcessor {
  private options: DrawingOptions;

  constructor(options?: Partial<DrawingOptions>) {
    this.options = {
      photoAreaColor: "#00FF00",
      descriptionAreaColor: "#0000FF",
      lineWidth: 3,
      labelFontSize: 24,
      labelFont: "Arial Bold",
      labelColor: "#000000",
      labelBackgroundColor: "rgba(255, 255, 255, 0.8)",
      errorBackgroundColor: "rgba(255, 0, 0, 0.8)",
      errorTextColor: "#FFFFFF",
      ...options,
    };
  }

  async processImage(
    imagePath: string,
    layoutResult: LayoutResult | null,
    outputPath: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      // 元画像の読み込み
      const image = await loadImage(imagePath);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      // 元画像を描画
      ctx.drawImage(image, 0, 0);

      if (errorMessage) {
        // エラーメッセージをオーバーレイ
        this.drawErrorMessage(ctx, errorMessage, image.width, image.height);
      } else if (layoutResult) {
        // レイアウト結果を描画
        this.drawLayoutResult(ctx, layoutResult);
      }

      // 結果画像を保存
      const buffer = canvas.toBuffer("image/png");
      await sharp(buffer).png().toFile(outputPath);

      logger.debug(`Image processed and saved: ${outputPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process image ${imagePath}: ${errorMsg}`);
      throw new Error(`Image processing failed: ${errorMsg}`);
    }
  }

  private drawLayoutResult(
    ctx: CanvasRenderingContext2D,
    layoutResult: LayoutResult
  ): void {
    for (const plant of layoutResult.plants) {
      this.drawPlant(ctx, plant);
    }
  }

  private drawPlant(ctx: CanvasRenderingContext2D, plant: Plant): void {
    // 写真領域を描画
    for (const area of plant.photoAreas) {
      this.drawBoundingBox(ctx, area, this.options.photoAreaColor);
    }

    // 説明領域を描画
    for (const area of plant.descriptionAreas) {
      this.drawBoundingBox(ctx, area, this.options.descriptionAreaColor);
    }

    // 植物名ラベルを描画（最初の写真領域の上部）
    if (plant.photoAreas.length > 0) {
      this.drawPlantLabel(ctx, plant.name, plant.photoAreas[0]);
    } else if (plant.descriptionAreas.length > 0) {
      // 写真領域がない場合は説明領域の上部に表示
      this.drawPlantLabel(ctx, plant.name, plant.descriptionAreas[0]);
    }
  }

  private drawBoundingBox(
    ctx: CanvasRenderingContext2D,
    area: Area,
    color: string
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = this.options.lineWidth;
    ctx.globalAlpha = 0.8;

    ctx.strokeRect(area.x, area.y, area.width, area.height);

    ctx.restore();
  }

  private drawPlantLabel(
    ctx: CanvasRenderingContext2D,
    plantName: string,
    area: Area
  ): void {
    ctx.save();

    // フォント設定
    ctx.font = `${this.options.labelFontSize}px ${this.options.labelFont}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // テキストサイズを測定
    const textMetrics = ctx.measureText(plantName);
    const textWidth = textMetrics.width;
    const textHeight = this.options.labelFontSize;

    // ラベル位置を計算（バウンディングボックスの上部）
    const labelX = area.x;
    const labelY = Math.max(0, area.y - textHeight - 10);

    // 背景を描画
    const padding = 5;
    ctx.fillStyle = this.options.labelBackgroundColor;
    ctx.fillRect(
      labelX - padding,
      labelY - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // テキストを描画
    ctx.fillStyle = this.options.labelColor;
    ctx.fillText(plantName, labelX, labelY);

    ctx.restore();
  }

  private drawErrorMessage(
    ctx: CanvasRenderingContext2D,
    errorMessage: string,
    imageWidth: number,
    imageHeight: number
  ): void {
    ctx.save();

    // エラー背景を描画
    ctx.fillStyle = this.options.errorBackgroundColor;
    const errorBoxHeight = 80;
    const errorBoxY = (imageHeight - errorBoxHeight) / 2;
    ctx.fillRect(0, errorBoxY, imageWidth, errorBoxHeight);

    // エラーテキストを描画
    ctx.fillStyle = this.options.errorTextColor;
    ctx.font = `${this.options.labelFontSize}px ${this.options.labelFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 長いメッセージは改行
    const maxWidth = imageWidth - 40;
    const lines = this.wrapText(ctx, errorMessage, maxWidth);
    const lineHeight = this.options.labelFontSize + 5;
    const totalHeight = lines.length * lineHeight;
    const startY = imageHeight / 2 - totalHeight / 2;

    lines.forEach((line, index) => {
      ctx.fillText(line, imageWidth / 2, startY + index * lineHeight);
    });

    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
