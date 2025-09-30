# iOS App Store提出ガイド

## 概要
このドキュメントは「tapless」アプリをiOS App Storeに提出するための手順をまとめています。

## 前提条件
- [x] Apple Developer Program登録済み（年間$99）
- [x] app.json設定完了
- [x] eas.json設定完了
- [x] アプリアイコン準備済み（1024x1024px）

## 次のステップ

### 1. Apple Developer Account設定
```bash
# EAS CLI インストール（未インストールの場合）
npm install -g @expo/eas-cli

# EASにログイン
eas login

# Apple Developer Accountとの連携
eas device:create
```

### 2. Bundle Identifierの登録
App Store Connectで以下を設定：
- Bundle ID: `com.aicalendarapp.tapless`
- App Name: `tapless`

### 3. プロダクションビルド作成
```bash
# 初回ビルド
eas build --platform ios --profile production

# ビルド状況確認
eas build:list
```

### 4. App Store Connect設定項目

#### 必須情報
- **アプリ名**: tapless
- **副題**: AIカレンダー - スマートカレンダー
- **説明**: （appStoreDescription.mdを参照）
- **キーワード**: カレンダー, 祝日, 行事, AI, スケジュール
- **カテゴリ**: 仕事効率化
- **年齢レーティング**: 4+

#### スクリーンショット要件
以下のデバイスサイズのスクリーンショットが必要：
- **iPhone 6.7"** (iPhone 14 Pro Max): 1290 x 2796 px (3-10枚)
- **iPhone 6.5"** (iPhone 11 Pro Max): 1242 x 2688 px (3-10枚)
- **iPhone 5.5"** (iPhone 8 Plus): 1242 x 2208 px (3-10枚)
- **iPad Pro 12.9"**: 2048 x 2732 px (3-10枚)

#### プライバシー情報
- データ収集: なし
- サードパーティトラッキング: なし
- 暗号化: 標準暗号化のみ使用

#### レビュー情報
- **連絡先**: [開発者のメールアドレス]
- **電話番号**: [開発者の電話番号]
- **レビューノート**:
  ```
  このアプリは祝日と行事を表示するカレンダーアプリです。
  外部APIを使用していますが、ユーザーの個人データは収集しません。
  テスト用アカウントは不要です。
  ```

### 5. 提出前チェックリスト
- [ ] アプリが正常に動作する
- [ ] すべてのスクリーンショットを準備
- [ ] プライバシーポリシーURL設定（必要に応じて）
- [ ] 利用規約URL設定（必要に応じて）
- [ ] App Store レビューガイドラインの確認

### 6. 提出コマンド
```bash
# App Store Connect への提出
eas submit --platform ios --profile production
```

## 重要なポイント

### Bundle Identifier注意点
現在設定: `com.aicalendarapp.tapless`
- Apple Developer Portalで事前に登録必要
- 一度決めると変更困難

### ビルド番号管理
- app.json内の `buildNumber` は自動インクリメント設定済み
- 新しいバージョンは `version` を更新

### 必要なドキュメント
既存のドキュメントを活用：
- アプリ説明: `appStoreDescription.md`
- セットアップ: `SETUP.md`

## トラブルシューティング

### よくある問題
1. **証明書エラー**: EAS CLIで自動管理を有効化
2. **ビルド失敗**: expo-doctorでプロジェクトをチェック
3. **提出失敗**: App Store Connect の要件を再確認

### サポートコマンド
```bash
# プロジェクトの健全性チェック
npx expo doctor

# ビルドログの確認
eas build:view [BUILD_ID]

# 提出状況の確認
eas submit:list
```

## 推定スケジュール
- 初期設定: 2-3時間
- ビルドとテスト: 3-4時間
- App Store Connect設定: 2-3時間
- レビュー期間: 1-7日
- **合計**: 約1-2日 + レビュー期間

## 次回更新時
1. `app.json` の `version` を更新
2. `eas build --platform ios --profile production`
3. `eas submit --platform ios --profile production`