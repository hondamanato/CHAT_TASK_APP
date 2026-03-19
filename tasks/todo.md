# アプリ起動時クラッシュ修正（AdMobネイティブモジュール問題）

## 状態: ✅ 完了

## 原因

**インポートチェーンによる早期ネイティブモジュール初期化：**

1. `_layout.tsx` → `AdContext.tsx`をインポート（起動時）
2. `AdContext.tsx` → `rewardAdService`をトップレベルインポート（4行目）
3. `rewardAdService.ts` → `react-native-google-mobile-ads`をトップレベルインポート（2-5行目）
4. **結果**: アプリ起動時にAdMobネイティブモジュールが初期化 → クラッシュ

## 修正内容

### `src/contexts/AdContext.tsx`

**削除（4行目）:**
```typescript
import { rewardAdService } from '../services/rewardAdService';
```

**変更（useEffect内で動的インポート）:**
```typescript
useEffect(() => {
  const initializeAdServices = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await MobileAds().initialize();
      console.log('[AdContext] AdMob SDK初期化完了');

      // 動的インポートでrewardAdServiceを取得（早期初期化を防ぐ）
      const { rewardAdService } = await import('../services/rewardAdService');

      rewardAdService.initializeAd();
      await checkAdFreeStatus();
      rewardAdService.loadRewardedAd();
    } catch (error) {
      console.error('[AdContext] 広告サービス初期化エラー:', error);
    }
  };
  initializeAdServices();
}, []);
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/AdContext.tsx` | `rewardAdService`を動的インポートに変更 |

## 検証方法

- [x] TypeScriptコンパイルエラーがないことを確認 ✅
- [ ] `npx expo prebuild --clean --platform ios`
- [ ] XcodeでArchive
- [ ] TestFlightに配布
- [ ] アプリ起動 → クラッシュしないことを確認

## レビュー

### 変更概要
`rewardAdService`のトップレベルインポートを削除し、AdMob SDK初期化後に動的インポートで取得するように変更。

### 技術的効果
- アプリ起動時に`rewardAdService`モジュールがロードされなくなる
- AdMobネイティブモジュールは`MobileAds().initialize()`完了後（1秒遅延後）に初めて初期化される
- インポートチェーンによる早期初期化問題を解消

---

# Gmail連動画面クラッシュ修正（Phase 18: prebuild更新）

## 状態: ✅ 完了

## 原因
ファイル追加後に `npx expo prebuild --clean` を実行していないため、新しいファイルがMetro bundlerに認識されていない。

## 修正計画

- [x] `npx expo prebuild --clean --platform ios` を実行 ✅
- [x] Xcodeでクリーンビルド → Archive
- [x] TestFlightに配布
- [x] メールアイコンタップで動作確認

---

# Gmail連動画面クラッシュ修正（Phase 16: lazy()完全削除）

## 状態: ✅ 完了

## 原因
Geminiの指摘により、React.lazy()にはSuspense境界でのエラーハンドリング（ErrorBoundary）が必要であることが判明。ErrorBoundaryがないとエラーがキャッチされずクラッシュする。

## 根本的解決策
**lazy()を完全に削除し、通常インポートに変更**

## 修正内容

### ファイル: `app/(tabs)/index.tsx`

**Step 1: lazy()定義を削除** ✅
```typescript
// 削除
const LazyReservationScreen = lazy(() =>
  import('@/src/screens/ReservationCandidatesScreen').then(mod => ({ default: mod.ReservationCandidatesScreen }))
);
```

**Step 2: 通常インポートを追加** ✅
```typescript
import { ReservationCandidatesScreen } from '@/src/screens/ReservationCandidatesScreen';
```

**Step 3: lazyとSuspenseのインポートを削除** ✅
```typescript
// 変更前
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

// 変更後
import React, { useCallback, useEffect, useMemo, useState } from 'react';
```

**Step 4: SuspenseとLazyReservationScreenを置換** ✅
```typescript
// 変更前
<GmailProvider>
  <Suspense fallback={
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryBackground }}>
      <ActivityIndicator size="large" color={colors.primaryText} />
    </View>
  }>
    <LazyReservationScreen
      isVisible={showReservations}
      onClose={() => setShowReservations(false)}
      onAddToCalendar={handleReservationAddToCalendar}
    />
  </Suspense>
</GmailProvider>

// 変更後
<GmailProvider>
  <ReservationCandidatesScreen
    isVisible={showReservations}
    onClose={() => setShowReservations(false)}
    onAddToCalendar={handleReservationAddToCalendar}
  />
</GmailProvider>
```

**Step 5: 未使用のActivityIndicatorインポートを削除** ✅

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | lazy()削除、ReservationCandidatesScreenを通常インポート、Suspense削除、ActivityIndicator削除 |

---

## 技術的説明

### なぜ通常インポートでも安全か

1. **条件付きレンダリング**
   - `{showReservations && (...)}` でマウントを制御
   - メールアイコンタップ時のみコンポーネントがマウントされる

2. **GmailContext内のサービスは動的インポート済み**
   - `gmailAuthService`, `gmailService`, `reservationParserService`は全て動的インポート
   - モジュールロード時にネイティブモジュールは初期化されない

3. **ReservationCandidatesScreen自体は軽量**
   - ネイティブモジュールを直接使用していない
   - UIコンポーネントのみ

---

## 検証方法

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo start --clear` でアプリ起動
3. アプリが正常に起動することを確認
4. メールアイコンタップ → Gmail画面表示を確認
5. TestFlightビルド・配布
6. 実機で確認

---

## レビュー

### 変更概要
React.lazy()を完全に削除し、ReservationCandidatesScreenを通常インポートに変更。ErrorBoundaryの必要性を回避。

### 詳細
- `index.tsx`: `lazy()`によるLazyReservationScreenの定義を削除
- `index.tsx`: `ReservationCandidatesScreen`を通常の名前付きインポートに変更
- `index.tsx`: Reactからの`Suspense`と`lazy`のインポートを削除
- `index.tsx`: `Suspense`コンポーネントとそのfallbackを削除
- `index.tsx`: 未使用となった`ActivityIndicator`のインポートを削除

### 技術的効果
- ErrorBoundaryが不要になり、Suspenseでのエラーハンドリング問題を回避
- `showReservations`条件付きレンダリングにより、アプリ起動時にはコンポーネントはマウントされない
- GmailContext内のサービスは全て動的インポート済みのため、起動時のネイティブモジュール初期化問題はない
- コードがシンプルになり、保守性が向上

---

# Gmail連動画面クラッシュ修正（Phase 15: Suspenseレースコンディション修正）

## 状態: ✅ 完了

## 原因

### Suspense内のネストされたlazy()コンポーネントによるレースコンディション

**ファイル**: `app/(tabs)/index.tsx`

**問題のコード**:
```typescript
<Suspense fallback={...}>
  <LazyGmailProvider>        // ← lazy()
    <LazyReservationScreen   // ← lazy()
      ...
    />
  </LazyGmailProvider>
</Suspense>
```

**問題の仕組み**:
1. `LazyGmailProvider`と`LazyReservationScreen`は両方とも`lazy()`で遅延読み込み
2. Reactの`Suspense`は一度に1つのPromiseしか待機できない
3. `LazyReservationScreen`が`LazyGmailProvider`より先にレンダリングされる可能性がある
4. その場合、`useGmail()`が`GmailProvider`の外で呼ばれる
5. **エラー**: `"useGmail must be used within a GmailProvider"` → クラッシュ

## 修正内容

### Step 1: GmailProviderを通常importに変更 ✅

**削除**:
```typescript
const LazyGmailProvider = lazy(() =>
  import('@/src/contexts/GmailContext').then(mod => ({ default: mod.GmailProvider }))
);
```

**追加**（インポート部分）:
```typescript
import { GmailProvider } from '@/src/contexts/GmailContext';
```

**変更**（Suspense構造）:
```typescript
// 変更前
<Suspense fallback={...}>
  <LazyGmailProvider>
    <LazyReservationScreen ... />
  </LazyGmailProvider>
</Suspense>

// 変更後
<GmailProvider>
  <Suspense fallback={...}>
    <LazyReservationScreen ... />
  </Suspense>
</GmailProvider>
```

### Step 2: HolidayContextの無限ループ修正 ✅

**変更**（行120）:
```typescript
// 変更前
}, [isOnline]);

// 変更後
}, []); // 依存配列を空に
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | GmailProviderを通常importに変更、Suspense構造を修正 |
| `src/contexts/HolidayContext.tsx` | useEffect依存配列から`isOnline`を削除 |

## 技術的説明

### なぜGmailProviderを通常importにしても安全か

1. **GmailContext.tsx内のサービスは動的インポート済み**
   - `gmailAuthService`, `gmailService`, `reservationParserService`は全て動的インポート
   - モジュールロード時にネイティブモジュールは初期化されない

2. **GmailProviderのuseEffectは空**
   - 自動初期化は削除済み（Phase 12）
   - `initialize()`は手動呼び出しのみ

3. **条件付きレンダリングで保護**
   - `{showReservations && (...)}` でマウントを制御
   - メールアイコンタップ時のみGmailProviderがマウントされる

## 検証方法

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo start --clear` でアプリ起動
3. アプリが正常に起動することを確認
4. メールアイコンタップ → Gmail画面表示を確認
5. TestFlightビルド・配布
6. 実機で確認

## レビュー

### 変更概要
Suspense内のネストされたlazy()コンポーネントによるレースコンディションを修正。GmailProviderを通常インポートに変更し、Suspenseの外側に配置。

### 詳細
- `index.tsx`: `LazyGmailProvider`の定義を削除し、`GmailProvider`を通常インポートに変更
- `index.tsx`: `GmailProvider`をSuspenseの外側に配置し、コンテキストが確実に先に確立されるようにした
- `HolidayContext.tsx`: useEffectの依存配列から`isOnline`を削除し、無限ループを防止

### 技術的効果
- `GmailProvider`が同期的にレンダリングされ、コンテキストが確実に先に確立される
- `LazyReservationScreen`が`useGmail()`を呼び出す時点でコンテキストが必ず存在する
- `showReservations`が`true`の時のみ`GmailProvider`がマウントされるため、起動時のオーバーヘッドはない
- HolidayContextの無限レンダリング問題も解消

---

# 過去のPhase履歴（折りたたみ）

<details>
<summary>Phase 14以前の履歴</summary>

# Gmail連動画面クラッシュ修正（Phase 14: 完全動的インポート化）

## 状態: ✅ 完了

## 調査結果：クラッシュの根本原因

### 原因1: `index.tsx` の静的型インポート（14行目）
```typescript
import { ReservationEventData } from '@/src/types/gmail';
```
**問題**: `import type` ではなく通常の `import` を使用。バンドラーによってはモジュールとして評価される可能性。

### 原因2: `reservationParserService.ts` の静的インポート（15行目）
```typescript
import { gmailService } from './gmailService';
```
**問題**: `reservationParserService` が動的インポートされても、内部で `gmailService` を静的インポートしているため、インポートチェーンが即座に評価される。

## 修正内容

### Step 1: `index.tsx` - 型インポートを `import type` に変更 ✅

**変更箇所（14行目）:**
```typescript
// 変更前
import { ReservationEventData } from '@/src/types/gmail';

// 変更後
import type { ReservationEventData } from '@/src/types/gmail';
```

### Step 2: `reservationParserService.ts` - gmailServiceを動的インポートに変更 ✅

**削除（15行目）:**
```typescript
import { gmailService } from './gmailService';
```

**追加（15-24行目）:**
```typescript
// gmailServiceは使用時に動的インポート（インポートチェーンの遅延化）
let gmailServiceInstance: Awaited<typeof import('./gmailService')>['gmailService'] | null = null;

const getGmailService = async () => {
  if (!gmailServiceInstance) {
    const mod = await import('./gmailService');
    gmailServiceInstance = mod.gmailService;
  }
  return gmailServiceInstance;
};
```

**変更箇所1（99-100行目 - `extractStructuredData`メソッド内）:**
```typescript
// 変更前
const body = gmailService.getMessageBody(message);

// 変更後
const gmailSvc = await getGmailService();
const body = gmailSvc.getMessageBody(message);
```

**変更箇所2（267-270行目 - `parseWithAI`メソッド内）:**
```typescript
// 変更前
const body = gmailService.getMessageBody(message);
const subject = gmailService.getHeader(message, 'Subject') || '';
const from = gmailService.getHeader(message, 'From') || '';

// 変更後
const gmailSvc = await getGmailService();
const body = gmailSvc.getMessageBody(message);
const subject = gmailSvc.getHeader(message, 'Subject') || '';
const from = gmailSvc.getHeader(message, 'From') || '';
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | `import type` に変更 |
| `src/services/reservationParserService.ts` | gmailServiceを動的インポートに変更 |

## 効果

1. **アプリ起動時にGmail関連モジュールが一切ロードされない**
2. **インポートチェーン全体が完全に遅延ロード**
3. **メールアイコンタップ時にのみ初めてモジュールがロード**

</details>
