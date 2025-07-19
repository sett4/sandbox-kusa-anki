# PRD: extract-page

## 1. 概要

### 目的

ブラウザで開いた Kindle Cloud Reader を自動でページ送りし、各ページを PNG として保存します。

### 対象ユーザー

- 開発者個人

## 2. 機能要求

### 必須機能（Must Have）

- [ ] コマンドラインプログラムとして動作
- [ ] Playwright か Puppeteer などを利用し、すでに起動したブラウザに対して Chrome DevTools Protocol で接続する。これは認証済みのブラウザを利用したいから。
- [ ] 開いているページを PNG に保存する
- [ ] 次ページに遷移する

### 推奨機能（Should Have）

- [x] 進捗表示 (winston logger使用)
- [ ] エラー時の自動リトライ
- [x] 最大ページ数制限機能

### 任意機能（Could Have）

- [ ] 並行処理
- [ ] 設定ファイル対応

## 3. 技術仕様

### 入力

- cdpUrl: 接続先 Chrome DevTools Protocol の URL
- destDir: ファイル出力先ディレクトリ
- --max-pages: 抽出する最大ページ数 (デフォルト: 10)

### 出力

- $destDir に保存した PNG ファイル群
- ファイル名形式: `${asin}_${pageNum}.png` (pageNumは0埋め4桁)

### 処理フロー

1. $cdpUrl の Chrome に接続
2. Chrome のアクティブなタブが Kindle Cloud Reader であることを確認( https://read.amazon.co.jp/?asin=$asin )
3. ASINを解析し、開始ページ番号を取得
4. 出力ディレクトリ $destDir を作成
5. 各ページに対して以下を実行:
   - fullPageスクリーンショットを $destDir に保存 (ファイル名: `${asin}_${pageNum}.png`)
   - 右矢印キーで次ページへ遷移
   - ページ読み込み完了を待機 (domcontentloaded + 追加の4秒待機)
6. 最大ページ数に達するまで 5 を繰り返す

## 4. 実装詳細

### 使用技術

- TypeScript で書くこと
- コマンドラインパーサとして Commander を利用
- ブラウザへの接続として Playwright を利用
- winston でログを取ること

### ファイル構成

src/
├── commands/
├── utils/
└── types/

## 5. テスト要件

### 単体テスト

- 単体テストでは Playwright でヘッドレスブラウザを立ち上げ、Google トップ画面( https://www.google.com )のスクリーンショットを保存できることを確認すること

### 統合テスト

## 6. 成功基準

- 全ページが正常に PNG 保存される
- ファイル名が仕様通り

## 7. リスク・制約

### 技術的リスク

- 認証切れ
- ネットワークエラー
- Kindle の仕様変更

### 制約事項
