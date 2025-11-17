# Shift Table OCR API

OpenCVとTesseract OCRを使用してシフト表の構造を検出するPython APIです。

## 機能

- OpenCVで表の線を検出
- セル座標を特定
- Tesseract OCRで各セルのテキストを抽出
- 表のタイプ（横型/縦型）を自動判定
- 構造化されたJSONデータを返す

## ローカル開発

### 前提条件

- Python 3.11以上
- Tesseract OCR（日本語言語パック含む）

### セットアップ

```bash
# 仮想環境を作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係をインストール
pip install -r requirements.txt

# Tesseract OCRをインストール（macOS）
brew install tesseract tesseract-lang

# サーバーを起動
python main.py
```

サーバーは http://localhost:8000 で起動します。

### APIエンドポイント

#### POST /analyze-table

シフト表の画像を解析して構造化データを返します。

**リクエスト:**
```json
{
  "imageBase64": "base64エンコードされた画像データ",
  "userName": "本多" // オプション
}
```

**レスポンス:**
```json
{
  "tableType": "horizontal",
  "headers": ["日付", "本多真翔", "田中太郎"],
  "cells": [
    {
      "row": 0,
      "col": 0,
      "x": 10,
      "y": 10,
      "w": 100,
      "h": 30,
      "text": "日付"
    }
  ],
  "rowCount": 32,
  "colCount": 10,
  "confidence": 0.85
}
```

#### GET /health

ヘルスチェックエンドポイント

## Dockerでのビルド

```bash
# イメージをビルド
docker build -t shift-table-ocr-api .

# コンテナを起動
docker run -p 8000:8000 shift-table-ocr-api
```

## Renderへのデプロイ

### 手順

1. [Render](https://render.com/)にアカウントを作成
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を入力:
   - **Name**: `shift-table-ocr-api`
   - **Root Directory**: `python-ocr-api`
   - **Environment**: `Docker`
   - **Plan**: Free（または有料プラン）
5. 「Create Web Service」をクリック

### デプロイ後の設定

1. デプロイが完了したら、URLをコピー（例: `https://shift-table-ocr-api.onrender.com`）
2. Supabaseの環境変数に設定:

```bash
npx supabase secrets set PYTHON_OCR_API_URL="https://shift-table-ocr-api.onrender.com"
```

3. Edge Functionを再デプロイ:

```bash
npx supabase functions deploy analyze-shift-gpt4o
```

## トラブルシューティング

### Tesseractが見つからない

```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-jpn

# Windows
# https://github.com/UB-Mannheim/tesseract/wiki からインストーラーをダウンロード
```

### OCRの精度が低い

- 画像の解像度を上げる
- 画像の前処理パラメータを調整（main.pyのpreprocess_image関数）
- Tesseractの設定を調整（custom_configパラメータ）
