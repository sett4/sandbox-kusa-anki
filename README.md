# kusa-anki

## 概要

Kindle Books から Anki の Deck を作るための個人用ツールです。
現在の想定は 1 ページの中に複数の草木の説明があるものを想定しています。

## 機能

- Kindle Cloud Reader で開いた本を全ページ PNG ファイルに変換する機能
- PNG ファイルをレイアウト解析し、画像の中に含まれる草木の領域を抽出する
- 抽出結果をもとに Anki の Deck を作成する

## インストール

```bash
# インストール手順を記載
```

## 使用方法

```bash
npm run extract-page [CDP_URL]
npm run extract-layout [PNG_DIRECTORY]
npm run build-deck [PNG_DIRECTORY] [LAYOUT_FILE]
```

## 開発

```bash
npm install
npm run build
npm run lint
npm run test
npm run dev
```

## ライセンス

MIT
