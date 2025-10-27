import * as FileSystem from 'expo-file-system';
import { geminiChatService, type ChatResponse } from './geminiChatService';
import { supabaseEdgeService } from './supabaseEdgeService';

export interface EventEntry {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  description?: string;
  matchedName?: string;
  confidence: number;
  rawText?: string;
}

export interface ImageAnalysisResult {
  events: EventEntry[];
  totalFound: number;
  processingTime: number;
}

/**
 * ハイブリッドAIサービス
 * - 画像解析: Supabase Edge Function + GPT-4o Vision (汎用画像解析)
 * - チャット機能: Gemini 1.5 Flash (コスト効率・日本語に強い)
 */
class HybridAIService {

  /**
   * 画像を解析して予定を抽出（汎用）
   * Supabase Edge Function + GPT-4o Visionを使用
   *
   * @param imageUri 画像のURI
   * @param userMessage ユーザーメッセージ（オプション）- AIが名前や意図を自動判断
   * @param timezone ユーザーのタイムゾーン（オプション）
   * @param locale ユーザーの言語設定（オプション）
   */
  async analyzeImage(
    imageUri: string,
    userMessage?: string,
    timezone?: string,
    locale?: string
  ): Promise<ImageAnalysisResult> {
    try {
      console.log(`🖼️ GPT-4o Visionで画像を解析中 (${locale || 'ja'}, ${timezone || 'Asia/Tokyo'})${userMessage ? ` - メッセージ: ${userMessage}` : ''}...`);

      // 画像をBase64に変換
      const base64Image = await this.convertImageToBase64(imageUri);

      // Supabase Edge Functionを呼び出し
      const response = await supabaseEdgeService.callEdgeFunction(
        'analyze-shift-gpt4o',
        {
          imageBase64: base64Image,
          userMessage: userMessage || undefined,
          timezone: timezone || 'Asia/Tokyo',
          locale: locale || 'ja'
        }
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result: ImageAnalysisResult = response.data;

      console.log('✅ 画像解析完了:', {
        totalFound: result.totalFound,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      console.error('❌ 画像解析エラー:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : '画像の解析に失敗しました'
      );
    }
  }

  /**
   * シフト表画像を解析（後方互換性のため）
   * @deprecated analyzeImageを使用してください
   */
  async analyzeShiftImage(imageUri: string, userName?: string): Promise<ImageAnalysisResult> {
    console.warn('analyzeShiftImageは非推奨です。analyzeImageを使用してください。');
    return this.analyzeImage(imageUri, userName);
  }

  /**
   * 画像URIをBase64文字列に変換
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Base64変換エラー:', error);
      throw new Error('画像の変換に失敗しました');
    }
  }

  /**
   * 自然言語チャットメッセージを処理して予定を作成
   * Gemini 1.5 Flashを使用
   */
  async processChatMessage(message: string, context?: string): Promise<ChatResponse> {
    try {
      console.log('💬 Gemini 1.5 Flashでチャットメッセージを処理中...', message);
      const result = await geminiChatService.processChatMessage(message, context);
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
  async testConnections(): Promise<{ openai: boolean; gemini: boolean }> {
    try {
      console.log('🔗 API接続テスト中...');

      const openaiStatus = await openaiService.testConnection();
      const geminiStatus = await geminiChatService.testConnection();

      const result = {
        openai: openaiStatus,
        gemini: geminiStatus
      };

      console.log('📊 API接続状況:', result);
      return result;
    } catch (error) {
      console.error('❌ 接続テストエラー:', error);
      return { openai: false, gemini: false };
    }
  }

  /**
   * サービス統計情報を取得
   */
  getServiceInfo() {
    return {
      imageAnalysis: {
        provider: 'Supabase Edge Function + OpenAI',
        model: 'GPT-4o Vision',
        architecture: 'Supabase Edge Function',
        purpose: '汎用画像解析（シフト表、イベント表、チケットなど）',
        features: [
          '高精度Vision API',
          '多様な画像タイプに対応',
          '日本語認識',
          '表構造理解',
          'ユーザー名フィルタリング（オプション）'
        ]
      },
      chatProcessing: {
        provider: 'Gemini',
        model: 'Gemini 1.5 Flash',
        purpose: 'チャット・自然言語処理',
        features: ['自然な会話', '日時解析', 'コスト効率', '日本語に強い']
      },
      estimated_cost: {
        monthly: '$5-10',
        per_image: '$0.002-0.003',
        per_chat: '$0.00001'
      }
    };
  }
}

// シングルトンインスタンスをエクスポート
export const hybridAIService = new HybridAIService();
export { HybridAIService };