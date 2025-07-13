import { JsonValidator, ValidationError } from '../../src/utils/json-validator';
import { LayoutResult } from '../../src/types/layout-types';

describe('JsonValidator', () => {
  describe('validateLayoutResult', () => {
    test('有効なLayoutResultを正しく検証する', () => {
      const validData: LayoutResult = {
        page: 'test.png',
        plants: [
          {
            name: 'ヨモギ',
            photoAreas: [
              { x: 100, y: 100, width: 200, height: 150 }
            ],
            descriptionAreas: [
              { x: 100, y: 300, width: 200, height: 100 }
            ]
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(validData)).toBe(true);
    });

    test('pageフィールドが文字列でない場合は無効', () => {
      const invalidData = {
        page: 123,
        plants: []
      };

      expect(JsonValidator.validateLayoutResult(invalidData)).toBe(false);
    });

    test('plantsフィールドが配列でない場合は無効', () => {
      const invalidData = {
        page: 'test.png',
        plants: 'not an array'
      };

      expect(JsonValidator.validateLayoutResult(invalidData)).toBe(false);
    });

    test('植物の名前が空文字列の場合は無効', () => {
      const invalidData = {
        page: 'test.png',
        plants: [
          {
            name: '',
            photoAreas: [],
            descriptionAreas: []
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(invalidData)).toBe(false);
    });

    test('座標が負の値の場合は無効', () => {
      const invalidData = {
        page: 'test.png',
        plants: [
          {
            name: 'テスト植物',
            photoAreas: [
              { x: -10, y: 100, width: 200, height: 150 }
            ],
            descriptionAreas: []
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(invalidData)).toBe(false);
    });

    test('幅や高さが0以下の場合は無効', () => {
      const invalidData = {
        page: 'test.png',
        plants: [
          {
            name: 'テスト植物',
            photoAreas: [
              { x: 100, y: 100, width: 0, height: 150 }
            ],
            descriptionAreas: []
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(invalidData)).toBe(false);
    });

    test('空の配列は有効', () => {
      const validData = {
        page: 'test.png',
        plants: [
          {
            name: 'unknown',
            photoAreas: [],
            descriptionAreas: []
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(validData)).toBe(true);
    });

    test('複数の植物を含むデータを正しく検証する', () => {
      const validData = {
        page: 'test.png',
        plants: [
          {
            name: 'ヨモギ',
            photoAreas: [
              { x: 100, y: 100, width: 200, height: 150 }
            ],
            descriptionAreas: [
              { x: 100, y: 300, width: 200, height: 100 }
            ]
          },
          {
            name: 'ハコベ',
            photoAreas: [
              { x: 400, y: 100, width: 200, height: 150 }
            ],
            descriptionAreas: [
              { x: 400, y: 300, width: 200, height: 100 }
            ]
          }
        ]
      };

      expect(JsonValidator.validateLayoutResult(validData)).toBe(true);
    });
  });

  describe('validateExistingLayoutFile', () => {
    test('存在しないファイルはfalseを返す', () => {
      expect(JsonValidator.validateExistingLayoutFile('/nonexistent/file.json')).toBe(false);
    });
  });
});