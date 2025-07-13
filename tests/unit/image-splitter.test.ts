import { ImageSplitter } from "../../src/utils/image-splitter";
import { LayoutPattern } from "../../src/types/layout-types";

// loggerのモック
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// sharpのモック
const mockBuffer = Buffer.from("fake-image-data");
jest.mock("sharp", () => {
  return jest.fn(() => ({
    extract: jest.fn(() => ({
      png: jest.fn(() => ({
        toBuffer: jest.fn(() => Promise.resolve(mockBuffer)),
      })),
    })),
  }));
});

describe("ImageSplitter", () => {
  let imageSplitter: ImageSplitter;

  beforeEach(() => {
    imageSplitter = new ImageSplitter();
    jest.clearAllMocks();
  });

  test("ImageSplitterが正しく初期化される", () => {
    expect(imageSplitter).toBeDefined();
  });

  test("ODD_3ROWSパターンで画像分割できる", async () => {
    const pattern: LayoutPattern = {
      code: "ODD_3ROWS",
      boxes: [
        { x: 225, y: 119, width: 1110, height: 567 },
      ],
    };

    const results = await imageSplitter.splitByPattern("/fake/path/test.png", pattern);
    
    expect(results).toHaveLength(1);
    expect(results[0].box).toEqual(pattern.boxes[0]);
    expect(results[0].photoArea.x).toBe(225 + 628); // x + photoSection.x
    expect(results[0].descriptionArea.x).toBe(225); // x + descriptionSection.x
  });

  test("EVEN_3ROWSパターンで画像分割できる", async () => {
    const pattern: LayoutPattern = {
      code: "EVEN_3ROWS",
      boxes: [
        { x: 288, y: 83, width: 1096, height: 577 },
      ],
    };

    const results = await imageSplitter.splitByPattern("/fake/path/test.png", pattern);
    
    expect(results).toHaveLength(1);
    expect(results[0].photoArea.x).toBe(288); // x + photoSection.x (0)
    expect(results[0].descriptionArea.x).toBe(288 + 463); // x + descriptionSection.x
  });

  test("存在しないパターンでエラーが発生する", async () => {
    const pattern: LayoutPattern = {
      code: "UNKNOWN_PATTERN",
      boxes: [
        { x: 0, y: 0, width: 100, height: 100 },
      ],
    };

    await expect(
      imageSplitter.splitByPattern("/fake/path/test.png", pattern)
    ).rejects.toThrow("No split rule found for pattern: UNKNOWN_PATTERN");
  });
});