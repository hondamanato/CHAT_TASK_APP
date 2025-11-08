import Config from 'react-native-config';

interface RecurrenceSettings {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number;
  unit?: 'day' | 'week' | 'month' | 'year';
  endCondition: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
  weekdays?: number[]; // 週の繰り返し時の曜日選択 (0=日曜日, 1=月曜日, ...)
  monthlyOption?: 'same-date' | 'same-weekday'; // 月の繰り返しオプション
}

interface ChatEvent {
  date: string;
  endDate?: string; // 複数日イベントの終了日（オプション）
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  isAllDay?: boolean;
  notes?: string;      // メモ
  workplace?: string;  // 勤務場所
  color?: string;      // イベントの色
  recurrence?: RecurrenceSettings; // 繰り返し設定
  reminders?: number[]; // リマインダー（分単位の配列）
}

interface ChatKeywords {
  date?: string;      // 検索対象の日付 (YYYY-MM-DD)
  startDate?: string; // 検索期間の開始日 (YYYY-MM-DD) - search_events用
  endDate?: string;   // 検索期間の終了日 (YYYY-MM-DD) - search_events用
  title?: string;     // 検索対象のタイトルキーワード
}

interface ChatResponse {
  intent: 'create_event' | 'delete_event' | 'update_event' | 'search_events' | 'confirm_events' | 'cancel' | 'edit_existing_events' | 'chat';
  keywords?: ChatKeywords;  // delete_event/update_event/search_events時の検索キーワード
  event?: ChatEvent;        // create_event時のイベントデータ
  events?: ChatEvent[];     // 後方互換性のため（create_event時）、またはsearch_events時の検索結果、edit_existing_events時の統合されたイベントリスト
  message: string;
  confidence: number;
}

class GeminiChatService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private edgeFunctionUrl: string;

  constructor() {
    this.supabaseUrl = Config.SUPABASE_URL || '';
    this.supabaseKey = Config.SUPABASE_ANON_KEY || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL and ANON KEY are required');
    }

    // Supabase Edge Function URL
    this.edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/gemini-proxy`;
  }

  async processChatMessage(message: string, context?: string, existingEvents?: ChatEvent[]): Promise<ChatResponse> {
    try {
      // 日本時間で現在の日時を取得
      const now = new Date();
      const currentDate = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').join('-');

      const currentTime = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // 明日の日付も計算して提供
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').join('-');

      // 既存イベントリストをJSON形式で整形
      const existingEventsContext = existingEvents && existingEvents.length > 0
        ? `\n\n**既存のイベントリスト（画像解析で抽出済み）**:\n${JSON.stringify(existingEvents, null, 2)}`
        : '';

      const prompt = `
あなたはAIカレンダーアシスタントです。ユーザーの自然な言葉から、操作の意図(intent)と必要な情報を抽出してJSONで返してください。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}

ユーザーメッセージ: "${message}"
${context ? `前の会話: ${context}` : ''}${existingEventsContext}

以下の形式で返してください：

{
  "intent": "create_event" | "delete_event" | "update_event" | "search_events" | "confirm_events" | "cancel" | "edit_existing_events" | "chat",
  "keywords": {
    "date": "YYYY-MM-DD",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "title": "キーワード"
  },
  "event": {
    "date": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "title": "予定のタイトル",
    "description": "詳細（あれば）",
    "isAllDay": false,
    "recurrence": {
      "type": "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom",
      "interval": 1,
      "unit": "day" | "week" | "month" | "year",
      "endCondition": "never" | "date" | "count",
      "endDate": "YYYY-MM-DD",
      "endCount": 10,
      "weekdays": [1, 3, 5],
      "monthlyOption": "same-date" | "same-weekday"
    },
    "reminders": [10, 60, 1440]
  },
  "message": "ユーザーへの自然な返答",
  "confidence": 0.95
}

**重要なルール**：

0. **会話履歴の扱い**：
   - 前の会話から人名や固有名詞を勝手に使わない
   - タイトルは現在のメッセージのみから抽出
   - 例: 前の会話に「本多さん」とあっても、現在のメッセージが「明日18時からバイト」なら、タイトルは「バイト」のみ

1. **intentの判定**：
   - 予定を作成: intent: "create_event"、eventフィールドに予定データ
   - 予定を削除: intent: "delete_event"、keywordsフィールドに検索条件
   - 予定を編集: intent: "update_event"、keywordsとeventフィールド両方
   - 予定を検索: intent: "search_events"、keywordsフィールドに検索条件（startDate, endDate, title）
   - **既存イベントリストを編集**: intent: "edit_existing_events"（既存のイベントリストに対して追加・削除・修正を行う）
   - イベント追加を確認: intent: "confirm_events"（「はい」「お願い」「追加して」「よろしく」「やって」など肯定的な返答）
   - キャンセル: intent: "cancel"（「いいえ」「やめる」「キャンセル」など否定的な返答）
   - 通常の会話: intent: "chat"、messageのみ

2. **search_eventsの場合**：
   - keywordsにstartDate（開始日）、endDate（終了日）、title（キーワード）を抽出
   - **日付範囲の計算**:
     - 「明日の予定」 → { startDate: "${tomorrowDate}", endDate: "${tomorrowDate}" }
     - 「今週の予定」 → { startDate: "今週月曜日", endDate: "今週日曜日" }
     - 「来週の予定」 → { startDate: "来週月曜日", endDate: "来週日曜日" }
     - 「今月の予定」 → { startDate: "今月1日", endDate: "今月末日" }
     - 「10月の予定」 → { startDate: "2025-10-01", endDate: "2025-10-31" }
   - タイトルフィルタ（オプション）:
     - 「来週の会議」 → { startDate: "...", endDate: "...", title: "会議" }
   - 例:
     - 「明日の予定を教えて」 → { intent: "search_events", keywords: { startDate: "${tomorrowDate}", endDate: "${tomorrowDate}" } }
     - 「来週の予定は？」 → { intent: "search_events", keywords: { startDate: "来週月曜", endDate: "来週日曜" } }
     - 「10月の会議」 → { intent: "search_events", keywords: { startDate: "2025-10-01", endDate: "2025-10-31", title: "会議" } }

3. **delete_eventの場合**：
   - keywordsに日付とタイトルのキーワードを抽出
   - 例: 「明日の会議を削除」 → { intent: "delete_event", keywords: { date: "${tomorrowDate}", title: "会議" } }
   - 例: 「10月3日の予定を削除」 → { intent: "delete_event", keywords: { date: "2025-10-03" } }

4. **create_eventの場合**：
   - 相対的な日時表現を具体的な日付に変換
     - 「明日」 → ${tomorrowDate}
     - 「今日」 → ${currentDate}
     - 「来週火曜日」 → 具体的な日付を計算

   - **複数日にわたる予定は1つのイベントとして生成**
     - 「明日から3日間旅行」 → date: 明日, endDate: 明日+2日後, isAllDay: true
     - 複数日イベントはendDateフィールドに終了日を設定

   - 時刻の正確な解析
     - 「15時」「午後3時」 → "15:00"
     - 「9時」「朝9時」 → "09:00"
     - 終了時間が未指定の場合は開始時間+1時間

5. **繰り返し予定の解析**：
   - **繰り返しなし（デフォルト）**: recurrenceフィールドを省略、または type: "none"

   - **毎日**: type: "daily", interval: 1, endCondition: "never"
     例: 「毎日9時に朝会」

   - **毎週**: type: "weekly", interval: 1, weekdays: [曜日番号], endCondition: "never"
     曜日番号: 0=日曜日, 1=月曜日, 2=火曜日, 3=水曜日, 4=木曜日, 5=金曜日, 6=土曜日
     例: 「毎週月曜日10時に定例会議」 → weekdays: [1]
     例: 「毎週月水金に運動」 → weekdays: [1, 3, 5]

   - **毎月**: type: "monthly", interval: 1, monthlyOption: "same-date", endCondition: "never"
     例: 「毎月1日に請求書確認」

   - **毎年**: type: "yearly", interval: 1, endCondition: "never"
     例: 「毎年12月25日にクリスマス」

   - **カスタム間隔**: type: "custom", interval: N, unit: 単位
     例: 「3日ごとに薬を飲む」 → type: "custom", interval: 3, unit: "day"
     例: 「2週間ごとにミーティング」 → type: "custom", interval: 2, unit: "week"

   - **終了条件**:
     - 「〜まで」: endCondition: "date", endDate: "YYYY-MM-DD"
       例: 「12月31日まで」
     - 「〜回」: endCondition: "count", endCount: N
       例: 「10回まで」
     - 指定なし: endCondition: "never"

6. **色の指定**：
   - ユーザーが色を指定した場合、colorフィールドに適切なカラーコードを設定
   - 色名→カラーコードのマッピング:
     - 赤: "#ef4444", オレンジ: "#f97316", 黄色: "#eab308", ライム: "#84cc16"
     - 緑: "#22c55e", ティール: "#14b8a6", シアン: "#06b6d4", スカイ: "#0ea5e9"
     - 青: "#3b82f6", インディゴ: "#6366f1", バイオレット: "#8b5cf6", パープル: "#a855f7"
     - マゼンタ: "#ec4899", ピンク: "#f472b6", ブラウン: "#a16207", グレー: "#6b7280"
   - 色指定がない場合は、colorフィールドを省略（デフォルトの青が使用される）
   - 例: 「明日3時に会議、赤色で」 → color: "#ef4444"
   - 例: 「毎週月曜10時に定例会議、緑で」 → color: "#22c55e"

7. **リマインダー（通知）の設定**：
   - ユーザーがリマインダーを指定した場合、remindersフィールドに分単位の配列を設定
   - リマインダーの時間→分への変換:
     - 5分前: 5, 10分前: 10, 15分前: 15, 30分前: 30
     - 1時間前: 60, 2時間前: 120, 3時間前: 180
     - 1日前: 1440, 2日前: 2880, 3日前: 4320
     - 1週間前: 10080
   - 複数のリマインダーを配列で設定可能
   - 例: 「10分前に通知」 → reminders: [10]
   - 例: 「30分前と1時間前」 → reminders: [30, 60]
   - 例: 「1日前に通知して」 → reminders: [1440]
   - リマインダー指定がない場合は、remindersフィールドを省略

8. **edit_existing_eventsの場合**：
   - **既存のイベントリストが提供されている場合のみ、このインテントを使用**
   - ユーザーが「4日の18から23も追加して」「3日を削除して」「5日の時間を変更して」など、既存リストの編集を要求した場合に使用
   - 処理内容:
     - **追加**: 既存リストに新しいイベントを追加
       例: 「4日の18から23も追加して」 → 既存リスト + 新規イベント
     - **削除**: 既存リストから指定されたイベントを削除
       例: 「3日を削除して」 → 該当イベントを除外
     - **修正**: 既存リストの特定イベントを修正
       例: 「5日の時間を20時までに変更して」 → 該当イベントの終了時刻を変更
   - **eventsフィールドに統合後の完全なイベントリストを返す**（元のリスト + 変更分）
   - messageには変更内容を明確に伝える
     例: 「11月4日 18:00-23:00のバイトを追加しました。合計14件の予定になります。カレンダーに追加しますか？」
   - 日付の解析:
     - 「4日」 → 既存リストの月を参照（例: 既存が11月なら2025-11-04）
     - 「11月4日」 → 2025-11-04
   - タイトルの継承:
     - ユーザーがタイトルを指定しない場合、既存リストの一般的なタイトル（「バイト」など）を使用
     - 既存リストに複数のタイトルがある場合は、ユーザーに確認するか、デフォルトで「予定」を使用

9. **自然な日本語で応答**：
   - 丁寧語で親しみやすく
   - 予定が明確でない場合は確認事項を質問
   - 繰り返し予定を作成した場合は「繰り返し予定を設定しました」と伝える
   - リマインダーを設定した場合は「通知を設定しました」と伝える

例：
- 「明日の3時に会議」 → { intent: "create_event", event: { date: "${tomorrowDate}", startTime: "15:00", endTime: "16:00", title: "会議", isAllDay: false }, message: "明日の15時に会議を追加しました。" }
- 「毎週月曜日10時に定例会議」 → { intent: "create_event", event: { date: "次の月曜日", startTime: "10:00", endTime: "11:00", title: "定例会議", isAllDay: false, recurrence: { type: "weekly", interval: 1, weekdays: [1], endCondition: "never" } }, message: "毎週月曜日10時に定例会議の繰り返し予定を設定しました。" }
- 「明日の予定を教えて」 → { intent: "search_events", keywords: { startDate: "${tomorrowDate}", endDate: "${tomorrowDate}" }, message: "明日の予定を検索しています..." }
- 「来週の予定は？」 → { intent: "search_events", keywords: { startDate: "来週月曜日", endDate: "来週日曜日" }, message: "来週の予定を確認します。" }
- 「10月の会議」 → { intent: "search_events", keywords: { startDate: "2025-10-01", endDate: "2025-10-31", title: "会議" }, message: "10月の会議を検索しています..." }
- 「明日の会議を削除」 → { intent: "delete_event", keywords: { date: "${tomorrowDate}", title: "会議" }, message: "明日の会議を削除しますか？" }
- 「4日の18から23もついかして」（既存イベントリストがある場合） → { intent: "edit_existing_events", events: [既存リスト全体 + 新規イベント], message: "11月4日 18:00-23:00のバイトを追加しました。合計14件の予定になります。カレンダーに追加しますか？" }
- 「来週病院」 → { intent: "chat", message: "来週の何曜日ですか？具体的な日時を教えていただけますか？" }

JSONのみを返してください。
`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
      };

      // Supabase Edge Function経由でGemini APIを呼び出し
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini Edge Function error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result: ChatResponse = JSON.parse(cleanedResponse);

      // 後方互換性: create_eventの場合はeventsフィールドも設定
      if (result.intent === 'create_event' && result.event) {
        result.events = [result.event];
      }

      return result;
    } catch (error) {
      console.error('Geminiチャット処理エラー:', error);

      // フォールバック応答
      return {
        intent: 'chat',
        events: [],
        message: 'すみません、うまく理解できませんでした。もう少し詳しく教えていただけますか？',
        confidence: 0.0
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'こんにちは' }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// デフォルトインスタンスをエクスポート
export const geminiChatService = new GeminiChatService();
export { GeminiChatService, type ChatEvent, type ChatResponse };
