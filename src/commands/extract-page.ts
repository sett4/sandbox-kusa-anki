import { chromium } from 'playwright';
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { ExtractPageOptions, KindlePageInfo } from '../types';

export function createExtractPageCommand(): Command {
  return new Command('extract-page')
    .description('Kindle Cloud Readerから各ページをPNGとして保存')
    .argument('<cdpUrl>', 'Chrome DevTools ProtocolのURL')
    .argument('<destDir>', 'ファイル出力先ディレクトリ')
    .action(async (cdpUrl: string, destDir: string) => {
      const options: ExtractPageOptions = { cdpUrl, destDir };
      await extractPage(options);
    });
}

export async function extractPage(options: ExtractPageOptions): Promise<void> {
  const { cdpUrl, destDir } = options;
  
  logger.info('extract-page開始', { cdpUrl, destDir });

  try {
    // 出力ディレクトリを作成
    await fs.mkdir(destDir, { recursive: true });

    // Chrome DevTools Protocolで既存のブラウザに接続
    const browser = await chromium.connectOverCDP(cdpUrl);
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
      throw new Error('アクティブなブラウザコンテキストが見つかりません');
    }

    const context = contexts[0];
    const pages = context.pages();
    
    if (pages.length === 0) {
      throw new Error('アクティブなページが見つかりません');
    }

    const page = pages[0];
    const url = page.url();
    
    logger.info('現在のページURL', { url });

    // Kindle Cloud ReaderのURLであることを確認
    const kindlePageInfo = parseKindleUrl(url);
    if (!kindlePageInfo) {
      throw new Error('Kindle Cloud Readerのページではありません');
    }

    logger.info('Kindle情報を取得', kindlePageInfo);

    let pageNum = kindlePageInfo.pageNum;
    
    // ページ抽出ループ
    while (true) {
      try {
        // スクリーンショットを保存
        const filename = `${kindlePageInfo.asin}_${pageNum}.png`;
        const filepath = path.join(destDir, filename);
        
        await page.screenshot({ path: filepath, fullPage: true });
        logger.info('スクリーンショット保存', { filename, pageNum });

        // 次ページへ遷移（右矢印キー）
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(1000); // ページ読み込み待機

        // ページ番号を更新
        pageNum++;

        // TODO: 最後のページの判定ロジックを実装
        // 現在は無限ループを避けるため、仮で10ページで停止
        if (pageNum > kindlePageInfo.pageNum + 10) {
          logger.info('仮の停止条件に達しました');
          break;
        }

      } catch (error) {
        logger.error('ページ処理中にエラー', { error, pageNum });
        break;
      }
    }

    await browser.close();
    logger.info('extract-page完了');

  } catch (error) {
    logger.error('extract-pageでエラー', { error });
    throw error;
  }
}

function parseKindleUrl(url: string): KindlePageInfo | null {
  // https://read.amazon.co.jp/?asin=XXXXXXXXXX のようなURLを解析
  const match = url.match(/read\.amazon\.co\.jp\/.*asin=([A-Z0-9]+)/);
  if (!match) {
    return null;
  }

  const asin = match[1];
  // ページ番号は現在のところ1と仮定（実際のページ番号取得は今後実装）
  const pageNum = 1;

  return {
    asin,
    pageNum,
    url
  };
}