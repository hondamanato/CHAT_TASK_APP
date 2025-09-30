interface EdgeFunctionResponse {
  data?: any;
  error?: {
    message: string;
    code?: string;
  };
}

class SupabaseEdgeService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor() {
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    this.supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }
  }

  async callEdgeFunction(
    functionName: string,
    payload: any = {}
  ): Promise<EdgeFunctionResponse> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `Edge Function error: ${response.status} - ${
            errorData?.error || response.statusText
          }`
        );
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error(`Edge Function ${functionName} error:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EDGE_FUNCTION_ERROR'
        }
      };
    }
  }

  async callGeminiProxy(requestBody: any): Promise<EdgeFunctionResponse> {
    return this.callEdgeFunction('gemini-proxy', requestBody);
  }

  async callOpenAIProxy(requestBody: any): Promise<EdgeFunctionResponse> {
    return this.callEdgeFunction('openai-proxy', requestBody);
  }
}

// デフォルトインスタンスをエクスポート
export const supabaseEdgeService = new SupabaseEdgeService();
export { SupabaseEdgeService, type EdgeFunctionResponse };