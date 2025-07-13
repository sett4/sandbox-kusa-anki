import { logger } from '../../src/utils/logger';

describe('logger', () => {
  test('loggerが正しく設定されている', () => {
    expect(logger).toBeDefined();
    expect(logger.level).toBe('info');
  });

  test('ログレベルが適切に設定されている', () => {
    expect(logger.isInfoEnabled()).toBe(true);
    expect(logger.isDebugEnabled()).toBe(false);
  });
});