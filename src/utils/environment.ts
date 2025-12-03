/**
 * 環境判定ユーティリティ
 * 開発環境と本番環境を判定するための関数
 */

/**
 * 開発環境かどうかを判定
 * @returns 開発環境の場合はtrue、本番環境の場合はfalse
 */
export const isDevelopment = (): boolean => {
  return __DEV__;
};

/**
 * 本番環境かどうかを判定
 * @returns 本番環境の場合はtrue、開発環境の場合はfalse
 */
export const isProduction = (): boolean => {
  return !__DEV__;
};

/**
 * デバッグ情報を含むエラーメッセージを生成
 * 開発環境では詳細情報を含め、本番環境ではユーザーフレンドリーなメッセージのみを返す
 * 
 * @param userMessage ユーザーに表示するメッセージ
 * @param debugInfo デバッグ情報（開発環境でのみ表示）
 * @param error エラーオブジェクト（オプション）
 * @returns 環境に応じたエラーメッセージ
 */
export const formatErrorMessage = (
  userMessage: string,
  debugInfo?: string,
  error?: Error | any
): string => {
  if (isDevelopment()) {
    // 開発環境: 詳細情報を表示
    let fullMessage = userMessage;
    
    if (debugInfo) {
      fullMessage += `\n\n[Debug] ${debugInfo}`;
    }
    
    if (error) {
      const errorMessage = error.message || String(error);
      fullMessage += `\n${errorMessage.substring(0, 200)}`;
    }
    
    return fullMessage;
  } else {
    // 本番環境: ユーザーフレンドリーなメッセージのみ
    return userMessage;
  }
};

/**
 * エラーログを出力（開発環境でのみ詳細を表示）
 * 
 * @param context ログのコンテキスト
 * @param error エラーオブジェクト
 */
export const logError = (context: string, error: any): void => {
  if (isDevelopment()) {
    console.error(`[${context}] エラー詳細:`, error);
    if (error.stack) {
      console.error(`[${context}] スタックトレース:`, error.stack);
    }
  } else {
    // 本番環境では最小限のログ
    console.error(`[${context}] エラーが発生しました`);
  }
};

