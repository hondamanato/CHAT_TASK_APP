# OTP送信エラーの修正: signUp + パスワード更新フローへ変更 (2025-11-02)

[過去の履歴は省略 - 既存の内容はそのまま保持]

---

# 認証番号メール送信とAIチャットエラーの修正 (2025-11-11)

## 概要
2つの問題を修正します：
1. 新規登録時の認証番号メールが送信されない
2. AIチャットで「すみませんうまくわかりません」と返される

## 問題の詳細

### 問題1: 認証番号メールが送信されない
**現状:**
- メールアドレス入力後、OTP入力画面に遷移するが、メールが届かない
- コード実装自体は正常（authService.ts sendOTPForSignup）
- Supabase設定済みと報告されているが、動作していない

**考えられる原因:**
1. Supabase Email TemplatesでOTPトークン（`{{ .Token }}`）が設定されていない
2. Supabase SMTP設定が未完了またはテストされていない
3. Edge Functionからのメール送信がブロックされている
4. エラーが発生しているが、ユーザーに通知されていない

### 問題2: AIチャットで「すみませんうまくわかりません」エラー
**現状:**
- メッセージ送信時に常に「すみません、うまく理解できませんでした」と返される
- geminiChatService.tsのエラーハンドリングでフォールバック応答が返されている

**根本原因:**
- `gemini-proxy` Edge Functionで`GEMINI_API_KEY`が未設定またはエラー発生
- geminiChatService.ts (325-335行目) でエラーをキャッチしてフォールバック応答を返している
- 実際のエラー内容がユーザーに通知されていない

## 修正計画

### [ ] 1. authService.tsのsendOTPForSignup関数にデバッグログ追加
**ファイル:** `src/services/authService.ts` (442-466行目)

**目的:**
- OTP送信の成功/失敗を詳細にログ出力
- Supabaseからのエラーメッセージをキャプチャ
- メール送信プロセスの各ステップを追跡

**変更内容:**
- 送信開始時のログ追加
- 成功時のログ追加
- エラー時の詳細なログ出力（error.message、error.code、error.details）

```typescript
async sendOTPForSignup(email: string) {
  try {
    console.log('[OTP送信] 開始:', email);
    const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        emailRedirectTo: undefined,
        shouldCreateSession: false,
        data: {
          temp_signup: true,
        },
      },
    });

    if (error) {
      console.error('[OTP送信] Supabaseエラー:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });
      throw error;
    }

    console.log('[OTP送信] 成功:', {
      userId: data?.user?.id,
      email: data?.user?.email,
      confirmed: data?.user?.confirmed_at,
    });
  } catch (error: any) {
    console.error('[OTP送信] キャッチエラー:', error);
    throw new Error('認証コードの送信に失敗しました: ' + error.message);
  }
}
```

### [ ] 2. AuthContext.tsxのOTP送信処理にユーザー通知を追加
**ファイル:** `src/contexts/AuthContext.tsx` (416-438行目)

**目的:**
- エラー発生時にユーザーに詳細なエラーメッセージを表示
- デバッグ情報を収集しやすくする

**変更内容:**
- エラー発生時にAlert.alertで詳細を表示
- エラーメッセージをreturnで返す

```typescript
const sendSignupOTP = async (email: string) => {
  try {
    isSignupInProgressRef.current = true;
    setIsSignupInProgress(true);
    setLoading(true);
    console.log('[AuthContext] OTP送信開始:', email);
    const { authService } = await import('../services/authService');
    await authService.sendOTPForSignup(email);
    console.log('[AuthContext] OTP送信成功');
    return { error: undefined };
  } catch (error: any) {
    console.error('[AuthContext] OTP送信エラー:', error);
    isSignupInProgressRef.current = false;
    setIsSignupInProgress(false);

    // エラーの詳細を含めて返す
    return {
      error: {
        message: error.message || 'OTP送信に失敗しました',
        code: error.code,
        details: error.toString(),
      } as AuthError
    };
  } finally {
    setLoading(false);
  }
};
```

### [ ] 3. geminiChatService.tsのエラーハンドリング改善
**ファイル:** `src/services/geminiChatService.ts` (325-335行目)

**目的:**
- エラーの詳細をユーザーに通知
- デバッグ情報を収集

**変更内容:**
- エラーメッセージにエラー詳細を含める
- Gemini API接続エラーを判別

```typescript
} catch (error: any) {
  console.error('Geminiチャット処理エラー:', error);

  // エラーの種類を判別
  let errorMessage = 'すみません、うまく理解できませんでした。';

  if (error.message?.includes('API key not configured')) {
    errorMessage = '⚠️ Gemini APIキーが設定されていません。管理者に連絡してください。';
  } else if (error.message?.includes('fetch')) {
    errorMessage = '⚠️ ネットワークエラーが発生しました。インターネット接続を確認してください。';
  } else if (error.status === 500) {
    errorMessage = '⚠️ サーバーエラーが発生しました。しばらく待ってから再試行してください。';
  } else {
    errorMessage += `\n詳細: ${error.message || 'Unknown error'}`;
  }

  return {
    intent: 'chat',
    events: [],
    message: errorMessage,
    confidence: 0.0
  };
}
```

### [ ] 4. MultiStepSignupForm.tsxのエラー表示改善
**ファイル:** `src/components/MultiStepSignupForm.tsx` (89-93行目)

**目的:**
- OTP送信エラーをユーザーにわかりやすく表示
- 再送信を促すメッセージを追加

**変更内容:**
- エラー発生時にAlert.alertで詳細を表示
- 再送信ボタンを強調

```typescript
const handleEmailNext = (email: string) => {
  setSignupData({ ...signupData, email });
  setPreviousStep(currentStep);
  setCurrentStep(2);

  onSendOTP(email).then((result) => {
    if (result?.error) {
      // エラーの詳細を表示
      Alert.alert(
        'OTP送信エラー',
        `認証コードの送信に失敗しました。\n\n${result.error.message}\n\nOTP入力画面で「再送信」ボタンをタップしてください。`,
        [{ text: 'OK' }]
      );
    }
  }).catch((error: any) => {
    Alert.alert('エラー', 'OTPの送信に失敗しました。再送信ボタンをタップしてください。');
  });
};
```

### [ ] 5. Supabase Email Templates設定の確認（手動作業）

**重要:** この作業はSupabaseダッシュボードで手動で実施する必要があります。

#### 手順:
1. Supabaseダッシュボードにログイン
2. Authentication > Email Templates
3. **「Confirm signup」** テンプレートを選択
4. Messageに `{{ .Token }}` が含まれているか確認

#### 正しいテンプレート例:
```
件名: [Tapless] 認証コード

本文:
以下の6桁の認証コードを入力してください:

{{ .Token }}

このコードの有効期限は10分です。
```

#### もし `{{ .ConfirmationURL }}` になっている場合:
- 上記のテンプレートに変更
- 保存

### [ ] 6. Supabase Secrets確認（手動作業）

**GEMINI_API_KEY**が設定されているか確認:

#### 確認方法:
```bash
# Supabase CLIでSecretsを確認
supabase secrets list --project-ref your-project-id
```

#### GEMINI_API_KEYが見つからない場合:
```bash
# Gemini APIキーを設定
supabase secrets set GEMINI_API_KEY=your-gemini-api-key --project-ref your-project-id
```

#### Gemini APIキーの取得方法:
1. https://aistudio.google.com/app/apikey にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. APIキーをコピー

### [ ] 7. Edge Functionのデプロイ確認（手動作業）

#### 確認方法:
```bash
# Edge Functionsのリストを表示
supabase functions list

# gemini-proxyがデプロイされているか確認
```

#### デプロイされていない場合:
```bash
# Edge Functionをデプロイ
supabase functions deploy gemini-proxy --project-ref your-project-id
```

### [ ] 8. ローカルでのテストとデバッグ

#### OTP送信のテスト:
1. アプリを起動
2. 新規登録画面を開く
3. メールアドレスを入力して「次へ」をタップ
4. コンソールログを確認:
   - `[OTP送信] 開始: メールアドレス`
   - `[OTP送信] 成功: { userId, email, confirmed }`
   - または `[OTP送信] Supabaseエラー: { message, code, status }`
5. メールボックスを確認（届いていれば成功）

#### AIチャットのテスト:
1. アプリを起動
2. カレンダー画面のチャットアイコンをタップ
3. メッセージを送信（例: 「明日の14時にミーティング」）
4. コンソールログを確認:
   - `Geminiチャット処理エラー: ...`
   - エラーメッセージの内容を確認
5. エラーメッセージが表示されたら、その内容を元に対処

## 期待される結果

### OTP送信:
- ✅ メールアドレス入力後、認証コードメールが届く
- ✅ エラー発生時は詳細なエラーメッセージが表示される
- ✅ コンソールログでデバッグ情報が確認できる

### AIチャット:
- ✅ メッセージ送信時に正常な応答が返される
- ✅ エラー発生時は具体的なエラーメッセージが表示される
- ✅ Gemini APIキー未設定の場合は適切なエラーメッセージが表示される

## 影響範囲
- **修正ファイル数**: 4ファイル
- **変更行数**: 約80行
- **影響範囲**: 新規登録フロー、AIチャット機能のみ

## 注意事項
- コード変更はログ追加とエラーハンドリング改善のみで、既存機能に影響を与えない
- Supabase設定の変更は手動作業が必要
- テスト時はコンソールログを確認すること

## レビュー

### 実装完了内容

コード側のエラーログとエラーハンドリングを改善しました。これにより、問題の原因を特定しやすくなりました。

### 変更の概要

#### 1. authService.ts (`src/services/authService.ts`)
**変更箇所:** sendOTPForSignup関数 (442-478行目)

**変更内容:**
- OTP送信開始時のログ追加: `[OTP送信] 開始: email`
- 成功時の詳細ログ追加: userId, email, confirmed情報を出力
- エラー時の詳細ログ追加: message, code, status情報を出力
- エラーメッセージに詳細を含める

#### 2. AuthContext.tsx (`src/contexts/AuthContext.tsx`)
**変更箇所:** sendSignupOTP関数 (416-447行目)

**変更内容:**
- エラー時にmessage, code, status, nameを含む詳細なエラーオブジェクトを返す
- エラー情報がMultiStepSignupFormで利用可能になる

#### 3. geminiChatService.ts (`src/services/geminiChatService.ts`)
**変更箇所:** processChatMessage関数のcatchブロック (325-355行目)

**変更内容:**
- エラーの種類を判別してユーザーにわかりやすいメッセージを表示
  - APIキー未設定エラー: `⚠️ Gemini APIキーが設定されていません。`
  - ネットワークエラー: `⚠️ ネットワークエラーが発生しました。`
  - サーバーエラー: `⚠️ サーバーエラーが発生しました。`
  - JSON解析エラー: `⚠️ AIの応答を解析できませんでした。`
  - その他: エラー詳細を含むメッセージ
- 各エラーケースごとに詳細なログ出力

#### 4. MultiStepSignupForm.tsx (`src/components/MultiStepSignupForm.tsx`)
**変更箇所:** handleEmailNext関数 (89-106行目)

**変更内容:**
- OTP送信の成功/失敗をチェック
- エラー発生時にユーザーにわかりやすいアラートを表示
- エラーメッセージに詳細情報を含める
- 成功時のログ出力追加

### 技術的ハイライト

1. **デバッグ情報の充実**: 各ステップでコンソールログを出力し、問題の特定が容易になりました
2. **エラー情報の詳細化**: Supabaseエラーのcode, status, messageを全て記録
3. **ユーザー体験の向上**: エラー発生時に具体的な対処方法を提示
4. **エラー種類の判別**: Geminiエラーを種類ごとに分類して適切なメッセージを表示

### 次のステップ（ユーザーが実施）

#### 1. アプリを起動してテスト

**OTP送信のテスト:**
1. アプリを起動
2. 新規登録画面を開く
3. メールアドレスを入力して「次へ」をタップ
4. **コンソールログを確認:**
   - `[OTP送信] 開始: メールアドレス`
   - `[OTP送信] 成功: { userId, email, confirmed }` または
   - `[OTP送信] Supabaseエラー: { message, code, status }`
5. メールボックスを確認（届いていれば成功）

**AIチャットのテスト:**
1. アプリを起動（ログイン済み）
2. カレンダー画面のチャットアイコンをタップ
3. メッセージを送信（例: 「明日の14時にミーティング」）
4. **コンソールログを確認:**
   - エラーメッセージが表示された場合、その内容を確認
   - `[Gemini] APIキー未設定エラー` または
   - `[Gemini] ネットワークエラー: ...` または
   - `[Gemini] サーバーエラー: ...`

#### 2. エラーメッセージから問題を特定

**「⚠️ Gemini APIキーが設定されていません」と表示された場合:**
1. Supabase Secretsを確認
```bash
supabase secrets list --project-ref your-project-id
```
2. GEMINI_API_KEYが見つからない場合は設定
```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key --project-ref your-project-id
```

**OTP送信エラーが表示された場合:**
1. コンソールログで `[OTP送信] Supabaseエラー:` のメッセージを確認
2. エラーコードとメッセージから原因を特定:
   - `Email not confirmed`: Email Templates設定を確認
   - `SMTP not configured`: SMTP設定を確認
   - その他のエラー: エラーメッセージを元に対処

#### 3. Supabase設定の確認（手動作業）

**Email Templates設定:**
1. Supabaseダッシュボード > Authentication > Email Templates
2. 「Confirm signup」テンプレートを選択
3. Messageに `{{ .Token }}` が含まれているか確認

**SMTP設定:**
1. Supabaseダッシュボード > Authentication > Emails > SMTP Settings
2. カスタムSMTPが有効化されているか確認
3. Resend APIキーが正しく設定されているか確認

#### 4. デバッグログの活用

コンソールログを確認して、以下の情報を収集:
- エラーが発生した箇所
- エラーメッセージの内容
- エラーコードとステータス
- ユーザーに表示されたメッセージ

### 期待される動作

#### OTP送信:
- ✅ メールアドレス入力後、コンソールログに `[OTP送信] 開始:` が表示される
- ✅ 成功時は `[OTP送信] 成功:` とユーザーIDが表示される
- ✅ エラー時は詳細なエラー情報がコンソールログとアラートに表示される
- ✅ ユーザーは具体的な対処方法を知ることができる

#### AIチャット:
- ✅ メッセージ送信時、正常な応答が返される（APIキーが設定済みの場合）
- ✅ エラー発生時、具体的なエラーメッセージが表示される
- ✅ APIキー未設定の場合、その旨が明確に表示される
- ✅ コンソールログでエラーの詳細を確認できる

### 注意事項

- **コード変更のみでは問題は解決しません**: Supabase設定（Email Templates、SMTP、Gemini APIキー）が必要です
- **デバッグ情報の活用**: コンソールログを確認して、具体的な問題を特定してください
- **既存機能への影響なし**: ログ追加とエラーハンドリング改善のみで、既存の動作は変わりません

---
