import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Localization from 'expo-localization';
import { setLocale as setI18nLocale, isSupportedLocale } from '../i18n';

interface LocalizationContextType {
  locale: string;
  getLanguageName: (localeCode: string) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

interface LocalizationProviderProps {
  children: ReactNode;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState('ja');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // タイムアウト付きでロケール読み込み
    const timeoutId = setTimeout(() => {
      if (!isInitialized) {
        console.warn('[Localization] ロケール読み込みがタイムアウトしました。デフォルト(ja)で続行します。');
        setLocaleState('ja');
        setI18nLocale('ja');
        setIsInitialized(true);
      }
    }, 3000); // 3秒

    loadLocale().finally(() => {
      clearTimeout(timeoutId);
      setIsInitialized(true);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  // 言語コード変換: iOS の言語コードをアプリの言語コードに変換
  const convertIOSLanguageCode = (iosCode: string): string => {
    // iOSの言語コードをマッピング
    const languageMap: { [key: string]: string } = {
      'ja': 'ja',
      'en': 'en',
      'zh-Hans': 'zh-CN',
      'zh-Hant': 'zh-TW',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'pt': 'pt',
      'it': 'it',
      'ru': 'ru',
      'ar': 'ar',
      'th': 'th',
      'vi': 'vi',
      'id': 'id',
      'hi': 'hi',
    };

    // 言語コードのみを抽出 (例: "en-US" -> "en")
    const baseCode = iosCode.split('-')[0].split('_')[0];

    // マッピングに存在すればそれを使用、なければ元のコードをチェック
    if (languageMap[iosCode]) {
      return languageMap[iosCode];
    }
    if (languageMap[baseCode]) {
      return languageMap[baseCode];
    }

    return baseCode;
  };

  const loadLocale = async () => {
    try {
      console.log('[Localization] Starting locale initialization...');

      // デバイスのロケールを取得（安全に）
      let locales;
      try {
        locales = Localization.getLocales();
        console.log('[Localization] Device locales retrieved:', JSON.stringify(locales));
      } catch (localeError) {
        console.error('[Localization] Failed to get device locales:', localeError);
        // getLocales()が失敗した場合はデフォルトに
        setLocaleState('ja');
        setI18nLocale('ja');
        return;
      }

      if (locales && locales.length > 0) {
        try {
          const deviceLanguageCode = locales[0].languageCode ?? 'ja';
          const deviceLanguageTag = locales[0].languageTag ?? 'ja';
          console.log('[Localization] Device language code:', deviceLanguageCode);
          console.log('[Localization] Device language tag:', deviceLanguageTag);

          // iOS言語コードをアプリの言語コードに変換
          let finalLocale = convertIOSLanguageCode(deviceLanguageTag);

          // サポートされている言語かチェック
          if (!isSupportedLocale(finalLocale)) {
            // 中国語の特殊ケース
            const regionCode = locales[0].regionCode;
            if (deviceLanguageCode === 'zh') {
              if (regionCode === 'CN' || regionCode === 'SG') {
                finalLocale = 'zh-CN';
              } else if (regionCode === 'TW' || regionCode === 'HK' || regionCode === 'MO') {
                finalLocale = 'zh-TW';
              }
            } else {
              // サポートされていない言語の場合はデフォルトに
              finalLocale = 'ja';
            }
            console.log('[Localization] Unsupported language, using fallback:', finalLocale);
          }

          console.log('[Localization] Final locale:', finalLocale);
          setLocaleState(finalLocale);
          setI18nLocale(finalLocale);
        } catch (processError) {
          console.error('[Localization] Failed to process locale:', processError);
          setLocaleState('ja');
          setI18nLocale('ja');
        }
      } else {
        // デフォルトは日本語
        console.log('[Localization] No device locale found, using default: ja');
        setLocaleState('ja');
        setI18nLocale('ja');
      }
    } catch (error) {
      console.error('[Localization] Critical error in loadLocale:', error);
      // 何があってもデフォルト値を設定
      setLocaleState('ja');
      setI18nLocale('ja');
    }
  };

  //言語名を取得する関数
  const getLanguageName = (localeCode: string): string => {
    const languageNames: { [key: string]: string } = {
      'ja': '日本語',
      'en': 'English',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'ko': '한국어',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'pt': 'Português',
      'it': 'Italiano',
      'ru': 'Русский',
      'ar': 'العربية',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'id': 'Bahasa Indonesia',
      'hi': 'हिन्दी',
    };

    return languageNames[localeCode] || localeCode;
  };

  return (
    <LocalizationContext.Provider value={{ locale, getLanguageName }}>
      {children}
    </LocalizationContext.Provider>
  );
};

// カスタムフック
export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
