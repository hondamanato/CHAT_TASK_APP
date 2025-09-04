import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export class NetworkService {
  private static instance: NetworkService;
  private listeners: Array<(state: NetworkState) => void> = [];
  private currentState: NetworkState = {
    isConnected: true, // 初期値をtrueに変更（楽観的初期化）
    isInternetReachable: true,
    type: 'unknown'
  };
  private unsubscribe: (() => void) | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  private async initialize() {
    console.log('🌐 NetworkService: 初期化開始');
    
    try {
      // 初期状態を取得（タイムアウト付き）
      await Promise.race([
        this.updateCurrentState(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network state fetch timeout')), 5000)
        )
      ]);
      console.log('🌐 NetworkService: 初期状態取得完了', this.currentState);
      console.log('🌐 NetworkService: isOnline()結果:', this.isOnline());
    } catch (error) {
      console.warn('🌐 NetworkService: 初期状態取得に失敗、デフォルト値を使用', error);
      // デフォルトでオンライン状態とする
      this.currentState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      };
      console.log('🌐 NetworkService: フォールバック後のisOnline()結果:', this.isOnline());
    }
    
    // ネットワーク状態の変化を監視
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkStateChange.bind(this));
    console.log('🌐 NetworkService: 監視開始');
  }

  private async updateCurrentState() {
    try {
      const state = await NetInfo.fetch();
      this.currentState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type
      };
    } catch (error) {
      console.error('Failed to fetch network state:', error);
    }
  }

  private handleNetworkStateChange(state: any) {
    const newState: NetworkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type
    };

    // 状態が変化した場合のみ通知
    if (this.hasStateChanged(newState)) {
      const previousState = { ...this.currentState };
      this.currentState = newState;
      
      console.log(`🌐 Network state changed:`, {
        from: previousState,
        to: newState
      });

      // リスナーに通知
      this.listeners.forEach(listener => {
        try {
          listener(newState);
        } catch (error) {
          console.error('Network listener error:', error);
        }
      });
    }
  }

  private hasStateChanged(newState: NetworkState): boolean {
    return (
      this.currentState.isConnected !== newState.isConnected ||
      this.currentState.isInternetReachable !== newState.isInternetReachable ||
      this.currentState.type !== newState.type
    );
  }

  // 現在のネットワーク状態を取得
  getCurrentState(): NetworkState {
    return { ...this.currentState };
  }

  // インターネット接続があるかチェック
  isOnline(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable;
  }

  // ネットワーク状態変化のリスナーを追加
  addListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);

    // リスナーを削除する関数を返す
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 最新の状態を強制的に取得
  async refreshState(): Promise<NetworkState> {
    await this.updateCurrentState();
    return this.getCurrentState();
  }

  // サービスのクリーンアップ
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }

  // デバッグ用：ネットワーク状態の詳細情報を取得
  async getDetailedNetworkInfo() {
    try {
      const state = await NetInfo.fetch();
      console.log('🔍 Detailed network info:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details
      });
      return state;
    } catch (error) {
      console.error('Failed to get detailed network info:', error);
      return null;
    }
  }
}

// シングルトンインスタンス
export const networkService = NetworkService.getInstance();