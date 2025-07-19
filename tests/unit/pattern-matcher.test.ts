import { PatternMatcher } from "../../src/utils/pattern-matcher";

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
jest.mock("sharp", () => {
  return jest.fn(() => ({
    greyscale: jest.fn(() => ({
      convolve: jest.fn(() => ({
        raw: jest.fn(() => ({
          toBuffer: jest.fn(() => Promise.resolve(Buffer.from([100, 200, 50]))),
        })),
      })),
    })),
    metadata: jest.fn(() => Promise.resolve({ width: 1600, height: 2000 })),
  }));
});

describe("PatternMatcher", () => {
  let patternMatcher: PatternMatcher;

  beforeEach(() => {
    patternMatcher = new PatternMatcher();
    jest.clearAllMocks();
  });

  test("PatternMatcherが正しく初期化される", () => {
    expect(patternMatcher).toBeDefined();
  });

  test("パターンマッチングが実行される", async () => {
    const result = await patternMatcher.matchPattern("/fake/path/test.png");
    
    // モックの条件では低いスコアになるため、パターンがマッチする
    expect(result).not.toBeNull();
    expect(result?.code).toBe("ODD_3ROWS"); // 最初のパターンがマッチ
  });

  test("存在しないファイルでエラーハンドリングされる", async () => {
    // sharpのモックでエラーを投げる
    const sharp = require("sharp");
    sharp.mockReturnValueOnce({
      greyscale: jest.fn(() => {
        throw new Error("File not found");
      }),
    });

    const result = await patternMatcher.matchPattern("/non/existent/file.png");
    expect(result).toBeNull();
  });
});