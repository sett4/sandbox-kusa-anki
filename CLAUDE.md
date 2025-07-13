# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

kusa-ankiは Kindle Books から Anki の Deck を作成する個人用ツールです。3つの主要機能で構成されています：

1. **extract-page**: Kindle Cloud Reader を自動でページ送りし、各ページを PNG として保存
2. **extract-layout**: PNG ファイルをレイアウト解析し、草木の領域を抽出  
3. **build-deck**: 抽出結果をもとに Anki の Deck を作成

## 開発コマンド

```bash
npm install        # 依存関係のインストール
npm run build      # プロジェクトのビルド
npm run lint       # コードの静的解析
npm run test       # テストの実行
npm run dev        # 開発モード
```

## 使用コマンド

```bash
npm run extract-page [CDP_URL]                           # Kindle Cloud Reader からページ抽出
npm run extract-layout [PNG_DIRECTORY]                   # レイアウト解析
npm run build-deck [PNG_DIRECTORY] [LAYOUT_FILE]         # Anki Deck 作成
```

## 技術スタック

- **言語**: TypeScript
- **CLI**: Commander.js
- **ブラウザ自動化**: Playwright (Chrome DevTools Protocol 経由)
- **ログ**: winston
- **テスト**: Playwright でのヘッドレスブラウザテスト

## アーキテクチャ

```
src/
├── commands/    # 各コマンドの実装 (extract-page, extract-layout, build-deck)
├── utils/       # 共通ユーティリティ
└── types/       # TypeScript 型定義
```

## 重要な設計方針

- Chrome DevTools Protocol を使用して認証済みブラウザに接続
- Kindle Cloud Reader の操作は右矢印キーでのページ遷移を想定
- ファイル名形式: `${asin}_${pageNum}.png`
- PRD は `docs/prd/` ディレクトリに格納