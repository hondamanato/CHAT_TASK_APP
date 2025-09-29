import AsyncStorage from '@react-native-async-storage/async-storage';

interface TermsAgreement {
  hasAgreed: boolean;
  agreedDate: string;
  termsVersion: string;
}

export class TermsService {
  private static readonly TERMS_KEY = 'terms_agreement';
  private static readonly CURRENT_TERMS_VERSION = '1.0.0';

  /**
   * 利用規約への同意状態を取得
   */
  static async getAgreementStatus(): Promise<TermsAgreement | null> {
    try {
      const agreementData = await AsyncStorage.getItem(this.TERMS_KEY);
      if (!agreementData) {
        return null;
      }
      return JSON.parse(agreementData);
    } catch (error) {
      console.error('利用規約同意状態の取得に失敗:', error);
      return null;
    }
  }

  /**
   * 利用規約に同意済みかどうかをチェック
   */
  static async hasAgreedToCurrentTerms(): Promise<boolean> {
    try {
      const agreement = await this.getAgreementStatus();
      if (!agreement) {
        return false;
      }

      // 同意済みかつ現在のバージョンに対する同意であるかをチェック
      return agreement.hasAgreed && agreement.termsVersion === this.CURRENT_TERMS_VERSION;
    } catch (error) {
      console.error('利用規約同意状態のチェックに失敗:', error);
      return false;
    }
  }

  /**
   * 利用規約への同意を記録
   */
  static async recordAgreement(): Promise<boolean> {
    try {
      const agreementData: TermsAgreement = {
        hasAgreed: true,
        agreedDate: new Date().toISOString(),
        termsVersion: this.CURRENT_TERMS_VERSION,
      };

      await AsyncStorage.setItem(this.TERMS_KEY, JSON.stringify(agreementData));
      console.log('利用規約への同意を記録しました');
      return true;
    } catch (error) {
      console.error('利用規約同意の記録に失敗:', error);
      return false;
    }
  }

  /**
   * 同意状態をクリア（開発・テスト用）
   */
  static async clearAgreement(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.TERMS_KEY);
      console.log('利用規約の同意状態をクリアしました');
      return true;
    } catch (error) {
      console.error('利用規約同意状態のクリアに失敗:', error);
      return false;
    }
  }

  /**
   * 現在の利用規約バージョンを取得
   */
  static getCurrentTermsVersion(): string {
    return this.CURRENT_TERMS_VERSION;
  }
}