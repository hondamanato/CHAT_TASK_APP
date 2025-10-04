import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { LoadingScreen } from '@/src/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { CalendarProvider } from '@/src/contexts/CalendarContext';
import { HolidayProvider } from '@/src/contexts/HolidayContext';
import { SettingsProvider } from '@/src/contexts/SettingsContext';
import { AuthScreen } from '@/src/screens/AuthScreen';

function AppContent() {
  const { user, loading } = useAuth();

  // ローディング中
  if (loading) {
    return <LoadingScreen />;
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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#007AFF' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CalendarProvider>
          <SettingsProvider>
            <HolidayProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <AppContent />
                <StatusBar style="auto" />
              </ThemeProvider>
            </HolidayProvider>
          </SettingsProvider>
        </CalendarProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
