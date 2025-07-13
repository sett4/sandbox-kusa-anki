// Jest watch mode セットアップファイル
// ファイル変更時にlintとtestを実行する設定

import { execSync } from 'child_process';

// watchモード用のカスタム設定
jest.setTimeout(30000);

// ファイル変更時にlintを実行するためのフック
if (process.env.JEST_WATCH_MODE) {
  beforeAll(() => {
    try {
      console.log('🔍 Running lint before tests...');
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('✅ Lint passed');
    } catch (error) {
      console.log('❌ Lint failed');
      throw error;
    }
  });
}