import { spawn } from 'child_process';
import * as path from 'path';

describe('CLI統合テスト', () => {
  const cliPath = path.join(__dirname, '../../dist/index.js');

  test('--helpオプションが正しく動作する', (done) => {
    const child = spawn('node', [cliPath, '--help']);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Commanderは--helpでexit code 0を返すがexitOverrideでエラーログが出力される
      expect(stdout).toContain('kusa-anki');
      expect(stdout).toContain('extract-page');
      done();
    });
  });

  test('--versionオプションが正しく動作する', (done) => {
    const child = spawn('node', [cliPath, '--version']);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Commanderは--versionでexit code 0を返すがexitOverrideでエラーログが出力される
      expect(stdout).toContain('1.0.0');
      done();
    });
  });
});