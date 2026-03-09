# TestFlightクラッシュ修正

## 概要
TestFlightで実機テスト時にアプリがクラッシュする問題を修正する。

## 根本原因
`useResponsive()`から取得した動的な値を、`Animated.Value()`や`useSharedValue()`の初期値として直接使用している。これによりReact/React Native hooksルールに違反し、画面回転や再レンダリング時にアニメーションシステムが不整合を起こす。

## 影響範囲
- サイドバーの開閉（Sidebar.tsx）
- 場所検索画面の表示（LocationSearchScreen.tsx）
- カレンダー作成シートの表示（CalendarCreateSheet.tsx）
- 各種ボトムシート（BaseBottomSheet.tsx）- 設定、プロフィール、カレンダーオプション等

**ほぼ全ての主要機能がクラッシュする状態**

## 実装タスク

### Phase 1: 緊急修正（クリティカル - 5ファイル）

#### 1-1. useResponsive.ts の安全性向上
- [x] `hooks/useResponsive.ts:15-16` を修正
  - すでにtry-catchとフォールバックが実装済み
  - TestFlight環境でDimensionsが初期化されていない場合のエラーハンドリング済み

#### 1-2. Sidebar.tsx の修正
- [x] `src/components/Sidebar.tsx:78-82` を修正
  - `useState`で`sidebarWidth`の初期値をキャプチャ
  - `slideAnimation`の初期値に固定値`initialSidebarWidth`を使用
  - `useState`は既にインポート済み

#### 1-3. LocationSearchScreen.tsx の修正
- [x] `src/components/LocationSearchScreen.tsx:56-65` を修正
  - `useState`で`screenWidth`の初期値をキャプチャ
  - `slideAnimation`の初期値に固定値`initialScreenWidth`を使用
  - `useEffect`内のアニメーション値も修正
  - `useState`は既にインポート済み

#### 1-4. CalendarCreateSheet.tsx の修正
- [x] `src/components/CalendarCreateSheet.tsx:69-72` を修正
  - `useState`で`SHEET_HEIGHT`の初期値をキャプチャ
  - `translateY`の初期値に固定値`initialSheetHeight`を使用
  - `useEffect`内のアニメーション値も修正
  - `useState`は既にインポート済み

#### 1-5. BaseBottomSheet.tsx の修正
- [x] `src/components/BaseBottomSheet.tsx:74-77` を修正
  - `useState`のインポートを追加
  - `useState`で`sheetHeight`の初期値をキャプチャ
  - `useSharedValue`の初期値に固定値`initialSheetHeight`を使用
  - `useEffect`と`closeSheet`関数内のアニメーション値も修正

### Phase 2: 検証ファイルの確認

#### 2-1. ScreenLayer.tsx の確認
- [ ] `src/components/ScreenLayer.tsx:36-39` を確認
  - すでに正しく実装されている（修正不要）
  - `useState`で初期値をキャプチャ済み

#### 2-2. ScreenContainer.tsx の確認
- [ ] `src/components/ScreenContainer.tsx:31-33` を確認
  - 問題なし（修正不要）
  - 静的な値（0）を使用

### Phase 3: 検証とテスト

#### 3-1. 開発環境でのテスト
- [ ] iOSシミュレーター: iPhone SE でテスト
- [ ] iOSシミュレーター: iPhone 14 Pro でテスト
- [ ] iOSシミュレーター: iPad Pro でテスト
- [ ] 画面回転テスト（縦横両方）

**テスト項目:**
1. **サイドバー（Sidebar.tsx）**
   - [ ] サイドバーの開閉が正常に動作
   - [ ] スワイプジェスチャーで閉じられる
   - [ ] 画面回転後も正常に動作

2. **場所検索画面（LocationSearchScreen.tsx）**
   - [ ] 場所検索画面が右からスライドイン
   - [ ] 戻るボタンで閉じられる
   - [ ] 画面回転後も正常に動作

3. **カレンダー作成シート（CalendarCreateSheet.tsx）**
   - [ ] シートが下から表示される
   - [ ] タップで閉じられる
   - [ ] 画面回転後も正常に動作

4. **各種ボトムシート（BaseBottomSheet.tsx）**
   - [ ] 設定シート、プロフィールシート、カレンダーオプションシート
   - [ ] すべてのボトムシートが正常に表示
   - [ ] スワイプで閉じられる
   - [ ] 画面回転後も正常に動作

5. **クラッシュテスト**
   - [ ] アプリ起動時にクラッシュしない
   - [ ] 各画面遷移でクラッシュしない
   - [ ] 画面回転時にクラッシュしない

#### 3-2. TestFlightでのテスト
- [ ] 修正版をTestFlightにデプロイ（ビルド番号: 403）
- [ ] 実機（iPhone）で全機能テスト
- [ ] 実機（iPad）で全機能テスト
- [ ] 画面回転を繰り返してもクラッシュしないか確認
- [ ] バックグラウンド→フォアグラウンド復帰テスト

## 修正パターン

**全ファイル共通の修正方針:**
```typescript
// ❌ 間違い（動的な値を直接使用）
const { width: screenWidth } = useResponsive();
const slideAnimation = useRef(new Animated.Value(screenWidth)).current;

// ✅ 正しい（初期値をuseStateでキャプチャ）
const { width: screenWidth } = useResponsive();
const [initialWidth] = useState(screenWidth);  // 初回レンダリング時の値を固定
const slideAnimationRef = useRef<Animated.Value | null>(null);
if (!slideAnimationRef.current) {
  slideAnimationRef.current = new Animated.Value(initialWidth);  // 固定値を使用
}
const slideAnimation = slideAnimationRef.current;
```

## 修正ファイルサマリー

### クリティカル（修正必須 - 5ファイル）

| # | ファイル | 行 | 修正内容 |
|---|---------|---|---------|
| 1 | `hooks/useResponsive.ts` | 15-16 | Dimensions初期化にtry-catchとフォールバック追加 |
| 2 | `src/components/Sidebar.tsx` | 78-82 | `sidebarWidth`の初期値を`useState`でキャプチャ |
| 3 | `src/components/LocationSearchScreen.tsx` | 56-65 | `screenWidth`の初期値を`useState`でキャプチャ |
| 4 | `src/components/CalendarCreateSheet.tsx` | 69-72 | `SHEET_HEIGHT`の初期値を`useState`でキャプチャ |
| 5 | `src/components/BaseBottomSheet.tsx` | 74-77 | `sheetHeight`の初期値を`useState`でキャプチャ |

### 確認済み（修正不要 - 2ファイル）

| # | ファイル | 状態 | 理由 |
|---|---------|------|------|
| 6 | `src/components/ScreenLayer.tsx` | ✅ 正しい | すでに`useState`で初期値をキャプチャ済み |
| 7 | `src/components/ScreenContainer.tsx` | ✅ 問題なし | 静的な値（0）を使用 |

## レビュー

（修正完了後に記載）
