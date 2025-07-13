// Jest セットアップファイル
// グローバルテスト設定やモックをここで定義

// 時間関連のテストで使用するタイムアウト調整
jest.setTimeout(30000);

// console.log を抑制（必要に応じて）
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };