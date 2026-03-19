/**
 * 予約情報解析サービス
 * 構造化データ（JSON-LD/schema.org）とAI解析を使用して予約情報を抽出
 */

import {
  GmailReservation,
  GmailMessage,
  ReservationType,
  SchemaOrgReservation,
  SchemaOrgFlight,
  SchemaOrgLodgingBusiness,
  SchemaOrgFoodEstablishment,
} from '../types/gmail';
// gmailServiceは使用時に動的インポート（インポートチェーンの遅延化）
let gmailServiceInstance: Awaited<typeof import('./gmailService')>['gmailService'] | null = null;

const getGmailService = async () => {
  if (!gmailServiceInstance) {
    const mod = await import('./gmailService');
    gmailServiceInstance = mod.gmailService;
  }
  return gmailServiceInstance;
};

// expo-constantsは使用時に動的インポート（ネイティブモジュール初期化の遅延）
let ConstantsModule: typeof import('expo-constants') | null = null;

const getConstants = async () => {
  if (!ConstantsModule) {
    ConstantsModule = await import('expo-constants');
  }
  return ConstantsModule.default;
};

/**
 * 予約情報解析サービスクラス
 */
class ReservationParserService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private initialized: boolean;

  constructor() {
    this.supabaseUrl = '';
    this.supabaseKey = '';
    this.initialized = false;
  }

  /**
   * 設定を遅延初期化
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    const Constants = await getConstants();
    this.supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
    this.supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';
    this.initialized = true;
  }

  /**
   * メッセージから予約情報を解析
   */
  async parseReservations(messages: GmailMessage[]): Promise<GmailReservation[]> {
    const reservations: GmailReservation[] = [];

    for (const message of messages) {
      try {
        // まず構造化データを試行
        const structuredData = await this.extractStructuredData(message);
        if (structuredData.length > 0) {
          reservations.push(...structuredData);
          continue;
        }

        // 構造化データがない場合はAI解析にフォールバック
        const aiData = await this.parseWithAI(message);
        if (aiData.length > 0) {
          reservations.push(...aiData);
        }
      } catch (error) {
        console.error('[ReservationParser] メッセージ解析エラー:', error);
      }
    }

    // 重複を除去（同じ予約番号があれば）
    return this.deduplicateReservations(reservations);
  }

  /**
   * 構造化データ（JSON-LD/schema.org）を抽出
   */
  async extractStructuredData(message: GmailMessage): Promise<GmailReservation[]> {
    const reservations: GmailReservation[] = [];

    try {
      const gmailSvc = await getGmailService();
      const body = gmailSvc.getMessageBody(message);
      const html = body.html || '';

      // JSON-LDスクリプトタグを抽出
      const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      let match;

      while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(match[1]);
          const parsed = this.parseSchemaOrgData(jsonData, message.id);
          if (parsed) {
            reservations.push(parsed);
          }
        } catch (parseError) {
          console.warn('[ReservationParser] JSON-LDパースエラー:', parseError);
        }
      }
    } catch (error) {
      console.error('[ReservationParser] 構造化データ抽出エラー:', error);
    }

    return reservations;
  }

  /**
   * schema.orgデータを解析
   */
  private parseSchemaOrgData(
    data: SchemaOrgReservation | SchemaOrgReservation[],
    messageId: string
  ): GmailReservation | null {
    // 配列の場合は最初の要素を処理
    const reservation = Array.isArray(data) ? data[0] : data;

    if (!reservation || !reservation['@type']) {
      return null;
    }

    const type = reservation['@type'];

    // 飛行機予約
    if (type === 'FlightReservation' && reservation.reservationFor) {
      return this.parseFlightReservation(reservation, messageId);
    }

    // ホテル予約
    if (type === 'LodgingReservation' && reservation.reservationFor) {
      return this.parseLodgingReservation(reservation, messageId);
    }

    // レストラン予約
    if (type === 'FoodEstablishmentReservation' && reservation.reservationFor) {
      return this.parseFoodEstablishmentReservation(reservation, messageId);
    }

    return null;
  }

  /**
   * 飛行機予約を解析
   */
  private parseFlightReservation(
    data: SchemaOrgReservation,
    messageId: string
  ): GmailReservation | null {
    const flight = data.reservationFor as SchemaOrgFlight;
    if (!flight) return null;

    const departureTime = flight.departureTime ? new Date(flight.departureTime) : new Date();
    const arrivalTime = flight.arrivalTime ? new Date(flight.arrivalTime) : departureTime;

    return {
      id: `gmail_${messageId}_flight`,
      type: 'flight',
      title: `${flight.airline?.name || ''} ${flight.flightNumber || ''} フライト`,
      startDate: departureTime,
      endDate: arrivalTime,
      location: flight.departureAirport?.name || flight.departureAirport?.iataCode,
      confirmationNumber: data.reservationNumber,
      rawEmailId: messageId,
      flightNumber: flight.flightNumber,
      airline: flight.airline?.name,
      departureAirport: flight.departureAirport?.iataCode || flight.departureAirport?.name,
      arrivalAirport: flight.arrivalAirport?.iataCode || flight.arrivalAirport?.name,
    };
  }

  /**
   * ホテル予約を解析
   */
  private parseLodgingReservation(
    data: SchemaOrgReservation,
    messageId: string
  ): GmailReservation | null {
    const lodging = data.reservationFor as SchemaOrgLodgingBusiness;
    if (!lodging) return null;

    const checkIn = data.checkinTime ? new Date(data.checkinTime) : new Date();
    const checkOut = data.checkoutTime ? new Date(data.checkoutTime) : checkIn;

    const address = lodging.address
      ? [
          lodging.address.streetAddress,
          lodging.address.addressLocality,
          lodging.address.addressRegion,
        ]
          .filter(Boolean)
          .join(' ')
      : undefined;

    return {
      id: `gmail_${messageId}_hotel`,
      type: 'hotel',
      title: `${lodging.name || 'ホテル'} 宿泊`,
      startDate: checkIn,
      endDate: checkOut,
      location: lodging.name,
      address,
      confirmationNumber: data.reservationNumber,
      rawEmailId: messageId,
      hotelName: lodging.name,
      checkInTime: data.checkinTime,
      checkOutTime: data.checkoutTime,
    };
  }

  /**
   * レストラン予約を解析
   */
  private parseFoodEstablishmentReservation(
    data: SchemaOrgReservation,
    messageId: string
  ): GmailReservation | null {
    const restaurant = data.reservationFor as SchemaOrgFoodEstablishment;
    if (!restaurant) return null;

    const startDate = data.startDate ? new Date(data.startDate) : new Date();

    const address = restaurant.address
      ? [
          restaurant.address.streetAddress,
          restaurant.address.addressLocality,
        ]
          .filter(Boolean)
          .join(' ')
      : undefined;

    return {
      id: `gmail_${messageId}_restaurant`,
      type: 'restaurant',
      title: `${restaurant.name || 'レストラン'} 予約`,
      startDate,
      location: restaurant.name,
      address,
      confirmationNumber: data.reservationNumber,
      rawEmailId: messageId,
      restaurantName: restaurant.name,
    };
  }

  /**
   * AI（Gemini）を使用して予約情報を解析
   */
  async parseWithAI(message: GmailMessage): Promise<GmailReservation[]> {
    try {
      await this.ensureInitialized();
      const gmailSvc = await getGmailService();
      const body = gmailSvc.getMessageBody(message);
      const subject = gmailSvc.getHeader(message, 'Subject') || '';
      const from = gmailSvc.getHeader(message, 'From') || '';

      // テキストコンテンツを取得（HTMLタグを除去）
      let textContent = body.text || '';
      if (!textContent && body.html) {
        textContent = this.stripHtmlTags(body.html);
      }

      // コンテンツが短すぎる場合はスキップ
      if (textContent.length < 50) {
        return [];
      }

      // コンテンツを制限（トークン制限対策）
      const maxLength = 3000;
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength);
      }

      const prompt = `
以下のメールから予約情報を抽出してください。予約情報がない場合は空配列を返してください。

件名: ${subject}
送信者: ${from}
本文:
${textContent}

以下のJSON形式で返してください:
{
  "reservations": [
    {
      "type": "flight" | "hotel" | "restaurant" | "car_rental" | "event" | "other",
      "title": "予約のタイトル",
      "startDate": "YYYY-MM-DDTHH:mm:ss",
      "endDate": "YYYY-MM-DDTHH:mm:ss（任意）",
      "location": "場所名",
      "address": "住所（任意）",
      "confirmationNumber": "予約番号（任意）",
      "notes": "追加情報（任意）"
    }
  ]
}

重要:
- 確実に予約と判断できる情報のみ抽出してください
- 日時が不明な場合は予約として扱わないでください
- JSON以外のテキストは返さないでください
`;

      // Supabase Edge Functionを呼び出し
      const response = await fetch(`${this.supabaseUrl}/functions/v1/gemini-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          prompt,
          maxTokens: 1000,
        }),
      });

      if (!response.ok) {
        console.error('[ReservationParser] AI解析APIエラー:', response.status);
        return [];
      }

      const result = await response.json();
      const content = result.text || result.content || '';

      // JSONを抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.reservations || !Array.isArray(parsed.reservations)) {
        return [];
      }

      // 予約情報を変換
      return parsed.reservations.map((r: any, index: number) => ({
        id: `gmail_${message.id}_ai_${index}`,
        type: this.normalizeReservationType(r.type),
        title: r.title || '予約',
        startDate: r.startDate ? new Date(r.startDate) : new Date(),
        endDate: r.endDate ? new Date(r.endDate) : undefined,
        location: r.location,
        address: r.address,
        confirmationNumber: r.confirmationNumber,
        notes: r.notes,
        rawEmailId: message.id,
      }));
    } catch (error) {
      console.error('[ReservationParser] AI解析エラー:', error);
      return [];
    }
  }

  /**
   * HTMLタグを除去
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 予約タイプを正規化
   */
  private normalizeReservationType(type: string): ReservationType {
    const typeMap: Record<string, ReservationType> = {
      flight: 'flight',
      airline: 'flight',
      airplane: 'flight',
      hotel: 'hotel',
      lodging: 'hotel',
      accommodation: 'hotel',
      restaurant: 'restaurant',
      dining: 'restaurant',
      car_rental: 'car_rental',
      rental_car: 'car_rental',
      event: 'event',
      ticket: 'event',
      concert: 'event',
    };

    return typeMap[type?.toLowerCase()] || 'other';
  }

  /**
   * 重複する予約を除去
   */
  private deduplicateReservations(reservations: GmailReservation[]): GmailReservation[] {
    const seen = new Set<string>();
    return reservations.filter(r => {
      // 予約番号がある場合はそれで重複判定
      if (r.confirmationNumber) {
        const key = `${r.type}_${r.confirmationNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }

      // 予約番号がない場合はタイトルと日付で判定
      const key = `${r.type}_${r.title}_${r.startDate.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// シングルトンインスタンス
export const reservationParserService = new ReservationParserService();
