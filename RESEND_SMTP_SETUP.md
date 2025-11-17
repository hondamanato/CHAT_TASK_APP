# Resend SMTP設定ガイド（本番環境用）

このドキュメントは、Supabase認証メール送信用にResendのカスタムSMTPを設定する手順を説明します。

## 前提条件
- Supabaseプロジェクトが作成済み
- メールアドレスが確認可能

## ステップ1: Resendアカウント作成

1. [Resend](https://resend.com)にアクセス
2. 「Sign Up」をクリックしてアカウント作成
3. メールアドレスを確認
4. 無料プラン（月3,000通まで）で開始

## ステップ2: Resend SMTP認証情報の取得

### 2-1. APIキーの作成

1. Resendダッシュボードにログイン
2. 左メニューから「API Keys」をクリック
3. 「Create API Key」をクリック
4. 以下を設定：
   - Name: `Supabase Production SMTP`
   - Permission: `Sending access`
5. 作成されたAPIキーを**安全な場所にコピー**（一度しか表示されません）

### 2-2. SMTP設定情報の確認

Resendの標準SMTP設定：
```
Host: smtp.resend.com
Port: 465 (SSL推奨) または 587 (TLS)
Username: resend
Password: [作成したAPIキー]
```

## ステップ3: ドメイン設定（推奨）

### オプションA: 共有ドメインを使用（開発・テスト用）

**メリット**: すぐに使える、DNS設定不要
**デメリット**: 送信元が `onboarding@resend.dev` になる

1. そのまま次のステップへ進む
2. 送信者メールは `onboarding@resend.dev` を使用

### オプションB: 独自ドメインを使用（本番環境推奨）

**メリット**: ブランドイメージ向上、信頼性が高い
**デメリット**: ドメイン取得費用、DNS設定が必要

#### 3-1. ドメイン取得
- お名前.com、Google Domains、Cloudflareなどでドメインを取得

#### 3-2. Resendにドメイン追加

1. Resendダッシュボードで「Domains」をクリック
2. 「Add Domain」をクリック
3. ドメイン名を入力（例: `yourdomain.com`）
4. 表示されるDNSレコードをコピー

#### 3-3. DNS設定

ドメインプロバイダーのDNS設定画面で以下を追加：

| Type | Name | Value |
|------|------|-------|
| TXT | @ | v=spf1 include:_spf.resend.com ~all |
| CNAME | resend._domainkey | resend._domainkey.resend.com |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:your-email@example.com |

#### 3-4. ドメイン認証確認

1. DNS設定後、Resendダッシュボードに戻る
2. 「Verify Domain」をクリック
3. 認証完了まで数時間〜24時間待つ

## ステップ4: Supabaseでの設定

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「Authentication」→「Email」をクリック
4. 「SMTP Settings」タブを選択
5. 「カスタムSMTPを有効にする」をオンにする
6. 以下を入力：

```
送信者メール: noreply@yourdomain.com
（共有ドメインの場合: onboarding@resend.dev）

送信者名: Tapless

ホスト: smtp.resend.com

ポート番号: 465

Username: resend

Password: [ResendのAPIキー]
```

7. 「Save」をクリック

## ステップ5: テストメール送信

### 5-1. テストユーザー登録

1. アプリで新規ユーザー登録を試行
2. OTP認証メールが届くか確認

### 5-2. トラブルシューティング

**メールが届かない場合：**

1. Resendダッシュボードで「Logs」を確認
2. APIキーが正しいか確認
3. ドメイン認証が完了しているか確認（独自ドメイン使用時）
4. 迷惑メールフォルダを確認

**よくあるエラー：**

- `Invalid API key`: APIキーが間違っている
- `Domain not verified`: ドメイン認証が未完了
- `Rate limit exceeded`: 送信制限を超えている（無料プランは月3,000通）

## ステップ6: 環境変数の管理（オプション）

SMTP設定情報を環境変数として記録：

`.env.example` に以下を追加（実際の値は含めない）：
```env
# Resend SMTP Configuration
RESEND_API_KEY=your_resend_api_key_here
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Tapless
```

## セキュリティのベストプラクティス

1. **APIキーの管理**
   - GitHubなどにコミットしない
   - 定期的にローテーションする
   - 必要最小限の権限のみ付与

2. **ドメイン設定**
   - SPF、DKIM、DMARCを正しく設定
   - HTTPS接続を使用（ポート465推奨）

3. **メール送信制限**
   - レート制限を監視
   - 必要に応じて有料プランへアップグレード

## 料金プラン

### Resend無料プラン
- 月3,000通まで無料
- 1日100通まで
- 基本的なサポート

### 有料プラン
- Pro: $20/月〜（月50,000通まで）
- Business: カスタム価格

## 参考リンク

- [Resend公式ドキュメント](https://resend.com/docs)
- [Supabase SMTP設定](https://supabase.com/docs/guides/auth/auth-smtp)
- [SPF/DKIM/DMARC設定ガイド](https://resend.com/docs/dashboard/domains/introduction)

## まとめ

このガイドに従って設定することで、本番環境で信頼性の高いメール送信が可能になります。
共有ドメインで開発・テストを行い、本番リリース前に独自ドメインへ移行することを推奨します。
