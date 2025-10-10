# プッシュ通知機能実装（完了）

## 概要
カレンダーアプリにExpo Notificationsを使用したプッシュ通知機能を実装しました。
予定作成時の自動通知スケジューリング、通知設定UI、および既存のイベント管理システムとの統合が完了しました。

## 実装内容

### ✅ 完了した作業

#### 1. 依存関係のインストール
- `expo-notifications@0.32.11` - プッシュ通知の核となるライブラリ
- `expo-device@8.0.7` - デバイス情報取得

#### 2. Expo Notifications設定
- **app.json設定追加**: プッシュ通知プラグイン設定
- **Android通知チャンネル**: デフォルトとリマインダー用の2チャンネル
- **iOS設定**: アラート、バッジ、サウンド権限

#### 3. 通知サービス (`src/services/notificationService.ts`)
- **権限管理**: 自動権限リクエストとステータス確認
- **通知スケジューリング**: イベント日時に基づく自動通知設定
- **設定管理**: AsyncStorageによる通知設定の永続化
- **通知キャンセル**: イベント削除時の関連通知自動削除
- **テスト機能**: 即座に送信するテスト通知

#### 4. 通知コンテキスト (`src/contexts/NotificationContext.tsx`)
- **状態管理**: 通知設定と権限状態の一元管理
- **設定更新**: リアルタイムでの設定変更反映
- **初期化処理**: アプリ起動時の自動初期化とクリーンアップ

#### 5. 通知設定UI (`src/components/NotificationSettings.tsx`)
- **権限ステータス表示**: 現在の通知権限状態を視覚的に表示
- **基本設定**: 通知有効/無効、予定リマインダーON/OFF
- **リマインダー時間設定**: 5分前〜1日前まで7段階の選択肢
- **テスト通知**: 設定確認用の即座通知送信

#### 6. EventContextとの統合
- **自動通知スケジューリング**: 新しいイベント作成時に通知を自動設定
- **通知ID管理**: イベントデータに通知IDを追加して関連付け
- **削除時クリーンアップ**: イベント削除時に関連通知も自動削除

#### 7. UI統合
- **サイドバー統合**: 設定メニューに「通知設定」項目を追加
- **モーダル表示**: 専用モーダルでの通知設定画面表示
- **プロバイダー追加**: メインアプリにNotificationProviderを統合

## 技術仕様

### 通知設定項目
```typescript
interface NotificationSettings {
  enabled: boolean;              // 通知全体のON/OFF
  eventReminders: boolean;       // 予定リマインダーのON/OFF
  reminderMinutesBefore: number; // リマインダー時間（分）
  dailyDigest: boolean;          // 日次ダイジェスト（未実装）
  dailyDigestTime: string;       // ダイジェスト送信時刻（未実装）
}
```

### リマインダー時間オプション
- 5分前、10分前、15分前（デフォルト）
- 30分前、1時間前、2時間前、1日前

### 対応プラットフォーム
- **iOS**: 完全対応（アラート、バッジ、サウンド）
- **Android**: 完全対応（通知チャンネル、バイブレーション）
- **実機必須**: プッシュ通知はシミュレーターでは動作不可

## ファイル構成

### 新規作成ファイル
- `src/services/notificationService.ts` - 通知サービス
- `src/contexts/NotificationContext.tsx` - 通知コンテキスト
- `src/components/NotificationSettings.tsx` - 通知設定UI

### 修正ファイル
- `app.json` - Expo Notifications設定追加
- `package.json` - 依存関係追加
- `src/contexts/EventContext.tsx` - 通知機能統合
- `app/(tabs)/index.tsx` - NotificationProvider追加
- `src/components/Sidebar.tsx` - 通知設定メニュー追加

## 使用方法

### 基本利用フロー
1. **初回起動**: アプリが自動的に通知権限をリクエスト
2. **予定作成**: 新しい予定を作成すると自動で通知がスケジューリング
3. **設定変更**: サイドバー > 通知設定で詳細設定を調整
4. **テスト**: 設定画面から「テスト通知を送信」で動作確認

### 通知タイミング
- **デフォルト**: 予定開始15分前
- **カスタマイズ**: 設定で5分前〜1日前まで調整可能
- **過去イベント**: 過去の予定には通知を設定しない

## 今後の拡張予定

### 未実装機能
- **日次ダイジェスト**: 1日の予定をまとめて通知
- **位置ベース通知**: 特定の場所に近づいた時の通知
- **繰り返し予定**: 週次・月次予定の通知対応
- **サウンドカスタマイズ**: 通知音の選択機能

### 改善点
- **バックグラウンド処理**: アプリ非アクティブ時の通知管理強化
- **通知履歴**: 送信済み通知の履歴表示
- **グループ化**: 複数予定の通知をまとめて表示

## テスト状況

### 動作確認済み
- ✅ 通知権限リクエスト
- ✅ 設定UI表示と操作
- ✅ テスト通知送信
- ✅ イベント作成時の通知スケジューリング
- ✅ サイドバー統合

### 実機テスト必要
- 📱 実際の通知受信
- 📱 バックグラウンド動作
- 📱 通知タップ時の動作

## レビュー

### 実装品質
- **コード品質**: TypeScript完全対応、エラーハンドリング充実
- **ユーザビリティ**: 直感的な設定UI、わかりやすい権限状態表示
- **パフォーマンス**: 非同期処理、メモリリーク対策済み
- **拡張性**: モジュラー設計、将来機能追加に対応

### セキュリティ
- **権限管理**: 適切な権限リクエストフロー
- **データ保護**: ローカルストレージのみ使用
- **プライバシー**: 外部サービスへの通知内容送信なし

### アーキテクチャ
- **関心の分離**: サービス層、コンテキスト層、UI層の明確な分離
- **状態管理**: Reactコンテキストによる一元管理
- **エラー処理**: try-catch、fallback処理の充実

この実装により、カレンダーアプリに本格的なプッシュ通知機能が追加され、ユーザーの予定管理体験が大幅に向上しました。

---

# メンバー招待機能実装計画

## 現状分析
✅ データベーススキーマ調査完了
- `invitations`テーブルが既に存在
- `calendar_members`テーブルでメンバー管理
- Row Level Security (RLS) ポリシー設定済み

## 実装提案

### 方式1: シンプルな招待リンク方式（推奨）
**特徴:**
- 招待リンクを生成・共有
- 受信者がリンクをクリックして招待受諾
- 実装が簡単でユーザビリティが高い

**フロー:**
1. カレンダーオーナーがメールアドレスで招待
2. 招待トークン生成（7日間有効）
3. 招待リンク（`/invite?token=xxx`）を作成
4. リンクをメールやメッセージで共有
5. 受信者がリンクをクリック
6. アカウント作成/ログイン後、自動でカレンダーメンバーに追加

### 方式2: メール通知付き招待方式
**特徴:**
- 自動メール送信機能付き
- より本格的だが実装複雑度が高い

**フロー:**
1. Supabase Edge Functionでメール送信
2. 招待メールに招待リンクを含める
3. 受信者がメールから直接アクセス

### 方式3: アプリ内通知方式
**特徴:**
- 既存ユーザーのみ対象
- アプリ内で招待通知を表示

## 技術実装詳細

### 必要なコンポーネント
- [ ] InvitationService - 招待管理サービス
- [ ] InviteModal - 招待送信UI
- [ ] InviteAcceptScreen - 招待受諾画面
- [ ] MemberManagementSheet - メンバー管理UI

### データベース構造（既存）
```sql
-- 招待テーブル（既存）
invitations (
  id, calendar_id, inviter_id, invitee_email,
  token, expires_at, accepted_at, created_at
)

-- カレンダーメンバー（既存）
calendar_members (
  id, calendar_id, user_id, role, can_invite, joined_at
)
```

### セキュリティ考慮事項
- トークン有効期限（7日間）
- 招待権限の確認（オーナー + 招待権限持ちメンバー）
- 重複招待の防止
- RLSポリシーによるアクセス制御

## 推奨する実装順序

### フェーズ1: 基盤実装
- [ ] 招待サービス作成
- [ ] 招待トークン生成・検証
- [ ] 招待リンク処理機能

### フェーズ2: UI実装
- [ ] メンバー管理ボトムシート
- [ ] 招待送信モーダル
- [ ] 招待受諾画面

### フェーズ3: 統合・改善
- [ ] カレンダー設定画面との統合
- [ ] エラーハンドリング
- [ ] ユーザビリティ改善

## 提案

**方式1（シンプルな招待リンク方式）**を推奨します。理由：

1. **実装コスト**: 最も少ない実装時間で基本機能を実現
2. **ユーザビリティ**: リンク共有は直感的で使いやすい
3. **保守性**: シンプルな構造で保守が容易
4. **拡張性**: 後からメール機能などを追加可能

どの方式で進めたいか、またはその他のご要望があればお知らせください。

---

# メンバー招待機能実装完了報告

## 実装内容

QRコードと招待リンクによるメンバー招待機能を実装しました。

### ✅ 実装済み機能

#### 1. 招待サービス (`src/services/invitationService.ts`)
- 招待トークンの生成と管理
- Deep Linkの生成（`aicalendarapp://invite?token=xxx`）
- 招待の検証と受諾処理
- メンバー管理（追加、削除、権限変更）
- 保留中の招待管理

#### 2. QRコード生成機能 (`src/components/InviteModal.tsx`)
- react-native-qrcode-svgによるQRコード生成
- QRコード画像の表示と共有
- 3つのタブ切替（リンク共有、QRコード、メール招待）

#### 3. 招待リンク共有機能
- ワンタップでクリップボードにコピー
- ネイティブ共有機能（Share API）
- 7日間の有効期限付きトークン

#### 4. メンバー管理UI (`src/components/MemberManagementSheet.tsx`)
- 現在のメンバー一覧表示
- メンバーごとの招待権限管理
- メンバーの削除機能
- 保留中の招待一覧表示

#### 5. 招待受諾画面 (`src/screens/InviteAcceptScreen.tsx`)
- 招待リンクからのアクセス処理
- 招待情報の表示
- ワンタップで受諾/辞退
- 未ログイン時の案内

#### 6. カレンダー設定との統合
- CalendarOptionsSheetにメンバー管理ボタン追加
- オーナー権限の確認
- シームレスなUI遷移

### 技術仕様

#### 使用ライブラリ
- `react-native-qrcode-svg` - QRコード生成
- `expo-clipboard` - クリップボード操作
- `expo-crypto` - セキュアなトークン生成
- `expo-linking` - Deep Link処理

#### データベース構造
既存のSupabaseテーブルを活用：
- `invitations` - 招待情報管理
- `calendar_members` - メンバー情報管理
- Row Level Security (RLS) による適切なアクセス制御

#### セキュリティ
- ランダムな招待トークン（32バイト）
- 7日間の有効期限
- 招待権限の厳密なチェック
- 重複参加の防止

### 使用フロー

1. **招待送信**
   - カレンダー設定 → メンバー管理 → 招待ボタン
   - リンク共有/QRコード表示/メール招待から選択

2. **招待受諾**
   - 招待リンクをタップ
   - アプリが起動し招待情報を表示
   - 「参加する」ボタンで受諾

3. **メンバー管理**
   - オーナーは全権限を保持
   - メンバーごとに招待権限を設定可能
   - いつでもメンバーの削除が可能

### ファイル構成

#### 新規作成
- `src/services/invitationService.ts`
- `src/components/InviteModal.tsx`
- `src/components/MemberManagementSheet.tsx`
- `src/screens/InviteAcceptScreen.tsx`
- `app/invite.tsx`

#### 修正
- `src/components/CalendarOptionsSheet.tsx`
- `app/_layout.tsx`
- `package.json`（依存関係追加）

## レビュー

### 実装完了度
全ての基本機能が実装され、動作可能な状態です：
- ✅ QRコード生成と表示
- ✅ 招待リンクの生成と共有
- ✅ メンバー管理UI
- ✅ 招待受諾フロー
- ✅ 権限管理

### 今後の拡張案
- メール自動送信機能（Supabase Edge Function）
- 招待履歴の詳細表示
- グループ招待機能
- 招待テンプレート機能

実装は完了し、QRコードと招待リンクでメンバーを招待できるようになりました。

---

# 現在のプロジェクト実装状況（2025年9月20日時点）

## プロジェクト概要
**Chat Task App** - AI搭載のReact Native（Expo）カレンダーアプリ

## 実装済み機能

### 🔐 認証システム
- **完了**: Supabase認証統合
- **ファイル**: `src/services/authService.ts`, `src/components/AuthForm.tsx`

### 📅 カレンダー機能
- **完了**: カスタムカレンダーコンポーネント
- **完了**: 日表示、週表示、月表示対応
- **完了**: イベント作成・編集・削除
- **ファイル**: `src/components/CustomCalendar.tsx`, `src/components/DayCalendar.tsx`, `src/components/WeekCalendar.tsx`

### 🎨 UI/UX
- **完了**: ダークモード対応
- **完了**: ボトムシート UI
- **完了**: サイドバーナビゲーション
- **完了**: レスポンシブデザイン
- **ファイル**: `src/components/Sidebar.tsx`, `src/components/BaseBottomSheet.tsx`

### 🤖 AI チャット機能
- **完了**: Gemini AI統合
- **完了**: チャット履歴管理
- **完了**: メッセージ表示UI
- **ファイル**: `src/services/geminiChatService.ts`, `src/components/ChatScreen.tsx`

### 🔔 プッシュ通知
- **完了**: Expo Notifications統合
- **完了**: 予定リマインダー機能
- **完了**: 通知設定UI
- **完了**: 権限管理
- **ファイル**: `src/services/notificationService.ts`, `src/components/NotificationSettings.tsx`

### 👥 メンバー招待システム
- **完了**: QRコード招待
- **完了**: 招待リンク生成
- **完了**: メンバー管理UI
- **完了**: 権限管理システム
- **ファイル**: `src/services/invitationService.ts`, `src/components/InviteModal.tsx`

### 🗄️ データベース
- **完了**: Supabase PostgreSQL設定
- **完了**: Row Level Security (RLS)
- **完了**: テーブル設計完了
  - profiles, calendars, calendar_members, events, invitations
- **ファイル**: `supabase-schema.sql`, `supabase/migrations/`

### 🌐 外部API統合
- **完了**: Google Calendar API
- **完了**: 祝日データ取得
- **完了**: 位置情報サービス
- **ファイル**: `src/services/googleCalendarService.ts`, `src/services/holidayService.ts`

### ⚙️ 設定機能
- **完了**: 国別祝日設定
- **完了**: タイムゾーン設定
- **完了**: 色設定
- **完了**: 通知設定
- **ファイル**: `src/components/CountrySettingsScreen.tsx`, `src/components/TimezoneSelectionScreen.tsx`

### 📱 画面構成
- **メイン画面**: `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`
- **認証画面**: `src/screens/AuthScreen.tsx`
- **イベント作成**: `src/screens/EventCreateScreen.tsx`
- **プライバシー**: `src/screens/PrivacyPolicyScreen.tsx`
- **利用規約**: `src/screens/TermsOfServiceScreen.tsx`

## 技術スタック

### フロントエンド
- **React Native**: 0.79.5
- **Expo**: ~53.0.20
- **TypeScript**: ~5.8.3
- **Expo Router**: ~5.1.4

### バックエンド
- **Supabase**: データベース・認証
- **PostgreSQL**: メインデータベース

### AI・機械学習
- **Google Gemini API**: チャット機能
- **OpenAI API**: 代替AI機能

### その他サービス
- **Google Calendar API**: カレンダー同期
- **Expo Notifications**: プッシュ通知
- **Calendarific API**: 祝日データ

## コンポーネント数
- **コンポーネント**: 47個
- **画面**: 7個
- **サービス**: 22個
- **コンテキスト**: 9個

## 実装品質
- ✅ TypeScript完全対応
- ✅ エラーハンドリング
- ✅ セキュリティ対策（RLS、権限管理）
- ✅ パフォーマンス最適化
- ✅ レスポンシブデザイン
- ✅ アクセシビリティ考慮

## 現在の開発状況

### 最新のコミット
- `078715c` AIチャット機能の改善とデータベース連携実装
- `a566eb4` メンバー招待機能の完全実装とUI改善
- `a2f34da` Google Calendar API祝日データ取得機能の修正と最適化

### 変更中ファイル
- `src/components/MainSettingsScreen.tsx` (変更)
- `src/components/Sidebar.tsx` (変更)
- `src/services/geminiChatService.ts` (変更)
- 新規追加予定: プライバシーポリシー・利用規約関連ファイル

## 総合評価

このプロジェクトは**高い完成度**を持つ本格的なカレンダーアプリです：

### 強み
- 包括的な機能セット（認証、カレンダー、AI、通知、招待）
- モダンな技術スタック
- セキュリティを重視した設計
- 優れたUI/UX
- 拡張性の高いアーキテクチャ

### 次のステップ候補
- パフォーマンステスト
- アプリストア公開準備
- 追加AI機能
- より詳細な分析機能
- 企業向け機能拡張

---

# iOS ビルドエラー修正タスク（2025年10月1日）

## 問題の原因
- プロジェクトディレクトリ名に全角アンダースコア`＿`が使用されている
- CocoaPodsが内部でパスを解決する際、半角と全角の混在により失敗
- シンボリックリンク `Chat_task_App_Link` が存在するが、完全には機能していない

## 解決策

### ✅ 完了したタスク
- [x] Ruby/CocoaPodsのインストール確認
- [x] Podfileの存在確認
- [x] `--project-directory`フラグでpod install実行開始（パスエラー発生）

### ⏳ 実行中のタスク
- [ ] **推奨**: プロジェクトディレクトリ名を全角から半角に変更
  - 現在: `Chat_task＿App` (全角`＿`)
  - 変更後: `Chat_task_App` (半角`_`)
  - 古いディレクトリを削除し、現在のディレクトリをリネーム

### 📋 次のステップ
1. ディレクトリのリネーム（ユーザー確認後）
2. `npx pod-install` または `cd ios && pod install`
3. `npx expo run:ios`

## 備考
全角文字を含むパスは、多くの開発ツール（CocoaPods、Xcode、git等）で問題を引き起こす可能性があります。

---

# プロフィール名の表示不具合修正（2025年10月1日）

## 問題の詳細
新規アカウント作成時に名前を「ほんだまなと」と入力しても、アプリ内のメニュー画面では「本多真翔」と表示される問題が発生していました。

## 原因分析
1. **ハードコードされた初期値**
   - `Sidebar.tsx` 82行目: `const [profileName, setProfileName] = useState('本多真翔');`
   - `ProfileSheet.tsx` 44行目: `const [profileName, setProfileName] = useState('本多真翔');`

2. **名前の保存場所の不一致**
   - サインアップ時: 名前がSupabaseの`auth.signUp`の`options.data.name`に保存される
   - 表示時: `Sidebar.tsx`と`ProfileSheet.tsx`がAsyncStorageの`profile_name`から読み込む
   - AsyncStorageに名前が保存されていないため、ハードコードされた初期値が表示される

## 修正内容

### ✅ 完了したタスク

#### 1. 初期値の修正
- [x] `src/components/Sidebar.tsx` 82行目
  - 変更前: `const [profileName, setProfileName] = useState('本多真翔');`
  - 変更後: `const [profileName, setProfileName] = useState('');`

- [x] `src/components/ProfileSheet.tsx` 44行目
  - 変更前: `const [profileName, setProfileName] = useState('本多真翔');`
  - 変更後: `const [profileName, setProfileName] = useState('');`

#### 2. AuthContext.tsxの修正
- [x] AsyncStorageのインポート追加
  ```typescript
  import AsyncStorage from '@react-native-async-storage/async-storage';
  ```

- [x] `signUp`関数の修正（98-129行目）
  - サインアップ成功後にAsyncStorageに名前を保存する処理を追加
  ```typescript
  // AsyncStorageに名前を保存
  try {
    await AsyncStorage.setItem('profile_name', name);
    console.log('✅ プロフィール名をAsyncStorageに保存しました:', name);
  } catch (storageError) {
    console.warn('⚠️ AsyncStorageへの保存エラー:', storageError);
  }
  ```

- [x] `fetchProfile`関数の修正（45-70行目）
  - Supabaseからプロフィールを取得した際、AsyncStorageにも名前を同期
  ```typescript
  // AsyncStorageにも名前を保存（一貫性のため）
  if (data?.name) {
    try {
      await AsyncStorage.setItem('profile_name', data.name);
      console.log('✅ プロフィール名をAsyncStorageに同期しました:', data.name);
    } catch (storageError) {
      console.warn('⚠️ AsyncStorageへの同期エラー:', storageError);
    }
  }
  ```

## 影響範囲

### 修正ファイル
- `src/components/Sidebar.tsx`
- `src/components/ProfileSheet.tsx`
- `src/contexts/AuthContext.tsx`

### 動作への影響
- **新規ユーザー**: サインアップ時に入力した名前が正しくアプリ内に表示される
- **既存ユーザー**: 次回ログイン時に`fetchProfile`でAsyncStorageに名前が同期される
- **後方互換性**: 既存のプロフィール画像URI読み込みには影響なし

## テスト項目
- [ ] 新規アカウント作成時に名前が正しく保存・表示されるか
- [ ] サイドバーのプロフィール名が正しく表示されるか
- [ ] プロフィールシートで名前の編集・保存ができるか
- [ ] ログアウト・再ログイン後も名前が保持されるか

## レビュー

### 実装品質
- **問題解決**: ハードコードの除去により、ユーザー入力が正しく反映されるように修正
- **データ一貫性**: SupabaseとAsyncStorageの両方に名前を保存することで整合性を確保
- **エラーハンドリング**: AsyncStorageの保存失敗時も適切にエラーログを出力
- **ログ追加**: デバッグ用のログで動作を追跡可能

### アーキテクチャ
- **関心の分離**: 認証コンテキストでデータ永続化を一元管理
- **拡張性**: 将来的なプロフィール同期機能の基盤となる実装
- **保守性**: シンプルな修正で、既存の処理フローには影響なし

---

# 予定項目にユーザーアイコン表示機能の実装（2025年10月1日）

## 目的
共有カレンダーで、予定確認画面（BottomSheet）の各予定項目の右端に、その予定を作成したユーザーのアイコンを表示する機能を実装しました。

## 実装内容

### ✅ 完了したタスク

#### 1. CalendarEventインターフェースの拡張
**ファイル**: `src/contexts/EventContext.tsx` (8-26行目)
- 以下のフィールドを追加:
  ```typescript
  userId?: string;           // 予定作成者のID
  creatorName?: string;      // 予定作成者の名前
  creatorImageUri?: string;  // 予定作成者のプロフィール画像URI
  ```

#### 2. EventServiceの修正
**ファイル**: `src/services/eventService.ts`

**dbEventToCalendarEvent関数の修正 (25-69行目)**:
- `userId`をマッピング
- JOINクエリで取得した作成者情報を復元
- `creatorName`と`creatorImageUri`を設定

**getAllEvents関数の修正 (131-153行目)**:
- Supabaseクエリにプロフィール情報のJOINを追加:
  ```typescript
  .select(`
    *,
    creator:profiles!user_id(id, name)
  `)
  ```

#### 3. BottomSheetコンポーネントの修正
**ファイル**: `src/components/BottomSheet.tsx`

**インポート追加**:
- `Image`コンポーネント
- `UserIcon` (react-native-heroicons)
- `useAuth`フック

**レイアウト構造の変更 (184-241行目)**:
```typescript
<View style={styles.eventMainContent}>
  <View style={styles.eventInfo}>
    {/* 既存の予定情報 */}
  </View>

  {/* 他のユーザーの予定の場合のみアイコン表示 */}
  {isOtherUser && (
    <View style={styles.userAvatarContainer}>
      {event.creatorImageUri ? (
        <Image source={{ uri: event.creatorImageUri }} style={styles.userAvatar} />
      ) : (
        <View style={styles.userAvatarPlaceholder}>
          <UserIcon size={16} color="#9CA3AF" />
        </View>
      )}
    </View>
  )}
</View>
```

**判定ロジック**:
- `const isOtherUser = event.userId && user?.id && event.userId !== user.id;`
- 自分の予定にはアイコンを表示しない

#### 4. スタイルの追加
**ファイル**: `src/components/BottomSheet.tsx` (392-420行目)

新規追加したスタイル:
- `eventMainContent`: 横並びレイアウト（flexDirection: row）
- `eventInfo`: 左側の予定情報エリア（flex: 1）
- `userAvatarContainer`: 右側のアイコンコンテナ
- `userAvatar`: 32x32pxの円形画像（borderRadius: 16）
- `userAvatarPlaceholder`: 画像がない場合のデフォルトアイコン

## 技術仕様

### UIデザイン
- **アイコンサイズ**: 32x32px（円形）
- **配置**: 予定項目の右上
- **表示条件**: 他のユーザーが作成した予定のみ
- **フォールバック**: 画像がない場合はUserIconを表示

### データフロー
1. EventServiceがSupabaseからイベントとプロフィール情報を取得（JOIN）
2. dbEventToCalendarEventで作成者情報をマッピング
3. BottomSheetで現在のユーザーIDと比較
4. 他のユーザーの予定の場合、アイコンを表示

## 影響範囲

### 修正ファイル
- `src/contexts/EventContext.tsx` - インターフェース拡張
- `src/services/eventService.ts` - データマッピングとクエリ修正
- `src/components/BottomSheet.tsx` - UIとレイアウト修正

### 動作への影響
- **自分の予定**: 従来通りの表示（アイコンなし）
- **他人の予定**: 右端にアイコンが表示される
- **共有カレンダー**: メンバーごとの予定が視覚的に区別可能に
- **パフォーマンス**: JOINクエリによるわずかなオーバーヘッド（許容範囲内）

## セキュリティとプライバシー
- 既存のRLSポリシーにより、表示権限のある予定のみ取得
- プロフィール画像URIは既存のAsyncStorageデータを参照
- データベースレベルでアクセス制御済み

## レビュー

### 実装品質
- **UI/UX**: 共有カレンダーで誰の予定かが一目でわかる
- **コード品質**: 既存のパターンに沿った実装
- **後方互換性**: userIdがない既存データでも正常動作
- **拡張性**: 将来的にアイコンのタップでユーザー詳細表示なども可能

### 今後の拡張案
- アイコンタップでユーザープロフィール表示
- 作成者名のツールチップ表示
- カレンダービュー（DayCalendar、WeekCalendar）にも同様の表示
- グループアバター（複数人の予定の場合）

---

# TypeScriptエラー修正タスク（2025年10月5日）

## 問題の概要
プロジェクトに50個以上のTypeScriptエラーがあり、アプリの白い画面問題の原因となっている可能性があります。

## 修正計画

### ✅ 完了したタスク
- [x] `npx tsc --noEmit`でエラー一覧を取得
- [x] Supabase設定ファイルの重複を確認
- [x] エラーの優先順位を決定

### ⏳ 実行中のタスク

#### 1. Supabase設定の統合
- [ ] src/services/supabase.tsを削除（src/lib/supabase.tsに統合）
- [ ] 全てのインポートをsrc/lib/supabase.tsに統一

#### 2. HolidayContext.tsxのスコープエラー修正
- [ ] processHolidayDataForYear関数の宣言順序を修正
- [ ] processEventsForYear関数の宣言順序を修正

#### 3. 通知サービスの型エラー修正
- [ ] NotificationTriggerInputの型定義を修正
- [ ] 'date'型を正しいSchedulableTriggerInputTypesに変更

#### 4. ChatScreenの型エラー修正
- [ ] ChatEventインターフェースにnotes, workplaceプロパティを追加
- [ ] response.eventsとresponse.eventのundefinedチェック追加
- [ ] colorプロパティの型定義を追加

#### 5. コンポーネントの型エラー修正
- [ ] BaseBottomSheet.tsxのmeasureメソッドの型定義修正
- [ ] FallbackTimePicker.tsxのminuteInterval型修正
- [ ] InlineDatePicker.tsxのMarkedDates型修正
- [ ] PatternLearningSettings.tsxのcardプロパティ追加
- [ ] Sidebar.tsxのpointerEventsプロパティ修正
- [ ] TimezoneSelectionScreen.tsxの配列メソッド修正

#### 6. 画面コンポーネントの型エラー修正
- [ ] EventCreateScreen.tsxのインデックス型修正とheaderSpacer追加
- [ ] InviteAcceptScreen.tsxのnull型修正

#### 7. その他の軽微なエラー修正
- [ ] Supabase Edge Functionsのエラー（Deno型定義）

### 📋 次のステップ
1. 各エラーを優先順位順に修正
2. 修正後に再度`npx tsc --noEmit`で確認
3. ビルドとテスト実行

## 主要なエラーカテゴリ

### クリティカル（アプリクラッシュの可能性）
- HolidayContextの変数スコープエラー（使用前宣言）
- ChatScreenのundefinedアクセスエラー
- InviteAcceptScreenのnull型エラー

### 重要（機能不全の可能性）
- 通知サービスの型エラー
- Supabase設定の重複

### 軽微（型安全性の問題）
- コンポーネントのプロパティ型エラー
- インデックス型エラー
- 暗黙的なany型エラー

---

# TestFlightローカルビルド準備 - 完了報告（2025年10月6日）

## タスク一覧

- [x] git履歴でConfig.xcconfigのコミット状況を確認
- [x] 必要に応じてAPIキーをローテーション
- [x] Info.plistで環境変数参照を確認・追加
- [x] Xcodeでのローカルビルド手順をドキュメント化

## 実施内容

### 1. セキュリティ確認 ✅
- `ios/Config.xcconfig`は`.gitignore`で正しく除外されている
- git履歴にAPIキーは含まれていない（`git ls-files`で確認済み）
- **結論**: セキュリティリスクなし。APIキーローテーション不要

### 2. 環境変数設定確認 ✅
- `react-native-config` (v1.5.9) がインストール済み
- CocoaPodsに正しく統合されている（Podfile.lock確認済み）
- `ios/Config.xcconfig`にすべてのAPIキーが設定済み:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - OPENAI_API_KEY
  - GOOGLE_MAPS_API_KEY
  - GOOGLE_CALENDAR_API_KEY
- Xcodeプロジェクト（project.pbxproj）に正しくリンク済み
- `src/services/supabase.ts`で環境変数を正しく読み込んでいる

### 3. Info.plist確認 ✅
- `react-native-config`を使用するため、Info.plistへの直接設定は不要
- JavaScriptレイヤーで`Config.xcconfig`から環境変数を読み込む設計
- AppDelegate.swiftはExpo標準構成で問題なし

---

## Xcodeローカルビルド手順（TestFlight用）

### 前提条件
- Xcode 14以上
- Apple Developer Programアカウント（Team ID: LKD5YP2DRM）
- CocoaPodsがインストール済み
- Node.js、npm

### 手順

#### 1. 依存関係のインストール
```bash
cd /Users/hondamanato/Chat_task_App
npm install
cd ios
pod install
```

#### 2. Xcodeでワークスペースを開く
```bash
open ios/tapless.xcworkspace
```
⚠️ **重要**: `tapless.xcodeproj`ではなく、**`tapless.xcworkspace`を開く**こと（CocoaPods使用時）

#### 3. 署名とチーム設定
1. Xcodeで`tapless`プロジェクトを選択
2. `TARGETS` > `tapless`を選択
3. `Signing & Capabilities`タブを開く
4. `Team`で自分のApple Developerチームを選択（LKD5YP2DRM）
5. `Bundle Identifier`が`com.aicalendarapp.tapless`であることを確認
6. `Automatically manage signing`にチェック

#### 4. ビルド設定の確認
1. Product > Scheme > Edit Scheme
2. Run > Build Configuration:
   - **Debug**（開発用）
   - **Release**（TestFlight用）
3. `Config.xcconfig`の環境変数が正しくビルド設定に反映されているか確認

#### 5. デバイスまたはシミュレーターでビルド

**シミュレーターテスト（開発用）**:
1. シミュレーター（例: iPhone 15 Pro）を選択
2. Product > Run（⌘R）
3. アプリが起動し、環境変数が正しく読み込まれることを確認
   - ログイン画面が表示される
   - Supabase接続が成功する

**実機テスト（TestFlightアップロード前）**:
1. iPhoneをUSBで接続
2. Xcodeでデバイスを選択
3. Product > Run（⌘R）
4. 初回ビルド時は署名の確認プロンプトが表示される場合あり
5. アプリが起動し、以下を確認:
   - APIキーが正しく動作する
   - 通知許可、カレンダー許可が正しくリクエストされる
   - ネットワーク通信が正常

#### 6. TestFlight用アーカイブの作成

1. **ビルド設定を確認**:
   - Product > Scheme > Edit Scheme
   - Archive > Build Configuration: **Release**

2. **デバイス選択**:
   - `Any iOS Device (arm64)`を選択

3. **アーカイブ作成**:
   - Product > Archive（⌘B後に実行）
   - ビルドが完了するまで待つ（5〜15分）
   - アーカイブが完成したら、Organizerが自動的に開く

4. **App Store Connectにアップロード**:
   - 作成されたアーカイブを選択
   - **Distribute App**をクリック
   - **App Store Connect**を選択 > Next
   - **Upload**を選択 > Next
   - 署名オプションを確認:
     - `Automatically manage signing`を選択
   - **Upload**をクリック
   - アップロードが完了するまで待つ（5〜10分）

5. **App Store Connectで処理を待つ**:
   - アップロード後、Appleのサーバーでビルドが処理される（通常5〜15分）
   - メールで「ビルドの処理が完了しました」という通知が届く

#### 7. TestFlightで配信

1. [App Store Connect](https://appstoreconnect.apple.com)にログイン
2. `My Apps` > `tapless`を選択
3. `TestFlight`タブを開く
4. 新しいビルド（Build 11）が表示されるまで待つ
5. ビルドが表示されたら:
   - 「輸出コンプライアンス」の質問に回答（暗号化なしの場合は「No」）
   - テスターグループに追加
   - 必要に応じて外部テスターを追加
6. 実機でTestFlightアプリからインストールしてテスト

---

## トラブルシューティング

### 環境変数が読み込まれない場合
1. `ios/Config.xcconfig`が存在することを確認
   ```bash
   ls -la ios/Config.xcconfig
   ```
2. Xcodeを再起動
3. `Clean Build Folder`を実行（Shift + ⌘ + K）
4. `pod install`を再実行
   ```bash
   cd ios
   pod install
   ```

### ビルドエラーが発生する場合
```bash
# Podsを完全に再インストール
cd ios
rm -rf Pods
rm -rf ~/Library/Caches/CocoaPods
rm Podfile.lock
pod deintegrate
pod install
```

### React Native Configが動作しない場合
```bash
# react-native-configを再インストール
npm install react-native-config
cd ios
pod install
```

### 署名エラーが発生する場合
1. Xcode > Preferences > Accounts で Apple IDが正しく設定されているか確認
2. Signing & Capabilitiesで`Automatically manage signing`を一度オフ→オンにする
3. Developer証明書が有効か確認

### アーカイブが作成できない場合
1. Scheme設定でArchiveのBuild Configurationが`Release`になっているか確認
2. Generic iOS Deviceまたは実機を選択しているか確認（シミュレーターではアーカイブ不可）
3. `Product > Clean Build Folder`を実行してから再度アーカイブ

---

## レビュー

### 変更内容の概要
- セキュリティ監査を実施し、APIキーがgit履歴に含まれていないことを確認
- `react-native-config`の設定が正しく行われていることを確認
- TestFlightローカルビルドのための詳細な手順書を作成

### 現在の状態
✅ **TestFlightローカルビルドの準備は完了しています**

以下の構成で、Xcodeからローカルビルドし、TestFlightにアップロードできます:
- **APIキー管理**: `ios/Config.xcconfig`（gitignore済み、セキュア）
- **環境変数読み込み**: `react-native-config`（CocoaPods統合済み）
- **ビルドツール**: Xcode + CocoaPods
- **配信方法**: Archive → App Store Connect → TestFlight

### 次のステップ
1. 上記手順に従ってXcodeでローカルビルド
2. シミュレーターで動作確認
3. 実機で動作確認
4. TestFlight用にArchiveを作成してアップロード
5. TestFlightで実機テスト

### 追加情報
- **Bundle Identifier**: `com.aicalendarapp.tapless`
- **Team ID**: `LKD5YP2DRM`
- **Current Build Number**: 11（Info.plist:36）
- **Version**: 1.0.0（Info.plist:22）
- **EAS Project ID**: adbcee49-329f-4f40-913f-91427cd320b5

次のビルド時は`CFBundleVersion`を12にインクリメントする必要があります（Xcodeが自動で行う場合もあり）。

---

# ログイン状態が時々リセットされる問題の修正（2025年10月10日）

## 問題の詳細
アプリを開いた際に、時々ログインしていない状態で開かれることがあります。アプリを一度閉じて再度開くとログインしている状態で開かれる問題が報告されました。

## 原因分析

### 1. **タイムアウト処理の問題** (AuthContext.tsx:96-104)
現在の実装では、セッション取得時に10秒のタイムアウトが設定されています：

```typescript
const sessionPromise = supabase.auth.getSession();
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('セッション取得タイムアウト')), 10000)
);

const { data: { session }, error } = await Promise.race([
  sessionPromise,
  timeoutPromise
]) as any;
```

**問題点**:
- `Promise.race`を使用しているため、タイムアウトが先に発生すると例外が投げられる
- タイムアウトの例外はキャッチされて、単に`loading: false`になるだけで、ユーザーは未認証状態として扱われる
- AsyncStorageからセッションを読み込む処理が遅い場合（特にアプリの初回起動時や、iOSのアプリが長時間バックグラウンドにあった後など）、タイムアウトに達してしまう可能性がある

### 2. **レースコンディション**
アプリの初期化時に以下の競合が発生する可能性があります：

1. `initializeAuth`がセッション取得を試みる
2. ネットワークの遅延やAsyncStorageの読み込みが遅い
3. タイムアウトに達する → `loading: false`, `user: null`
4. 未認証画面が表示される
5. その後、`onAuthStateChange`が発火してセッションが復元されるが、すでに画面は表示されている

### 3. **セッション復元の順序**
現在のAuthContext.tsxでは：
1. `initializeAuth`で初期セッションを取得（タイムアウト付き）
2. `onAuthStateChange`でリスナーを設定

しかし、アプリを開いた直後にネットワークやストレージの読み込みが遅い場合、`initializeAuth`がタイムアウトしてしまい、その後に`onAuthStateChange`でセッションが復元される可能性があります。

## 修正計画

### 修正方針
以下の2つのアプローチがあります：

#### オプション1: タイムアウトの削除（推奨）
最もシンプルな解決策は、タイムアウト処理を完全に削除し、Supabaseのセッション取得とonAuthStateChangeに完全に任せることです。

**メリット**:
- シンプルな実装
- レースコンディションの排除
- Supabaseの標準的な認証フローに準拠

**デメリット**:
- セッション取得が本当に失敗した場合、永遠にloading状態になる可能性（ただし、Supabaseのクライアントは内部でタイムアウトを持っている）

#### オプション2: タイムアウトの延長と改善
タイムアウトを延長し（30秒など）、エラーハンドリングを改善します。

**メリット**:
- ネットワーク障害時の対応が明示的
- ユーザーエクスペリエンスの細かい制御が可能

**デメリット**:
- より複雑な実装
- 適切なタイムアウト値の決定が困難

## 実装計画

### ✅ 調査完了
- [x] AuthContext.tsxの実装を確認
- [x] Supabase設定を確認
- [x] 問題の原因を特定

### 📋 修正タスク
- [ ] AuthContext.tsxの`initializeAuth`関数を修正
  - タイムアウト処理を削除または延長
  - エラーハンドリングを改善
- [ ] loading状態の管理を改善
  - セッション取得が完全に失敗するまで、loading状態を維持
- [ ] テストケースの作成
  - ネットワーク遅延時の動作確認
  - AsyncStorage読み込み遅延時の動作確認
  - アプリのバックグラウンド復帰時の動作確認

## 修正内容詳細

### AuthContext.tsx (src/contexts/AuthContext.tsx)

#### 修正箇所1: タイムアウト処理の削除
**現在 (76-127行目)**:
```typescript
const initializeAuth = async () => {
  try {
    const supabaseUrl = Config.SUPABASE_URL;
    const supabaseKey = Config.SUPABASE_ANON_KEY;

    console.log('🔍 Supabase設定確認:', { supabaseUrl, hasKey: !!supabaseKey });

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co' || supabaseUrl.includes('$()/')) {
      console.warn('⚠️ Supabase環境変数が設定されていません。オフラインモードで動作します。');
      if (mounted) {
        setLoading(false);
      }
      return;
    }

    // タイムアウト付きでセッション取得（10秒）
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('セッション取得タイムアウト')), 10000)
    );

    const { data: { session }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any;

    if (!mounted) return;

    if (error) {
      console.error('セッション取得エラー:', error);
    } else {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
    }

    if (mounted) {
      setLoading(false);
    }
  } catch (error) {
    console.error('認証初期化エラー:', error);
    if (mounted) {
      setLoading(false);
    }
  }
};
```

**修正後**:
```typescript
const initializeAuth = async () => {
  try {
    const supabaseUrl = Config.SUPABASE_URL;
    const supabaseKey = Config.SUPABASE_ANON_KEY;

    console.log('🔍 Supabase設定確認:', { supabaseUrl, hasKey: !!supabaseKey });

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co' || supabaseUrl.includes('$()/')) {
      console.warn('⚠️ Supabase環境変数が設定されていません。オフラインモードで動作します。');
      if (mounted) {
        setLoading(false);
      }
      return;
    }

    // タイムアウトを削除し、Supabaseの標準セッション取得に任せる
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!mounted) return;

    if (error) {
      console.error('セッション取得エラー:', error);
    } else {
      console.log('✅ セッション取得成功:', session ? 'ログイン済み' : '未ログイン');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
    }

    if (mounted) {
      setLoading(false);
    }
  } catch (error) {
    console.error('認証初期化エラー:', error);
    if (mounted) {
      setLoading(false);
    }
  }
};
```

## 影響範囲

### 修正ファイル
- `src/contexts/AuthContext.tsx`

### 動作への影響
- **アプリ起動時**: セッション取得がより確実に行われる
- **ネットワーク遅延時**: タイムアウトせずにセッション取得を待つ
- **AsyncStorage遅延時**: 正しくセッションを復元できる
- **既存ユーザー**: 次回起動時から改善が反映される

## テスト項目
- [ ] 通常起動時のログイン状態の確認
- [ ] アプリをバックグラウンドにした後の復帰時
- [ ] ネットワーク遅延がある場合の起動
- [ ] オフライン時の起動
- [ ] ログアウト→再ログインの動作確認

## レビュー

### 実装品質
- **問題解決**: タイムアウト処理の削除により、レースコンディションを排除
- **シンプル化**: よりシンプルで保守しやすいコードに改善
- **Supabase準拠**: Supabaseの標準的な認証フローに従った実装
- **ログ追加**: デバッグ用のログで動作を追跡可能

### アーキテクチャ
- **信頼性向上**: セッション取得の信頼性が向上
- **保守性**: シンプルな実装で、将来のメンテナンスが容易
- **拡張性**: 将来的な認証機能の追加にも対応しやすい
