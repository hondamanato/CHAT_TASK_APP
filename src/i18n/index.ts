import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import ja from '../locales/ja.json';
import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';
import ko from '../locales/ko.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import pt from '../locales/pt.json';
import it from '../locales/it.json';
import ru from '../locales/ru.json';
import ar from '../locales/ar.json';
import th from '../locales/th.json';
import vi from '../locales/vi.json';
import id from '../locales/id.json';
import hi from '../locales/hi.json';

// i18nインスタンスを作成
const i18n = new I18n({
  ja,
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ko,
  es,
  fr,
  de,
  pt,
  it,
  ru,
  ar,
  th,
  vi,
  id,
  hi,
});

// フォールバック言語を日本語に設定
i18n.defaultLocale = 'ja';
i18n.enableFallback = true;

// デフォルトロケールを日本語に設定
// LocalizationProviderがマウントされた後に適切なロケールで上書きされます
i18n.locale = 'ja';

// 翻訳関数をエクスポート
export const t = (key: string, options?: object): string => {
  return i18n.t(key, options);
};

// i18nインスタンスもエクスポート（必要な場合）
export default i18n;

// サポートされている言語コードのリスト
export const SUPPORTED_LOCALES = [
  'ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'es', 'fr', 'de',
  'pt', 'it', 'ru', 'ar', 'th', 'vi', 'id', 'hi'
];

// ロケール情報を取得する関数
export const getCurrentLocale = (): string => {
  return i18n.locale;
};

// ロケールを手動で設定する関数（LocalizationProviderから呼ばれます）
export const setLocale = (locale: string): void => {
  i18n.locale = locale;
};

// サポートされている言語かチェックする関数
export const isSupportedLocale = (locale: string): boolean => {
  return SUPPORTED_LOCALES.includes(locale);
};
