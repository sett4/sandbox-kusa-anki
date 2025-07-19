import { GeminiClient } from "../../src/utils/gemini-client";

// loggerのモック
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// fsのモック
jest.mock("fs", () => ({
  readFileSync: jest.fn(() => Buffer.from("fake-image-data")),
}));

// fetchのモック
global.fetch = jest.fn();

describe("GeminiClient OCR", () => {
  let geminiClient: GeminiClient;

  beforeEach(() => {
    geminiClient = new GeminiClient("fake-api-key");
    jest.clearAllMocks();
  });

  test("OCR処理が正常に実行される", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn(() =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "植物名: ヨモギ\n説明文: ヨモギ\nキク科\n多年生草本...",
                  },
                ],
              },
            },
          ],
        })
      ),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const buffer = Buffer.from("fake-image-data");
    const result = await geminiClient.performOCR(buffer);

    expect(result.plantName).toBe("ヨモギ");
    expect(result.fullText).toBe("ヨモギ");
  });

  test("植物名が見つからない場合のフォールバック", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn(() =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "説明文: ハコベ\nナデシコ科\n一年草または越年草...",
                  },
                ],
              },
            },
          ],
        })
      ),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const buffer = Buffer.from("fake-image-data");
    const result = await geminiClient.performOCR(buffer);

    expect(result.plantName).toBe("ハコベ");
    expect(result.fullText).toBe("ハコベ");
  });

  test("OCR失敗時のエラーハンドリング", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const buffer = Buffer.from("fake-image-data");

    await expect(geminiClient.performOCR(buffer)).rejects.toThrow("Network error");
  });

  test("不正なレスポンス時のフォールバック", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn(() =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "読み取り不可能なテキスト",
                  },
                ],
              },
            },
          ],
        })
      ),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const buffer = Buffer.from("fake-image-data");
    const result = await geminiClient.performOCR(buffer);

    expect(result.plantName).toBe("unknown");
    expect(result.fullText).toBe("");
  });
});