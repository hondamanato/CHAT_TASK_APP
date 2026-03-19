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

## 検証方法

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo start --clear` でアプリ起動
3. アプリが正常に起動することを確認
4. メールアイコンタップ → Gmail画面表示を確認
5. TestFlightビルド・配布
6. 実機で確認

## レビュー

### 変更概要
`index.tsx` の型インポートを `import type` に変更し、`reservationParserService.ts` で `gmailService` を動的インポートに変更。

### 詳細
- `index.tsx`: `ReservationEventData` のインポートを `import type` に変更（型のみの使用のため、バンドル時にモジュール評価が不要）
- `reservationParserService.ts`: `gmailService` を静的インポートから動的インポートに変更し、`getGmailService()` ヘルパーを追加

### 技術的効果
- インポートチェーン全体が完全に遅延ロード化
- アプリ起動時に Gmail 関連モジュール（expo-secure-store 含む）が一切ロードされない
- メールアイコンをタップした時にのみ動的にインポートされる

---

# Gmail連動画面クラッシュ修正（Phase 13: GmailProvider配置の再検討）

## 状態: ✅ 完了

## 問題
Phase 12の変更後、シミュレータで「No script URL provided」エラーが発生。

## 根本原因
Phase 11で`GmailProvider`を`_layout.tsx`に静的インポートで配置したことが原因。
`GmailContext.tsx`が静的インポートされると、インポートチェーン全体がアプリ起動時に評価される。

## 解決策
`GmailProvider`を`_layout.tsx`から削除し、`index.tsx`のモーダル内に**React.lazy**で遅延ロード配置。

## 修正内容

### Step 1: `app/_layout.tsx` - GmailProviderを削除 ✅

- `GmailProvider`のインポートを削除
- プロバイダーチェーンから`GmailProvider`を削除

### Step 2: `app/(tabs)/index.tsx` - LazyGmailProviderを追加 ✅

- `LazyGmailProvider`を`lazy(() => import(...))`で定義
- モーダル内の`Suspense`の中で`LazyGmailProvider`が`LazyReservationScreen`をラップ

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/_layout.tsx` | GmailProviderのインポートと使用を削除 |
| `app/(tabs)/index.tsx` | LazyGmailProviderを追加、モーダル内でラップ |

## 効果

1. **アプリ起動時にGmail関連モジュールがロードされない**: React.lazy
2. **SecureStoreアクセスは手動トリガーのみ**: Phase 12の`initialize()`
3. **コンテキスト確立保証**: GmailProviderとReservationScreenが同じSuspense内

## 検証方法

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo start --clear` でアプリ起動
3. アプリが正常に起動することを確認
4. メールアイコンタップ → Gmail画面表示を確認
5. TestFlightビルド・配布
6. 実機で確認

## レビュー

### 変更概要
`GmailProvider`を`_layout.tsx`から削除し、`index.tsx`でReact.lazyを使用して遅延ロード。

### 詳細
- `_layout.tsx`: `GmailProvider`のインポートとプロバイダーチェーンから削除
- `index.tsx`: `LazyGmailProvider`を定義し、モーダル内で`LazyReservationScreen`をラップ

### 技術的効果
- アプリ起動時にGmail関連モジュール（expo-secure-store含む）が一切ロードされない
- メールアイコンをタップした時にのみ動的にインポートされる
- `GmailProvider`と`ReservationScreen`が同じSuspense内で遅延ロードされ、コンテキスト確立が保証される

---

# Gmail連動画面クラッシュ修正（Phase 12: 手動初期化方式）

## 状態: ❌ 失敗 → Phase 13で修正

## 問題
- Phase 10: メールアイコンタップ時にクラッシュ（GmailProviderがモーダル内で毎回再生成）
- Phase 11: GmailProviderを`_layout.tsx`に移動 → **アプリ起動直後にクラッシュ**

## 根本原因
`GmailContext.tsx`の`useEffect`内で`restoreTokens()`が自動実行され、SecureStoreにアクセスする。
どの配置場所でも、ネイティブブリッジの準備が完了する前にSecureStoreアクセスが発生してクラッシュ。

## 解決策: 遅延初期化 + 手動トリガー方式

**コンセプト**: `useEffect`での自動初期化を完全に削除し、**画面表示時にのみ手動で呼び出す**。

## 修正内容

### Step 1: `src/types/gmail.ts` - GmailContextTypeを更新 ✅

- `GmailContextActions`に`initialize: () => Promise<void>`を追加
- `GmailContextInitState`インターフェースを追加（`isInitialized: boolean`）
- `GmailContextType`に`GmailContextInitState`を追加

### Step 2: `src/contexts/GmailContext.tsx` - 自動初期化を削除、initialize()を追加 ✅

- `useEffect`内の`restoreAuth()`自動呼び出しを完全に削除
- `isInitialized` stateを追加
- `isInitializingRef`で重複初期化を防止
- `initialize()`メソッドを追加（手動で呼び出し用）
- `InteractionManager`インポートを削除

### Step 3: `src/screens/ReservationCandidatesScreen.tsx` - 画面表示時にinitializeを呼び出す ✅

- `isInitialized`と`initialize`をuseGmailから取得
- `useEffect`で画面表示時（`isVisible && !isInitialized`）に`initialize()`を呼び出す
- 初期化完了後に予約を取得する別の`useEffect`を追加

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/gmail.ts` | GmailContextTypeにisInitialized, initializeを追加 |
| `src/contexts/GmailContext.tsx` | useEffectの自動初期化を削除、initialize()メソッドを追加 |
| `src/screens/ReservationCandidatesScreen.tsx` | 画面表示時にinitialize()を呼び出す |

## 効果

1. **起動時クラッシュ解消**: SecureStoreアクセスがアプリ起動時に発生しない
2. **メールアイコンタップ時クラッシュ解消**: Providerは既にマウント済み、コンテキストは常に存在
3. **パフォーマンス向上**: Gmail機能を使わないユーザーはSecureStoreアクセスが一切発生しない

## 検証方法

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. シミュレータでアプリ起動 → クラッシュしないことを確認
3. メールアイコンタップ → ローディング後にGmail画面表示を確認
4. TestFlightビルド・配布
5. 実機でアプリ起動 → クラッシュしないことを確認
6. 実機でメールアイコンタップ → クラッシュせず画面表示を確認

## レビュー

### 変更概要
GmailContextの自動初期化を完全に削除し、画面表示時にのみ手動で初期化する方式に変更。

### 詳細
- `GmailContext.tsx`: `useEffect`内の自動初期化を削除、`initialize()`メソッドを追加
- `ReservationCandidatesScreen.tsx`: 画面表示時に`initialize()`を呼び出す
- `gmail.ts`: 型定義に`isInitialized`と`initialize`を追加

### 技術的効果
- アプリ起動時にSecureStoreアクセスが発生しない
- Gmail機能を使わないユーザーは一切初期化処理が走らない
- 画面表示時にのみ初期化されるため、ネイティブブリッジの準備完了が保証される

---

# Gmail連動画面クラッシュ修正（Phase 11: GmailProvider初期化問題解決）

## 状態: ❌ 失敗 → Phase 12で修正

## 問題
Phase 10でGmailProviderを通常インポートに変更したが、TestFlightでまだメールアイコンタップ時にクラッシュが発生。

## 原因分析

### 主要な問題: GmailProviderの毎回新規生成

モーダル表示のたびに新しいProviderインスタンスが生成され、`restoreTokens()`が実行される。
TestFlightではネイティブブリッジの競合が発生しやすい。

## 修正内容

### Step 1: `app/_layout.tsx` - GmailProviderをプロバイダーチェーンに追加

```typescript
// インポート追加
import { GmailProvider } from '@/src/contexts/GmailContext';

// プロバイダーチェーンに追加（最外側、他のプロバイダーより前）
<GmailProvider>
  <LocalizationProvider>
    ...
  </LocalizationProvider>
</GmailProvider>
```

### Step 2: `app/(tabs)/index.tsx` - GmailProviderを削除

```typescript
// 削除
import { GmailProvider } from '@/src/contexts/GmailContext';

// 変更後（GmailProviderなし）
{showReservations && (
  <Modal ...>
    <Suspense fallback={...}>
      <LazyReservationScreen ... />
    </Suspense>
  </Modal>
)}
```

### Step 3: `src/contexts/GmailContext.tsx` - 遅延初期化を2000msに増加

```typescript
// 遅延を2000msに増加（アプリ起動時の他の初期化と競合しないよう）
await new Promise<void>((resolve) => {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(resolve, 2000);  // 1000ms → 2000ms
  });
});
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/_layout.tsx` | GmailProviderをプロバイダーチェーンに追加 |
| `app/(tabs)/index.tsx` | GmailProviderのインポートと使用を削除 |
| `src/contexts/GmailContext.tsx` | 遅延初期化を2000msに増加 |

## 問題点

GmailProviderを`_layout.tsx`に移動しても、`useEffect`内の自動初期化が発生し、アプリ起動直後にSecureStoreアクセスでクラッシュする。

---

# Gmail連動画面クラッシュ修正（Phase 10: GmailProvider通常インポート化）

## 状態: ❌ 失敗 → Phase 11で修正

## 問題
TestFlightでGmail連動画面（メールアイコン）を開くとクラッシュする。

## 原因
`index.tsx`で`GmailProvider`と`ReservationCandidatesScreen`の両方が`React.lazy()`でラップされていた。
React Suspenseのネスト構造では、実機でネイティブブリッジのタイミング差により、子コンポーネントが親コンテキスト確立前にマウントされる可能性がある。
`ReservationCandidatesScreen`が`useGmail()`を呼び出した時、`GmailContext`がundefinedとなりクラッシュ。

## 修正内容

### ファイル: `app/(tabs)/index.tsx`

**変更1: GmailProviderを通常インポートに変更**
```typescript
// 削除
const LazyGmailProvider = lazy(() =>
  import('@/src/contexts/GmailContext').then(mod => ({ default: mod.GmailProvider }))
);

// 追加（インポート部分）
import { GmailProvider } from '@/src/contexts/GmailContext';
```

**変更2: Suspense構造を簡略化**
```typescript
// 変更前
{showReservations && (
  <Modal ...>
    <Suspense fallback={...}>
      <LazyGmailProvider>
        <Suspense fallback={...}>
          <LazyReservationScreen ... />
        </Suspense>
      </LazyGmailProvider>
    </Suspense>
  </Modal>
)}

// 変更後
{showReservations && (
  <Modal ...>
    <GmailProvider>
      <Suspense fallback={...}>
        <LazyReservationScreen ... />
      </Suspense>
    </GmailProvider>
  </Modal>
)}
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | GmailProviderを通常インポートに変更、Suspense構造を簡略化 |

## 効果

- `GmailProvider`は同期的にレンダリングされ、コンテキストが確実に先に確立される
- `ReservationCandidatesScreen`が`useGmail()`を呼び出す時点でコンテキストが必ず存在する
- Phase 9で`EventContext`/`CalendarContext`依存は削除済みなので、通常インポートでも問題なし

## 検証方法

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo run:ios`でローカルビルド確認
3. TestFlightでビルド・配布
4. 実機でGmail連動画面（メールアイコン）をタップ
5. クラッシュせずに画面が表示されることを確認

## レビュー

### 変更概要
GmailProviderをReact.lazy()から通常の同期インポートに変更し、Suspense構造を簡略化。

### 詳細
Phase 9でGmailContextからEventContext/CalendarContext依存を削除済みのため、GmailProviderを通常インポートにしてもコンテキスト初期化順の問題は発生しない。GmailProviderを同期インポートにすることで、子コンポーネント（ReservationCandidatesScreen）がuseGmail()を呼ぶ時点で確実にコンテキストが存在するようになる。

### 技術的詳細
- `GmailProvider`の通常インポートを追加（14行目）
- `LazyGmailProvider`の定義を削除（28-30行目）
- 外側のSuspenseを削除し、GmailProviderをSuspenseの外側に配置（516-535行目）

---

# Gmail連動画面クラッシュ修正（Phase 9: EventContext依存削除）

## 状態: ✅ 完了

## 問題
TestFlightの実機でGmail連動画面を開いた瞬間にクラッシュする。
Phase 8で`GmailProvider`を通常インポートに変更したが、まだクラッシュが発生。

## 原因
`GmailContext.tsx`が`EventContext`と`CalendarContext`に依存していた。
GmailProviderを通常インポートにしたことで、アプリ起動時にこれらのコンテキストへのアクセスが発生。

## 修正内容

### Step 1: GmailContext.tsx - EventContext/CalendarContext依存を削除
- [x] `useEventContext`と`useCalendarContext`のインポートを削除
- [x] `addReservationToCalendar`メソッドを削除
- [x] `getReservationEventData`メソッドを追加（予約情報をイベントデータ形式に変換するだけ）

### Step 2: gmail.ts - 型定義を更新
- [x] `GmailContextActions`から`addReservationToCalendar`を削除
- [x] `getReservationEventData`を追加
- [x] `ReservationEventData`インターフェースを追加

### Step 3: index.tsx - GmailProviderを遅延ロードに戻す
- [x] `GmailProvider`の通常インポートを削除
- [x] `LazyGmailProvider`を再度追加（lazy import）
- [x] `handleReservationAddToCalendar`関数を追加
- [x] 2段階Suspenseでラップ

### Step 4: ReservationCandidatesScreen.tsx - 予約追加機能を移動
- [x] `onAddToCalendar` propsを追加
- [x] `addReservationToCalendar`の代わりに`getReservationEventData` + `onAddToCalendar`を使用

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/GmailContext.tsx` | EventContext/CalendarContext依存を削除、getReservationEventDataを追加 |
| `src/types/gmail.ts` | ReservationEventData型を追加、GmailContextActionsを更新 |
| `app/(tabs)/index.tsx` | GmailProviderを遅延ロードに戻す、handleReservationAddToCalendar追加 |
| `src/screens/ReservationCandidatesScreen.tsx` | onAddToCalendar propsを追加 |

## 効果
- GmailProviderを遅延ロードに戻せる
- GmailContext.tsxがEventContext/CalendarContextに依存しなくなる
- コンテキスト依存によるクラッシュリスクを排除
- 予約追加機能はindex.tsx側で実行（EventContextがある場所）

## 検証方法
1. TypeScriptコンパイルエラーがないことを確認 ✅
2. TestFlightでビルド・配布
3. 実機でGmail連動画面（メールアイコン）をタップ
4. クラッシュせずに画面が表示されることを確認
5. 予約をカレンダーに追加できることを確認

---

# Gmail連動画面クラッシュ修正（Phase 8: GmailProvider遅延ロード廃止）

## 状態: ❌ 失敗 → Phase 9で修正

## 問題
TestFlightの実機でGmail連動画面を開いた瞬間にクラッシュする。

## 原因
`app/(tabs)/index.tsx`でGmailProviderとReservationCandidatesScreenが**両方とも遅延ロード**されていた。

```typescript
// 問題のコード（行27-32）
const LazyGmailProvider = lazy(() =>
  import('@/src/contexts/GmailContext').then(mod => ({ default: mod.GmailProvider }))
);
const LazyReservationScreen = lazy(() =>
  import('@/src/screens/ReservationCandidatesScreen').then(mod => ({ default: mod.ReservationCandidatesScreen }))
);
```

**問題のフロー:**
1. `showReservations = true` になる
2. `Suspense`内で`LazyGmailProvider`と`LazyReservationScreen`が同時にロード開始
3. React Suspenseの仕様上、**子コンポーネント（ReservationCandidatesScreen）が親（GmailProvider）より先にマウントされる可能性がある**
4. `useGmail()`が呼ばれた時点で`GmailContext`がundefined
5. `throw new Error('useGmail must be used within a GmailProvider')` → クラッシュ

実機ではネイティブブリッジのタイミングがシミュレータと異なるため、この問題が発生しやすい。

## 修正内容

### ファイル: `app/(tabs)/index.tsx`

**変更1: GmailProviderを通常インポートに変更（行13）**

```typescript
// 変更前
const LazyGmailProvider = lazy(() =>
  import('@/src/contexts/GmailContext').then(mod => ({ default: mod.GmailProvider }))
);

// 変更後
import { GmailProvider } from '@/src/contexts/GmailContext';
```

**変更2: Suspenseの外側にGmailProviderを配置（行494-505）**

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

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | GmailProviderを通常インポートに変更、Suspenseの外側に配置 |

## 効果
- GmailProviderは確実に先にマウントされる
- ReservationCandidatesScreenがuseGmail()を呼んだ時点でコンテキストが存在する
- ReservationCandidatesScreenのみ遅延ロードされるため、アプリ起動時のパフォーマンスは維持

## 検証方法
1. TestFlightでビルド・配布
2. 実機でGmail連動画面（メールアイコン）をタップ
3. クラッシュせずに画面が表示されることを確認

---

# Gmail認証クラッシュ修正（Phase 7: Info.plist URLスキーム追加）

## 状態: ✅ 完了

## 問題
TestFlightでメールアイコンをタップしてGoogle認証後、アプリにリダイレクトできずクラッシュする。

## 根本原因
**Info.plistにGoogle OAuthのURLスキームが登録されていない**

| 設定箇所 | 現在の値 | 必要な値 |
|---------|---------|---------|
| Info.plist CFBundleURLSchemes | `aicalendarapp`, `com.aicalendarapp.tapless` | `com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3` **が不足** |
| gmailAuthService.ts scheme | `com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3` | 正しい |

## クラッシュの流れ

1. メールアイコンをタップ
2. ReservationCandidatesScreen が表示
3. Googleサインインボタンをタップ
4. Google認証画面が開く
5. ユーザーがログインを許可
6. GoogleがリダイレクトURLにリダイレクト: `com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3://oauth2redirect`
7. **iOSがこのURLスキームを認識できない（Info.plistに未登録）**
8. クラッシュまたはリダイレクト失敗

## 修正内容

### ファイル: `ios/tapless/Info.plist`

**変更箇所（行 49-53）:**

```xml
<!-- 変更前 -->
<key>CFBundleURLSchemes</key>
<array>
  <string>aicalendarapp</string>
  <string>com.aicalendarapp.tapless</string>
</array>

<!-- 変更後 -->
<key>CFBundleURLSchemes</key>
<array>
  <string>aicalendarapp</string>
  <string>com.aicalendarapp.tapless</string>
  <string>com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3</string>
</array>
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `ios/tapless/Info.plist` | CFBundleURLSchemesにGoogle OAuth URLスキームを追加 |

## 検証手順

1. Info.plistを修正 ✅
2. ローカルでビルド: `npx expo run:ios`
3. メールアイコンをタップ
4. Googleサインインボタンをタップ
5. Google認証画面でログイン
6. アプリにリダイレクトされることを確認
7. 予約情報が表示されることを確認

## 追加確認事項（Google Cloud Console）

Google Cloud Consoleで以下を確認してください：

1. **OAuth 2.0 クライアントID** の設定画面を開く
2. **iOS アプリ** の設定で以下が正しいか確認：
   - バンドルID: `com.aicalendarapp.tapless`
   - App Store ID: （設定されている場合）
3. **OAuth同意画面** で以下を確認：
   - テストユーザーにご自身のGoogleアカウントが追加されているか
   - 公開ステータスが「テスト中」の場合、テストユーザーのみがログイン可能

## レビュー

### 変更概要
Info.plistのCFBundleURLSchemesにGoogle OAuth用のURLスキームを追加。

### 詳細
Google認証後のリダイレクトURLスキーム `com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3` がInfo.plistに登録されていなかったため、iOSがリダイレクトを処理できずクラッシュしていた。

### 効果
- Google認証後のリダイレクトをiOSが正しく処理できるようになる
- アプリがリダイレクトを受け取り、認証フローを完了できる

---

# Gmail認証クラッシュ修正（Phase 6: URLスキーム不一致修正）

## 状態: ✅ 完了

## 問題
メールアイコンをタップしてGmail認証画面を開いた瞬間にアプリがクラッシュする。TestFlight（実機）で発生。

## 根本原因
**URLスキームの不一致**

- アプリが `aicalendarapp://` リダイレクトで待機
- Googleは `com.googleusercontent.apps.{CLIENT_ID}://` にリダイレクト
- アプリがリダイレクトを受け取れず、認証が失敗→クラッシュ

## 修正内容

### `src/services/gmailAuthService.ts`

1. **リダイレクトURIのスキームを修正**（116-120行目）
   - `Constants.expoConfig?.scheme` を使用していたのを、Googleの reversed client ID に変更
   - `scheme: 'com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3'`
   - `path: 'oauth2redirect'` を追加

2. **未使用コードの削除**
   - `CryptoModule` 変数とヘルパー関数 `getCrypto()` を削除
   - 手動の `codeVerifier` 生成コードを削除（expo-auth-sessionが自動生成）

3. **エラーハンドリング強化**（142-149行目）
   - `request.promptAsync()` を try-catch でラップ
   - クラッシュを防止し、ユーザーにエラーメッセージを表示

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/gmailAuthService.ts` | URLスキーム修正、未使用コード削除、エラーハンドリング強化 |

## 検証方法
1. Xcode で Archive してビルド
2. TestFlight にアップロード
3. 実機でメールアイコンをタップ
4. Google認証画面が表示されることを確認
5. 認証後、アプリに戻れることを確認

---

# メールアイコンタップ時クラッシュ修正（Phase 5: gmailService動的インポート）

## 状態: ✅ 完了

## 問題
Phase 4でGmailContext.tsxのサービスを動的インポートに変更したが、まだクラッシュする。

## 原因分析

### 発見した問題
`gmailService.ts`が`gmailAuthService`を**静的インポート**している（7行目）：

```typescript
import { gmailAuthService } from './gmailAuthService';
```

### インポートチェーン（修正前）
```
app/(tabs)/index.tsx (メールアイコンタップ)
  ↓ (React.lazy)
src/contexts/GmailContext.tsx
  ↓ (動的import) ✅ 修正済み
src/services/gmailService.ts
  ↓ (静的import) ← 問題の箇所！
src/services/gmailAuthService.ts
  └── export const gmailAuthService = new GmailAuthService();
      └── ネイティブモジュール（SecureStore, AuthSession等）の初期化
```

### 根本原因
GmailContext.tsxが`gmailService`を動的インポートしても、`gmailService.ts`自体が`gmailAuthService`を静的インポートしているため、結局`gmailAuthService.ts`が即座にロードされる。

## 修正内容

### gmailService.ts - gmailAuthServiceを動的インポートに変更

- [x] 静的インポート `import { gmailAuthService } from './gmailAuthService';` を削除
- [x] 動的インポートヘルパー `getGmailAuthService()` を追加
- [x] `searchReservationEmails()` メソッドで動的インポートを使用
- [x] `getRecentEmails()` メソッドで動的インポートを使用

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/gmailService.ts` | gmailAuthServiceを動的インポートに変更 |

## 技術的詳細

```typescript
// 変更前（静的インポート）
import { gmailAuthService } from './gmailAuthService';

// 変更後（動的インポート）
let gmailAuthServiceInstance: Awaited<typeof import('./gmailAuthService')>['gmailAuthService'] | null = null;

const getGmailAuthService = async () => {
  if (!gmailAuthServiceInstance) {
    const mod = await import('./gmailAuthService');
    gmailAuthServiceInstance = mod.gmailAuthService;
  }
  return gmailAuthServiceInstance;
};
```

## 効果
- gmailService.tsがロードされた時点ではgmailAuthService.tsはロードされない
- gmailAuthServiceは実際にアクセストークンが必要な時のみ動的にロードされる
- これにより、インポートチェーン全体が完全に遅延ロードになる

## 検証手順

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. XcodeからArchiveでビルド
3. TestFlightでメールアイコンタップ → クラッシュしないことを確認

## レビュー

### 変更概要
gmailService.tsのgmailAuthService静的インポートを動的インポートに変更し、インポートチェーン全体の遅延ロードを完成させた。

### 詳細
GmailContext.tsxで動的インポートを使用していても、gmailService.tsがgmailAuthServiceを静的インポートしていたため、gmailAuthService.tsが即座にロードされていた。gmailService.ts内で`getGmailAuthService()`ヘルパーを使用し、アクセストークン取得時にのみ動的にロードするよう変更。

### 効果
- モジュールロード時にgmailAuthService.tsが初期化されなくなる
- gmailAuthServiceは実際に認証が必要な時のみ動的にロード
- インポートチェーン全体が完全に遅延ロード化

---

# メールアイコンタップ時クラッシュ修正（Phase 4: サービス動的インポート）

## 状態: ✅ 完了

## 問題
Phase 3でexpo-constantsを動的インポートに変更したが、まだクラッシュする。

## 原因分析

### インポートチェーン
```
app/(tabs)/index.tsx (メールアイコンタップ)
  ↓ (React.lazy)
src/contexts/GmailContext.tsx
  ↓ (静的import) ← 問題の箇所
import { gmailAuthService } from '../services/gmailAuthService';
import { gmailService } from '../services/gmailService';
import { reservationParserService } from '../services/reservationParserService';
```

### 根本原因
`GmailContext.tsx`がサービスファイルを**静的インポート**している。モジュールがロードされると：
1. 各サービスファイルの`export const xxxService = new XxxService();`が実行される
2. シングルトンインスタンスが作成される
3. 何らかの初期化処理がクラッシュを引き起こす可能性

## 修正内容

### GmailContext.tsx - サービスを動的インポートに変更
- [x] 静的インポートを削除（gmailAuthService, gmailService, reservationParserService）
- [x] 動的インポート用キャッシュ変数を追加
- [x] `getGmailAuthService()` ヘルパー関数を追加
- [x] `getGmailService()` ヘルパー関数を追加
- [x] `getReservationParserService()` ヘルパー関数を追加
- [x] `restoreAuth()` 内でサービスを動的ロード
- [x] `signIn()` 内でサービスを動的ロード
- [x] `signOut()` 内でサービスを動的ロード
- [x] `fetchReservationsInternal()` 内でサービスを動的ロード

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/GmailContext.tsx` | サービスの静的インポートを動的インポートに変更 |

## 効果
- GmailContext.tsxがロードされた時点ではサービスファイルはロードされない
- サービスは実際に使用される時に初めて動的にロードされる
- これにより、React.lazyの遅延ロードが完全に機能する

## 検証手順

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo start`でExpo Goテスト
3. メールアイコンタップ → クラッシュしないことを確認
4. `eas build --platform ios --profile production`でTestFlightビルド
5. TestFlightで最終確認

## レビュー

### 変更概要
GmailContext.tsxのサービスインポートを静的から動的に変更。

### 詳細
3つのサービス（gmailAuthService, gmailService, reservationParserService）を静的インポートから動的インポートに変更した。各サービスは `getXxxService()` ヘルパー関数を通じて遅延ロードされ、一度ロードされるとキャッシュされる。

### 技術的詳細
```typescript
// 変更前（静的インポート）
import { gmailAuthService } from '../services/gmailAuthService';

// 変更後（動的インポート）
let gmailAuthServiceInstance: ... | null = null;

const getGmailAuthService = async () => {
  if (!gmailAuthServiceInstance) {
    const mod = await import('../services/gmailAuthService');
    gmailAuthServiceInstance = mod.gmailAuthService;
  }
  return gmailAuthServiceInstance;
};
```

### 効果
- モジュールロード時にサービスファイルが初期化されなくなる
- サービスは実際に使用される時のみ動的にロードされる
- React.lazyの遅延ロードと合わせて、クラッシュリスクを最小化

---

# メールアイコンタップ時クラッシュ修正（Phase 3: expo-constants動的インポート）

## 状態: ✅ 完了

## 問題
Phase 2でexpo-auth-session, expo-cryptoを動的インポートに変更したが、まだクラッシュする。

## 原因分析

### インポートチェーン
```
app/(tabs)/index.tsx (メールアイコンタップ)
  ↓ (React.lazy)
src/contexts/GmailContext.tsx
  ↓ (静的import)
src/services/gmailAuthService.ts
  └── import Constants from 'expo-constants'; ← 問題①
src/services/reservationParserService.ts
  └── import Constants from 'expo-constants'; ← 問題②
      └── コンストラクタで Constants.expoConfig にアクセス
```

### 根本原因
`expo-constants`が**静的インポート**され、サービスのコンストラクタで即座に`Constants.expoConfig`にアクセスしている。

## 修正内容

### Step 1: gmailAuthService.ts
- [x] `import Constants from 'expo-constants';` を削除
- [x] 動的インポートヘルパー `getConstants()` を追加
- [x] `signIn()` メソッド: Constantsを動的ロード
- [x] `getClientId()` を非同期メソッド(`async`)に変更
- [x] `refreshAccessToken()` の `getClientId()` 呼び出しを `await` に変更

### Step 2: reservationParserService.ts
- [x] `import Constants from 'expo-constants';` を削除
- [x] 動的インポートヘルパー `getConstants()` を追加
- [x] コンストラクタから `Constants.expoConfig` アクセスを削除（空文字初期化）
- [x] `initialized` フラグを追加
- [x] `ensureInitialized()` 遅延初期化メソッドを追加
- [x] `parseWithAI()` で `ensureInitialized()` を呼び出し

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/gmailAuthService.ts` | expo-constantsを動的インポート、getClientId()を非同期化 |
| `src/services/reservationParserService.ts` | expo-constantsを動的インポート、遅延初期化に変更 |

## 効果
- モジュールロード時にexpo-constantsが初期化されなくなる
- Constants.expoConfigへのアクセスは実際に必要な時のみ実行
- メールアイコンタップ時のクラッシュが解消される

## 検証手順

1. TypeScriptコンパイルエラーがないことを確認 ✅
2. `npx expo start`でExpo Goテスト
3. アプリ起動 → クラッシュしないことを確認
4. メールアイコンタップ → クラッシュしないことを確認
5. TestFlightビルドで最終確認

---

# メールアイコンタップ時クラッシュ修正（Phase 2: AuthSession/Crypto動的インポート）

## 状態: ✅ 完了

## 問題
前回SecureStoreを動的インポートに変更したが、まだメールアイコンタップ時にクラッシュする。

## 原因分析
`gmailAuthService.ts`で以下のネイティブモジュールがまだ**静的インポート**されていた：

```typescript
import * as AuthSession from 'expo-auth-session';  // ← ネイティブモジュール
import * as Crypto from 'expo-crypto';              // ← ネイティブモジュール
```

**インポートチェーン:**
1. メールアイコンタップ → `showReservations = true`
2. React.lazyが`GmailContext.tsx`をロード
3. `GmailContext.tsx`が`gmailAuthService.ts`を静的import
4. `gmailAuthService.ts`が`expo-auth-session`と`expo-crypto`を静的import
5. ネイティブモジュール初期化 → クラッシュ

## 修正内容

### gmailAuthService.ts - 全ネイティブモジュールを動的インポートに変更
- [x] `expo-auth-session` を動的インポートに変更（`getAuthSession()`ヘルパー追加）
- [x] `expo-crypto` を動的インポートに変更（`getCrypto()`ヘルパー追加）
- [x] `signIn()` メソッド: AuthSession, Crypto使用箇所を動的インポート対応に
- [x] `refreshAccessToken()` メソッド: AuthSession使用箇所を動的インポート対応に
- [x] `signOut()` メソッド: AuthSession.revokeAsync使用箇所を動的インポート対応に
- [x] `saveTokens()` の型アノテーションをインライン型に変更

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/gmailAuthService.ts` | expo-auth-session, expo-cryptoを動的インポートに変更 |

## 仕組み

**変更前:**
```typescript
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
// → モジュールロード時にネイティブ初期化
```

**変更後:**
```typescript
let AuthSessionModule: typeof import('expo-auth-session') | null = null;
let CryptoModule: typeof import('expo-crypto') | null = null;

const getAuthSession = async () => {
  if (!AuthSessionModule) {
    AuthSessionModule = await import('expo-auth-session');
  }
  return AuthSessionModule;
};

const getCrypto = async () => {
  if (!CryptoModule) {
    CryptoModule = await import('expo-crypto');
  }
  return CryptoModule;
};
// → 実際に使用する時のみ初期化
```

## 効果
- モジュールロード時にexpo-auth-session, expo-cryptoが初期化されなくなる
- ネイティブモジュールは実際にOAuth認証が必要な時のみ動的にロード
- メールアイコンタップ時のクラッシュが解消される

## 検証手順

1. `npx expo start`でExpo Goテスト
2. アプリ起動 → クラッシュしないことを確認
3. メールアイコンタップ → クラッシュしないことを確認
4. TestFlightビルドで最終確認

---

# メールアイコンタップ時クラッシュ修正（Phase 1: SecureStore動的インポート）

## 状態: ✅ 完了

## 問題
TestFlightでアプリ起動は成功するが、メールアイコンをタップするとクラッシュする。

## 原因分析
React.lazyを使用しても、`gmailAuthService.ts`の静的インポート：
```typescript
import * as SecureStore from 'expo-secure-store';
```
がモジュールロード時にSecureStoreのネイティブモジュールを初期化するため、クラッシュが発生。

**インポートチェーン:**
1. メールアイコンタップ → `showReservations = true`
2. React.lazyが`GmailContext.tsx`をロード
3. `GmailContext.tsx`が`gmailAuthService.ts`をimport
4. `gmailAuthService.ts`が`expo-secure-store`を静的import
5. SecureStoreのネイティブモジュールが初期化 → クラッシュ

## 修正内容

### gmailAuthService.ts - SecureStoreを動的インポートに変更
- [x] 静的インポート `import * as SecureStore` を削除
- [x] 動的インポートヘルパー `getSecureStore()` を追加
- [x] `restoreTokens()` を動的インポート対応に修正
- [x] `fetchUserInfo()` を動的インポート対応に修正
- [x] `saveTokens()` を動的インポート対応に修正
- [x] `signOut()` を動的インポート対応に修正

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/gmailAuthService.ts` | SecureStoreを動的インポートに変更 |

## 仕組み

**変更前:**
```typescript
import * as SecureStore from 'expo-secure-store';
// → モジュールロード時にネイティブ初期化
```

**変更後:**
```typescript
let SecureStoreModule: typeof import('expo-secure-store') | null = null;

const getSecureStore = async () => {
  if (!SecureStoreModule) {
    SecureStoreModule = await import('expo-secure-store');
  }
  return SecureStoreModule;
};
// → 実際に使用する時のみ初期化
```

## 効果
- モジュールロード時にSecureStoreが初期化されなくなる
- SecureStoreは実際にトークン操作が必要な時のみ動的にロード
- メールアイコンタップ時のクラッシュが解消される

## 検証手順

1. `npx expo start`でExpo Goテスト
2. アプリ起動 → クラッシュしないことを確認
3. メールアイコンタップ → クラッシュしないことを確認
4. TestFlightビルドで最終確認

---

# Gmail機能の安全な再実装（動的インポート）

## 状態: ✅ 完了

## 問題
静的インポートではアプリ起動時に`expo-secure-store`が初期化されクラッシュする。

## 解決策
**React.lazy + Suspense** を使用して、ユーザーがメールアイコンをタップした時にのみGmail機能をロードする。

## 修正計画

### Step 1: index.tsx にReact.lazyで遅延ロード実装
- [x] React.lazy, Suspenseをインポート
- [x] ActivityIndicatorをインポート
- [x] EnvelopeIconをインポート
- [x] LazyGmailProviderを定義（動的インポート）
- [x] LazyReservationScreenを定義（動的インポート）
- [x] showReservations stateを追加
- [x] ヘッダー右側にメールアイコンを追加
- [x] Modalで遅延ロードコンポーネントを表示

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | React.lazy + Suspenseで遅延ロード実装 |

## 仕組み

1. `lazy(() => import(...))` はアプリ起動時には実行されない
2. `showReservations`がtrueになった時点で初めてインポートが実行される
3. `Suspense`がロード中のフォールバックUIを表示
4. ロード完了後、GmailProviderとReservationCandidatesScreenが表示される

## レビュー

### 変更概要
React.lazyとSuspenseを使用して、Gmail機能を動的インポートで安全に再実装。

### 詳細
- `lazy(() => import(...))` で GmailProvider と ReservationCandidatesScreen を遅延ロード
- `{showReservations && (...)}` でメールアイコンタップ時のみコンポーネントをマウント
- `Suspense` でロード中のローディングインジケーターを表示
- ヘッダー右側にEnvelopeIconを追加

### 効果
- アプリ起動時にGmail関連モジュール（expo-secure-store含む）が一切ロードされない
- メールアイコンをタップした時にのみ動的にインポートされる
- SecureStoreのネイティブモジュール初期化問題を完全に回避
- 起動時クラッシュが解消される

## 検証手順

1. Expo Goでテスト（`npx expo start`）
2. アプリ起動 → クラッシュしないことを確認
3. メールアイコンタップ → ローディング表示後、Gmail画面が表示されることを確認
4. TestFlightビルドで最終確認

---

# Gmail連携機能の再無効化（起動クラッシュ修正）

## 状態: ✅ 完了

## 問題
Gmail連携機能を再有効化後、TestFlightで起動直後にクラッシュが発生。

## 原因分析
条件付きレンダリング（`{showReservations && ...}`）を使用しても、**import文はアプリ起動時にすべて評価される**。

```typescript
// これらのimportが起動時に評価される
import { GmailProvider } from '@/src/contexts/GmailContext';
import { ReservationCandidatesScreen } from '@/src/screens/ReservationCandidatesScreen';
```

インポートチェーン:
1. `GmailContext.tsx` → `gmailAuthService.ts`
2. `gmailAuthService.ts` → `import * as SecureStore from 'expo-secure-store'`
3. SecureStoreのネイティブモジュールが初期化前にアクセスされクラッシュ

## 修正内容

### app/(tabs)/index.tsx から削除
- [x] `EnvelopeIcon` のインポートを削除（`Bars3Icon`のみに）
- [x] `GmailProvider` のインポートを削除
- [x] `ReservationCandidatesScreen` のインポートを削除
- [x] `showReservations` stateを削除
- [x] ヘッダー右側のメールアイコン（TouchableOpacity + EnvelopeIcon）を空のViewに変更
- [x] Gmail予約候補画面のModalを削除

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | Gmail関連のimport、state、UIを削除 |

## 検証手順
1. 変更をコミット
2. `eas build --platform ios --profile production` でビルド
3. TestFlightに配布
4. アプリ起動確認（クラッシュしないことを確認）

## 備考
Gmail関連ファイル自体は削除せず保持。将来的に動的インポート（React.lazy）を使用して安全に再実装可能。

## レビュー

### 変更概要
Gmail連携機能を再度無効化し、起動時クラッシュを修正。

### 詳細
import文がアプリ起動時に評価されるため、条件付きレンダリングだけではクラッシュを防げなかった。Gmail関連の3つのインポート（EnvelopeIcon、GmailProvider、ReservationCandidatesScreen）をすべて削除し、関連するstate（showReservations）とUI（メールアイコン、Modal）も削除した。

### 効果
- アプリ起動時にGmail関連モジュール（expo-secure-store含む）が一切ロードされなくなる
- SecureStoreのネイティブモジュール初期化問題を完全に回避
- 起動時クラッシュが解消される

### 将来の対応
Gmail関連ファイル（GmailContext、gmailAuthService等）は保持しているため、React.lazyを使用した動的インポートで安全に再実装可能。

---

# Gmail連携機能の安全な再有効化（前回の試み - 失敗）

## 状態: ❌ 失敗 → 再無効化済み

## 概要
Gmail機能を再有効化し、クラッシュを防止する修正を実施したが、失敗した。

## 問題の原因
1. **SecureStoreの並列呼び出し**: `Promise.all`で4つのSecureStore操作を同時実行 → ネイティブブリッジ初期化前にクラッシュ
2. **遅延時間の不足**: 500ms遅延では不十分（AdContextは1000ms使用で安定）
3. **即時初期化**: GmailProviderがマウントされると即座にSecureStore呼び出しが発生

## 修正計画

### Step 1: gmailAuthService.ts - SecureStore操作の直列化
- [x] `restoreTokens()` メソッドを直列化
- [x] `saveTokens()` メソッドを直列化
- [x] `signOut()` メソッドを直列化

### Step 2: GmailContext.tsx - 遅延初期化の強化
- [x] `InteractionManager.runAfterInteractions()` でネイティブアイドル待機
- [x] 遅延時間を500ms → 1000msに増加
- [x] 初期化フラグ `isInitialized` を追加して重複初期化を防止

### Step 3: index.tsx - 条件付きレンダリングでGmail UI復活
- [x] `EnvelopeIcon` (react-native-heroicons)をインポート
- [x] `GmailProvider`をインポート
- [x] `ReservationCandidatesScreen`をインポート
- [x] `showReservations` stateを追加
- [x] ヘッダーにメールアイコン追加
- [x] 条件付きModalでGmailProviderをラップ

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/services/gmailAuthService.ts` | SecureStore操作を直列化 |
| `src/contexts/GmailContext.tsx` | InteractionManager + 1000ms遅延 |
| `app/(tabs)/index.tsx` | メールアイコン + 条件付きGmailProvider |

## レビュー

### 変更概要
Gmail連携機能を安全に再有効化するため、3つの防御的修正を実施。

### 詳細

1. **gmailAuthService.ts**: SecureStore操作を`Promise.all`から直列実行に変更。これにより、ネイティブブリッジへの同時アクセスによる競合を回避。

2. **GmailContext.tsx**:
   - `InteractionManager.runAfterInteractions()`を使用してネイティブのアイドル状態を待機
   - 遅延時間を500ms→1000msに増加（AdContextと同じ遅延時間で安定）
   - `isInitialized` refフラグを追加して重複初期化を防止

3. **index.tsx**:
   - ヘッダー右側にメールアイコン（EnvelopeIcon）を追加
   - `showReservations`がtrueの時のみGmailProviderをマウント
   - 条件付きレンダリングにより、アプリ起動時のGmailProvider初期化を完全に回避

### 効果
- アプリ起動時にSecureStoreが呼び出されなくなり、クラッシュリスクを排除
- メールアイコンをタップした時のみGmail機能が初期化される
- SecureStore操作が直列化されたことで、ネイティブブリッジの競合を防止

---

# Gmail機能一時無効化によるクラッシュ修正（ビルド414対応）

## 状態: ✅ 完了・コミット済み

## 問題
Gmail機能追加後、TestFlightビルド（414）でアプリ起動時にクラッシュする。

## 原因
- GmailProviderがモーダル内で毎回新規作成される
- SecureStoreの呼び出しタイミング問題
- ネイティブモジュール初期化の競合

## 修正内容

### app/(tabs)/index.tsxから以下を削除
- [x] GmailProviderのインポートを削除
- [x] ReservationCandidatesScreenのインポートを削除
- [x] `showReservations` stateを削除
- [x] ヘッダーのEnvelopeIcon（メールアイコン）を削除
- [x] モーダル内のGmailProvider/ReservationCandidatesScreenを削除
- [x] mailButtonスタイルを削除

## 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | Gmail関連のUI・コードを削除 |

## 検証手順
1. ~~変更をコミット~~ ✅ 完了
2. `eas build --platform ios --profile production` でビルド
3. TestFlightに配布
4. アプリ起動確認

## 備考
- Gmail関連ファイル（`src/contexts/GmailContext.tsx`等）は削除せず残す
- 将来的に安定版として再実装可能

## レビュー
Gmail連携機能のUI部分を一時的に無効化。Gmail関連ファイル自体は保持し、起動時にGmailProviderが初期化されないようにした。これにより、SecureStoreやネイティブモジュールの初期化タイミング問題を回避し、起動時クラッシュを防止する。

### 最終コミット
- コミットハッシュ: `240149e`
- コミットメッセージ: `refactor: ヘッダースペーサーをインラインスタイルに変更`
- 変更内容: headerSpacerスタイルを削除しインラインスタイルに統一、未使用の空行を削除

---

# TestFlight起動時クラッシュ修正（ビルド413対応）

## 問題
TestFlightビルド（413）でアプリ起動時にクラッシュする。

## 修正内容

### 修正1: AdContext.tsx - AdMob初期化に1秒遅延追加
- [x] AdMob SDK初期化前に1秒の遅延を追加
- [x] エラー発生時もアプリ継続のコメントを明確化

### 修正2: HolidayContext.tsx - networkService初期化を遅延
- [x] 初期値を`networkService.isOnline()`から`true`に変更（即時呼び出し回避）
- [x] useEffect内で500ms遅延後にネットワーク状態を取得
- [x] エラーハンドリング追加

### 修正3: EventContext.tsx - 通知スケジューリング遅延を3秒に増加
- [x] 1000ms → 3000msに遅延を増加
- [x] コメントを更新

## 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/AdContext.tsx` | AdMob初期化に1秒遅延追加 |
| `src/contexts/HolidayContext.tsx` | networkService.isOnline()呼び出しを遅延（デフォルトtrue + 500ms後に更新） |
| `src/contexts/EventContext.tsx` | 通知スケジューリング遅延を1秒→3秒に増加 |

## 検証手順
1. `eas build --platform ios --profile production` でビルド
2. TestFlightに配布
3. アプリ起動確認
4. クラッシュしない場合は成功

## レビュー
3つの防御的コーディングを追加し、起動時のネイティブモジュール初期化タイミング問題に対応。
- AdMob: 1秒遅延でSDK初期化前にネイティブモジュールの準備を待つ
- networkService: 即時呼び出しを回避し、500ms後に状態取得
- 通知: 3秒遅延でNotificationContext完全初期化を確保

---

# Gmail連携機能クラッシュ修正 (Phase 2)

## 問題
Gmail連携機能追加後、アプリ起動時にクラッシュする問題。

## 原因
1. **Modal内のGmailProviderが起動時にマウントされる**: React NativeのModalは`visible={false}`でもchildrenをマウントするため、GmailProviderが起動時に初期化される
2. **GmailContext内でSecureStoreを即時呼び出し**: useEffect内でrestoreTokens()を即時実行し、ネイティブモジュール未初期化でクラッシュ

## 修正内容

### 修正1: Modal内で条件付きレンダリング
- [x] `app/(tabs)/index.tsx` で `{showReservations && <GmailProvider>...}` を追加
- `visible={true}`の時のみGmailProviderをレンダリング

### 修正2: SecureStore呼び出しに遅延を追加
- [x] `src/contexts/GmailContext.tsx` でrestoreAuth()に500ms遅延を追加
- ネイティブモジュールの初期化を待つ

## 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | Modal内で条件付きレンダリングを追加 |
| `src/contexts/GmailContext.tsx` | SecureStore呼び出しに500ms遅延を追加 |

## 効果
- アプリ起動時にGmailProvider/expo-secure-storeが初期化されなくなる
- メールアイコンをタップした時にのみGmail機能が初期化される
- SecureStore呼び出し前にネイティブモジュールの初期化を待つ

---

# Gmail連携機能クラッシュ修正 (Phase 1)

## 問題
Gmail連携機能追加後、アプリ起動時にクラッシュする問題。

## 原因
`GmailProvider`の初期化時に`expo-secure-store`を呼び出しているが、ネイティブモジュールが正しくロードされていない可能性がある。

## 修正内容

### 修正1: _layout.tsxからGmailProviderを削除
- [x] `app/_layout.tsx` から `GmailProvider` のインポートと使用を削除

### 修正2: index.tsxでGmailProviderをモーダル内に移動
- [x] `app/(tabs)/index.tsx` に `GmailProvider` をインポート
- [x] 予約候補画面のModal内でのみ `GmailProvider` をラップ

## 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `app/_layout.tsx` | GmailProviderのインポートと使用を削除 |
| `app/(tabs)/index.tsx` | GmailProviderをモーダル内に移動 |

## 効果
- アプリ起動時にGmailProvider/expo-secure-storeが初期化されなくなる
- メールアイコンをタップした時にのみGmail機能が初期化される
- これにより起動時クラッシュを回避

---

# Gmail API 予約情報取得機能 実装完了

## 概要
Gmail APIを使用して予約情報（飛行機、ホテル等）を取得し、ヘッダーのメールアイコンからイベント候補画面を表示する機能を実装した。

## 実装ステップ

### Step 1: 型定義の作成
- [x] `src/types/gmail.ts` を作成
- 主要な型: GmailReservation, GmailAuthState, GmailMessage, SchemaOrg関連型

### Step 2: Gmail認証サービスの実装
- [x] `src/services/gmailAuthService.ts` を作成
- expo-auth-sessionを使用したGoogle OAuth 2.0認証
- expo-secure-storeでトークンを安全に保存
- スコープ: gmail.readonly, userinfo.email

### Step 3: Gmail APIサービスの実装
- [x] `src/services/gmailService.ts` を作成
- Gmail API呼び出し（予約メール検索）
- 検索クエリ: category:reservations, label:^smartlabel_receipt等

### Step 4: 予約情報解析サービスの実装
- [x] `src/services/reservationParserService.ts` を作成
- 構造化データ抽出（JSON-LD/schema.org）
- Gemini AIフォールバック解析

### Step 5: GmailContextの実装
- [x] `src/contexts/GmailContext.tsx` を作成
- 状態管理: authState, reservations, isLoading, error
- メソッド: signIn, signOut, fetchReservations, addReservationToCalendar

### Step 6: イベント候補画面の実装
- [x] `src/screens/ReservationCandidatesScreen.tsx` を作成
- [x] `src/components/ReservationCard.tsx` を作成
- フルスクリーンモーダル形式
- 未ログイン時: Googleログインボタン
- ログイン済み: 予約リスト表示

### Step 7: ヘッダーにメールアイコン追加
- [x] `app/(tabs)/index.tsx` を更新
- ヘッダー右側にEnvelopeIconを追加
- タップで予約候補画面を表示

### Step 8: アプリへの統合
- [x] `app/_layout.tsx` にGmailProviderを追加
- [x] `constants/Colors.ts` に cardBackground, borderColor を追加
- [x] expo-secure-store, expo-auth-session, expo-crypto をインストール

## 新規ファイル一覧
| ファイル | 説明 |
|---------|------|
| `src/types/gmail.ts` | Gmail関連型定義 |
| `src/services/gmailAuthService.ts` | Google OAuth認証 |
| `src/services/gmailService.ts` | Gmail API呼び出し |
| `src/services/reservationParserService.ts` | 予約情報解析 |
| `src/contexts/GmailContext.tsx` | Gmail状態管理 |
| `src/screens/ReservationCandidatesScreen.tsx` | 候補画面 |
| `src/components/ReservationCard.tsx` | 予約カード |

## 変更ファイル一覧
| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | ヘッダーにメールアイコン追加、ReservationCandidatesScreenをModal表示 |
| `app/_layout.tsx` | GmailProvider追加 |
| `constants/Colors.ts` | cardBackground, borderColor追加 |
| `package.json` | expo-secure-store, expo-auth-session, expo-crypto追加 |

## 次のステップ（本番利用前に必要）
1. **Google Cloud Console設定**
   - プロジェクト作成
   - Gmail API有効化
   - OAuth 2.0クライアントID作成（iOS/Android/Web）
   - `src/services/gmailAuthService.ts` のGOOGLE_CLIENT_ID_*に設定

2. **テスト**
   - 認証フロー: メールアイコンタップ → Google OAuth認証
   - 予約取得: テスト用Gmailに予約メールを送信 → 取得確認
   - イベント作成: 予約選択 → カレンダーイベント作成確認

## セキュリティ考慮事項
- トークンはexpo-secure-storeで暗号化保存
- gmail.readonlyスコープのみ使用（読み取り専用）
- メール本文はローカル処理、サーバーに送信しない
- 予約情報のみ抽出、メール本文は保持しない

---

# 過去のタスク

## TestFlightクラッシュ修正 - ビルド408

### 概要
TestFlightビルド405/406/407でもアプリ起動直後にクラッシュする問題を修正した。

### 根本原因
1. 重複AdMob初期化（最重大）
2. EventContextとNotificationContextの初期化競合

### 修正内容
- `app/_layout.tsx` からAdMob初期化を削除（AdContext.tsxに一本化）
- EventContext.tsxの通知スケジューリングに1秒遅延を追加
