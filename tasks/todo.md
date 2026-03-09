# TestFlightクラッシュ修正 - ビルド406

## 概要
TestFlightビルド405でもアプリ起動直後にクラッシュする問題を修正する。

## 根本原因（ビルド405）
**HolidayContextの無限レンダリング問題**

問題のコード（src/contexts/HolidayContext.tsx 行70-73）：
1. 毎回のレンダリングで `new GoogleCalendarService()` と `new HolidayStorageService()` が呼ばれる
2. 新しいオブジェクト参照が作成されるため、依存配列が毎回変わる
3. `loadHolidaysForMultipleYears` が毎回再作成される
4. useEffect が毎回実行される → 無限ループ

## 実装タスク

### Phase 1: HolidayContextの無限レンダリング修正

#### 1-1. HolidayContext.tsx の修正
- [x] `useMemo`をReactからのインポートに追加
- [x] `googleCalendarService`インスタンスを`useMemo`でメモ化
- [x] `holidayStorageService`インスタンスを`useMemo`でメモ化

#### 1-2. CustomCalendar.tsx の修正（オプション）
- [x] `Dimensions.get('window')`にtry-catchを追加
- [x] エラー時のフォールバック値を提供

## 修正ファイルサマリー

| ファイル | 修正内容 |
|---------|---------|
| `src/contexts/HolidayContext.tsx` | サービスインスタンスを`useMemo`でメモ化、`useMemo`をインポート追加 |
| `src/components/CustomCalendar.tsx` | Dimensions.get()にtry-catchを追加 |

## レビュー

### 変更内容の概要

**問題:**
- HolidayProviderコンポーネント内で、毎回のレンダリング時に`new GoogleCalendarService()`と`new HolidayStorageService()`が実行される
- これらの新しいオブジェクト参照が`useCallback`の依存配列に含まれているため、`loadHolidaysForMultipleYears`が毎回再作成される
- 設定変更検知の`useEffect`がこの関数を依存配列に持っているため、毎回実行される
- 結果として無限レンダリングループが発生し、アプリがクラッシュ

**解決策:**
1. `googleCalendarService`と`holidayStorageService`のインスタンス生成を`useMemo`でラップ
2. 空の依存配列`[]`を指定して、コンポーネントのライフサイクル中に一度だけ生成
3. これにより依存配列が安定し、無限ループが解消される

### 修正の詳細

**HolidayContext.tsx:**

修正前：
```typescript
const googleCalendarService = new GoogleCalendarService(
  Constants.expoConfig?.extra?.googleCalendarApiKey || 'YOUR_GOOGLE_API_KEY'
);
const holidayStorageService = new HolidayStorageService();
```

修正後：
```typescript
const googleCalendarService = useMemo(() => new GoogleCalendarService(
  Constants.expoConfig?.extra?.googleCalendarApiKey || 'YOUR_GOOGLE_API_KEY'
), []);
const holidayStorageService = useMemo(() => new HolidayStorageService(), []);
```

**CustomCalendar.tsx:**

修正前：
```typescript
const [dimensions, setDimensions] = useState(Dimensions.get('window'));
```

修正後：
```typescript
const [dimensions, setDimensions] = useState(() => {
  try {
    return Dimensions.get('window');
  } catch (error) {
    console.warn('Dimensions初期化エラー、デフォルト値を使用:', error);
    return { width: 375, height: 667, scale: 2, fontScale: 1 };
  }
});
```

### 検証方法
1. TestFlightから新しいビルド（406）をインストール
2. アプリを起動してクラッシュしないことを確認
3. カレンダー画面で祝日が正常に表示されることを確認
4. 設定変更後も正常に動作することを確認

---

## 過去の修正履歴

### ビルド403/404: RewardAdServiceの早期初期化問題
- `rewardAdService.ts`: コンストラクタから`initializeAd()`を削除、`isInitialized`フラグ追加
- `AdContext.tsx`: AdMob初期化完了後に`rewardAdService.initializeAd()`を呼ぶ
