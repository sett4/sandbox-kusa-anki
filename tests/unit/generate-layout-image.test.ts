import { LayoutResult } from "../../src/types/layout-types";
import * as fs from "fs";
import { ImageProcessor } from "../../src/utils/image-processor";
import { filterPngFiles } from "../../src/commands/generate-layout-image";

// loggerのモック
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// canvas のモック
jest.mock("canvas", () => ({
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      strokeRect: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      save: jest.fn(),
      restore: jest.fn(),
    })),
    toBuffer: jest.fn(() => Buffer.from("fake-image-data")),
    width: 800,
    height: 600,
  })),
  loadImage: jest.fn(() =>
    Promise.resolve({
      width: 800,
      height: 600,
    })
  ),
}));

// sharp のモック
jest.mock("sharp", () => {
  return jest.fn(() => ({
    png: jest.fn(() => ({
      toFile: jest.fn(() => Promise.resolve()),
    })),
  }));
});

const mockFs = fs as jest.Mocked<typeof fs>;

describe("generate-layout-image", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ImageProcessor", () => {
    let imageProcessor: ImageProcessor;

    beforeEach(() => {
      imageProcessor = new ImageProcessor();
    });

    test("ImageProcessorが正しく初期化される", () => {
      expect(imageProcessor).toBeDefined();
    });

    test("正常なレイアウト結果で画像処理できる", async () => {
      const mockLayoutResult: LayoutResult = {
        page: "test.png",
        plants: [
          {
            name: "ヨモギ",
            photoAreas: [{ x: 100, y: 100, width: 200, height: 150 }],
            descriptionAreas: [{ x: 100, y: 300, width: 200, height: 100 }],
          },
        ],
      };

      await expect(
        imageProcessor.processImage(
          "/fake/path/test.png",
          mockLayoutResult,
          "/fake/output/test_layout.png"
        )
      ).resolves.not.toThrow();
    });

    test("エラーメッセージ付きで画像処理できる", async () => {
      await expect(
        imageProcessor.processImage(
          "/fake/path/test.png",
          null,
          "/fake/output/test_layout.png",
          "Layout file not found"
        )
      ).resolves.not.toThrow();
    });

    test("複数の植物を含むレイアウト結果で画像処理できる", async () => {
      const mockLayoutResult: LayoutResult = {
        page: "test.png",
        plants: [
          {
            name: "ヨモギ",
            photoAreas: [{ x: 100, y: 100, width: 200, height: 150 }],
            descriptionAreas: [{ x: 100, y: 300, width: 200, height: 100 }],
          },
          {
            name: "ハコベ",
            photoAreas: [
              { x: 400, y: 100, width: 150, height: 120 },
              { x: 400, y: 250, width: 150, height: 120 },
            ],
            descriptionAreas: [{ x: 400, y: 400, width: 200, height: 80 }],
          },
        ],
      };

      await expect(
        imageProcessor.processImage(
          "/fake/path/test.png",
          mockLayoutResult,
          "/fake/output/test_layout.png"
        )
      ).resolves.not.toThrow();
    });

    test("写真領域がない植物でも処理できる", async () => {
      const mockLayoutResult: LayoutResult = {
        page: "test.png",
        plants: [
          {
            name: "unknown",
            photoAreas: [],
            descriptionAreas: [{ x: 100, y: 300, width: 200, height: 100 }],
          },
        ],
      };

      await expect(
        imageProcessor.processImage(
          "/fake/path/test.png",
          mockLayoutResult,
          "/fake/output/test_layout.png"
        )
      ).resolves.not.toThrow();
    });
  });

  describe("ファイル処理のテスト", () => {
    test("カスタムオプションでImageProcessorを初期化できる", () => {
      const customOptions = {
        photoAreaColor: "#FF0000",
        descriptionAreaColor: "#0000FF",
        lineWidth: 5,
      };

      const processor = new ImageProcessor(customOptions);
      expect(processor).toBeDefined();
    });
  });

  describe("filterPngFiles関数のテスト", () => {
    test("PNGファイルから_layout.pngファイルを除外する", () => {
      const files = [
        "book_001.png",
        "book_002.png",
        "book_001_layout.png", // 除外されるべき
        "book_002_layout.png", // 除外されるべき
        "other_file.txt", // PNGでないので除外される
        "test_layout.json", // PNGでないので除外される
      ];

      const result = filterPngFiles(files);

      expect(result).toHaveLength(2);
      expect(result).toEqual(["book_001.png", "book_002.png"]);
    });

    test("空の配列を渡した場合空の配列を返す", () => {
      const result = filterPngFiles([]);
      expect(result).toEqual([]);
    });

    test("_layout.pngファイルのみの場合空の配列を返す", () => {
      const files = ["book_001_layout.png", "book_002_layout.png"];
      const result = filterPngFiles(files);
      expect(result).toEqual([]);
    });

    test("PNGファイル以外のみの場合空の配列を返す", () => {
      const files = ["document.txt", "image.jpg", "data.json"];
      const result = filterPngFiles(files);
      expect(result).toEqual([]);
    });

    test("通常のPNGファイルのみの場合全て返す", () => {
      const files = ["image1.png", "image2.png", "photo.png"];
      const result = filterPngFiles(files);
      expect(result).toEqual(["image1.png", "image2.png", "photo.png"]);
    });

    test("拡張子の大文字小文字を正しく処理する", () => {
      const files = ["image1.PNG", "image2.Png", "image3.png"];
      const result = filterPngFiles(files);
      expect(result).toEqual(["image1.PNG", "image2.Png", "image3.png"]);
    });

    test("名前にlayoutが含まれるが_layoutで終わらないファイルは含む", () => {
      const files = [
        "layout_design.png", // これは含まれる
        "my_layout_final.png", // これは含まれる（_layoutで終わらない）
        "layout.png", // これは含まれる
        "test_layout.png", // これは除外される（_layoutで終わる）
      ];
      const result = filterPngFiles(files);
      expect(result).toEqual(["layout_design.png", "my_layout_final.png", "layout.png"]);
    });
  });
});
