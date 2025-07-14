import { YomitokuClient } from '../../src/utils/yomitoku-client';

// loggerのモック
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// child_processのモック
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// fsモジュールのモック
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('mock markdown content'),
  mkdtempSync: jest.fn().mockReturnValue('/tmp/test-dir'),
  rmSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(['test.md'])
}));

// osモジュールのモック
jest.mock('os', () => ({
  tmpdir: jest.fn().mockReturnValue('/tmp')
}));

// pathモジュールのモック
jest.mock('path', () => ({
  join: jest.fn((...paths) => paths.join('/'))
}));

describe('YomitokuClient', () => {
  let yomitokuClient: YomitokuClient;

  describe('parseMarkdownResult', () => {
    beforeEach(() => {
      // execを成功するようにモック
      const { exec } = require('child_process');
      exec.mockImplementation((command: string, callback: Function) => {
        if (command === 'which yomitoku') {
          callback(null, { stdout: '/usr/bin/yomitoku', stderr: '' });
        }
        return {};
      });
      
      yomitokuClient = new YomitokuClient();
    });

    it('植物名と説明文を正しく抽出する（科名前の行パターン）', () => {
      const markdownContent = `
イヌトウバナ

シソ科トウバナ属

開花期<br>夏~秋7~9月

北海道から九州の山地の木陰に分布する多年草。
`;

      const result = (yomitokuClient as any).parseMarkdownResult(markdownContent);

      expect(result.plantName).toBe('イヌトウバナ');
      expect(result.fullText).toContain('シソ科トウバナ属');
    });

    it('植物名と説明文を正しく抽出する（見出しパターン）', () => {
      const markdownContent = `
# スギナ

分布：全国

トクサ科トクサ属

春の山菜として知られる。
`;

      const result = (yomitokuClient as any).parseMarkdownResult(markdownContent);

      expect(result.plantName).toBe('スギナ');
      expect(result.fullText).toContain('トクサ科トクサ属');
    });

    it('植物名と説明文を正しく抽出する（最初の行パターン）', () => {
      const markdownContent = `
ヨモギ

分布情報

見わけポイント

多年生草本
`;

      const result = (yomitokuClient as any).parseMarkdownResult(markdownContent);

      expect(result.plantName).toBe('ヨモギ');
      expect(result.fullText).toContain('ヨモギ');
    });

    it('空のMarkdownの場合、unknown を返す', () => {
      const markdownContent = '';

      const result = (yomitokuClient as any).parseMarkdownResult(markdownContent);

      expect(result.plantName).toBe('unknown');
      expect(result.fullText).toBe('');
    });

    it('植物名が特定できない場合、unknown を返す', () => {
      const markdownContent = `
>> 123

分布

見わけポイント

<br>タグのみ
`;

      const result = (yomitokuClient as any).parseMarkdownResult(markdownContent);

      expect(result.plantName).toBe('unknown');
      expect(result.fullText).toContain('分布');
    });
  });
});