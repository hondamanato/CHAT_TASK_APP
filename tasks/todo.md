# TestFlightクラッシュ修正 - ビルド405

## 概要
TestFlightビルド403/404でアプリ起動直後にクラッシュする問題を修正する。

## 根本原因（ビルド403/404）
**RewardAdServiceの早期初期化問題**

モジュールインポート順序の問題でクラッシュが発生：

1. `app/_layout.tsx` がロードされる
2. `AdContext.tsx` がインポートされる
3. `rewardAdService.ts` がインポートされる
4. `new RewardAdService()` が即座に実行される
5. コンストラクタ内で `RewardedAd.createForAdRequest()` が呼ばれる
6. しかし `MobileAds().initialize()` はまだ完了していない
7. → ネイティブモジュール未初期化でクラッシュ

## 実装タスク

### Phase 1: RewardAdServiceの遅延初期化

#### 1-1. rewardAdService.ts の修正
- [x] `src/services/rewardAdService.ts` を修正
  - コンストラクタから`initializeAd()`呼び出しを削除
  - `isInitialized`フラグを追加
  - `initializeAd()`に重複初期化チェックを追加

#### 1-2. AdContext.tsx の修正
- [x] `src/contexts/AdContext.tsx` を修正
  - `MobileAds`をインポート追加
  - `useEffect`を非同期関数に変更
  - `MobileAds().initialize()`完了後に`rewardAdService.initializeAd()`を呼ぶ

## 修正ファイルサマリー

| ファイル | 修正内容 |
|---------|---------|
| `src/services/rewardAdService.ts` | コンストラクタから`initializeAd()`を削除、`isInitialized`フラグ追加 |
| `src/contexts/AdContext.tsx` | AdMob初期化完了後に`rewardAdService.initializeAd()`を呼ぶ |

## レビュー

### 変更内容の概要

**問題:**
- `rewardAdService.ts`でシングルトンインスタンス`export const rewardAdService = new RewardAdService()`がモジュールインポート時に即座に実行される
- コンストラクタ内で`this.initializeAd()`が呼ばれ、AdMob SDKが初期化される前に`RewardedAd.createForAdRequest()`が呼ばれる
- 結果としてネイティブモジュール未初期化エラーでクラッシュ

**解決策:**
1. `RewardAdService`のコンストラクタを空にして、遅延初期化パターンを採用
2. `AdContext.tsx`で`MobileAds().initialize()`の完了を待ってから`rewardAdService.initializeAd()`を呼ぶ
3. `isInitialized`フラグで重複初期化を防止

### 修正の詳細

**rewardAdService.ts:**
- `isInitialized`プロパティを追加（重複初期化防止）
- コンストラクタを空にして早期初期化を防止
- `initializeAd()`の先頭で初期化済みチェックを追加

**AdContext.tsx:**
- `MobileAds`をインポート
- `useEffect`内を非同期関数`initializeAdServices`に変更
- 処理順序: `MobileAds().initialize()` → `rewardAdService.initializeAd()` → `checkAdFreeStatus()` → `rewardAdService.loadRewardedAd()`

### 検証方法
1. TestFlightから新しいビルド（405）をインストール
2. アプリを起動してクラッシュしないことを確認
3. 設定画面でリワード広告が正常に動作することを確認
