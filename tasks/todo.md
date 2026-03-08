# ダークモード設定が反映されない問題の修正

## 概要
アプリ内の設定でダークモードをオフにしても、画面がダークモードのままになる問題を修正する。

## 原因
`src/contexts/SettingsContext.tsx`の32行目にあるダークモードの判定ロジックに問題がある:
- `isDarkMode = darkModeEnabled || systemColorScheme === 'dark'`
- OR演算により、OSのダークモード設定が有効な場合、アプリ内設定が無視される

## 実装タスク

- [x] `src/contexts/SettingsContext.tsx`の32行目を修正
  - 修正前: `const isDarkMode = darkModeEnabled || systemColorScheme === 'dark';`
  - 修正後: `const isDarkMode = darkModeEnabled;`

## 検証方法
1. アプリを起動
2. 設定画面を開く
3. ダークモードをオフに切り替える
4. 画面がライトモードに変わることを確認
5. アプリを再起動しても設定が保持されることを確認

## レビュー

### 変更内容
- `src/contexts/SettingsContext.tsx`の32行目を1箇所修正
- `isDarkMode`の判定からシステムのカラースキーム（`systemColorScheme === 'dark'`）を削除
- アプリ内の設定（`darkModeEnabled`）のみを参照するように変更

### 変更の影響
- ユーザーがアプリ内でダークモード設定を変更した場合、その設定が正しく反映される
- OSのダークモード設定に関係なく、アプリ内の設定が優先される
- `systemColorScheme`変数は未使用になるが、将来的に「システム設定に従う」オプションを追加する際に使用可能

### 完了日
2026-02-27

---

# Apple WeatherKit への移行

## 概要

天気予報APIをWeatherAPI.comからApple WeatherKitに変更する。

## 変更点サマリー

| 項目 | 現在 | 変更後 |
|------|------|--------|
| API | WeatherAPI.com | Apple WeatherKit REST API |
| 予報期間 | 14日間（実質3日） | 10日間 |
| 天気コード | 数値（1000-1282） | 文字列（Clear, Rain等） |
| 認証 | APIキー | JWT |

---

## 実装タスク

### Step 0: Apple Developer Portal 事前準備（ユーザー作業）

- [ ] WeatherKit を App ID に追加
- [ ] WeatherKit 用のキーを作成し Key ID をメモ
- [ ] .p8 ファイルをダウンロード
- [ ] 必要情報を共有: Key ID, .p8 ファイル内容

### Step 1: JWT認証サービス作成

- [ ] `src/services/weatherKitAuth.ts` を新規作成
- [ ] JWT生成ロジックを実装
- [ ] トークンの有効期限管理

### Step 2: 型定義の更新

- [ ] `src/types/weather.ts` に WeatherKit レスポンス型を追加
- [ ] WeatherKit天気コード→絵文字マッピングを追加
- [ ] WeatherKit天気コード→日本語説明マッピングを追加

### Step 3: 天気サービスの更新

- [ ] `src/services/weatherService.ts` をWeatherKit REST APIに変更
- [ ] JWT認証ヘッダーの追加
- [ ] レスポンス変換ロジックの更新
- [ ] キャッシュロジックは維持

### Step 4: 設定の更新

- [ ] `app.json` から `weatherApiKey` を削除
- [ ] WeatherKit用の設定を追加（keyId, teamId等）

### Step 5: 設定画面の更新

- [ ] `src/components/WeatherSettingsScreen.tsx` の予報期間説明を更新

### Step 6: 動作確認

- [ ] ビルド確認
- [ ] API呼び出し確認
- [ ] カレンダー各ビューで天気表示確認

---

## 注意事項

- 予報期間が14日→10日に短縮される
- JWT認証の秘密鍵（.p8）はセキュアに管理する必要あり
- Apple Developer Account（$99/年）が必要（既に所有）

---

## 必要情報（ユーザーから提供済み）

- **Key ID**: `7BCH7A263F`
- **Team ID**: `LKD5YP2DRM`
- **Service ID**: `com.aicalendarapp.tapless`
- **.p8ファイル内容**: 取得済み

---

## 実装完了

### Step 0: Apple Developer Portal 事前準備
- [x] WeatherKit を App ID に追加
- [x] WeatherKit 用のキーを作成し Key ID をメモ
- [x] .p8 ファイルをダウンロード

### Step 1: JWT認証サービス作成
- [x] `src/services/weatherKitAuth.ts` を新規作成
- [x] jose ライブラリをインストール
- [x] JWT生成ロジック・トークンキャッシュを実装

### Step 2: 型定義の更新
- [x] `src/types/weather.ts` に WeatherKit レスポンス型を追加
- [x] WeatherKit天気コード→絵文字マッピングを追加
- [x] WeatherKit天気コード→日本語説明マッピングを追加
- [x] getWeatherIcon/getWeatherDescription を両API対応に更新

### Step 3: 天気サービスの更新
- [x] `src/services/weatherService.ts` をWeatherKit REST APIに変更
- [x] JWT認証ヘッダーの追加
- [x] レスポンス変換ロジックの更新

### Step 4: 設定の更新
- [x] `app.json` から `weatherApiKey` を削除

### Step 5: 設定画面の更新
- [x] `src/components/WeatherSettingsScreen.tsx` の予報期間説明を更新

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/services/weatherKitAuth.ts` | 新規作成 - JWT認証サービス |
| `src/types/weather.ts` | WeatherKitレスポンス型・コードマッピング追加 |
| `src/services/weatherService.ts` | WeatherKit REST API対応に全面改修 |
| `app.json` | weatherApiKey削除 |
| `src/components/WeatherSettingsScreen.tsx` | 予報期間説明を更新 |
| `package.json` | joseライブラリ追加 |

### 技術詳細

| 項目 | 詳細 |
|------|------|
| API | Apple WeatherKit REST API |
| 認証 | JWT (ES256署名) |
| ライブラリ | jose |
| 予報期間 | 10日間 |
| キャッシュ | 12時間TTL (変更なし) |

### WeatherKit認証情報

| 項目 | 値 |
|------|-----|
| Team ID | LKD5YP2DRM |
| Key ID | 7BCH7A263F |
| Service ID | com.aicalendarapp.tapless |

### 検証方法

1. アプリをビルド
2. 設定 → 天気表示 → キャッシュをクリア
3. カレンダーで天気が表示されることを確認
4. コンソールで `[WeatherKit]` ログを確認

---

# TestFlightクラッシュ修正（Supabase Function方式）

## 問題

WeatherKit移行後、TestFlightでアプリがクラッシュする。

### 原因

1. **joseライブラリがReact Native非対応** - ES256署名操作が失敗
2. **秘密鍵がアプリに埋め込まれている** - セキュリティリスク

## 修正方針

**JWT生成をSupabase Edge Functionに移動**

```
[アプリ] → [Supabase Function] → [WeatherKit API]
              ↓
         JWT生成（秘密鍵はサーバー側で管理）
```

**メリット:**
- 秘密鍵がアプリに含まれない（セキュリティ向上）
- joseはDeno環境で正常動作（クラッシュ解消）
- react-native-quick-crypto不要

---

## 実装タスク

- [x] Supabase Edge Function作成 (`supabase/functions/weatherkit-proxy/index.ts`)
- [x] weatherService.tsをSupabase Function呼び出しに変更
- [x] weatherKitAuth.ts削除
- [x] joseライブラリをアプリから削除

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `supabase/functions/weatherkit-proxy/index.ts` | **新規作成** - JWT生成 + WeatherKit API呼び出し |
| `src/services/weatherService.ts` | Supabase Function呼び出しに変更 |
| `src/services/weatherKitAuth.ts` | **削除** |
| `package.json` | joseライブラリ削除 |

### Supabase Function 設計

**エンドポイント:** `POST /functions/v1/weatherkit-proxy`

**リクエスト:**
```json
{
  "lat": 35.6762,
  "long": 139.6503,
  "timezone": "Asia/Tokyo"
}
```

**レスポンス:** WeatherKit APIレスポンスをそのまま返却

### デプロイ手順

1. Supabase Secretsを設定:
```bash
supabase secrets set WEATHERKIT_KEY_ID=7BCH7A263F
supabase secrets set WEATHERKIT_TEAM_ID=LKD5YP2DRM
supabase secrets set WEATHERKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgH+vfHyOgYnLkFFTi
ozs9ztVMB/6VjvbHingGiWmKXrmgCgYIKoZIzj0DAQehRANCAASIk3UrLoorpLND
6qOoi0GtC8NMIOuE483EVgX2wf8zrVJ0hUhvL+F4U6PEaGYxz5fv8M3Dz7S5AejK
jCLDTIgj
-----END PRIVATE KEY-----"
```

2. Functionをデプロイ:
```bash
supabase functions deploy weatherkit-proxy
```

3. 動作確認:
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/weatherkit-proxy" \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"lat": 35.6762, "long": 139.6503, "timezone": "Asia/Tokyo"}'
```

### 検証方法

1. Supabase Functionをデプロイ
2. curlでFunction動作確認
3. アプリでキャッシュクリア → 天気取得
4. TestFlightで動作確認

---

# 天気アイコン「?」マーク修正

## 問題

WeatherKit移行後、一部の日付で天気アイコンが「?」（❓）で表示される。

### 原因

`src/types/weather.ts` の `WEATHERKIT_CODE_TO_ICON` マッピングに、WeatherKitが返す一部の天気コードが含まれていなかった。

---

## 実装タスク

- [x] `WEATHERKIT_CODE_TO_ICON` に不足している3つの天気コードを追加
- [x] `WEATHERKIT_CODE_TO_DESCRIPTION` に不足している3つの天気コードを追加

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/types/weather.ts` | 不足している3つのWeatherKit天気コードを追加 |

### 追加した天気コード

| コード | アイコン | 説明 |
|--------|---------|------|
| `SunShowers` | 🌦️ | 晴れ時々にわか雨 |
| `SunFlurries` | 🌨️ | 晴れ時々にわか雪 |
| `WintryMix` | 🌨️ | 雪まじりの雨 |

### 検証方法

1. アプリでキャッシュをクリア
2. カレンダーで天気が正しく表示されるか確認
3. 「?」マークが消えていることを確認

---

# 天気アイコンをSF Symbolsに変更

## 概要

天気アイコンを絵文字からApple公式のSF Symbolsに変更し、Apple天気アプリと同じ見た目にする。

## 現状

- 絵文字（☀️🌧️🌨️等）を使用
- `expo-symbols`は既にインストール済み

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/weather.ts` | SF Symbol名マッピング `WEATHERKIT_CODE_TO_SF_SYMBOL` を追加、`getWeatherSFSymbol` 関数を追加 |
| `src/contexts/WeatherContext.tsx` | `getWeatherSFSymbolForDate` 関数を追加 |
| `src/components/CustomCalendar.tsx` | `Text`を`SymbolView`に変更 |
| `src/components/WeekCalendar.tsx` | `Text`を`SymbolView`に変更 |
| `src/components/DayCalendar.tsx` | `Text`を`SymbolView`に変更 |

## SF Symbolマッピング

| WeatherKitコード | SF Symbol名 | 説明 |
|-----------------|-------------|------|
| Clear | sun.max.fill | 快晴 |
| MostlyClear | sun.max.fill | 晴れ |
| PartlyCloudy | cloud.sun.fill | やや曇り |
| MostlyCloudy | cloud.fill | ほぼ曇り |
| Cloudy | cloud.fill | 曇り |
| Foggy | cloud.fog.fill | 霧 |
| Haze | sun.haze.fill | もや |
| Smoky | smoke.fill | 煙 |
| Breezy | wind | そよ風 |
| Windy | wind | 強風 |
| Drizzle | cloud.drizzle.fill | 霧雨 |
| Rain | cloud.rain.fill | 雨 |
| HeavyRain | cloud.heavyrain.fill | 大雨 |
| IsolatedThunderstorms | cloud.bolt.fill | 局地的な雷雨 |
| ScatteredThunderstorms | cloud.bolt.fill | 散発的な雷雨 |
| StrongStorms | cloud.bolt.rain.fill | 激しい嵐 |
| Thunderstorms | cloud.bolt.rain.fill | 雷雨 |
| Flurries | cloud.snow.fill | にわか雪 |
| Snow | cloud.snow.fill | 雪 |
| HeavySnow | cloud.snow.fill | 大雪 |
| Blizzard | wind.snow | 吹雪 |
| BlowingSnow | wind.snow | 地吹雪 |
| FreezingDrizzle | cloud.sleet.fill | 着氷性霧雨 |
| FreezingRain | cloud.sleet.fill | 着氷性の雨 |
| Sleet | cloud.sleet.fill | みぞれ |
| Hail | cloud.hail.fill | 雹 |
| Hot | thermometer.sun.fill | 猛暑 |
| Frigid | thermometer.snowflake | 極寒 |
| BlowingDust | sun.dust.fill | 砂塵 |
| TropicalStorm | tropicalstorm | 熱帯性低気圧 |
| Hurricane | hurricane | ハリケーン |
| SunShowers | cloud.sun.rain.fill | 晴れ時々にわか雨 |
| SunFlurries | sun.snow.fill | 晴れ時々にわか雪 |
| WintryMix | cloud.sleet.fill | 雪まじりの雨 |

## 実装タスク

- [x] `src/types/weather.ts` に `WEATHERKIT_CODE_TO_SF_SYMBOL` マッピングを追加
- [x] `src/types/weather.ts` に `getWeatherSFSymbol` 関数を追加
- [x] `src/contexts/WeatherContext.tsx` に `getWeatherSFSymbolForDate` を追加
- [x] `src/components/CustomCalendar.tsx` をSF Symbols対応に変更
- [x] `src/components/WeekCalendar.tsx` をSF Symbols対応に変更
- [x] `src/components/DayCalendar.tsx` をSF Symbols対応に変更

## 注意事項

- `expo-symbols`はiOSのみ対応（Androidでは代替表示が必要な場合あり）
- 色はカレンダーのテーマカラーに合わせる

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/types/weather.ts` | SF Symbolマッピング `WEATHERKIT_CODE_TO_SF_SYMBOL` と `getWeatherSFSymbol` 関数を追加 |
| `src/contexts/WeatherContext.tsx` | `getWeatherSFSymbolForDate` 関数を追加 |
| `src/components/CustomCalendar.tsx` | `SymbolView` を使用した天気アイコン表示に変更 |
| `src/components/WeekCalendar.tsx` | `SymbolView` を使用した天気アイコン表示に変更 |
| `src/components/DayCalendar.tsx` | `SymbolView` を使用した天気アイコン表示に変更 |

### 技術詳細

- **ライブラリ**: `expo-symbols`（既存）
- **対応プラットフォーム**: iOS のみ（`Platform.OS === 'ios'` でチェック）
- **SF Symbol 数**: 34種類のWeatherKitコードをマッピング

### 検証方法

1. iOSシミュレータまたは実機でアプリを起動
2. 設定 → 天気表示を有効化
3. 月/週/日カレンダーで天気アイコンがApple天気アプリと同じSF Symbolsで表示されることを確認

---

# 天気表示の日付ズレ修正

## 問題

天気アイコンの表示日がカレンダーの実際の日付と1日ずれている。

## 原因

`src/services/weatherService.ts`の`transformResponse`メソッドで、WeatherKitの`forecastStart`（ISO 8601形式）を単純に`split('T')[0]`で分割していた。

WeatherKitは`forecastStart`をUTC時間で返す場合があり、これを単純に分割すると日本時間（UTC+9）との差で日付がずれる。

例：
- WeatherKit: `2026-01-21T15:00:00Z` (UTC)
- 日本時間: 2026-01-22 00:00:00
- `split('T')[0]` → `2026-01-21` （1日ずれる）

## 修正内容

`forecastStart`をJavaScriptの`Date`オブジェクトでパースし、ローカル日付に変換するよう変更。

## 実装タスク

- [x] `transformResponse`メソッドの日付処理を修正

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/weatherService.ts` | `transformResponse`メソッドの日付処理を`Date`オブジェクト使用に変更 |

### 変更前後

**変更前:**
```typescript
const date = day.forecastStart.split('T')[0];
```

**変更後:**
```typescript
const forecastDate = new Date(day.forecastStart);
const year = forecastDate.getFullYear();
const month = String(forecastDate.getMonth() + 1).padStart(2, '0');
const date = String(forecastDate.getDate()).padStart(2, '0');
const dateString = `${year}-${month}-${date}`;
```

### 検証方法

1. アプリで設定 → 天気表示 → キャッシュをクリア
2. カレンダーで天気が正しい日付に表示されることを確認
3. 今日の日付に天気アイコンが表示されることを確認

---

# 地域選択を市単位に変更

## 概要

天気表示の地域選択を県単位から市単位に変更する。
県を選択 → その県の市を選択する2段階選択UIに変更。

## 現状の構造

```json
{
  "code": "JP-13",
  "name": "東京都",
  "lat": 35.6762,
  "long": 139.6503
}
```

## 変更後の構造

```json
{
  "code": "JP-13",
  "name": "東京都",
  "cities": [
    { "code": "JP-13-shinjuku", "name": "新宿区", "lat": 35.6938, "long": 139.7035 },
    { "code": "JP-13-shibuya", "name": "渋谷区", "lat": 35.6580, "long": 139.7016 }
  ]
}
```

## 実装タスク

- [ ] `src/types/weather.ts` - City型を追加、Region型にcitiesを追加
- [ ] `src/data/regions.json` - 日本の各都道府県に主要都市を追加
- [ ] `src/components/RegionSelectionScreen.tsx` - 県選択後に市を表示するUIに変更
- [ ] `src/contexts/WeatherContext.tsx` - 市単位の選択に対応

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/weather.ts` | City型追加 |
| `src/data/regions.json` | 日本の都道府県に主要都市を追加 |
| `src/components/RegionSelectionScreen.tsx` | 2段階選択UIに変更 |
| `src/contexts/WeatherContext.tsx` | 市単位選択のロジック対応 |

---

# 市区単位の天気表示機能（Nominatim検索）

## 概要

天気アプリのように、世界中の市区単位で地域を検索・選択して天気を表示できるようにする。

## 現状

- 都道府県/州単位のハードコードされた地域リスト（`regions.json`）
- 10ヶ国のみ対応
- 国選択 → 地域選択の2段階UI

## 変更後

- 地名検索で世界中の任意の都市を選択可能
- Apple天気アプリのようなUX（検索ボックスで直接都市を検索）
- `regions.json`に依存しない

---

## 実装タスク

### Step 1: 型定義の追加
- [ ] `src/types/weather.ts` に `SearchedCity` 型を追加

### Step 2: 地名検索サービス作成
- [ ] `src/services/geocodingService.ts` を新規作成
- [ ] Nominatim APIを呼び出す関数を実装

### Step 3: 地域選択画面を検索UIに変更
- [ ] `src/components/RegionSelectionScreen.tsx` を検索UIに全面変更
- [ ] 検索ボックスで都市名入力 → 候補表示 → 選択

### Step 4: WeatherContextを更新
- [ ] 選択した都市の座標（lat/long）と名前を保存するよう変更
- [ ] `regions.json`への依存を削除

### Step 5: 設定画面の更新
- [ ] `src/components/WeatherSettingsScreen.tsx` - 選択都市名表示に変更
- [ ] `src/components/SettingsSheet.tsx` - 国選択フローを削除（検索で直接都市選択）

---

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/weather.ts` | `SearchedCity` 型追加 |
| `src/services/geocodingService.ts` | **新規作成** - Nominatim API |
| `src/components/RegionSelectionScreen.tsx` | 検索UIに全面変更 |
| `src/contexts/WeatherContext.tsx` | 座標ベースの保存に変更 |
| `src/components/WeatherSettingsScreen.tsx` | 地域表示を選択都市名に変更 |
| `src/components/SettingsSheet.tsx` | 国選択フローを削除 |

---

## 新しい地域選択フロー

```
WeatherSettingsScreen
    ↓ 「地域」をタップ
RegionSelectionScreen（検索UI）
    ↓ "渋谷" と入力
Nominatim API で検索
    ↓
候補リスト表示
  - 渋谷区, 東京都, 日本
  - Shibuya, Tokyo, Japan
    ↓ タップで選択
WeatherContext に保存
  - name: "渋谷区"
  - displayName: "渋谷区, 東京都, 日本"
  - lat: 35.6580
  - long: 139.7016
```

---

## Nominatim API 仕様

**エンドポイント:** `https://nominatim.openstreetmap.org/search`

**パラメータ:**
- `q`: 検索クエリ（都市名）
- `format`: `json`
- `addressdetails`: `1`
- `limit`: `10`
- `accept-language`: `ja`（日本語結果優先）

**レート制限:** 1秒1リクエスト

---

## 検証方法

1. アプリで設定 → 天気表示 → 地域をタップ
2. 「渋谷」「New York」「Paris」など検索
3. 候補から選択
4. カレンダーに天気が表示されることを確認

---

## 実装完了

- [x] Step 1: `src/types/weather.ts` に `SearchedCity` 型を追加
- [x] Step 2: `src/services/geocodingService.ts` を新規作成
- [x] Step 3: `src/components/RegionSelectionScreen.tsx` を検索UIに変更
- [x] Step 4: `src/contexts/WeatherContext.tsx` を座標ベースに変更
- [x] Step 5: 設定画面を更新（国選択フロー削除）

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/types/weather.ts` | `SearchedCity` 型追加 |
| `src/services/geocodingService.ts` | **新規作成** - Nominatim API呼び出し |
| `src/components/RegionSelectionScreen.tsx` | 検索UIに全面変更 |
| `src/contexts/WeatherContext.tsx` | 座標ベース保存に変更、`regions.json`依存削除 |
| `src/components/WeatherSettingsScreen.tsx` | props/Context名を更新 |
| `src/components/SettingsSheet.tsx` | 国選択フローを削除、直接地域検索へ |
| `src/components/MainSettingsScreen.tsx` | Context関数名を更新 |

### 技術詳細

| 項目 | 詳細 |
|------|------|
| 検索API | Nominatim (OpenStreetMap) |
| レート制限 | 1秒1リクエスト（デバウンス300ms） |
| データ保存 | AsyncStorage（JSON形式） |
| キャッシュキー | 座標ベース（`lat_long`形式） |

### 新しいフロー

```
設定 → 天気表示 → 地域
    ↓
検索ボックスで都市名入力
    ↓
Nominatim APIで検索
    ↓
候補リストから選択
    ↓
WeatherContextに保存 (name, displayName, lat, long)
```

### 削除されたファイル・機能

- `CountrySelectionScreen` のインポート（SettingsSheetから削除）
- 国選択フロー（`showWeatherCountrySelection` state削除）
- `regions.json` への依存（WeatherContextから削除）
- `selectedRegionCode` → `selectedCity` に変更

### 注意事項

- 既存のユーザーは地域を再設定する必要あり（AsyncStorageキーが変更）
- Nominatim APIは無料だが、User-Agentヘッダーが必要

---

# 検索履歴機能

## 概要

地域検索画面に、過去に選択した都市を新しい順に最大10件表示する。

## 実装タスク

- [ ] WeatherContextに検索履歴の保存・取得機能を追加
- [ ] RegionSelectionScreenに履歴表示UIを追加

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/WeatherContext.tsx` | 検索履歴の保存・取得・追加機能 |
| `src/components/RegionSelectionScreen.tsx` | 履歴表示UI |
| `src/components/SettingsSheet.tsx` | recentCities props追加 |

---

## 実装完了

- [x] WeatherContextに検索履歴機能を追加
- [x] RegionSelectionScreenに履歴表示UIを追加
- [x] SettingsSheetでrecentCitiesを渡す

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/WeatherContext.tsx` | `recentCities` state、`addCityToHistory` 関数追加 |
| `src/components/RegionSelectionScreen.tsx` | 履歴表示UI、「最近の検索」セクション追加 |
| `src/components/SettingsSheet.tsx` | `recentCities` propsを渡す |

### 機能詳細

| 項目 | 詳細 |
|------|------|
| 保存キー | `recent_cities` (AsyncStorage) |
| 最大履歴数 | 10件 |
| 表示順 | 新しい順（選択順） |
| 重複処理 | 同じ座標の都市は除外して先頭に移動 |

### UI仕様

- 検索ボックスが空の時に履歴を表示
- 「最近の検索」セクションヘッダー付き
- 履歴アイテムには時計アイコン（ClockIcon）を表示
- 検索結果アイテムにはピンアイコン（MapPinIcon）を表示

---

# トグルスイッチのデザイン修正

## 問題

設定画面のトグルスイッチ（六曜、プッシュ通知、ダークモード）の背景色がライトモードで暗く表示され、「重なって見える」問題が発生していた。

## 原因

3つのSwitchコンポーネントに `ios_backgroundColor="#3e3e3e"`（ダークグレー）がハードコードされており、ライトモードでも暗い背景色が適用されていた。

## 実装タスク

- [x] 六曜スイッチの `ios_backgroundColor` を修正
- [x] プッシュ通知スイッチの `ios_backgroundColor` を修正
- [x] ダークモードスイッチの `ios_backgroundColor` を修正

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/MainSettingsScreen.tsx` | 3箇所の `ios_backgroundColor` を動的に変更 |

### 変更内容

**変更前:**
```tsx
ios_backgroundColor="#3e3e3e"
```

**変更後:**
```tsx
ios_backgroundColor={isDarkMode ? '#3e3e3e' : '#e9e9eb'}
```

### 対象スイッチ

| スイッチ | 行番号 |
|---------|--------|
| 六曜 | 238行目 |
| プッシュ通知 | 271行目 |
| ダークモード | 301行目 |

### 検証方法

1. iOSシミュレータまたは実機でアプリを起動
2. 設定画面を開く
3. ライトモードで3つのトグルが正常に表示されることを確認
4. ダークモードに切り替えて正常に表示されることを確認

---

# Apple WeatherKit 帰属表示追加

## 概要

Apple WeatherKitの利用規約に準拠するため、天気表示設定画面にApple Weatherの帰属表示を追加。

## 要件

WeatherKitを使用するアプリは以下を表示する必要がある：
1. Appleの天気ロゴ
2. 法的帰属ページへのリンク（https://weatherkit.apple.com/legal-attribution.html）

## 実装タスク

- [x] `WeatherSettingsScreen.tsx` に帰属表示を追加
- [x] SF Symbols の `apple.logo` を使用
- [x] タップで法的帰属ページを開く

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/WeatherSettingsScreen.tsx` | Apple Weather帰属表示を追加、トグルスイッチの背景色を修正 |

### 追加内容

- **Appleロゴ**: SF Symbols の `apple.logo` を使用（iOS限定）
- **テキスト**: 「Weather」
- **リンク先**: `https://weatherkit.apple.com/legal-attribution.html`
- **表示位置**: 地域設定の下

### 検証方法

1. iOSシミュレータまたは実機でアプリを起動
2. 設定 → 天気表示を開く
3. 地域設定の下に「 Weather」が表示されることを確認
4. タップして法的帰属ページが開くことを確認

---

# iOS広告ID修正

## 問題

広告が表示されない。コードに設定されているIDとAdMobコンソールのIDが異なっていた。

## 修正内容

| 項目 | 修正前（誤） | 修正後（正） |
|------|-----------|----------|
| iOS App ID | `ca-app-pub-5527851762647473~8167347478` | `ca-app-pub-6055680121132329~2681014599` |
| iOS バナー広告ID | `ca-app-pub-5527851762647473/6826345644` | `ca-app-pub-6055680121132329/8724319394` |
| iOS リワード広告ID | `ca-app-pub-5527851762647473/7807124868` | `ca-app-pub-6055680121132329/1340653394` |

## 実装タスク

- [x] `app.json` の `plugins` > `react-native-google-mobile-ads` > `iosAppId` を修正
- [x] `app.json` の `extra` > `admobBannerIdIos` を修正
- [x] `app.json` の `extra` > `admobRewardIdIos` を修正
- [x] `ios/tapless/Info.plist` の `GADApplicationIdentifier` を修正

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `app.json` | iOS広告ID 3箇所を修正（App ID、バナー広告ID、リワード広告ID） |
| `ios/tapless/Info.plist` | `GADApplicationIdentifier` を修正 |

### 検証方法

1. `npx expo prebuild --clean` を実行
2. EASビルドまたはXcodeでビルド
3. TestFlightで広告が表示されることを確認

---

# 広告が表示されない問題の修正（SKAdNetwork）

## 問題

- **プラットフォーム**: iOS (TestFlight)
- **症状**: 広告エリア自体が表示されない
- **原因**: バナー広告の読み込みエラー（SKAdNetwork設定の不足）

## 実装タスク

- [x] `app.json` に SKAdNetwork 設定を追加
- [x] `AdBanner.tsx` にデバッグ情報を追加（エラーメッセージを画面に表示）

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app.json` | SKAdNetwork設定の追加 |

## 検証方法

1. `npx expo prebuild --clean` を実行
2. EASで新しいTestFlightビルドを作成
3. TestFlightでインストールして広告が表示されるか確認

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app.json` | `react-native-google-mobile-ads` プラグインに `skAdNetworkItems` を追加（50件のSKAdNetworkID） |

### SKAdNetworkとは

iOS 14以降、Appleはプライバシー保護のためにIDFA（広告識別子）へのアクセスを制限しました。SKAdNetworkは、ユーザーのプライバシーを保護しながら広告の効果測定を行うためのApple公式フレームワークです。

AdMobを含む広告ネットワークは、Info.plistにSKAdNetwork IDを登録することで広告配信が可能になります。この設定がないと、広告が配信されない場合があります。

### 追加したSKAdNetwork ID

Google AdMobおよび主要な広告パートナーのSKAdNetwork IDを50件追加しました。これには以下が含まれます：
- Google（cstr6suwn9.skadnetwork）
- Facebook/Meta
- その他の主要な広告ネットワーク

### 次のステップ

1. `npx expo prebuild --clean` を実行してネイティブプロジェクトを再生成
2. EASビルドを作成してTestFlightにアップロード
3. 広告の表示を確認

---

# 広告デバッグ表示追加（Phase 2）

## 概要

広告が表示されない問題の原因特定のため、エラーメッセージを画面に表示するように修正。

## 実装タスク

- [x] `AdBanner.tsx` にエラーメッセージ表示機能を追加

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/AdBanner.tsx` | エラー発生時にエラーメッセージを画面に表示 |

### 変更内容

1. **`Text`コンポーネントのインポート追加**
2. **`errorMessage` stateを追加** - エラーメッセージを保存
3. **`onAdFailedToLoad`でエラーメッセージを保存**
4. **エラー時にメッセージを赤文字で表示**

### 変更前後

**変更前:**
```tsx
if (bannerError) {
  return null;
}
```

**変更後:**
```tsx
if (bannerError) {
  return (
    <View style={[styles.container, styles.errorContainer, ...]}>
      <Text style={styles.errorText}>
        広告エラー: {errorMessage}
      </Text>
    </View>
  );
}
```

### 考えられるエラー原因

| エラーコード | 原因 |
|-------------|------|
| `ERROR_CODE_NO_FILL` | 広告インベントリ不足 |
| `ERROR_CODE_NETWORK_ERROR` | ネットワーク問題 |
| `ERROR_CODE_INVALID_REQUEST` | 広告ユニットID間違い |
| `ERROR_CODE_INTERNAL_ERROR` | AdMob内部エラー |

### 検証方法

1. Xcodeでビルド番号を368に更新してArchive
2. TestFlightでインストール
3. アプリを起動して広告エリアを確認
4. エラーメッセージが表示される場合、その内容を確認

---

# 広告no-fillエラー対応（本番用に戻す）

## 概要

TestFlightビルド368で`[googleMobileAds/no-fill] Request Error: No ad to show.`エラーが発生。
調査の結果、設定は正常でAdMob側の問題（no-fill）と判明。
エラー表示を本番用に戻す。

## 実装タスク

- [x] `AdBanner.tsx` のエラー表示を `return null` に戻す
- [x] 不要になったスタイル（`errorContainer`, `errorText`）を削除

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/AdBanner.tsx` | エラー表示を `return null` に戻し、不要スタイル削除 |

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/AdBanner.tsx` | エラー表示を本番用に戻し、不要なインポート・スタイルを削除 |

### 変更内容

1. **エラー表示を`return null`に戻す**
   - デバッグ用のエラーメッセージ表示を削除
   - no-fillエラー時は広告エリア自体を非表示に

2. **不要になった要素を削除**
   - `Text`コンポーネントのインポート削除
   - `errorContainer`スタイル削除
   - `errorText`スタイル削除

3. **残した要素**
   - `errorMessage` state（コンソールログでデバッグ用に使用）
   - コンソールへのエラーログ出力

### 診断結果まとめ

| 項目 | 状態 |
|------|------|
| 広告ユニットID | ✅ 正しい（INVALID_REQUESTではない） |
| SDK設定 | ✅ 正しい（リクエストが送信されている） |
| SKAdNetwork | ✅ 設定済み |
| 広告配信 | ❌ no-fill（AdMob側で配信する広告がない） |

### no-fillの原因

- TestFlight限定：App Store未公開アプリは広告配信が制限される
- 新規広告ユニット：作成後24〜48時間は配信開始に時間がかかる
- トラフィック不足：ユーザー数が少ないと広告主が入札しない

### 次のステップ

1. Xcodeでビルド番号を369に更新
2. Archive → TestFlightにアップロード
3. App Store公開後に広告表示を確認

---

# 広告IDをテスト用に変更

## 概要

app.jsonの広告IDをGoogle AdMobのテスト用IDに変更する。

## 実装タスク

- [x] `app.json` の広告IDをテスト用に変更

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app.json` | 広告IDをGoogle AdMob公式テスト用IDに変更 |

### 変更内容

| 項目 | 本番ID | テスト用ID |
|------|--------|-----------|
| iOS バナー広告 | `ca-app-pub-6055680121132329/8724319394` | `ca-app-pub-3940256099942544/2934735716` |
| Android バナー広告 | `ca-app-pub-5527851762647473/7478347021` | `ca-app-pub-3940256099942544/6300978111` |
| iOS リワード広告 | `ca-app-pub-6055680121132329/1340653394` | `ca-app-pub-3940256099942544/1712485313` |
| Android リワード広告 | `ca-app-pub-5527851762647473/6745324630` | `ca-app-pub-3940256099942544/5224354917` |

※ `ca-app-pub-3940256099942544` はGoogleが提供する公式テスト用パブリッシャーID

### 検証方法

1. アプリを起動して広告が表示されることを確認
2. テスト広告には「Test Ad」のラベルが表示される

### 注意事項

- 本番リリース前に必ず本番用IDに戻すこと

---

# イベント名入力時のキーボード完了ボタン動作修正

## 概要

手動予定作成時、イベント名を入力してキーボードの青いチェックボタン（完了ボタン）をタップした際に、キーボードが閉じてイベント名候補画面が消え、元のイベント作成画面に戻るようにする。

## 実装タスク

- [x] `EventCreateScreen.tsx` のTextInputに `onSubmitEditing` ハンドラーを追加
- [x] `Keyboard` をreact-nativeからインポート

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | `onSubmitEditing` ハンドラー追加、`Keyboard` インポート追加 |

### 変更内容

**1. Keyboardのインポート追加（12行目）:**
```typescript
import {
  ...
  Keyboard,
} from 'react-native';
```

**2. onSubmitEditingハンドラー追加（617-620行目）:**
```typescript
onSubmitEditing={() => {
  Keyboard.dismiss();
  setShowTitleSuggestions(false);
}}
```

### 検証方法

1. アプリでイベント作成画面を開く
2. イベント名を入力（例：「バイト」）
3. キーボードの青いチェックボタンをタップ
4. 期待動作：キーボードが閉じ、イベント名候補リストが消え、元のイベント作成画面が表示される

---

# イベント名入力時の候補画面表示タイミング修正

## 概要

イベント名を入力した時点では候補画面を表示せず、キーボードの青いチェックボタン（完了ボタン）をタップした時に候補画面を表示するように変更。

## 現状の問題

- `onChangeText`で文字が入力されるたびに`setShowTitleSuggestions(true)`が実行される
- 文字を入力した瞬間に候補画面に切り替わってしまう

## 新しい動作フロー

1. ユーザーがイベント名を入力 → 候補画面は**表示しない**
2. チェックボタン（完了）をタップ → 候補画面を**表示**（キーボードは閉じる）
3. もう一度チェックボタンをタップ OR 候補画面のイベント名をタップ → 候補画面を**非表示**（元の作成画面に戻る）

## 実装タスク

- [x] `onChangeText` から候補画面表示ロジックを削除（テキスト空の場合のみ非表示）
- [x] `onSubmitEditing` を候補画面のトグル動作に変更

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | `onChangeText` と `onSubmitEditing` のロジック修正 |

### 変更内容

**1. onChangeText（603-609行目）:**

変更前:
```typescript
onChangeText={(text) => {
  setTitle(text);
  if (text.length > 0) {
    console.log('タイトル入力:', text, '候補表示: true');
    setShowTitleSuggestions(true);
  } else {
    console.log('タイトルクリア、候補非表示');
    setShowTitleSuggestions(false);
  }
}}
```

変更後:
```typescript
onChangeText={(text) => {
  setTitle(text);
  // テキストが空になったら候補画面を非表示
  if (text.length === 0) {
    setShowTitleSuggestions(false);
  }
}}
```

**2. onSubmitEditing（615-621行目）:**

変更前:
```typescript
onSubmitEditing={() => {
  Keyboard.dismiss();
  setShowTitleSuggestions(false);
}}
```

変更後:
```typescript
onSubmitEditing={() => {
  Keyboard.dismiss();
  // タイトルがある場合のみ候補画面をトグル
  if (title.length > 0) {
    setShowTitleSuggestions(!showTitleSuggestions);
  }
}}
```

### 検証方法

1. アプリでイベント作成画面を開く
2. イベント名を入力（例：「バイト」）→ 候補画面は表示されない
3. キーボードの青いチェックボタンをタップ → 候補画面が表示される
4. もう一度チェックボタンをタップ（テキスト入力欄をタップしてからチェックボタン） → 候補画面が非表示になる
5. または候補画面のイベント名をタップ → 候補画面が非表示になり、選択したイベント情報が反映される

---

# イベント名入力時の候補画面表示タイミング修正（確定検出）

## 概要

Appleカレンダーと同じ動作を実現する。日本語入力の確定を検出し、確定後に候補画面を表示する。

## 要件

1. 入力中（未確定/青いアンダーライン）は候補画面を表示しない
2. 入力が確定されたら候補画面を表示
3. 候補画面表示中もキーボードを維持してイベント名を編集できる

## 解決策

完了ボタンをタップした時のみ候補画面を表示する（シンプルな方式）。

## 実装タスク

- [x] `onChangeText`は入力のみ（空の場合のみ候補非表示）
- [x] `onSubmitEditing`をキーボード維持でトグルに修正
- [x] `blurOnSubmit={false}`を追加（完了ボタンでキーボードを閉じない）

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | 完了ボタンでのみ候補画面を表示、blurOnSubmit追加 |

### 変更内容

**1. onChangeText:**
- テキストを更新
- テキストが空の場合のみ候補画面を非表示

**2. onSubmitEditing:**
- タイトルがある場合のみ候補画面をトグル

**3. blurOnSubmit={false}:**
- 完了ボタンを押してもキーボードが閉じないように設定

### 動作フロー

```
[空欄] → 文字入力 → [作成画面のまま]
                  ↓ 完了ボタン
              [候補画面表示]（キーボード維持）
                  ↓ 完了ボタン or 候補タップ
              [作成画面に戻る]
```

### 検証方法

1. アプリでイベント作成画面を開く
2. イベント名を入力 → 作成画面のまま
3. 完了ボタンをタップ → 候補画面が表示される（キーボード維持）
4. もう一度完了ボタンをタップ → 作成画面に戻る
5. 候補をタップ → 選択されて作成画面に戻る

---

# 予測変換タップ時の候補画面表示（デバウンス方式）→ キャンセル

## 概要

デバウンス方式は実装後、ユーザーの要望によりキャンセル。完了ボタンでのみ候補画面を表示する方式を維持。

## 結果

デバウンス機能は削除。従来通り完了ボタンタップ時のみ候補画面をトグルする動作。

---

# イベントタイトル入力のUX改善

## 概要

イベント名候補リストを画面切り替えではなく、入力欄の直下にインライン表示するように変更。

## 実装タスク

- [x] `onChangeText`で入力中に候補を表示
- [x] `onFocus`でテキストがあれば候補を表示
- [x] `onBlur`で候補を非表示
- [x] 候補選択時に`Keyboard.dismiss()`を呼び出す
- [x] 条件分岐を削除し、候補リストを設定項目の上にインライン表示

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | タイトル候補リストのインライン表示化 |

### 変更内容

**1. TextInputのイベントハンドラー変更:**
- `onChangeText`: テキストがあれば候補表示、空なら非表示
- `onFocus`: テキストがあれば候補表示
- `onBlur`: 200ms遅延で候補非表示（選択を可能にするため）
- `blurOnSubmit={true}`に変更

**2. 候補リストの配置変更:**
- 条件分岐（`showTitleSuggestions ? ... : ...`）を削除
- ScrollView内で候補リストを設定項目の上に配置
- `maxHeight`を200pxに変更（コンパクト表示）

**3. 候補選択時の動作:**
- 選択時に`Keyboard.dismiss()`を追加

### 変更前後

**変更前:**
```
showTitleSuggestions = true → 画面全体が候補リストに切り替わる
設定項目（終日、日時など）が見えなくなる
```

**変更後:**
```
showTitleSuggestions = true → 候補リストが入力欄の下に表示される
設定項目は候補リストの下に見えたまま
```

### UIイメージ

```
┌─────────────────────────────┐
│ ✏️ [イベント名入力欄      ] │  ← タイトル入力
├─────────────────────────────┤
│ 🕐 バイト    09:00~17:00   │  ← 候補リスト
│ 🕐 バイト面接 14:00~15:00   │
├─────────────────────────────┤
│ 終日スイッチ                │  ← 設定項目
│ 開始日時                    │
│ 終了日時                    │
└─────────────────────────────┘
```

### 検証方法

1. イベント作成画面を開く
2. イベント名を入力 → 入力欄の下に候補リストが表示される
3. 設定項目（終日、日時など）は候補リストの下に見える
4. 候補をタップ → タイトルが入力され、キーボードが閉じる

---

# イベント名入力のUX修正（TimeTree方式）

## 問題点

現在の実装では、ひらがな入力中でも候補画面が表示されてしまう。

## 要件

1. **ひらがなのみの場合は候補画面を表示しない**
2. **ひらがな以外を含む場合は即座に候補画面を表示**

## 変更対象ファイル

- `src/screens/EventCreateScreen.tsx`

## 実装タスク

- [x] `isOnlyHiragana` 関数を追加
- [x] `onChangeText` をひらがな判定ロジックに変更
- [x] `debounceTimerRef` を削除

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | ひらがな判定方式に変更 |

### 変更内容

**1. `isOnlyHiragana` 関数を追加（54-57行目）:**
```typescript
const isOnlyHiragana = (text: string): boolean => {
  return /^[\u3040-\u309F\s]*$/.test(text);
};
```

**2. `debounceTimerRef` を削除:**
- useRefによるデバウンスタイマーを削除
- タイマー処理が不要に

**3. `onChangeText` をひらがな判定に変更:**
```typescript
onChangeText={(text) => {
  setTitle(text);
  if (text.length === 0) {
    setShowTitleSuggestions(false);
  } else if (isOnlyHiragana(text)) {
    // ひらがなのみ → 候補非表示
    setShowTitleSuggestions(false);
  } else {
    // ひらがな以外を含む → 即座に候補表示
    setShowTitleSuggestions(true);
  }
}}
```

### 動作フロー

```
「ばいと」入力 → ひらがなのみ → 候補非表示
「バイト」に変換確定 → カタカナ含む → 即座に候補表示
```

### 検証方法

1. イベント作成画面を開く
2. 「ばいと」とひらがなで入力 → 候補画面は表示されない
3. 「バイト」に変換確定 → 即座に候補画面が表示される
4. 候補をタップ → 設定画面に戻る

---

# イベント名入力のUX修正（確定ボタン対応追加）

## 要件

1. **ひらがなのみの場合は候補画面を表示しない**（実装済み）
2. **ひらがな以外を含む場合は即座に候補画面を表示**（実装済み）
3. **キーボードの確定ボタンタップでも候補画面を表示**（追加）

## 変更対象ファイル

- `src/screens/EventCreateScreen.tsx`

## 実装タスク

- [x] `onSubmitEditing`ハンドラーを追加

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | `onSubmitEditing`ハンドラー追加 |

### 変更内容

**TextInputに`onSubmitEditing`を追加（638-643行目）:**
```typescript
onSubmitEditing={() => {
  // タイトルがあれば候補画面を表示
  if (title.length > 0) {
    setShowTitleSuggestions(true);
  }
}}
```

### 動作フロー

```
「ばいと」入力 → ひらがなのみ → 候補非表示
「バイト」に変換確定 → カタカナ含む → 即座に候補表示
「ばいと」入力 → 確定ボタンタップ → 候補表示
```

### 検証方法

1. イベント作成画面を開く
2. 「ばいと」とひらがなで入力 → 候補画面は表示されない
3. キーボードの青い確定ボタンをタップ → 候補画面が表示される
4. 「バイト」に変換確定 → 即座に候補画面が表示される
5. 候補をタップ → 設定画面に戻る

---

# イベント名入力のUX修正（IME確定ボタン対応）

## 問題

日本語キーボードの「確定」ボタン（変換確定時）を押しても候補画面が表示されない。もう一度キーボードのチェックボタンを押す必要がある。

## 原因

- React Nativeの`onSubmitEditing`は、キーボードの「Done」ボタンでのみトリガーされる
- 日本語IMEの「確定」ボタンでは`onSubmitEditing`がトリガー**されない**
- `onChangeText`のみがトリガーされるが、ひらがなのままだと候補非表示のロジックが適用される

## 解決策

入力が500ms以上止まったら「入力完了」と判定し、ひらがなのみの場合でも候補画面を表示する。

## 変更対象ファイル

- `src/screens/EventCreateScreen.tsx`

## 実装タスク

- [x] デバウンスタイマーのrefを追加
- [x] onChangeTextにデバウンスロジックを追加
- [x] クリーンアップ用useEffectを追加

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | デバウンス方式によるIME確定検出を追加 |

### 変更内容

**1. デバウンスタイマーのref追加（72行目）:**
```typescript
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
```

**2. onChangeTextのデバウンスロジック（610-643行目）:**
- テキストが空の場合：候補非表示、タイマークリア
- ひらがな以外を含む場合：即座に候補表示、タイマークリア
- ひらがなのみの場合：500ms後に候補表示（デバウンス）

**3. クリーンアップ用useEffect（533-538行目）:**
- コンポーネントのアンマウント時にタイマーをクリア

### 動作フロー

```
「ばいと」入力中 → ひらがなのみ → 候補非表示
「ばいと」入力後500ms経過 → デバウンスで候補表示
「バイト」に変換確定 → カタカナ含む → 即座に候補表示
キーボードのチェックボタン → onSubmitEditing → 候補表示
```

### 検証方法

1. イベント作成画面を開く
2. 「ばいと」とひらがなで入力 → 入力中は候補非表示
3. IMEの「確定」ボタンをタップ → 約500ms後に候補画面が表示される
4. 「バイト」などカタカナに変換確定 → 即座に候補画面が表示される
5. キーボードのチェックボタンをタップ → 候補画面が表示される

---

# イベント名入力のUX修正（即座に候補表示）

## 要件

テキストがあれば即座に候補画面を表示する。ひらがな判定やデバウンスタイマーは不要。

## 変更対象ファイル

- `src/screens/EventCreateScreen.tsx`

## 実装タスク

- [x] `isOnlyHiragana` 関数を削除
- [x] `debounceTimerRef` の宣言を削除
- [x] デバウンスタイマーのクリーンアップuseEffectを削除
- [x] `onChangeText` を即座に候補表示するロジックに変更
- [x] `onFocus` でテキストがあれば候補表示

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | ひらがな判定とデバウンスを削除し、即座に候補表示するように変更 |

### 変更内容

**1. 削除した要素:**
- `isOnlyHiragana` 関数（54-57行目）
- `debounceTimerRef` の宣言（72行目付近）
- デバウンスタイマーのクリーンアップuseEffect（533-538行目付近）

**2. onChangeTextの変更:**
```typescript
onChangeText={(text) => {
  setTitle(text);
  // テキストがあれば即座に候補表示、空なら非表示
  setShowTitleSuggestions(text.length > 0);
}}
```

**3. onFocusの変更:**
```typescript
onFocus={() => {
  // フォーカス時、テキストがあれば候補表示
  if (title.length > 0) {
    setShowTitleSuggestions(true);
  }
}}
```

**4. onSubmitEditingはそのまま維持:**
```typescript
onSubmitEditing={() => {
  if (title.length > 0) {
    setShowTitleSuggestions(true);
  }
}}
```

### 動作フロー

```
「ばいと」入力 → 即座に候補表示
「バイト」に変換確定 → 候補表示維持
キーボードの確定ボタン → 候補表示
```

### 検証方法

1. イベント作成画面を開く
2. 「ばいと」とひらがなで入力 → 即座に候補画面が表示される
3. 「バイト」に変換確定 → 候補画面が表示されたまま
4. 候補をタップ → 選択されて設定画面に戻る

---

# イベント名入力のUX修正（変換確定後に候補表示）

## 問題

現在の実装では、テキスト入力時に即座に候補画面が表示されるため、日本語入力の変換確定前（下線が表示されている状態）でも候補画面に切り替わってしまう。

## 要件

- 変換確定前（下線が表示されている時）は候補画面を表示しない
- 変換確定後（下線が消えた時）に候補画面を表示する
- キーボードの確定ボタンタップでも候補画面を表示

## 解決策

**即座に表示方式**

React Nativeでは日本語IMEの「変換確定」イベントを直接検出できないため、テキストがあれば即座に候補画面を表示する方式を採用。

## 実装タスク

- [x] `onChangeText` でテキストがあれば即座に候補表示
- [x] `onFocus` でテキストがあれば候補表示
- [x] `onSubmitEditing` はそのまま維持

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | テキストがあれば即座に候補表示 |

### 変更内容

**`onChangeText`:**
```typescript
onChangeText={(text) => {
  setTitle(text);
  setShowTitleSuggestions(text.length > 0);
}}
```

**`onFocus`:**
```typescript
onFocus={() => {
  if (title.length > 0) {
    setShowTitleSuggestions(true);
  }
}}
```

### 動作フロー

```
テキスト入力 → 即座に候補画面表示
テキストを全て削除 → 候補画面非表示
候補をタップ → 選択されて設定画面に戻る
```

### 検証方法

1. イベント作成画面を開く
2. テキストを入力 → 即座に候補画面が表示される
3. 候補をタップ → 選択されて設定画面に戻る

---

# トグルスイッチの右端が途切れる問題の修正

## 問題

EventCreateScreen の「終日」トグルスイッチの右端が画面端で少し切れている。

## 原因

`styles.row` の `paddingHorizontal: 8` が小さすぎるため、Switch コンポーネントが画面右端でクリップされている。

## 実装タスク

- [x] `styles.row` の `paddingHorizontal` を `8` から `16` に変更

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/screens/EventCreateScreen.tsx` | `styles.row` の `paddingHorizontal` を `8` から `16` に変更 |

### 変更内容

**変更前:**
```typescript
row: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 8,
}
```

**変更後:**
```typescript
row: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 16,
}
```

### 検証方法

1. アプリを起動
2. イベント作成画面を開く
3. 「終日」のトグルスイッチが右端で切れていないことを確認

---

# イベント作成画面：写真追加機能

## 概要

EventCreateScreenの設定項目に写真項目を追加し、イベントに写真を添付できるようにする。
写真はSupabase Storageにアップロードする。

## 実装タスク

### Step 1: 型定義の更新
- [x] `src/types/recurrence.ts`の`EventCreateData`に`photo?: string`を追加

### Step 2: EventCreateScreenに写真機能を追加
- [x] `expo-image-picker`をインポート
- [x] `PhotoIcon`をインポート（react-native-heroicons）
- [x] `Image`コンポーネントをインポート
- [x] `XMarkIcon`をインポート（削除ボタン用）
- [x] `photo` stateを追加（選択した写真のローカルURI）
- [x] `photoUrl` stateを追加（アップロード後のURL）
- [x] `isUploadingPhoto` stateを追加（アップロード中表示）
- [x] 写真選択関数を追加（`pickPhoto`）
- [x] 写真削除関数を追加（`removePhoto`）
- [x] メモ欄の下に写真項目UIを追加
- [x] `handleSave`で写真URLを含める
- [x] 編集モード時に既存の写真を復元

### Step 3: 翻訳キーの追加
- [x] `src/locales/ja.json`に写真関連のテキストを追加

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/types/recurrence.ts` | `EventCreateData`に`photo?: string`フィールドを追加 |
| `src/screens/EventCreateScreen.tsx` | 写真選択UI・ロジックを追加 |
| `src/locales/ja.json` | 写真関連の翻訳キーを追加 |

### 技術詳細

| 項目 | 詳細 |
|------|------|
| 画像選択 | expo-image-picker |
| ストレージ | Supabase Storage (`event-photos`バケット) |
| 画像品質 | 0.7 (圧縮) |
| アスペクト比 | 4:3 |
| サムネイルサイズ | 48x48px |

### UI仕様

```
┌─────────────────────────────────────┐
│ 📝 メモ                    [入力欄] │
├─────────────────────────────────────┤
│ 📷 写真                   写真を追加 │  ← 写真未選択時
├─────────────────────────────────────┤
│ 📷 写真          [サムネイル] [×]   │  ← 写真選択後
├─────────────────────────────────────┤
│ 🎨 カラー                    [●]    │
└─────────────────────────────────────┘
```

### 写真選択フロー

1. 「写真を追加」をタップ
2. フォトライブラリへのアクセス許可を要求
3. フォトライブラリから画像を選択
4. 画像を4:3でクロップ
5. Supabase Storageにアップロード（ローディング表示）
6. サムネイルが表示される
7. [×]ボタンで写真を削除可能

### 注意事項

- Supabase Storageに`event-photos`バケットを作成する必要がある
- バケットの公開設定を有効にする必要がある

### 検証方法

1. アプリを起動
2. イベント作成画面を開く
3. メモ欄の下に「写真」項目が表示されることを確認
4. 「写真を追加」をタップ → フォトライブラリが開く
5. 画像を選択 → サムネイルが表示される
6. [×]をタップ → 写真が削除される
7. 保存後、編集画面で写真が復元されることを確認

---

# イベント写真機能の拡張（複数写真対応）

## 概要

写真機能を拡張し、複数写真の追加、タップで拡大表示（ぼかし背景）、横スワイプでのナビゲーションに対応する。

## 実装タスク

- [x] 型定義の変更（`recurrence.ts`, `EventContext.tsx`）: `photo: string` → `photos: string[]`
- [x] `PhotoGalleryModal.tsx` を新規作成（拡大表示モーダル）
- [x] `eventService.ts` を複数写真対応に変更
- [x] `EventCreateScreen.tsx` を複数写真対応に変更
- [x] `ja.json` に翻訳キーを追加

---

## レビュー

### 変更概要

イベントの写真機能を単一写真から複数写真対応に拡張しました。

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/types/recurrence.ts` | `photo?: string` → `photos?: string[]` に変更 |
| `src/contexts/EventContext.tsx` | `photo?: string` → `photos?: string[]` に変更 |
| `src/services/eventService.ts` | DatabaseEventとCalendarEvent変換を複数写真対応に変更 |
| `src/components/PhotoGalleryModal.tsx` | **新規作成** - BlurView背景、横スワイプ、ページインジケーター付きの拡大表示モーダル |
| `src/screens/EventCreateScreen.tsx` | 複数写真の追加・削除・表示、ギャラリーモーダル表示に対応 |
| `src/locales/ja.json` | `eventCreate.photo.count`キーを追加 |

### 新機能

1. **複数写真追加**: サムネイル一覧から「+」ボタンで追加
2. **写真削除**: 各サムネイルの×ボタンで個別削除
3. **拡大表示**: サムネイルタップでフルスクリーン表示
4. **ぼかし背景**: BlurViewを使用したぼかし効果
5. **横スワイプ**: FlatListのpagingEnabledで写真間をナビゲーション
6. **ページインジケーター**: 現在位置をドットで表示

### UI仕様

**写真未追加時:**
```
📷 写真                         写真を追加
```

**写真追加後:**
```
📷 写真    [img1] [img2] [img3] [+]
           (各サムネイルに×削除ボタン)
```

**拡大表示モーダル:**
```
┌─────────────────────────────┐
│                          [×] │ ← 閉じるボタン
│                              │
│     [  フルスクリーン画像  ]  │ ← 横スワイプ可能
│                              │
│          ● ○ ○               │ ← ページインジケーター
└─────────────────────────────┘
```

### データベース互換性

- **DBスキーマ変更不要**: 既存の`photo`カラム（text型）をそのまま使用
- **保存形式**: 複数写真URLをJSON配列文字列として保存（例: `["url1","url2"]`）
- **後方互換性**: 既存の単一写真URL（非JSON形式）も自動的に配列として読み込む

### 検証方法

1. 新規イベント作成画面を開く
2. 「写真を追加」をタップして複数枚追加
3. サムネイルが横スクロールで表示されることを確認
4. サムネイルタップで拡大表示モーダルが開くことを確認
5. 背景がぼかされていることを確認
6. 横スワイプで次の写真に移動できることを確認
7. イベント保存後、編集画面で写真が復元されることを確認

---

# 新規登録時デフォルトアバター自動生成

## 概要

アカウント作成時に、ユーザー名の最初の文字を使用したデフォルトアバターを自動生成する。

## 仕様

- **文字色**: 白色 (#FFFFFF)
- **背景色**: ランダム（パステルカラー系）
- **表示文字**: ユーザー名の最初の1文字（大文字）
- **フォーマット**: SVG画像
- **編集**: 従来通りユーザーがアイコンを変更可能

## 実装タスク

### Step 1: アバター生成ユーティリティ作成
- [x] `src/utils/avatarGenerator.ts` を新規作成
- [x] `generateAvatarSvg(name: string)` 関数を実装
- [x] ランダムカラー生成関数を実装

### Step 2: authService.tsに統合
- [x] `generateAndUploadDefaultAvatar` 関数を追加
- [x] `completeSignup` 関数でアバター生成を呼び出す

### Step 3: 動作確認
- [ ] 新規登録してデフォルトアバターが表示されることを確認
- [ ] プロフィール編集でアバターを変更できることを確認

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/utils/avatarGenerator.ts` | **新規作成** - SVGアバター生成ユーティリティ |
| `src/services/authService.ts` | `generateAndUploadDefaultAvatar`関数追加、`completeSignup`で呼び出し |

### 技術詳細

| 項目 | 詳細 |
|------|------|
| アバター形式 | SVG (200x200px) |
| 文字色 | 白色 (#FFFFFF) |
| 背景色 | 12色のパレットからランダム選択 |
| フォント | system-ui, -apple-system, sans-serif |
| 保存先 | Supabase Storage (`profile-images`バケット) |

### カラーパレット

| 色名 | カラーコード |
|------|------------|
| Blue | #3b82f6 |
| Violet | #8b5cf6 |
| Pink | #ec4899 |
| Red | #ef4444 |
| Orange | #f97316 |
| Yellow | #eab308 |
| Green | #22c55e |
| Teal | #14b8a6 |
| Cyan | #06b6d4 |
| Indigo | #6366f1 |
| Purple | #a855f7 |
| Rose | #f43f5e |

### 処理フロー

```
completeSignup()
  ↓
1. パスワード設定
  ↓
2. プロフィール名を更新
  ↓
3. generateAndUploadDefaultAvatar()
    ↓
    a. ランダム背景色を選択
    b. SVGアバターを生成
    c. Supabase Storageにアップロード
    d. profile_image_urlを更新
  ↓
4. 完了
```

### 検証方法

1. 新規アカウントを作成
2. サイドバーでプロフィールアイコンが表示されることを確認
3. アイコンに名前の最初の文字が表示されていることを確認
4. プロフィール編集画面でアイコンを変更できることを確認

---

# デフォルトアバターが表示されない問題の修正

## 問題

新規登録時に生成されたデフォルトアバター（SVG形式）がサイドバーに表示されない。

## 原因

React NativeのImageコンポーネントはSVG画像をサポートしていない。

## 解決策

`react-native-svg`の`SvgUri`コンポーネントを使用してSVG画像を表示する。

## 実装タスク

- [x] `src/components/Sidebar.tsx` にSvgUri対応を追加
- [x] `src/components/ProfileSheet.tsx` にSvgUri対応を追加
- [x] `src/components/ChatMessage.tsx` にSvgUri対応を追加

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/Sidebar.tsx` | `SvgUri`インポート追加、`isSvgUrl`関数追加、プロフィール画像表示部分をSVG対応に変更 |
| `src/components/ProfileSheet.tsx` | `SvgUri`インポート追加、`isSvgUrl`関数追加、プロフィール画像表示部分をSVG対応に変更 |
| `src/components/ChatMessage.tsx` | `SvgUri`インポート追加、`isSvgUrl`関数追加、ユーザーアバター表示部分をSVG対応に変更 |

### 技術詳細

| 項目 | 詳細 |
|------|------|
| 使用ライブラリ | `react-native-svg`（既存） |
| SVG判定方法 | URLに`.svg`が含まれるかどうかで判定 |
| 対応箇所 | サイドバー、プロフィール編集、チャットメッセージ |

### 変更内容

各ファイルで以下の実装を追加：

1. **`SvgUri`のインポート追加**
```typescript
import { SvgUri } from 'react-native-svg';
```

2. **`isSvgUrl`関数の追加**
```typescript
const isSvgUrl = (url: string) => url.includes('.svg');
```

3. **条件分岐でSVGとPNG/JPGを出し分け**
- SVG URLの場合: `<SvgUri uri={url} width={size} height={size} />`
- 通常画像の場合: `<Image source={{ uri: url }} style={styles.profileImage} />`

### 検証方法

1. アプリを再起動
2. サイドバーを開く
3. デフォルトアバター（名前の最初の文字 + ランダム背景色）が表示されることを確認
4. プロフィール編集画面でアバターが表示されることを確認
5. チャット画面でユーザーアバターが表示されることを確認
6. カスタム画像（PNG/JPG）に変更しても正常に表示されることを確認

---

# イベント確認画面のユーザーアイコン表示修正

## 問題

イベント確認画面（日付タップ時のボトムシート）で、イベントの横に表示されるユーザーアイコンがグレーのプレースホルダーになっている。

## 原因

`eventService.ts`のSupabaseクエリで、`profiles`テーブルから`profile_image_uri`を取得していなかった。

## 実装タスク

- [x] `eventService.ts`のgetAllEventsクエリに`profile_image_uri`を追加

---

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/services/eventService.ts` | getAllEventsのSELECTに`profile_image_uri`を追加 |

### 変更内容

**eventService.ts:165行目**

変更前:
```typescript
creator:profiles!user_id(id, name)
```

変更後:
```typescript
creator:profiles!user_id(id, name, profile_image_uri)
```

### 検証方法

1. アプリを起動
2. 予定のある日付をタップ
3. ボトムシートのイベント横にユーザーアイコン（SVGアバターまたはカスタム画像）が表示されることを確認

---

# イベント確認画面のユーザーアイコン表示修正（自分のイベント）

## 問題

イベント確認画面（日付タップ時のボトムシート）で、**自分で作成したイベント**でもユーザーアイコンがグレーのプレースホルダーになっている。

## 原因

**フィールド名の不一致**

| 場所 | フィールド名 |
|------|-------------|
| データベース（profiles テーブル） | `profile_image_uri` |
| AuthContext Profile 型定義 | `profile_image_url` |
| BottomSheet.tsx | `profile?.profile_image_url` を参照 |

`fetchProfile`で`select('*')`を実行すると、データベースから`profile_image_uri`が返されるが、Profile型は`profile_image_url`を期待しているため、`profile.profile_image_url`は常に`undefined`になる。

## 実装タスク

- [x] `src/contexts/AuthContext.tsx` - Profile型の`profile_image_url`を`profile_image_uri`に変更
- [x] `src/contexts/AuthContext.tsx` - `updateProfileImageUrl`関数内の参照を変更
- [x] `src/components/BottomSheet.tsx` - `profile_image_url`を`profile_image_uri`に変更

---

## レビュー

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/AuthContext.tsx` | Profile型の`profile_image_url`を`profile_image_uri`に変更（11行目）、`updateProfileImageUrl`関数内の参照を変更（415行目） |
| `src/components/BottomSheet.tsx` | `profile_image_url`を`profile_image_uri`に変更（92-94行目） |

### 変更内容

**1. AuthContext.tsx:11行目（Profile型定義）**
```typescript
// 変更前
profile_image_url?: string;

// 変更後
profile_image_uri?: string;
```

**2. AuthContext.tsx:415行目（updateProfileImageUrl関数）**
```typescript
// 変更前
setProfile({ ...profile, profile_image_url: imageUrl });

// 変更後
setProfile({ ...profile, profile_image_uri: imageUrl });
```

**3. BottomSheet.tsx:92-94行目**
```typescript
// 変更前
if (isVisible && profile?.profile_image_url) {
  setCurrentUserProfileImage(profile.profile_image_url);
}

// 変更後
if (isVisible && profile?.profile_image_uri) {
  setCurrentUserProfileImage(profile.profile_image_uri);
}
```

### 検証方法

1. アプリを起動
2. 自分で作成した予定のある日付をタップ
3. ボトムシートのイベント横に自分のアイコン（SVGアバターまたはカスタム画像）が表示されることを確認

---


# イベント確認画面のユーザーアイコン表示修正（SVG対応）

## 問題

イベント確認画面（日付タップ時のボトムシート）で、ユーザーアイコンがグレーのプレースホルダーになっていた。

## 原因

BottomSheet.tsxがSVG画像に対応していなかった。デフォルトアバターはSVG形式（`avatarGenerator.ts`で生成）だが、BottomSheet.tsxでは`<Image>`コンポーネントのみを使用していた。

## 実装タスク

- [x] importセクションにSvgUriを追加
- [x] isSvgUrlヘルパー関数を追加
- [x] ユーザーアイコン表示部分をSVG対応に変更

## レビュー

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/BottomSheet.tsx` | SvgUri対応を追加 |

### 変更内容

**1. importセクション（10行目）**
```typescript
import { SvgUri } from 'react-native-svg';
```

**2. isSvgUrlヘルパー関数追加（99行目）**
```typescript
const isSvgUrl = (url: string) => url.includes('.svg');
```

**3. ユーザーアイコン表示部分（248-262行目）**
```typescript
{displayImageUri ? (
  isSvgUrl(displayImageUri) ? (
    <SvgUri
      uri={displayImageUri}
      width={32}
      height={32}
    />
  ) : (
    <Image
      source={{ uri: displayImageUri }}
      style={styles.userAvatar}
    />
  )
) : (
  <View style={styles.userAvatarPlaceholder}>
    <UserIcon size={16} color="#9CA3AF" />
  </View>
)}
```

### 検証方法

1. アプリを起動
2. 予定のある日付をタップ
3. ボトムシートのイベント横にユーザーアイコン（SVGアバターまたはカスタム画像）が表示されることを確認

---

# イベント永続化問題の修正

## 問題

イベントを作成してアプリを閉じて再度開くとイベントが消える。

## 調査結果

- Supabaseダッシュボードで確認したところ、eventsテーブルに20レコードが正常に保存されていた
- DBへの保存は正常に動作していた
- **原因**: 認証セッション復元のタイミング問題

EventContextの`useEffect`が実行されるタイミングで、AuthContextの認証状態復元がまだ完了しておらず、`user?.id`がundefinedのため、イベント読み込みがスキップされていた。

## 修正内容

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/contexts/EventContext.tsx` | 認証状態のloading監視を追加、デバッグログを強化 |

### 修正箇所

**1. useAuthからloadingを取得（66行目）**
```typescript
// 変更前
const { user } = useAuth();

// 変更後
const { user, loading: authLoading } = useAuth();
```

**2. useEffectに認証状態確認の待機処理を追加（69-98行目）**
- `authLoading`がtrueの場合は待機
- ユーザー未ログイン時のログ出力を追加
- イベント読み込み開始時のログ出力を追加（user.idを表示）
- 依存配列に`authLoading`を追加

## 検証方法

1. アプリを起動し、Metro Bundlerのコンソールで以下のログを確認：
   - `[EventContext] 認証状態確認中...`
   - `[EventContext] イベント読み込み開始 - user.id: xxx`
   - `[EventContext] 予定を読み込みました: X件`

2. イベントを作成し、アプリを完全に終了して再起動

3. 再起動後にイベントが表示されることを確認

---

# イベント永続化問題の修正（第2弾）

## 問題

イベントを作成してアプリを閉じて再度開くとイベントが消える。
前回の修正（authLoading監視追加）では解決しなかった。

## 調査結果

### 根本原因

**EventProviderの配置場所が間違っていた**

現在の構造：
```
App.tsx (_layout.tsx):
├─ AuthProvider
│  ├─ CalendarProvider
│  ├─ NotificationProvider
│  └─ ... (EventProviderが含まれていない)

app/(tabs)/index.tsx:
├─ NotificationProvider (二重定義)
├─ CalendarProvider (二重定義)
├─ EventProvider ← ここにあった！
└─ CalendarScreenContent
```

**問題点:**
1. EventProviderがスクリーンレベルで定義されており、グローバルプロバイダー構造に含まれていなかった
2. 画面遷移でEventProviderがアンマウント/リマウントされる可能性があった
3. NotificationProviderとCalendarProviderが二重定義されていた

## 修正内容

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/_layout.tsx` | EventProviderをグローバルプロバイダーに追加 |
| `app/(tabs)/index.tsx` | 冗長なProvider（EventProvider, NotificationProvider, CalendarProvider）を削除 |

### 修正箇所

**1. app/_layout.tsx - EventProviderを追加**

```tsx
import { EventProvider } from '@/src/contexts/EventContext';

// プロバイダー構造
<LocalizationProvider>
  <AuthProvider>
    <CalendarProvider>
      <NotificationProvider>
        <EventProvider>  {/* ← 追加 */}
          <SettingsProvider>
            {/* 他のプロバイダー */}
          </SettingsProvider>
        </EventProvider>
      </NotificationProvider>
    </CalendarProvider>
  </AuthProvider>
</LocalizationProvider>
```

**2. app/(tabs)/index.tsx - 冗長なProviderを削除**

```tsx
// 変更前
export default function CalendarScreen() {
  return (
    <NotificationProvider>
      <CalendarProvider>
        <EventProvider>
          <CalendarScreenContent />
        </EventProvider>
      </CalendarProvider>
    </NotificationProvider>
  );
}

// 変更後
export default function CalendarScreen() {
  return <CalendarScreenContent />;
}
```

import文も整理：
- `CalendarProvider` → `useCalendarContext` のみ
- `EventProvider` → `useEventContext` のみ
- `NotificationProvider` → 削除（使用していなかった）

## 検証方法

1. アプリを起動し、Metro Bundlerのコンソールで以下のログを確認：
   - `[EventContext] 認証状態確認中...`
   - `[EventContext] イベント読み込み開始 - user.id: xxx`
   - `[EventContext] 予定を読み込みました: X件`

2. イベントを作成し、アプリを完全に終了して再起動

3. 再起動後にイベントが表示されることを確認

## 期待される効果

- EventProviderがアプリ全体でただ一つのインスタンスとして維持される
- 認証状態変更時に確実にイベントが読み込まれる
- 画面遷移でEventProviderが再マウントされない

---

# イベントが永続化されない問題の修正（第3弾）

## 問題

イベントを作成してアプリを閉じて再度開くとイベントが消える。
- 第1弾修正（authLoading監視追加）: 未解決
- 第2弾修正（EventProviderをグローバルに移動）: 未解決

## 根本原因

CalendarScreenのuseEffectがuser未設定時に実行され、空のキャッシュが設定される。
認証完了後もuseEffectが再実行されないため（依存配列にuser?.idがなかったため）、空のキャッシュが表示され続ける。

## 修正内容

### app/(tabs)/index.tsx

1. **useAuthからuserを取得を追加**（9行目、25行目）
2. **useEffectの修正**（114-132行目）
   - `user?.id`が未設定の場合は早期リターン
   - 依存配列に`user?.id`を追加

## 変更サマリー

| ファイル | 変更内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | useAuthインポート追加、useEffectに認証状態チェックと依存配列にuser?.id追加 |

## 期待される効果

- 認証完了後にuseEffectが再実行される
- 空キャッシュが設定される前にuserの存在をチェック
- イベントが正しく読み込まれ永続化される

---

# 広告が表示されない問題の修正

## 完了日
2026-02-04

## 問題
app.jsonにGoogleのテスト用広告ID（`ca-app-pub-3940256099942544`で始まるID）が設定されていたため、本番ビルドで広告が表示されなかった。

## 修正内容

### app.json (166-169行目)

| 項目 | 変更前（テスト用ID） | 変更後（本番用ID） |
|------|---------------------|-------------------|
| admobBannerIdIos | ca-app-pub-3940256099942544/2934735716 | ca-app-pub-6055680121132329/8724319394 |
| admobRewardIdIos | ca-app-pub-3940256099942544/1712485313 | ca-app-pub-6055680121132329/1340653394 |
| admobBannerIdAndroid | 変更なし（テスト用IDのまま） | - |
| admobRewardIdAndroid | 変更なし（テスト用IDのまま） | - |

## 次のステップ
1. `eas build --platform ios --profile production` で再ビルド
2. 実機で広告表示を確認

---

# AdMobポリシー違反の修正

## 概要

AdMobから指摘された2つのポリシー違反を修正する。

## 検出された問題

### 問題1: Googleが配信する広告の前面に重なって表示されるコンテンツの扱い
- **指摘内容**: 「Googleが配信する広告の全体または一部を隠している」
- **原因**: AdBanner.tsx の×ボタン（closeButton）が広告の上に `position: absolute` で重なっている

### 問題2: サイトの動作: ナビゲーション
- **指摘内容**: 「ナビゲーション用機能であると直感的に認識されるような配置で広告が表示されるページ」
- **原因**: ×ボタン（閉じるボタン）が広告の上にあり、ユーザーが誤って広告をクリックしてしまう

## 実装タスク

- [x] AdBanner.tsx の×ボタンを広告の外側に移動

## 変更内容

### `src/components/AdBanner.tsx`

**変更前のレイアウト**:
```
┌─────────────────────────┐
│  [広告]            [×]  │  ← ×が広告の上に重なっている (position: absolute)
└─────────────────────────┘
```

**変更後のレイアウト**:
```
┌─────────────────────────┐
│        [広告]           │  ← 広告エリア（adArea）
├─────────────────────────┤
│ 広告        非表示 [×]  │  ← コントロールバー（controlBar）- 広告の外側
└─────────────────────────┘
```

**主な変更点**:
1. `Text` コンポーネントをインポートに追加
2. 広告を `adArea` ビューで囲み、広告エリアを明確に分離
3. 新しい `controlBar` ビューを広告の下に追加
4. 「広告」ラベルと「非表示」ボタンをコントロールバー内に配置
5. ×ボタンの `position: absolute` を削除し、通常のフロー配置に変更
6. スタイルを整理（closeButtonBackground を削除、新しいスタイルを追加）

## 検証方法
1. ビルド後、広告表示画面を確認
2. ×ボタンが広告と重ならないことを確認
3. AdMobコンソールで「審査プロセスを開始」をリクエスト

## レビュー完了日
2026-02-04

## ステータス: コード修正完了 ✅

### 完了項目
- [x] AdBanner.tsx の×ボタンを広告の外側（controlBar）に移動
- [x] 広告エリア（adArea）とコントロールバー（controlBar）を分離
- [x] コード修正完了

### 残りの手順（運用作業）
1. **AdMobコンソールで審査をリクエスト**
   - https://apps.admob.com/ にログイン
   - ポリシーセンターから該当アプリを選択
   - 「審査をリクエスト」をクリック
   - 修正内容を説明して送信

2. **審査結果を待つ**（1〜3営業日）

3. **承認後、広告配信再開**

---

# 広告が表示されない問題の修正（ATT設定追加）

## 概要
iOS 14.5以降では、広告のIDFA使用にATT（App Tracking Transparency）許可が必要。
ATT設定がなかったため、広告が表示されない可能性があった。

## 修正内容

### 修正1: ATT設定をapp.jsonに追加 ✅
- 対象ファイル: `app.json`
- `ios.infoPlist` に `NSUserTrackingUsageDescription` を追加
- メッセージ: 「広告を最適化するためにトラッキングを許可してください」

### 修正2: Android広告ID
- 現状テストIDのまま（ユーザー判断によりスキップ）

## 検証手順
1. `npx expo prebuild --clean` を実行
2. iOSアプリをビルド
3. 初回起動時にATTダイアログ（トラッキング許可）が表示されることを確認
4. 許可後、広告が表示されることを確認

## ステータス: コード修正完了 ✅
