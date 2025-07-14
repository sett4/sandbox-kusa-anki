#!/usr/bin/env node

import { Command } from 'commander';
import { createExtractPageCommand } from './commands/extract-page';
import { createExtractLayoutCommand } from './commands/extract-layout';
import { createGenerateLayoutImageCommand } from './commands/generate-layout-image';
import { createGenerateApkgCommand } from './commands/generate-apkg';
import { logger } from './utils/logger';

const program = new Command();

program
  .name('kusa-anki')
  .description('Kindle BooksからAnki Deckを作成するツール')
  .version('1.0.0');

// extract-pageコマンドを追加
program.addCommand(createExtractPageCommand());

// extract-layoutコマンドを追加
program.addCommand(createExtractLayoutCommand());

// generate-layout-imageコマンドを追加
program.addCommand(createGenerateLayoutImageCommand());

// generate-apkgコマンドを追加
program.addCommand(createGenerateApkgCommand());

// エラーハンドリング
program.exitOverride();

try {
  program.parse();
} catch (error) {
  logger.error('プログラム実行エラー', { error });
  process.exit(1);
}