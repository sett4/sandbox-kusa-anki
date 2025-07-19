import { LayoutResult } from '../types/layout-types';
import { logger } from './logger';
import { existsSync, readFileSync } from 'fs';

export class ValidationError extends Error {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class JsonValidator {
  static validateLayoutResult(data: unknown): data is LayoutResult {
    try {
      this.validateRequired(data, 'object', 'root');
      this.validateRequired((data as { page: unknown }).page, 'string', 'page');
      this.validateRequired((data as { plants: unknown }).plants, 'object', 'plants');

      const dataObj = data as { plants: unknown };
      if (!Array.isArray(dataObj.plants)) {
        throw new ValidationError('plants must be an array', 'plants');
      }

      dataObj.plants.forEach((plant: unknown, index: number) => {
        this.validatePlant(plant, `plants[${index}]`);
      });

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.error(`Validation failed at ${error.path}: ${error.message}`);
      } else {
        logger.error('Unexpected validation error:', error);
      }
      return false;
    }
  }

  private static validatePlant(plant: unknown, path: string): void {
    this.validateRequired(plant, 'object', path);
    const plantObj = plant as { name: unknown; photoAreas: unknown; descriptionAreas: unknown };
    this.validateRequired(plantObj.name, 'string', `${path}.name`);
    this.validateRequired(plantObj.photoAreas, 'object', `${path}.photoAreas`);
    this.validateRequired(plantObj.descriptionAreas, 'object', `${path}.descriptionAreas`);

    if (!Array.isArray(plantObj.photoAreas)) {
      throw new ValidationError('photoAreas must be an array', `${path}.photoAreas`);
    }

    if (!Array.isArray(plantObj.descriptionAreas)) {
      throw new ValidationError('descriptionAreas must be an array', `${path}.descriptionAreas`);
    }

    plantObj.photoAreas.forEach((area: unknown, index: number) => {
      this.validateArea(area, `${path}.photoAreas[${index}]`);
    });

    plantObj.descriptionAreas.forEach((area: unknown, index: number) => {
      this.validateArea(area, `${path}.descriptionAreas[${index}]`);
    });
  }

  private static validateArea(area: unknown, path: string): void {
    this.validateRequired(area, 'object', path);
    const areaObj = area as { x: unknown; y: unknown; width: unknown; height: unknown };
    this.validateRequired(areaObj.x, 'number', `${path}.x`);
    this.validateRequired(areaObj.y, 'number', `${path}.y`);
    this.validateRequired(areaObj.width, 'number', `${path}.width`);
    this.validateRequired(areaObj.height, 'number', `${path}.height`);

    // 座標は正の数値である必要がある
    if ((areaObj.x as number) < 0) {
      throw new ValidationError('x must be non-negative', `${path}.x`);
    }
    if ((areaObj.y as number) < 0) {
      throw new ValidationError('y must be non-negative', `${path}.y`);
    }
    if ((areaObj.width as number) <= 0) {
      throw new ValidationError('width must be positive', `${path}.width`);
    }
    if ((areaObj.height as number) <= 0) {
      throw new ValidationError('height must be positive', `${path}.height`);
    }
  }

  private static validateRequired(value: unknown, expectedType: string, path: string): void {
    if (value === undefined || value === null) {
      throw new ValidationError(`${path} is required`, path);
    }

    if (expectedType === 'object' && typeof value !== 'object') {
      throw new ValidationError(`${path} must be an object`, path);
    }

    if (expectedType === 'string' && typeof value !== 'string') {
      throw new ValidationError(`${path} must be a string`, path);
    }

    if (expectedType === 'number' && typeof value !== 'number') {
      throw new ValidationError(`${path} must be a number`, path);
    }

    if (expectedType === 'string' && typeof value === 'string' && value.trim() === '') {
      throw new ValidationError(`${path} cannot be empty`, path);
    }
  }

  static validateExistingLayoutFile(filePath: string): boolean {
    try {
      if (!existsSync(filePath)) {
        return false;
      }

      const content = readFileSync(filePath, 'utf8');
      if (!content.trim()) {
        return false;
      }

      const data = JSON.parse(content);
      return this.validateLayoutResult(data);
    } catch (error) {
      logger.debug(`Invalid existing layout file ${filePath}:`, error);
      return false;
    }
  }
}