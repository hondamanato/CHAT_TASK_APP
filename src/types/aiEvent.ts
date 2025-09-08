// AI予定抽出で使用するデータ型定義
export interface AIExtractedEvent {
  title: string;
  date: string; // YYYY-MM-DD形式
  startTime?: string; // HH:MM形式
  endTime?: string; // HH:MM形式
  endDate?: string; // YYYY-MM-DD形式（複数日イベントの場合）
  location?: string;
  description?: string;
  isAllDay?: boolean;
  confidence?: number; // 0-1の信頼度スコア
}

// AI APIからのレスポンス型
export interface AIEventExtractionResponse {
  events: AIExtractedEvent[];
  summary?: string;
  error?: string;
}

// AIサービスの設定型
export interface AIServiceConfig {
  provider?: 'openai' | 'gemini';
  model?: string;
  maxTokens?: number;
  temperature?: number;
}