import { readFileSync } from 'fs';
import { logger } from './logger';
import { LayoutResult, OCRResult } from '../types/layout-types';

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
  }

  async performOCR(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      logger.info('Starting OCR processing');
      
      const imageBase64 = imageBuffer.toString('base64');
      const prompt = this.createOCRPrompt();
      
      const response = await this.callGeminiAPI(imageBase64, prompt);
      const ocrResult = this.parseOCRResponse(response);
      
      logger.info('OCR processing completed');
      return ocrResult;
    } catch (error) {
      logger.error('Failed to perform OCR:', error);
      throw error;
    }
  }

  async analyzeLayout(imagePath: string): Promise<LayoutResult> {
    try {
      logger.info(`Starting fallback layout analysis for: ${imagePath}`);
      
      const imageBase64 = this.imageToBase64(imagePath);
      const prompt = this.createPrompt();
      
      const response = await this.callGeminiAPI(imageBase64, prompt);
      const layoutResult = this.parseResponse(response, imagePath);
      
      logger.info(`Fallback layout analysis completed for: ${imagePath}`);
      return layoutResult;
    } catch (error) {
      logger.error(`Failed to analyze layout for ${imagePath}:`, error);
      throw error;
    }
  }

  private imageToBase64(imagePath: string): string {
    try {
      const imageBuffer = readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to read image file: ${imagePath}`);
    }
  }

  private createOCRPrompt(): string {
    return `
この画像に含まれるテキストを抽出してください。
最初の行は植物名として扱います。

出力形式：
植物名: [最初の行のテキスト]
説明文: [全体のテキスト]

テキストが読み取れない場合は "unknown" としてください。
`;
  }

  private createPrompt(): string {
    return `
この草木図鑑のページを解析してください。

以下の仕様に従ってJSONを出力してください：
- 1ページには2-6個の草木が含まれています
- 各草木には名前、写真領域、説明文領域があります
- 座標は x, y, width, height で表現してください（ピクセル単位）
- 認識できない植物名は "unknown" としてください
- 写真や説明がない場合は空配列にしてください

出力形式：
{
  "page": "filename.png",
  "plants": [
    {
      "name": "植物名",
      "photoAreas": [{"x": 数値, "y": 数値, "width": 数値, "height": 数値}],
      "descriptionAreas": [{"x": 数値, "y": 数値, "width": 数値, "height": 数値}],
      "descriptionText": "説明文"
    }
  ]
}

JSON以外の文字は出力しないでください。
`;
  }

  private async callGeminiAPI(imageBase64: string, prompt: string): Promise<string> {
    const url = `${this.baseUrl}/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
      }
    };

    return await this.callWithRetry(url, requestBody);
  }

  private async callWithRetry(url: string, requestBody: object, attempt: number = 1): Promise<string> {
    const maxRetries = 3;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 429 && attempt <= maxRetries) {
        // レート制限の場合、30秒 + エクスポネンシャルバックオフで待機
        const baseDelay = 30000; // 30秒
        const exponentialDelay = Math.pow(2, attempt - 1) * 1000; // 1秒, 2秒, 4秒...
        const totalDelay = baseDelay + exponentialDelay;
        
        logger.warn(`Rate limit hit (429), waiting ${totalDelay}ms before retry ${attempt}/${maxRetries}`);
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        return await this.callWithRetry(url, requestBody, attempt + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as GeminiResponse;
      
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content.parts[0].text) {
        throw new Error('No valid response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      if (attempt <= maxRetries && error instanceof Error && error.message.includes('fetch')) {
        // ネットワークエラーの場合もリトライ
        const delay = Math.pow(2, attempt - 1) * 2000; // 2秒, 4秒, 8秒
        logger.warn(`Network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.callWithRetry(url, requestBody, attempt + 1);
      }
      
      throw error;
    }
  }

  private parseOCRResponse(responseText: string): OCRResult {
    try {
      const lines = responseText.trim().split('\n');
      let plantName = 'unknown';
      let fullText = '';

      for (const line of lines) {
        if (line.startsWith('植物名:')) {
          plantName = line.replace('植物名:', '').trim();
        } else if (line.startsWith('説明文:')) {
          fullText = line.replace('説明文:', '').trim();
        }
      }

      // 植物名が見つからない場合、最初の非空行を植物名とする
      if (plantName === 'unknown' && fullText) {
        const firstLine = fullText.split('\n')[0].trim();
        if (firstLine) {
          plantName = firstLine;
        }
      }

      return {
        plantName: plantName || 'unknown',
        fullText: fullText || ''
      };
    } catch (error) {
      logger.error('Failed to parse OCR response:', error);
      logger.debug('Raw OCR response:', responseText);
      
      return {
        plantName: 'unknown',
        fullText: ''
      };
    }
  }

  private parseResponse(responseText: string, imagePath: string): LayoutResult {
    try {
      // JSONのみを抽出（マークダウンのコードブロックなどを除去）
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // ファイル名を実際のファイル名に置き換え
      const filename = imagePath.split('/').pop() || imagePath;
      parsed.page = filename;

      return parsed as LayoutResult;
    } catch (error) {
      logger.error(`Failed to parse Gemini response for ${imagePath}:`, error);
      logger.debug('Raw response:', responseText);
      
      // フォールバック：空の結果を返す
      return {
        page: imagePath.split('/').pop() || imagePath,
        plants: []
      };
    }
  }
}