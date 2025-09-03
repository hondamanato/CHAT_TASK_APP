# 祝日・行事表示のちらつき問題修正（完了）

## 概要
年の違うカレンダー表示時に祝日・行事が表示されたり消えたりを繰り返す問題を修正しました。

## 問題の原因

### 根本的な問題
1. **`loadHolidaysSimple`関数の不適切な依存配列**
   - `language`と`selectedColor`が依存配列に含まれていた
   - これらの値が変更されるたびに関数が再生成される
   - CustomCalendarのuseEffectが再トリガーされて不要な再読み込みが発生

2. **HolidayContext内のuseEffectでの過剰な再読み込み**
   - 言語や色の変更で5年分のデータを再取得していた
   - 表示の変更だけで済むところでAPIを再呼び出ししていた

## 修正内容

### 実装完了 ✅
- [x] `loadHolidaysSimple`関数の依存配列から`language`と`selectedColor`を削除
- [x] HolidayContext内のuseEffectの依存配列から`language`と`selectedColor`を削除  
- [x] 不要なAPI呼び出しを削減してパフォーマンスを向上

## 修正されたファイル

### `src/contexts/HolidayContext.tsx`

#### 1. loadHolidaysSimple関数の依存配列最適化（487行目）
```typescript
// 修正前
}, [loadHolidaysForMultipleYears, selectedCountry, showHolidays, showEvents, language, selectedColor]);

// 修正後  
}, [loadHolidaysForMultipleYears, selectedCountry, showHolidays, showEvents]);
```

#### 2. メインuseEffectの依存配列最適化（648行目）
```typescript
// 修正前
}, [loadHolidaysForMultipleYears, selectedCountry, showHolidays, showEvents, language, selectedColor]);

// 修正後
}, [loadHolidaysForMultipleYears, selectedCountry, showHolidays, showEvents]);
```

## 改善効果

### 1. ちらつき問題の完全解消
- **修正前**: 年変更時に祝日・行事が表示→消失→再表示を繰り返す
- **修正後**: 年変更時に一度だけ読み込んで安定して表示

### 2. パフォーマンスの大幅向上
- **不要なAPI呼び出しを削減**
  - 言語変更時: データ再取得なし（表示のみ更新）
  - 色変更時: データ再取得なし（表示のみ更新）
  - 国変更時: 必要な場合のみデータ再取得

### 3. ユーザー体験の向上
- スムーズなカレンダー操作
- 設定変更時の待機時間短縮
- 安定した祝日・行事表示

## 技術的詳細

### 依存関係の分離
- **データ取得が必要な変更**: `selectedCountry`, `showHolidays`, `showEvents`
- **表示のみの変更**: `language`, `selectedColor`

### 最適化のポイント
- 関数のメモ化を正しく活用
- useEffectの依存配列を適切に設定
- データ取得と表示処理の責任を明確に分離

この修正により、年の違うカレンダーを表示しても祝日・行事が安定して表示されるようになりました。

---

# 異なる年のカレンダー移動時の祝日・行事表示修正（完了）

## 概要
スワイプで異なる年のカレンダーに移動した時点で、祝日・行事が即座に表示されるように修正しました。

## 問題の解決

### 修正前の問題
- スワイプで年が変わっても祝日・行事が表示されない
- セルをタップしないと祝日データが読み込まれない
- `selectedDate` 変更時のみデータ取得がトリガーされていた

### 実装完了 ✅
- [x] `currentViewYear` state を追加（現在の表示年を追跡）
- [x] `handleMomentumScrollEnd` 関数で年変更検知機能を追加
- [x] 年が変わった時点で自動的に `loadHolidaysSimple` を実行
- [x] 初期表示時の祝日データ読み込みを確実にする追加処理

## 修正されたファイル

### `src/components/CustomCalendar.tsx`

#### 1. 表示年追跡 state の追加（64行目）
```typescript
const [currentViewYear, setCurrentViewYear] = useState<number>(new Date(selectedDate).getFullYear());
```

#### 2. スクロール完了時の年変更検知（382-388行目）
```typescript
// 年が変わった場合、祝日データを読み込む
const newYear = newViewDate.getFullYear();
if (newYear !== currentViewYear) {
  console.log(`年が変更されました: ${currentViewYear} → ${newYear}`);
  setCurrentViewYear(newYear);
  loadHolidaysSimple(newYear);
}
```

#### 3. 初期表示時の確実なデータ読み込み（98-103行目）
```typescript
// 初期表示時に確実に祝日データを読み込む
useEffect(() => {
  const initialYear = new Date(selectedDate).getFullYear();
  console.log(`初期表示: ${initialYear}年の祝日データを読み込み中...`);
  loadHolidaysSimple(initialYear);
}, []); // 一度のみ実行
```

## 改善効果
1. **即座の表示**: スワイプで年が変わった瞬間に祝日・行事が表示
2. **ユーザー体験向上**: セルタップ不要でデータが利用可能
3. **スムーズな操作**: 年間移動時のストレスが軽減
4. **確実な初期化**: アプリ起動時の祝日データ読み込みを保証
5. **デバッグ対応**: コンソールログで年変更とデータ読み込みを確認可能

## 動作フロー
1. カレンダー表示 → 初期年の祝日データを読み込み
2. スワイプで月移動 → 年が変わったか自動チェック
3. 年変更検知 → 新しい年の祝日データを即座に取得
4. 祝日・行事表示 → セルタップ不要で即座に表示

---

# Maximum update depth exceeded エラー修正（完了）

## 概要
HolidayContext.tsx でuseEffectの無限ループによる「Maximum update depth exceeded」エラーを完全に修正しました。

## 修正内容

### 実装完了 ✅
- [x] useCallbackの追加でReactのimportを更新
- [x] `loadHolidaysForMultipleYears`関数をuseCallbackでメモ化
- [x] 関数の引数に必要なパラメータ（selectedCountry, showHolidays等）を追加
- [x] `processHolidayDataForYear`関数の引数を拡張（language, selectedColor, selectedCountry）
- [x] `processEventsForYear`関数の引数を拡張（selectedCountry, selectedColor）
- [x] 全ての関数内で外部変数を直接参照しないように修正
- [x] useEffectの依存配列を適切に設定
- [x] HolidayContextTypeインターフェースのloadHolidays関数の型を更新
- [x] `loadHolidaysForYear`関数もuseCallbackでメモ化
- [x] **追加修正**: `loadHolidaysSimple`関数を作成（後方互換性対応）
- [x] **追加修正**: CustomCalendar.tsxで`loadHolidaysSimple`を使用

### 技術的な改善点

#### 1. 関数のメモ化
- **`loadHolidaysForMultipleYears`**: useCallbackでメモ化し、サービス依存関係を明記
- **`loadHolidaysForYear`**: 後方互換性を保ちつつuseCallbackでメモ化
- **`loadHolidaysSimple`**: CustomCalendar用の簡易版を新規追加

#### 2. 依存関係の明確化
- 外部スコープの変数を直接参照せず、全て引数として受け取る設計に変更
- 各関数の依存関係が型安全かつ明確になった

#### 3. 後方互換性の維持
- 既存のコンポーネント（CustomCalendar等）で使用されている`loadHolidays`呼び出しを壊さないよう簡易版を提供
- 2つのバージョンで柔軟な使用を可能に

#### 4. パフォーマンス最適化
- 不要な再レンダリングを防止
- API呼び出しの最適化
- メモリリークの防止

## 修正されたファイル

### 1. `src/contexts/HolidayContext.tsx`
- 1行目: Reactの import に useCallback を追加
- 21行目: HolidayContextType インターフェースの loadHolidays 型を更新
- 22行目: `loadHolidaysSimple` インターフェースを追加
- 404行目: loadHolidaysForMultipleYears関数をuseCallbackでラップ
- 477行目: loadHolidaysForYear関数をuseCallbackでラップ
- 483-487行目: `loadHolidaysSimple`関数を新規追加
- 482行目: processHolidayDataForYear関数の引数を拡張
- 536行目: processEventsForYear関数の引数を拡張
- 640行目: useEffectの依存配列を更新
- 664行目: Context valueに`loadHolidaysSimple`を追加

### 2. `src/components/CustomCalendar.tsx`
- 56行目: `loadHolidays`を`loadHolidaysSimple`に変更
- 94行目: `loadHolidays`呼び出しを`loadHolidaysSimple`に変更
- 95行目: useEffectの依存配列を`loadHolidaysSimple`に変更

## 改善効果
1. **無限ループ完全解消**: エラーの根本原因を解決
2. **パフォーマンス大幅向上**: 不要な再計算とAPI呼び出しを削減
3. **コード品質向上**: 関数の依存関係が明確で保守しやすい設計
4. **型安全性向上**: TypeScriptの恩恵を最大限活用
5. **安定性向上**: アプリのクラッシュを防止
6. **後方互換性**: 既存コンポーネントを壊すことなく修正完了

---

# BottomSheetスワイプ機能実装

## 概要
予定詳細ボトムシートをスワイプできるようにして、一定速度以上でスワイプするとボトムシートを閉じる機能を実装します。

## 実装完了内容

### 1. react-native-gesture-handlerへの移行
- PanResponderからPanGestureHandlerに移行
- react-native-reanimatedのSharedValueとuseAnimatedStyleを使用
- より滑らかで高性能なアニメーションを実現

### 2. スワイプによる閉じる機能
- **閾値設定**: 120px以上のスワイプで閉じる
- **速度検知**: 800px/s以上の速度でスワイプした場合に閉じる
- **スプリングアニメーション**: damping: 25, stiffness: 120で自然な動きを実現

### 3. 両方のボトムシートに対応
- **メインBottomSheet**: 予定一覧表示用
- **EventCreateBottomSheet**: 予定作成・編集用
- 両方に同様のスワイプ機能を実装

### 4. スクロール連携
- EventCreateBottomSheetでは、scrollViewAtTopの状態を確認
- スクロールが最上部にある時のみスワイプで閉じる動作を有効化

---

# 祝日バーの下の予定表示空白問題修正（完了）

## 概要
祝日バーの下に予定を表示する際、不要な空白が表示される問題を修正しました。

## 問題の詳細
- **症状**: 祝日バーの下に予定を追加すると、空白が生じて詰まって表示されない
- **原因**: 複数日予定の位置管理システムと新しい位置計算ロジックが競合していた
- **影響**: ユーザーが予定を追加した際の表示が美しくない

## 修正内容

### 実装完了 ✅
- [x] 複数の位置管理システムの競合を解決
- [x] 統一された位置管理システムを構築
- [x] 祝日・行事を最上部、通常予定を祝日の下に適切に配置
- [x] 複数日予定と単日予定の両方で正しい位置計算を実現

### 修正されたファイル

#### `src/components/CustomCalendar.tsx`

**1. 統一された位置管理システム（689-722行目）**
```typescript
// 統一された位置管理システム
const multiDayEventPositions = new Map<string, number>();
let globalPosition = 0;

// 優先度別に予定を分類し、位置を事前計算
const holidayEvents: EventInfo[] = [];
const scheduleEvents: EventInfo[] = [];

// 祝日・行事を最初に配置
holidayEvents.forEach((event) => {
  multiDayEventPositions.set(event.id, globalPosition);
  globalPosition++;
});

// 通常の予定を祝日・行事の後に配置
scheduleEvents.forEach((event) => {
  multiDayEventPositions.set(event.id, globalPosition);
  globalPosition++;
});
```

**2. セル内での位置管理最適化（724-859行目）**
```typescript
// セル内での位置管理（祝日を0から、通常予定を続けて配置）
let singleEventPosition = globalPosition; // 単日予定は複数日予定の後から開始

if (event.isMultiDay) {
  // 複数日予定は事前に計算された位置を使用
  const preCalculatedPosition = multiDayEventPositions.get(event.id);
  // 位置をpreCalculatedPositionで固定
} else {
  // 単日予定は連続して配置
  // singleEventPosition++で次の位置へ
}
```

## 改善効果

### 1. システム統合による安定化
- **修正前**: 2つの位置管理システムが競合し、予測不能な配置
- **修正後**: 統一されたシステムで一貫した配置

### 2. 優先度に基づく配置
- 祝日・行事: 最上部から配置（0、1、2...）
- 複数日の通常予定: 祝日・行事の後に配置
- 単日予定: すべての複数日予定の後に配置

### 3. 視覚的な改善
- 不要な空白が完全に除去
- 予定バーが詰めて表示される
- より整理された見た目

## 技術的詳細

### 統合された位置管理の仕組み
1. **事前計算フェーズ**:
   - 祝日・行事の複数日予定をグローバル位置0から配置
   - 通常の複数日予定を続けて配置
   - `globalPosition`でトータル複数日予定数を記録

2. **レンダリングフェーズ**:
   - 複数日予定は事前計算された位置を使用
   - 単日予定は`globalPosition`から開始して連続配置

### パフォーマンス最適化
- Map構造による高速な位置検索
- 重複計算の排除
- メモリ効率的な位置管理

この修正により、祝日バーと予定バーが完全に適切な位置に配置され、空白問題が根本的に解決されました。

---

# 以前の実装: カレンダー予定バー表示改善計画（完了）

## 概要
同じセル内に複数の予定バーがある場合、予定日数の多い順に並べ、同じ日数の場合は作成順に並べて重ならないように表示する機能を実装しました。

## ToDo項目

### Phase 1: 予定のソート機能改善
- [x] CustomCalendar.tsxの`calculateEventDuration`関数を改善（正確な日数計算）
- [x] `sortEventsInCell`関数のソートロジックを改善
- [x] 予定の期間を正確に計算する機能を実装

### Phase 2: EventContextの改善
- [x] CalendarEventインターフェースに`createdAt`フィールドを追加
- [x] `addEvent`関数でcreatedAtタイムスタンプを設定
- [x] `updateEvent`関数でcreatedAtを保持

### Phase 3: 予定バーのレイアウト改善
- [x] `renderEventLayer`関数の位置管理ロジックを改善
- [x] セル内での予定バーの重複を防ぐ
- [x] 複数日予定と単日予定の表示位置を最適化

### Phase 4: 視覚的改善とテスト
- [x] 予定バーの間隔とサイズを調整
- [x] 各種ケースでのテストと調整
- [x] コードの最終チェック

---

## 実装上の注意点
1. 既存のカレンダー機能を壊さないよう慎重に実装
2. パフォーマンスを考慮した効率的なソートアルゴリズム
3. 視覚的に分かりやすい予定表示

---

## レビュー

### 実装完了内容

#### 1. 予定のソート機能改善
- **`calculateEventDuration`関数**: `markedDates`から正確な期間を計算するように改善
- **`sortEventsInCell`関数**: 複数日予定を優先し、期間の長い順、同じ期間なら作成順にソート
- 予定の日数を開始日と終了日から正確に計算

#### 2. EventContextの改善
- **CalendarEventインターフェース**: `createdAt?: Date`フィールドを追加
- **`addEvent`関数**: 新しい予定作成時に`createdAt: new Date()`を設定
- **`updateEvent`関数**: 既存の`createdAt`を保持するように修正

#### 3. 予定バーのレイアウト改善
- **`renderEventLayer`関数**: 大幅に改善し、予定バーの重複を完全に防止
- **複数日予定**: 事前に位置を計算し、全ての週にわたって一貫した位置を維持
- **単日予定**: 複数日予定の後に配置し、週ごとに位置を管理

#### 4. 視覚的改善
- **予定バーの高さ**: 10px → 12pxに拡大（より見やすく）
- **予定バーの間隔**: 12px → 14pxに拡大（重複防止）
- **テキストサイズ**: 8px → 9pxに拡大（可読性向上）
- **角丸**: 2px → 3pxに拡大（より現代的なデザイン）

### 改善された機能
1. **重複解消**: 同じセル内の予定バーが重ならない
2. **優先順位**: 予定日数の多い順→作成順で並ぶ
3. **視覚的統一**: 複数日予定は週をまたいでも一貫した位置
4. **パフォーマンス**: 効率的な位置計算アルゴリズム

### 技術的詳細
- Map構造を使用した効率的な位置管理
- 複数日予定の事前計算によるパフォーマンス最適化
- TypeScript型安全性の向上
- 既存機能への影響を最小限に抑制

---

# カレンダーセルタップ時の数字重複増加問題修正（完了）

## 概要
カレンダーセルをタップするたびに予定数の表示が増加していく問題を修正しました。

## 問題の原因

### 1. mergeHolidaysAndEventsToMarkedDates関数の重複処理
- 祝日・行事データを`markedDates`にマージする際に、既存イベントの重複チェックが不十分
- 同じイベントが複数回追加される

### 2. renderRemainingCount関数のkey重複
- React要素のkeyプロパティが重複し、レンダリング時に同じ要素が複数描画される
- `more-events-${dayIndex}` のkeyでは一意性が不十分

## 修正内容

### 実装完了 ✅
- [x] `mergeHolidaysAndEventsToMarkedDates`関数で祝日・行事データの重複チェック追加
- [x] `renderRemainingCount`関数のkeyプロパティを改善
- [x] 修正の動作確認

### 1. mergeHolidaysAndEventsToMarkedDates関数の修正（204-208行目、237-241行目）
```typescript
// 重複チェック：既に同じIDのイベントが存在するかチェック
const existingEvent = merged[dateStr].events.find((e: any) => e.id === holidayEventId);
if (!existingEvent) {
  // イベントを追加
}
```

### 2. renderRemainingCount関数のkey改善（999行目）
```typescript
// 修正前
key={`more-events-${dayIndex}`}

// 修正後
key={`more-events-${dayInfo.date}-${dayIndex}-${remainingCount}`}
```

## 修正されたファイル
- `/Users/hondamanato/Chat_task＿App/ai-calendar-app/src/components/CustomCalendar.tsx`

## 改善効果

### 1. 重複表示の完全解消
- **修正前**: カレンダーセルをタップするたびに予定数が増加
- **修正後**: 正確な予定数のみ表示

### 2. Reactレンダリングの最適化
- 一意のkeyプロパティにより重複描画を防止
- より効率的なDOM更新

### 3. データ整合性の向上
- イベントIDの重複チェックにより、正確なデータ管理
- 祝日・行事データの一意性保証

## 技術的詳細

### 重複チェックの仕組み
1. **イベントID生成**: 日付・インデックス・名前を組み合わせて一意ID作成
2. **existingEvent検索**: `find`メソッドで既存イベント確認
3. **条件付き追加**: 重複がない場合のみ新規追加

### keyプロパティの改善
- **日付**: `dayInfo.date`で日付固有性
- **インデックス**: `dayIndex`でセル位置固有性  
- **カウント**: `remainingCount`で内容固有性

この修正により、カレンダーセルをタップしても予定数の表示が正確に保たれるようになりました。