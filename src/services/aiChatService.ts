import Config from 'react-native-config';

// イベントの型定義
export interface RecurrenceSettings {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number;
  unit?: 'day' | 'week' | 'month' | 'year';
  endCondition: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
  weekdays?: number[];
  monthlyOption?: 'same-date' | 'same-weekday';
}

export interface ChatEvent {
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  isAllDay?: boolean;
  notes?: string;
  workplace?: string;
  color?: string;
  recurrence?: RecurrenceSettings;
  reminders?: number[];
}

export interface ChatKeywords {
  date?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
}

// ツール呼び出しの結果
export interface ToolResult {
  toolName: 'createEvent' | 'deleteEvent' | 'updateEvent' | 'searchEvents' | 'analyzeImage';
  result: {
    success: boolean;
    events?: ChatEvent[];
    keywords?: ChatKeywords;
    event?: ChatEvent;
    totalFound?: number;
    message?: string;
    error?: string;
  };
}

// ストリーミングメッセージの型
export interface StreamingMessage {
  type: 'text' | 'tool-call' | 'tool-result' | 'finish';
  content?: string;
  toolCall?: {
    toolName: string;
    args: any;
  };
  toolResult?: ToolResult;
}

// AIチャットサービス
class AIChatService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private edgeFunctionUrl: string;
  private abortController: AbortController | null = null;

  constructor() {
    this.supabaseUrl = Config.SUPABASE_URL || '';
    this.supabaseKey = Config.SUPABASE_ANON_KEY || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL and ANON KEY are required');
    }

    this.edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/ai-chat`;
  }

  /**
   * チャットメッセージを送信してストリーミングレスポンスを受け取る
   */
  async sendMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    existingEvents?: any[],
    onStream?: (message: StreamingMessage) => void,
  ): Promise<void> {
    // 既存のリクエストをキャンセル
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      console.log('📤 Sending message to AI Chat Edge Function:', {
        messagesCount: messages.length,
        hasExistingEvents: !!existingEvents,
      });

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
        body: JSON.stringify({
          messages,
          existingEvents,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge Function error:', response.status, errorText);
        throw new Error(`AI Chat error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // ストリーミングレスポンスを処理
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let currentToolCalls: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Streaming completed');
          if (onStream) {
            onStream({ type: 'finish' });
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              // テキストストリーム
              if (parsed.type === 'text-delta') {
                currentText += parsed.textDelta;
                if (onStream) {
                  onStream({
                    type: 'text',
                    content: currentText,
                  });
                }
              }
              
              // ツール呼び出し
              else if (parsed.type === 'tool-call') {
                const toolCall = {
                  toolName: parsed.toolName,
                  args: parsed.args,
                };
                currentToolCalls.push(toolCall);
                console.log('🔧 Tool call:', toolCall);
                if (onStream) {
                  onStream({
                    type: 'tool-call',
                    toolCall,
                  });
                }
              }
              
              // ツール結果
              else if (parsed.type === 'tool-result') {
                const toolResult: ToolResult = {
                  toolName: parsed.toolName as any,
                  result: parsed.result,
                };
                console.log('✅ Tool result:', toolResult);
                if (onStream) {
                  onStream({
                    type: 'tool-result',
                    toolResult,
                  });
                }
              }
              
              // 最終レスポンス
              else if (parsed.type === 'finish') {
                console.log('✅ Finish:', { text: currentText, toolCalls: currentToolCalls.length });
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⏹️ Request aborted');
        return;
      }

      console.error('❌ AI Chat error:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * 現在のリクエストをキャンセル
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 接続テスト
   */
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
          messages: [{ role: 'user', content: 'こんにちは' }],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// デフォルトインスタンスをエクスポート
export const aiChatService = new AIChatService();
export { AIChatService };

