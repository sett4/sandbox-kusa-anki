#!/usr/bin/env node

import { Command } from 'commander';
import { createExtractPageCommand } from './commands/extract-page';
import { createExtractLayoutCommand } from './commands/extract-layout';
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

// TODO: 他のコマンドも追加予定
// program.addCommand(createBuildDeckCommand());

// エラーハンドリング
program.exitOverride();

try {
  program.parse();
} catch (error) {
  logger.error('プログラム実行エラー', { error });
  process.exit(1);
}