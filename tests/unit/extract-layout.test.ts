import { JsonValidator } from '../../src/utils/json-validator';
import { LayoutResult } from '../../src/types/layout-types';

// loggerのモック
jest.mock('../../src/utils/logger');

describe('extract-layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JsonValidator', () => {
    test('バリデーターが正しく動作する', () => {
      expect(JsonValidator.validateLayoutResult).toBeDefined();
      expect(typeof JsonValidator.validateLayoutResult).toBe('function');
    });
  });

  describe('レイアウト解析の統合テスト', () => {
    test('正常なレスポンスを処理できる', () => {
      const mockResult: LayoutResult = {
        page: 'test.png',
        plants: [
          {
            name: 'ヨモギ',
            photoAreas: [{ x: 100, y: 100, width: 200, height: 150 }],
            descriptionAreas: [{ x: 100, y: 300, width: 200, height: 100 }],
            descriptionText: 'ヨモギ\nキク科\n薬用植物として古くから利用されている'
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(mockResult)).toBe(true);
    });

    test('植物が認識できない場合のレスポンスを処理できる', () => {
      const mockResult: LayoutResult = {
        page: 'test.png',
        plants: [
          {
            name: 'unknown',
            photoAreas: [],
            descriptionAreas: [],
            descriptionText: ''
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(mockResult)).toBe(true);
    });

    test('複数の植物を含むレスポンスを処理できる', () => {
      const mockResult: LayoutResult = {
        page: 'test.png',
        plants: [
          {
            name: 'ヨモギ',
            photoAreas: [{ x: 100, y: 100, width: 200, height: 150 }],
            descriptionAreas: [{ x: 100, y: 300, width: 200, height: 100 }],
            descriptionText: 'ヨモギ\nキク科\n薬用植物として古くから利用されている'
          },
          {
            name: 'ハコベ',
            photoAreas: [
              { x: 400, y: 100, width: 150, height: 120 },
              { x: 400, y: 250, width: 150, height: 120 }
            ],
            descriptionAreas: [{ x: 400, y: 400, width: 200, height: 80 }],
            descriptionText: 'ハコベ\nナデシコ科\n春の七草の一つ'
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(mockResult)).toBe(true);
    });
  });
});