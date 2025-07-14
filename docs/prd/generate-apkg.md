# PRD: generate-apkg

## 1. 概要

### 目的

extract-pageとextract-layoutで処理した草木図鑑のデータから、標準的なAnki Package (.apkg) ファイルを生成します。各植物に対して、写真をFront面、説明画像とOCRテキストをBack面とするAnkiカードを作成します。

### 対象ユーザー

- 開発者個人

## 2. 機能要求

### 必須機能（Must Have）

- [ ] コマンドラインプログラムとして動作
- [ ] 指定されたディレクトリ内の全layout.jsonファイルを処理
- [ ] 各植物に対してAnkiカードを作成
- [ ] Front面：植物の写真PNG（`${pageBaseName}_${index}_photo.png`）
- [ ] Back面：説明画像PNG（`${pageBaseName}_${index}_description.png`）+ OCRテキスト
- [ ] 標準的なAnki Package (.apkg) ファイルの生成
- [ ] メディアファイル（画像）の適切な埋め込み
- [ ] 植物名をカード名として使用

### 推奨機能（Should Have）

- [ ] 処理進捗の表示
- [ ] 存在しないファイルのスキップ機能
- [ ] エラーハンドリング
- [ ] 生成されたカード数の統計表示

### 任意機能（Could Have）

- [ ] デッキ名のカスタマイズ
- [ ] カードテンプレートのカスタマイズ
- [ ] 複数のレイアウトJSONファイルの統合処理

## 3. 技術仕様

### 入力

- `srcDirectory`: 処理対象のディレクトリパス
  - 含まれるファイル：
    - `${pageBaseName}_layout.json`
    - `${pageBaseName}_${index}_photo.png`
    - `${pageBaseName}_${index}_description.png`
- `apkgFile`: 出力するAPKGファイルのパス

### 出力

- 標準的なAnki Package (.apkg) ファイル
- カード構成：
  - Front面：植物の写真画像
  - Back面：説明画像 + OCRテキスト（HTMLフォーマット）

### 処理フロー

1. **ファイル発見**: srcDirectory内のlayout.jsonファイルを検索
2. **各layout.jsonファイルに対して**:
   - JSONファイルを読み込み、植物データを取得
   - 各植物に対して対応する画像ファイルを検索
   - 存在する画像ファイルに対してAnkiカードを作成
3. **APKGファイル生成**: anki-apkg-exportを使用してファイルを出力
4. **処理完了報告**: 作成されたカード数と統計を表示

### データ構造

#### Layout JSON形式（入力）

```json
{
  "page": "filename.png",
  "plants": [
    {
      "name": "ヨモギ",
      "photoAreas": [
        {"x": 891, "y": 119, "width": 444, "height": 567}
      ],
      "descriptionAreas": [
        {"x": 225, "y": 119, "width": 628, "height": 567}
      ],
      "descriptionText": "ヨモギ\nキク科\n多年生草本。高さ50-120cm。茎は直立し、よく分枝する。葉は互生し、羽状に深裂する..."
    }
  ]
}
```

#### Ankiカード形式（出力）

```html
<!-- Front面 -->
<img src="${pageBaseName}_${index}_photo.png" />

<!-- Back面 -->
<img src="${pageBaseName}_${index}_description.png" />
<br><br>
<div style="text-align: left; font-family: 'Noto Sans JP', sans-serif;">
ヨモギ<br>
キク科<br>
多年生草本。高さ50-120cm。茎は直立し、よく分枝する。葉は互生し、羽状に深裂する...
</div>
```

### ファイル名規則

- 入力ファイル：
  - Layout JSON: `${pageBaseName}_layout.json`
  - Photo PNG: `${pageBaseName}_${index}_photo.png`
  - Description PNG: `${pageBaseName}_${index}_description.png`
- 出力ファイル：
  - APKG: ユーザー指定パス

### 使用コマンド

```bash
npm run generate-apkg <srcDirectory> <apkgFile>
```

例：
```bash
npm run generate-apkg ./output/kindle-book ./my-deck.apkg
```

## 4. 実装詳細

### 使用技術

- TypeScript で書くこと
- Commander.js でコマンドラインパーサ
- anki-apkg-export でAPKGファイル生成
- Node.js fs モジュールでファイル操作
- winston でログ出力

### 依存関係

```json
{
  "dependencies": {
    "anki-apkg-export": "^4.0.0"
  }
}
```

### ファイル構成

```
src/
├── commands/
│   └── generate-apkg.ts        # 新規：メインコマンド実装
├── utils/
│   └── apkg-builder.ts         # 新規：APKGファイル生成ユーティリティ
└── types/
    └── apkg-types.ts          # 新規：APKG関連の型定義
```

### 主要クラス設計

#### ApkgBuilder クラス

```typescript
export class ApkgBuilder {
  private apkg: AnkiExport;
  
  constructor(deckName: string);
  addPlantCard(plant: Plant, photoPath: string, descriptionPath: string): Promise<void>;
  save(outputPath: string): Promise<void>;
}
```

#### 処理フロー詳細

1. **初期化**:
   - AnkiExport インスタンスを作成
   - デッキ名を設定（デフォルト: "草木図鑑"）

2. **ファイル処理**:
   - glob パターンで `*_layout.json` ファイルを検索
   - 各JSONファイルを読み込み、plantsデータを取得

3. **カード作成**:
   - 各植物に対して `${pageBaseName}_${index}_photo.png` と `${pageBaseName}_${index}_description.png` を検索
   - 存在する場合のみカードを作成
   - addMedia() で画像ファイルを追加
   - addCard() でカードを追加

4. **出力**:
   - save() メソッドで .apkg ファイルを生成

### エラーハンドリング

- **ファイル不存在**: 警告ログ出力後、該当植物をスキップ
- **JSONパースエラー**: エラーログ出力後、該当ファイルをスキップ
- **画像読み込みエラー**: エラーログ出力後、該当カードをスキップ
- **APKG生成エラー**: エラーログ出力後、プロセス終了

### ログ出力

```
[INFO] Starting generate-apkg process
[INFO] Found 3 layout files
[INFO] Processing: page1_layout.json
[INFO] Added card: ヨモギ (page1_0_photo.png)
[WARN] Missing photo file: page1_1_photo.png
[INFO] Processing complete: 5 cards generated
[INFO] APKG saved to: ./my-deck.apkg
```

## 5. テスト要件

### 単体テスト

- ApkgBuilder クラスのテスト
- ファイル検索機能のテスト
- カード生成機能のテスト
- エラーハンドリングのテスト

### 統合テスト

- 実際のlayout.jsonファイルを使用したE2Eテスト
- 生成されたAPKGファイルの検証
- Ankiでの読み込み確認

## 6. 成功基準

- 全てのlayout.jsonファイルが正常に処理される
- 存在する画像ファイルに対してAnkiカードが作成される
- 生成されたAPKGファイルがAnkiで正常に読み込める
- 植物名が正しくカード名として表示される
- 画像とテキストが適切に表示される

## 7. リスク・制約

### 技術的リスク

- anki-apkg-export パッケージの制限
- 大量の画像ファイルによるメモリ不足
- ファイル名の文字エンコーディング問題

### 制約事項

- Node.js環境での実行が前提
- 画像ファイルサイズの制限（Ankiの制約）
- 特定のディレクトリ構造に依存

## 8. パフォーマンス要件

- 100枚の植物画像を含むデッキの生成時間: 30秒以内
- メモリ使用量: 1GB以内
- 生成されるAPKGファイルサイズ: 制限なし（Ankiの制約に準拠）

## 9. 今後の拡張予定

- 複数のデッキの統合機能
- カードテンプレートの選択機能
- 植物の分類によるタグ付け機能
- 進捗バーの表示