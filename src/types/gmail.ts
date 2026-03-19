/**
 * Gmail API 予約情報取得機能の型定義
 */

// 予約タイプ
export type ReservationType = 'flight' | 'hotel' | 'restaurant' | 'car_rental' | 'event' | 'other';

// 予約情報
export interface GmailReservation {
  id: string;
  type: ReservationType;
  title: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  address?: string;
  confirmationNumber?: string;
  notes?: string;
  rawEmailId: string;
  // 飛行機固有
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  // ホテル固有
  hotelName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  // レストラン固有
  restaurantName?: string;
  partySize?: number;
}

// Gmail認証状態
export interface GmailAuthState {
  isLinked: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  email: string | null;
}

// Gmail APIメッセージ
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailMessagePayload;
  internalDate: string;
}

export interface GmailMessagePayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: GmailMessageHeader[];
  body: GmailMessageBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageBody {
  size: number;
  data?: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers: GmailMessageHeader[];
  body: GmailMessageBody;
  parts?: GmailMessagePart[];
}

// Gmail APIレスポンス
export interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

// 構造化データ（schema.org）
export interface SchemaOrgReservation {
  '@type': string;
  reservationNumber?: string;
  reservationStatus?: string;
  reservationFor?: SchemaOrgFlight | SchemaOrgLodgingBusiness | SchemaOrgFoodEstablishment;
  underName?: SchemaOrgPerson;
  checkinTime?: string;
  checkoutTime?: string;
  startDate?: string;
  endDate?: string;
}

export interface SchemaOrgFlight {
  '@type': 'Flight';
  flightNumber?: string;
  airline?: SchemaOrgAirline;
  departureAirport?: SchemaOrgAirport;
  arrivalAirport?: SchemaOrgAirport;
  departureTime?: string;
  arrivalTime?: string;
}

export interface SchemaOrgAirline {
  '@type': 'Airline';
  name?: string;
  iataCode?: string;
}

export interface SchemaOrgAirport {
  '@type': 'Airport';
  name?: string;
  iataCode?: string;
}

export interface SchemaOrgLodgingBusiness {
  '@type': 'LodgingBusiness' | 'Hotel';
  name?: string;
  address?: SchemaOrgAddress;
}

export interface SchemaOrgFoodEstablishment {
  '@type': 'FoodEstablishment' | 'Restaurant';
  name?: string;
  address?: SchemaOrgAddress;
}

export interface SchemaOrgPerson {
  '@type': 'Person';
  name?: string;
  email?: string;
}

export interface SchemaOrgAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

// AI解析結果
export interface AIReservationParseResult {
  success: boolean;
  reservations: GmailReservation[];
  error?: string;
}

// GmailContext用の状態
export interface GmailContextState {
  authState: GmailAuthState;
  reservations: GmailReservation[];
  isLoading: boolean;
  error: string | null;
}

// GmailContext用のアクション
export interface GmailContextActions {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchReservations: () => Promise<void>;
  clearError: () => void;
  getReservationEventData: (reservation: GmailReservation) => ReservationEventData;
  initialize: () => Promise<void>;
}

// GmailContext用の初期化状態
export interface GmailContextInitState {
  isInitialized: boolean;
}

// 予約情報をカレンダーイベントに変換するためのデータ
export interface ReservationEventData {
  title: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  location: { name: string; address?: string };
  notes: string;
  color: string;
  isAllDay: boolean;
  reminders: number[];
  recurrence: { type: 'none'; endCondition: 'never' };
}

export type GmailContextType = GmailContextState & GmailContextActions & GmailContextInitState;
