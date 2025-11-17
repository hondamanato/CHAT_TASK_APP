# プロビジョニングプロファイル整理ガイド

このドキュメントでは、Apple Developer Consoleで重複しているプロビジョニングプロファイルを整理する手順を説明します。

## 現状

### 問題
- 古いBundle ID (`com.manatohonda.aicalendarapp`) のプロファイルが残っている
- 正しいBundle ID (`com.aicalendarapp.tapless`) のプロファイルが複数存在
- 無効なプロファイルと有効なプロファイルが混在

### 目標
- 古いBundle IDのプロファイルを削除
- 正しいBundle IDの最新プロファイルのみ残す
- Sign in with Apple capabilityを追加したプロファイルを生成

---

## 手順

### ステップ1: 古いBundle IDのプロファイルを削除

1. [Apple Developer Console](https://developer.apple.com/) → **Certificates, Identifiers & Profiles** → **Profiles**
2. 以下のプロファイルを探して削除:

#### 削除対象（古いBundle ID: `com.manatohonda.*`）
- `*[expo] com.manatohonda.ai-calendar-app AdHoc`
- `*[expo] com.manatohonda.ai-calendar-app AppStore`
- `*[expo] com.manatohonda.aicalendarapp AdHoc`

#### 削除方法
1. 各プロファイルをクリック
2. **Delete** ボタンをクリック
3. 確認ダイアログで **Delete** をクリック

---

### ステップ2: 正しいBundle IDのプロファイルを整理

#### 残すべきプロファイル（`com.aicalendarapp.tapless`）
- **App Store用**: 1つ（最新のもの）
- **AdHoc用**: 1つ（TestFlight用、最新のもの）

#### 削除するプロファイル
- 「無効な」と表示されているもの
- 古い日付のもの（ダウンロード不可のもの）
- 重複しているもの

#### 整理方法
1. `com.aicalendarapp.tapless` のプロファイルをリストアップ
2. 各プロファイルの**有効期限**と**タイプ**を確認
3. App Store用とAdHoc用でそれぞれ最新のものを1つ選ぶ
4. 残りの古いプロファイルを削除

---

### ステップ3: App IDにSign in with Apple Capabilityを追加

1. **Identifiers** → **App IDs**
2. `com.aicalendarapp.tapless` を検索してクリック
3. **Capabilities** セクションまでスクロール
4. **Sign in with Apple** を探す
   - ✅ チェック済み: 次のステップへ
   - ❌ 未チェック: チェックを入れる
5. **Save** をクリック
6. 確認ダイアログで **Confirm** をクリック

---

### ステップ4: プロビジョニングプロファイルを更新

Sign in with Apple capabilityを追加したので、プロビジョニングプロファイルを再生成する必要があります。

#### App Store用プロファイルの更新

1. **Profiles** → `com.aicalendarapp.tapless` の **App Store** プロファイルをクリック
2. **Edit** ボタンをクリック
3. 設定を確認（変更不要）
4. **Generate** ボタンをクリック
5. **Download** をクリックしてダウンロード
6. ダウンロードしたファイル（`.mobileprovision`）をダブルクリックしてXcodeに追加

#### AdHoc用プロファイルの更新（TestFlight用）

1. **Profiles** → `com.aicalendarapp.tapless` の **AdHoc** プロファイルをクリック
2. **Edit** ボタンをクリック
3. 設定を確認（変更不要）
4. **Generate** ボタンをクリック
5. **Download** をクリックしてダウンロード
6. ダウンロードしたファイル（`.mobileprovision`）をダブルクリックしてXcodeに追加

---

### ステップ5: Xcodeでプロファイルを確認

1. Xcodeでプロジェクトを開く:
   ```bash
   open ios/tapless.xcodeproj
   ```

2. **TARGETS** → **tapless** → **Signing & Capabilities**

3. **Automatically manage signing** のチェック状態を確認:
   - ✅ チェック有り: Xcodeが自動で最新プロファイルを使用
   - ❌ チェック無し: 手動でプロファイルを選択

4. 手動の場合、**Provisioning Profile** で先ほどダウンロードしたプロファイルを選択

5. **+ Capability** をクリック → **Sign in with Apple** を追加（まだの場合）

---

## 整理後の期待される状態

### Apple Developer Console - Profiles
```
プロファイル一覧:
✅ [expo] com.aicalendarapp.tapless AppStore (iOS) - App Store - 2026/09/25 [ダウンロード]
✅ [expo] com.aicalendarapp.tapless AdHoc (iOS) - 臨時 - 2026/09/25 [ダウンロード]
```

### Apple Developer Console - Identifiers
```
com.aicalendarapp.tapless の Capabilities:
✅ Sign in with Apple - Enabled
```

### Xcode - Signing & Capabilities
```
Capabilities:
✅ Sign in with Apple
```

---

## トラブルシューティング

### 「プロファイルが無効です」と表示される

**原因:**
- Capabilityを追加した後、プロファイルを再生成していない

**解決策:**
- 上記「ステップ4: プロビジョニングプロファイルを更新」を実施

### Xcodeでプロファイルが表示されない

**原因:**
- ダウンロードしたプロファイルがXcodeに追加されていない

**解決策:**
1. ダウンロードした `.mobileprovision` ファイルをダブルクリック
2. Xcodeを再起動
3. **Xcode** → **Settings** → **Accounts** → Apple IDを選択 → **Download Manual Profiles**

### 「Automatically manage signing」でビルドエラー

**原因:**
- Xcodeが適切なプロファイルを見つけられない
- Team IDが間違っている

**解決策:**
1. **Team** が `LKD5YP2DRM (本田マナト)` になっているか確認
2. **Automatically manage signing** のチェックを外す → 再度チェックを入れる
3. それでもダメな場合、手動でプロファイルを選択

---

## チェックリスト

整理が完了したか確認:

### Apple Developer Console
- [ ] 古いBundle ID (`com.manatohonda.*`) のプロファイルを削除
- [ ] `com.aicalendarapp.tapless` のプロファイルが App Store用とAdHoc用で各1つ
- [ ] App IDに「Sign in with Apple」capabilityが追加されている
- [ ] プロビジョニングプロファイルを再生成してダウンロード

### Xcode
- [ ] 最新のプロビジョニングプロファイルがXcodeに追加されている
- [ ] Signing & Capabilitiesで「Sign in with Apple」が追加されている
- [ ] ビルドエラーが発生しない

### TestFlight
- [ ] 新しいビルドをアップロード
- [ ] TestFlightでApple Sign-Inをテスト

---

## 次のステップ

プロファイル整理が完了したら:

1. **APPLE_SIGNIN_SETUP.md** の手順に従ってSupabase設定を完了
2. 新しいビルドをTestFlightにアップロード
3. Apple Sign-Inが動作するか確認

---

## 参考

### プロビジョニングプロファイルの種類

| タイプ | 用途 | 配布方法 |
|--------|------|----------|
| **Development** | 開発・デバッグ用 | Xcode経由で実機インストール |
| **AdHoc** | TestFlight配布用 | TestFlightで配布 |
| **App Store** | App Store配布用 | App Storeで公開 |

### 関連ドキュメント
- [Apple Developer - Managing Profiles](https://developer.apple.com/account/resources/profiles/list)
- [APPLE_SIGNIN_SETUP.md](./APPLE_SIGNIN_SETUP.md) - Apple Sign-In完全セットアップガイド
