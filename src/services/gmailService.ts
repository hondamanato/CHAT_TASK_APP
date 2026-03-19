/**
 * Gmail APIサービス
 * Gmail APIを使用してメールを検索・取得
 */

import { GmailMessage, GmailListResponse } from '../types/gmail';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

// 動的インポートヘルパー（ネイティブモジュール初期化を遅延）
let gmailAuthServiceInstance: Awaited<typeof import('./gmailAuthService')>['gmailAuthService'] | null = null;

const getGmailAuthService = async () => {
  if (!gmailAuthServiceInstance) {
    const mod = await import('./gmailAuthService');
    gmailAuthServiceInstance = mod.gmailAuthService;
  }
  return gmailAuthServiceInstance;
};

// 予約メール検索用クエリ
const RESERVATION_SEARCH_QUERIES = [
  'category:reservations',
  'label:^smartlabel_receipt',
  'subject:(予約 OR reservation OR booking OR confirmation OR itinerary)',
  'from:(booking.com OR hotels.com OR expedia OR airbnb OR "japan airlines" OR ana OR jal)',
];

/**
 * Gmail APIサービスクラス
 */
class GmailService {
  /**
   * 予約メールを検索
   */
  async searchReservationEmails(maxResults: number = 20): Promise<GmailMessage[]> {
    try {
      const gmailAuthService = await getGmailAuthService();
      const accessToken = await gmailAuthService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('アクセストークンがありません');
      }

      // 検索クエリを構築（OR条件で結合）
      const query = RESERVATION_SEARCH_QUERIES.join(' OR ');

      // メッセージ一覧を取得
      const listResponse = await this.listMessages(accessToken, query, maxResults);

      if (!listResponse.messages || listResponse.messages.length === 0) {
        console.log('[GmailService] 予約メールが見つかりませんでした');
        return [];
      }

      console.log(`[GmailService] ${listResponse.messages.length}件の予約メールを検出`);

      // 各メッセージの詳細を取得
      const messages = await Promise.all(
        listResponse.messages.map(msg => this.getMessage(accessToken, msg.id))
      );

      return messages.filter((msg): msg is GmailMessage => msg !== null);
    } catch (error) {
      console.error('[GmailService] 予約メール検索エラー:', error);
      throw error;
    }
  }

  /**
   * メッセージ一覧を取得
   */
  private async listMessages(
    accessToken: string,
    query: string,
    maxResults: number
  ): Promise<GmailListResponse> {
    const url = new URL(`${GMAIL_API_BASE}/users/me/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', maxResults.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GmailService] API Error:', response.status, errorText);
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * メッセージ詳細を取得
   */
  async getMessage(accessToken: string, messageId: string): Promise<GmailMessage | null> {
    try {
      const url = `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('[GmailService] メッセージ取得エラー:', response.status);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error('[GmailService] メッセージ取得エラー:', error);
      return null;
    }
  }

  /**
   * メッセージからヘッダー値を取得
   */
  getHeader(message: GmailMessage, headerName: string): string | undefined {
    const header = message.payload.headers.find(
      h => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value;
  }

  /**
   * メッセージ本文を取得（HTML/プレーンテキスト）
   */
  getMessageBody(message: GmailMessage): { html?: string; text?: string } {
    const result: { html?: string; text?: string } = {};

    const extractBody = (parts: GmailMessage['payload']['parts']) => {
      if (!parts) return;

      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body.data) {
          result.html = this.decodeBase64Url(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body.data) {
          result.text = this.decodeBase64Url(part.body.data);
        } else if (part.parts) {
          extractBody(part.parts);
        }
      }
    };

    // シングルパートメッセージの場合
    if (message.payload.body.data) {
      if (message.payload.mimeType === 'text/html') {
        result.html = this.decodeBase64Url(message.payload.body.data);
      } else if (message.payload.mimeType === 'text/plain') {
        result.text = this.decodeBase64Url(message.payload.body.data);
      }
    }

    // マルチパートメッセージの場合
    if (message.payload.parts) {
      extractBody(message.payload.parts);
    }

    return result;
  }

  /**
   * Base64 URL エンコードされた文字列をデコード
   */
  private decodeBase64Url(data: string): string {
    try {
      // Base64 URL形式をBase64標準形式に変換
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      // パディングを追加
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      // デコード
      return decodeURIComponent(
        atob(padded)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (error) {
      console.error('[GmailService] Base64デコードエラー:', error);
      return '';
    }
  }

  /**
   * 最近のメールを取得（テスト用）
   */
  async getRecentEmails(maxResults: number = 10): Promise<GmailMessage[]> {
    try {
      const gmailAuthService = await getGmailAuthService();
      const accessToken = await gmailAuthService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('アクセストークンがありません');
      }

      const listResponse = await this.listMessages(accessToken, '', maxResults);

      if (!listResponse.messages) {
        return [];
      }

      const messages = await Promise.all(
        listResponse.messages.map(msg => this.getMessage(accessToken, msg.id))
      );

      return messages.filter((msg): msg is GmailMessage => msg !== null);
    } catch (error) {
      console.error('[GmailService] 最近のメール取得エラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const gmailService = new GmailService();
