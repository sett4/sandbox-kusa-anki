import { readFileSync } from 'fs';
import { logger } from './logger';
import { LayoutResult } from '../types/layout-types';

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

  async analyzeLayout(imagePath: string): Promise<LayoutResult> {
    try {
      logger.info(`Starting layout analysis for: ${imagePath}`);
      
      const imageBase64 = this.imageToBase64(imagePath);
      const prompt = this.createPrompt();
      
      const response = await this.callGeminiAPI(imageBase64, prompt);
      const layoutResult = this.parseResponse(response, imagePath);
      
      logger.info(`Layout analysis completed for: ${imagePath}`);
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
      "descriptionAreas": [{"x": 数値, "y": 数値, "width": 数値, "height": 数値}]
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as GeminiResponse;
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content.parts[0].text) {
      throw new Error('No valid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
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