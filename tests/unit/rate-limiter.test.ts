import { RateLimiter } from '../../src/utils/rate-limiter';

describe('RateLimiter', () => {
  test('初期設定で1秒間隔が設定される', () => {
    const rateLimiter = new RateLimiter();
    expect(rateLimiter.getInterval()).toBe(1000);
  });

  test('カスタム間隔を設定できる', () => {
    const rateLimiter = new RateLimiter(2000);
    expect(rateLimiter.getInterval()).toBe(2000);
  });

  test('間隔を動的に変更できる', () => {
    const rateLimiter = new RateLimiter(1000);
    rateLimiter.setInterval(3000);
    expect(rateLimiter.getInterval()).toBe(3000);
  });

  test('初回呼び出しは即座に完了する', async () => {
    const rateLimiter = new RateLimiter(1000);
    const startTime = Date.now();
    
    await rateLimiter.waitIfNeeded();
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(100); // 100ms以内で完了
  });

  test('連続呼び出しで適切に待機する', async () => {
    const rateLimiter = new RateLimiter(500); // 500ms間隔
    const startTime = Date.now();
    
    await rateLimiter.waitIfNeeded(); // 初回は即座に完了
    await rateLimiter.waitIfNeeded(); // 500ms待機するはず
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(450); // 多少の誤差を考慮
    expect(elapsed).toBeLessThan(600);
  });

  test('間隔より短い時間での呼び出しは待機する', async () => {
    const rateLimiter = new RateLimiter(1000);
    
    await rateLimiter.waitIfNeeded(); // 初回
    
    // 200ms後に再呼び出し
    setTimeout(async () => {
      const startTime = Date.now();
      await rateLimiter.waitIfNeeded();
      const elapsed = Date.now() - startTime;
      
      // 残り800ms程度待機するはず
      expect(elapsed).toBeGreaterThanOrEqual(750);
      expect(elapsed).toBeLessThan(900);
    }, 200);
  });
});