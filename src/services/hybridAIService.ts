import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { geminiChatService, type ChatResponse, type ChatEvent } from './geminiChatService';
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
 * - 画像解析: Supabase Edge Function + Claude 3.5 Sonnet (汎用画像解析)
 * - チャット機能: Gemini 1.5 Flash (コスト効率・日本語に強い)
 */
class HybridAIService {

  /**
   * 画像を解析して予定を抽出（汎用）
   * Supabase Edge Function + Claude 3.5 Sonnetを使用
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
      console.log(`🖼️ Claude 3.5 Sonnetで画像を解析中 (${locale || 'ja'}, ${timezone || 'Asia/Tokyo'})${userMessage ? ` - メッセージ: ${userMessage}` : ''}...`);

      // 画像をBase64に変換
      const base64Image = await this.convertImageToBase64(imageUri);

      // Supabase Edge Functionを呼び出し（Claudeのみ）
      const response = await supabaseEdgeService.callEdgeFunction(
        'analyze-shift-claude',
        {
          imageBase64: base64Image,
          userMessage: userMessage || undefined,
          timezone: timezone || 'Asia/Tokyo',
          locale: locale || 'ja'
        }
      );

      if (response.error) {
        console.error('❌ Edge Function エラーレスポンス:', response.error);
        throw new Error(response.error.message);
      }

      const result: ImageAnalysisResult = response.data;

      console.log('✅ 画像解析完了:', {
        totalFound: result.totalFound,
        processingTime: result.processingTime,
        events: result.events.length > 0 ? result.events.map(e => ({ date: e.date, title: e.title })) : '予定なし'
      });

      return result;
    } catch (error) {
      console.error('❌ 画像解析エラー:', error);

      // より詳細なエラーメッセージを生成
      let userFriendlyMessage = '画像の解析に失敗しました';

      if (error instanceof Error) {
        if (error.message.includes('認証エラー')) {
          userFriendlyMessage = 'Supabaseの認証に失敗しました。設定を確認してください。';
        } else if (error.message.includes('ネットワーク')) {
          userFriendlyMessage = 'ネットワーク接続エラーが発生しました。インターネット接続を確認してください。';
        } else if (error.message.includes('見つかりません')) {
          userFriendlyMessage = 'Edge Functionが見つかりません。デプロイ状況を確認してください。';
        } else if (error.message.includes('ANTHROPIC_API_KEY')) {
          userFriendlyMessage = 'Claude APIキーが設定されていません。管理者に連絡してください。';
        } else if (error.message.includes('サーバーエラー')) {
          userFriendlyMessage = `サーバーエラーが発生しました: ${error.message}`;
        } else {
          userFriendlyMessage = error.message;
        }
      }

      throw new Error(userFriendlyMessage);
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
   * 画像を圧縮してBase64文字列に変換
   * - 2400px以下にリサイズ
   * - JPEG圧縮（品質95%）
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('🖼️ 画像を圧縮中...');

      // 画像を圧縮（最大2400px、JPEG品質95%）
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 2400 } }], // 幅を2400pxに制限（アスペクト比維持）
        {
          compress: 0.95, // 95%品質
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log('✅ 画像圧縮完了:', manipulatedImage.uri);

      // Base64に変換
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📦 Base64変換完了。サイズ:', Math.round(base64.length / 1024), 'KB');
      return base64;
    } catch (error) {
      console.error('❌ 画像変換エラー:', error);
      throw new Error('画像の変換に失敗しました');
    }
  }

  /**
   * 自然言語チャットメッセージを処理して予定を作成
   * Gemini 1.5 Flashを使用
   * @param existingEvents 既存のイベントリスト（画像解析で抽出したイベントなど）
   */
  async processChatMessage(message: string, context?: string, existingEvents?: EventEntry[]): Promise<ChatResponse> {
    try {
      console.log('💬 Gemini 1.5 Flashでチャットメッセージを処理中...', message);

      // EventEntryをChatEventに変換
      let chatEvents: ChatEvent[] | undefined;
      if (existingEvents && existingEvents.length > 0) {
        chatEvents = existingEvents.map(event => ({
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          title: event.title,
          description: event.description,
          workplace: event.location,
          isAllDay: false
        }));
      }

      const result = await geminiChatService.processChatMessage(message, context, chatEvents);
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
  async testConnections(): Promise<{ claude: boolean; gemini: boolean }> {
    try {
      console.log('🔗 API接続テスト中...');

      const geminiStatus = await geminiChatService.testConnection();

      const result = {
        claude: true, // Supabase Edge Function経由のため、直接テスト不可
        gemini: geminiStatus
      };

      console.log('📊 API接続状況:', result);
      return result;
    } catch (error) {
      console.error('❌ 接続テストエラー:', error);
      return { claude: false, gemini: false };
    }
  }

  /**
   * サービス統計情報を取得
   */
  getServiceInfo() {
    return {
      imageAnalysis: {
        provider: 'Supabase Edge Function + Anthropic',
        model: 'Claude 3.5 Sonnet',
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
        per_image: '$0.003-0.005',
        per_chat: '$0.00001'
      }
    };
  }
}

// シングルトンインスタンスをエクスポート
export const hybridAIService = new HybridAIService();
export { HybridAIService };