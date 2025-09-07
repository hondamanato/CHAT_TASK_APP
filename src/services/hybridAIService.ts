import { openaiService, type ShiftAnalysisResult, type ChatResponse } from './openaiService';

/**
 * ハイブリッドAIサービス
 * - 画像解析: OpenAI GPT-4o mini (高精度OCR)
 * - チャット機能: OpenAI GPT-4o mini (統一)
 */
class HybridAIService {
  
  /**
   * シフト表画像を解析して予定を抽出
   * OpenAI GPT-4o miniを使用
   */
  async analyzeShiftImage(imageUri: string): Promise<ShiftAnalysisResult> {
    try {
      console.log('🖼️ OpenAI GPT-4o miniでシフト表を解析中...');
      const result = await openaiService.analyzeShiftImage(imageUri);
      console.log('✅ シフト表解析完了:', result);
      return result;
    } catch (error) {
      console.error('❌ シフト表解析エラー:', error);
      throw error;
    }
  }

  /**
   * 自然言語チャットメッセージを処理して予定を作成
   * OpenAI GPT-4o miniを使用
   */
  async processChatMessage(message: string, context?: string): Promise<ChatResponse> {
    try {
      console.log('💬 OpenAI GPT-4o miniでチャットメッセージを処理中...', message);
      const result = await openaiService.processChatMessage(message, context);
      console.log('✅ チャット処理完了:', result);
      return result;
    } catch (error) {
      console.error('❌ チャット処理エラー:', error);
      throw error;
    }
  }

  /**
   * API接続テスト
   */
  async testConnections(): Promise<{ openai: boolean }> {
    try {
      console.log('🔗 OpenAI API接続テスト中...');
      
      const openaiStatus = await openaiService.testConnection();

      const result = {
        openai: openaiStatus
      };

      console.log('📊 API接続状況:', result);
      return result;
    } catch (error) {
      console.error('❌ 接続テストエラー:', error);
      return { openai: false };
    }
  }

  /**
   * サービス統計情報を取得
   */
  getServiceInfo() {
    return {
      imageAnalysis: {
        provider: 'OpenAI',
        model: 'GPT-4o mini',
        purpose: 'シフト表・画像解析',
        features: ['高精度OCR', '日本語認識', '表構造理解']
      },
      chatProcessing: {
        provider: 'OpenAI',
        model: 'GPT-4o mini',
        purpose: 'チャット・自然言語処理',
        features: ['自然な会話', '日時解析', '統一されたAPI']
      },
      estimated_cost: {
        monthly: '$15-20',
        per_image: '$0.003',
        per_chat: '$0.0002'
      }
    };
  }
}

// シングルトンインスタンスをエクスポート
export const hybridAIService = new HybridAIService();
export { HybridAIService };