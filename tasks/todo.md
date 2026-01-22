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

