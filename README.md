# kusa-anki

## 概要

Kindle Books から Anki の Deck を作るための個人用ツールです。
草木図鑑の各ページに含まれる複数の植物情報を抽出し、標準的なAnki Package (.apkg) ファイルを生成します。

## 機能

kusa-anki は以下の4つの主要コマンドで構成されています：

### 1. extract-page
Kindle Cloud Reader を自動でページ送りし、各ページを PNG として保存します。

### 2. extract-layout
PNG ファイルをレイアウト解析し、各草木の写真と説明文の領域を特定してJSONファイルとして出力します。

### 3. generate-layout-image
レイアウト解析結果を視覚的に確認するため、元画像にバウンディングボックスを重ねた画像を生成します。

### 4. generate-apkg
処理済みデータから標準的なAnki Package (.apkg) ファイルを生成します。

## インストール

```bash
git clone <repository-url>
cd kusa-anki
npm install
```

### 依存要件

- Node.js (v18以上推奨)
- `yomitoku` コマンド (OCR処理用)
  - インストール: https://github.com/jamsinclair/yomitoku

## 使用方法

### 基本的なワークフロー

1. **ページ抽出**: Kindle Cloud Reader からページを PNG として保存
```bash
npm run extract-page <CDP_URL> <DEST_DIR> [--max-pages <number>]
```

2. **レイアウト解析**: PNG ファイルから植物の領域を抽出
```bash
npm run extract-layout <PNG_DIRECTORY>
```

3. **レイアウト可視化** (オプション): 解析結果を視覚的に確認
```bash
npm run generate-layout-image <PNG_DIRECTORY>
```

4. **Anki デッキ生成**: 標準的な .apkg ファイルを作成
```bash
npm run generate-apkg <SRC_DIRECTORY> <APKG_FILE>
```

### 詳細なコマンド仕様

#### extract-page
```bash
npm run extract-page <CDP_URL> <DEST_DIR> [options]
```
- `CDP_URL`: Chrome DevTools Protocol の接続URL
- `DEST_DIR`: PNG ファイルの出力先ディレクトリ
- オプション:
  - `--max-pages <number>`: 抽出する最大ページ数 (デフォルト: 10)
- 認証済みブラウザで開いた Kindle Cloud Reader のページを自動取得
- 右矢印キーでページ送りを実行
- ファイル名形式: `${asin}_${pageNum}.png` (pageNumは0埋め4桁)

#### extract-layout
```bash
npm run extract-layout <PNG_DIRECTORY> [options]
```
- `PNG_DIRECTORY`: 解析対象のPNGファイルディレクトリ
- オプション:
  - `-r, --retry <count>`: リトライ回数 (デフォルト: 3)
  - `-i, --interval <ms>`: API呼び出し間隔 (デフォルト: 2000ms)
- 3段階解析: パターンマッチング → 領域分割 → OCR処理

#### generate-layout-image
```bash
npm run generate-layout-image <INPUT> [options]
```
- `INPUT`: PNGファイルまたはディレクトリ
- オプション:
  - `--layout-dir <dir>`: レイアウトJSONディレクトリ
  - `--output-dir <dir>`: 出力先ディレクトリ
- 植物領域をバウンディングボックスで可視化

#### generate-apkg
```bash
npm run generate-apkg <SRC_DIRECTORY> <APKG_FILE> [options]
```
- `SRC_DIRECTORY`: 処理対象ディレクトリ
- `APKG_FILE`: 出力するAPKGファイルパス
- オプション:
  - `-d, --deck-name <name>`: デッキ名 (デフォルト: "草木図鑑")
- Front面: 植物写真、Back面: 説明画像 + OCRテキスト

### 使用例

```bash
# 完全なワークフローの例
npm run extract-page ws://localhost:9222/devtools/page/... ./output/pages/ --max-pages 20
npm run extract-layout ./output/pages/
npm run generate-layout-image ./output/pages/
npm run generate-apkg ./output/pages/ ./my-plants.apkg
```

## 技術仕様

### 使用技術
- **言語**: TypeScript
- **CLI**: Commander.js
- **ブラウザ自動化**: Playwright (Chrome DevTools Protocol)
- **OCR**: yomitoku (ローカルOCRコマンド)
- **画像処理**: Sharp (エッジ検出、パターンマッチング)
- **Anki生成**: anki-apkg-export
- **ログ**: winston

### 対応レイアウトパターン
- **ODD_3ROWS**: 奇数ページ3行レイアウト
- **EVEN_3ROWS**: 偶数ページ3行レイアウト
- **ODD_2ROWS**: 奇数ページ2行レイアウト

### ファイル構成
```
output/
├── pages/
│   ├── ${asin}_${pageNum}.png        # 抽出されたページ
│   ├── ${asin}_${pageNum}_layout.json # レイアウト解析結果
│   ├── ${asin}_${pageNum}_${index}_photo.png # 植物写真
│   └── ${asin}_${pageNum}_${index}_description.png # 説明画像
└── my-plants.apkg                     # 生成されたAnkiデッキ
```

## 開発

```bash
npm install        # 依存関係のインストール
npm run build      # プロジェクトのビルド
npm run lint       # コードの静的解析
npm run test       # テストの実行
npm run dev        # 開発モード
```

## ライセンス

MIT
