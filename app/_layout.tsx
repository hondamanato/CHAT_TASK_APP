import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect, type ReactNode } from 'react';
import { MobileAds } from 'react-native-google-mobile-ads';

import { LoadingScreen } from '@/src/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { CalendarProvider } from '@/src/contexts/CalendarContext';
import { HolidayProvider } from '@/src/contexts/HolidayContext';
import { WeatherProvider } from '@/src/contexts/WeatherContext';
import { SettingsProvider } from '@/src/contexts/SettingsContext';
import { LocalizationProvider } from '@/src/contexts/LocalizationContext';
import { NotificationProvider } from '@/src/contexts/NotificationContext';
import { AdProvider } from '@/src/contexts/AdContext';
import { useSettings } from '@/src/contexts/SettingsContext';
import { AuthScreen } from '@/src/screens/AuthScreen';

// 本番環境でconsole.*を無効化
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.debug = () => {};
  // console.errorは本番環境でも残す（重要なエラー追跡のため）
}

function AppContent() {
  const { user, loading, isSignupInProgress } = useAuth();

  // ローディング中
  if (loading) {
    return <LoadingScreen />;
  }

  // 新規登録フロー中は認証画面を表示（OTP入力画面等を表示するため）
  if (isSignupInProgress) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  // 未認証の場合はログイン画面を表示
  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  // メインアプリ
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function ThemeWrapper({ children }: { children: ReactNode }) {
  const { isDarkMode } = useSettings();

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      {children}
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // AdMob初期化（アプリ起動時に1回のみ）
  useEffect(() => {
    const initializeAdMob = async () => {
      try {
        await MobileAds().initialize();
        console.log('[RootLayout] AdMob初期化成功');
      } catch (error) {
        console.error('[RootLayout] AdMob初期化エラー（継続）:', error);
        // エラーが発生してもアプリはクラッシュさせない
      }
    };

    initializeAdMob();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#007AFF' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocalizationProvider>
        <AuthProvider>
          <CalendarProvider>
            <NotificationProvider>
              <SettingsProvider>
                <HolidayProvider>
                  <WeatherProvider>
                    <AdProvider>
                      <ThemeWrapper>
                        <AppContent />
                      </ThemeWrapper>
                    </AdProvider>
                  </WeatherProvider>
                </HolidayProvider>
              </SettingsProvider>
            </NotificationProvider>
          </CalendarProvider>
        </AuthProvider>
      </LocalizationProvider>
    </GestureHandlerRootView>
  );
}
