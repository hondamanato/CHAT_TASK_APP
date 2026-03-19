/**
 * GmailContext
 * Gmail連携の状態管理
 */

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import {
  GmailAuthState,
  GmailReservation,
  GmailContextType,
  ReservationEventData,
} from '../types/gmail';
// サービスは動的インポートに変更（クラッシュ防止）

// 動的インポート用のキャッシュ
let gmailAuthServiceInstance: Awaited<typeof import('../services/gmailAuthService')>['gmailAuthService'] | null = null;
let gmailServiceInstance: Awaited<typeof import('../services/gmailService')>['gmailService'] | null = null;
let reservationParserServiceInstance: Awaited<typeof import('../services/reservationParserService')>['reservationParserService'] | null = null;

const getGmailAuthService = async () => {
  if (!gmailAuthServiceInstance) {
    const mod = await import('../services/gmailAuthService');
    gmailAuthServiceInstance = mod.gmailAuthService;
  }
  return gmailAuthServiceInstance;
};

const getGmailService = async () => {
  if (!gmailServiceInstance) {
    const mod = await import('../services/gmailService');
    gmailServiceInstance = mod.gmailService;
  }
  return gmailServiceInstance;
};

const getReservationParserService = async () => {
  if (!reservationParserServiceInstance) {
    const mod = await import('../services/reservationParserService');
    reservationParserServiceInstance = mod.reservationParserService;
  }
  return reservationParserServiceInstance;
};

// 初期状態
const initialAuthState: GmailAuthState = {
  isLinked: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  email: null,
};

// Context
const GmailContext = createContext<GmailContextType | undefined>(undefined);

// Provider Props
interface GmailProviderProps {
  children: ReactNode;
}

/**
 * GmailProvider
 */
export const GmailProvider: React.FC<GmailProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<GmailAuthState>(initialAuthState);
  const [reservations, setReservations] = useState<GmailReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  /**
   * 手動初期化メソッド
   * 画面表示時に呼び出し、SecureStoreからトークンを復元する
   */
  const initialize = useCallback(async () => {
    // 既に初期化済み、または初期化中の場合はスキップ
    if (isInitializingRef.current || isInitialized) {
      return;
    }
    isInitializingRef.current = true;

    try {
      setIsLoading(true);
      const gmailAuthService = await getGmailAuthService();
      const restoredState = await gmailAuthService.restoreTokens();
      setAuthState(restoredState);
      setIsInitialized(true);
    } catch (err) {
      console.error('[GmailContext] トークン復元エラー:', err);
      // エラーでも初期化完了とマーク（未認証状態で継続）
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [isInitialized]);

  /**
   * Googleアカウントにサインイン
   */
  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const gmailAuthService = await getGmailAuthService();
      const newAuthState = await gmailAuthService.signIn();
      setAuthState(newAuthState);

      // サインイン成功後、予約を自動取得
      if (newAuthState.isLinked) {
        await fetchReservationsInternal();
      }
    } catch (err: any) {
      console.error('[GmailContext] サインインエラー:', err);
      setError(err.message || 'サインインに失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * サインアウト
   */
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const gmailAuthService = await getGmailAuthService();
      await gmailAuthService.signOut();
      setAuthState(initialAuthState);
      setReservations([]);
    } catch (err: any) {
      console.error('[GmailContext] サインアウトエラー:', err);
      setError(err.message || 'サインアウトに失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 予約情報を取得（内部用）
   */
  const fetchReservationsInternal = async () => {
    try {
      // サービスを動的にロード
      const gmailService = await getGmailService();
      const reservationParserService = await getReservationParserService();

      // 予約メールを検索
      const messages = await gmailService.searchReservationEmails();

      if (messages.length === 0) {
        console.log('[GmailContext] 予約メールが見つかりませんでした');
        setReservations([]);
        return;
      }

      // 予約情報を解析
      const parsedReservations = await reservationParserService.parseReservations(messages);

      // 日付でソート（新しい順）
      parsedReservations.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

      setReservations(parsedReservations);
      console.log(`[GmailContext] ${parsedReservations.length}件の予約を取得しました`);
    } catch (err) {
      console.error('[GmailContext] 予約取得エラー:', err);
      throw err;
    }
  };

  /**
   * 予約情報を取得（公開用）
   */
  const fetchReservations = useCallback(async () => {
    if (!authState.isLinked) {
      setError('Googleアカウントに接続されていません');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await fetchReservationsInternal();
    } catch (err: any) {
      setError(err.message || '予約の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [authState.isLinked]);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 予約情報をイベントデータ形式に変換（EventContext依存なし）
   */
  const getReservationEventData = useCallback((reservation: GmailReservation): ReservationEventData => {
    return {
      title: reservation.title,
      date: formatDate(reservation.startDate),
      endDate: reservation.endDate ? formatDate(reservation.endDate) : undefined,
      startTime: formatTime(reservation.startDate),
      endTime: reservation.endDate
        ? formatTime(reservation.endDate)
        : formatTime(new Date(reservation.startDate.getTime() + 60 * 60 * 1000)), // デフォルト1時間
      location: reservation.location
        ? { name: reservation.location, address: reservation.address }
        : { name: '' },
      notes: buildNotes(reservation),
      color: getReservationColor(reservation.type),
      isAllDay: reservation.type === 'hotel', // ホテルは終日イベント
      reminders: [60], // 1時間前にリマインド
      recurrence: { type: 'none', endCondition: 'never' },
    };
  }, []);

  const value: GmailContextType = {
    authState,
    reservations,
    isLoading,
    error,
    isInitialized,
    signIn,
    signOut,
    fetchReservations,
    clearError,
    getReservationEventData,
    initialize,
  };

  return (
    <GmailContext.Provider value={value}>
      {children}
    </GmailContext.Provider>
  );
};

/**
 * useGmail フック
 */
export const useGmail = (): GmailContextType => {
  const context = useContext(GmailContext);
  if (!context) {
    throw new Error('useGmail must be used within a GmailProvider');
  }
  return context;
};

// ヘルパー関数

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 時刻をHH:MM形式にフォーマット
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 予約タイプに応じた色を取得
 */
function getReservationColor(type: string): string {
  const colorMap: Record<string, string> = {
    flight: '#0ea5e9', // Sky Blue
    hotel: '#8b5cf6', // Violet
    restaurant: '#f97316', // Orange
    car_rental: '#10b981', // Green
    event: '#ec4899', // Pink
    other: '#6b7280', // Gray
  };
  return colorMap[type] || colorMap.other;
}

/**
 * 予約情報からメモを構築
 */
function buildNotes(reservation: GmailReservation): string {
  const parts: string[] = [];

  if (reservation.confirmationNumber) {
    parts.push(`予約番号: ${reservation.confirmationNumber}`);
  }

  if (reservation.type === 'flight') {
    if (reservation.airline) {
      parts.push(`航空会社: ${reservation.airline}`);
    }
    if (reservation.flightNumber) {
      parts.push(`便名: ${reservation.flightNumber}`);
    }
    if (reservation.departureAirport && reservation.arrivalAirport) {
      parts.push(`${reservation.departureAirport} → ${reservation.arrivalAirport}`);
    }
  }

  if (reservation.type === 'hotel') {
    if (reservation.hotelName) {
      parts.push(`ホテル: ${reservation.hotelName}`);
    }
    if (reservation.checkInTime) {
      parts.push(`チェックイン: ${reservation.checkInTime}`);
    }
    if (reservation.checkOutTime) {
      parts.push(`チェックアウト: ${reservation.checkOutTime}`);
    }
  }

  if (reservation.address) {
    parts.push(`住所: ${reservation.address}`);
  }

  if (reservation.notes) {
    parts.push(reservation.notes);
  }

  parts.push('--- Gmailから取得 ---');

  return parts.join('\n');
}
