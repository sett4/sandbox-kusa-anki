import { chromium, Page } from "playwright";
import { Command } from "commander";
import * as path from "path";
import * as fs from "fs/promises";
import { logger } from "../utils/logger";
import { ExtractPageOptions, KindlePageInfo } from "../types";

export function createExtractPageCommand(): Command {
  return new Command("extract-page")
    .description("Kindle Cloud Readerから各ページをPNGとして保存")
    .argument("<cdpUrl>", "Chrome DevTools ProtocolのURL")
    .argument("<destDir>", "ファイル出力先ディレクトリ")
    .option("--max-pages <number>", "抽出する最大ページ数", "10")
    .action(
      async (cdpUrl: string, destDir: string, opts: { maxPages: string }) => {
        const maxPages = parseInt(opts.maxPages, 10);
        if (isNaN(maxPages) || maxPages <= 0) {
          throw new Error("--max-pagesは正の整数を指定してください");
        }
        const options: ExtractPageOptions = { cdpUrl, destDir, maxPages };
        await extractPage(options);
      }
    );
}

export async function extractPage(options: ExtractPageOptions): Promise<void> {
  const { cdpUrl, destDir, maxPages = 10 } = options;

  logger.info("extract-page開始", { cdpUrl, destDir, maxPages });

  try {
    // 出力ディレクトリを作成
    await fs.mkdir(destDir, { recursive: true });

    // Chrome DevTools Protocolで既存のブラウザに接続
    const browser = await chromium.connectOverCDP(cdpUrl);
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error("アクティブなブラウザコンテキストが見つかりません");
    }

    const context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      throw new Error("アクティブなページが見つかりません");
    }

    const page = pages[0];
    const url = page.url();

    logger.info("現在のページURL", { url });

    // Kindle Cloud ReaderのURLであることを確認
    const kindlePageInfo = parseKindleUrl(url);
    if (!kindlePageInfo) {
      throw new Error("Kindle Cloud Readerのページではありません");
    }

    logger.info("Kindle情報を取得", kindlePageInfo);

    let pageNum = kindlePageInfo.pageNum;

    // ページ抽出ループ
    while (true) {
      try {
        // スクリーンショットを保存
        const filename = `${kindlePageInfo.asin}_${pageNum
          .toString()
          .padStart(4, "0")}.png`;
        const filepath = path.join(destDir, filename);

        await page.screenshot({ path: filepath, fullPage: true });
        logger.info("スクリーンショット保存", { filename, pageNum });

        // 次ページへ遷移（右矢印キー）
        await page.keyboard.press("ArrowRight");

        // ページ読み込み完了を待機
        await waitForPageLoad(page);

        // ページ番号を更新
        pageNum++;

        // 最大ページ数に達したら停止
        if (pageNum > kindlePageInfo.pageNum + maxPages - 1) {
          logger.info("最大ページ数に達しました", {
            maxPages,
            currentPage: pageNum,
          });
          break;
        }
      } catch (error) {
        logger.error("ページ処理中にエラー", { error, pageNum });
        break;
      }
    }

    await browser.close();
    logger.info("extract-page完了");
  } catch (error) {
    logger.error("extract-pageでエラー", { error });
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
    url,
  };
}

async function waitForPageLoad(page: Page): Promise<void> {
  try {
    await page.waitForLoadState("load");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForResponse(
      async (response) => {
        await response.finished();
        return (
          response.url().includes("read.amazon.co.jp") &&
          response.request().method() === "GET" &&
          response.status() === 200
        );
      },
      { timeout: 2000 }
    );
    await page.waitForResponse(
      async (response) => {
        await response.finished();
        return (
          response.url().includes("s3.amazonaws.com") &&
          response.request().method() === "GET" &&
          response.status() === 200
        );
      },
      { timeout: 2000 }
    );
    // // Kindle特有の要素が読み込まれるまで待機
    // await page.waitForSelector('#KindleReaderIFrame, .kindleReaderPage, [data-testid="page-content"]', {
    //   timeout: 3000,
    //   state: 'visible'
    // }).catch(() => {
    //   // セレクタが見つからない場合は警告ログのみ
    //   logger.warn('Kindle特有の要素が見つかりませんでした');
    // });

    // 追加の待機時間（画像読み込み等のため）
    await page.waitForTimeout(4000);

    logger.debug("ページ読み込み完了");
  } catch (error) {
    logger.warn("ページ読み込み待機でタイムアウト", { error });
    // タイムアウトしてもエラーにせず、最低限の待機時間を確保
    await page.waitForTimeout(4000);
  }
}
