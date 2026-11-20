import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerBackTitle: 'Kembali',
        }}>
        <Stack.Screen name="index" options={{ title: 'ZTICK', headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Masuk', headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Daftar', headerShown: false }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout Tiket', headerBackTitle: 'Kembali' }} />
        <Stack.Screen
          name="pembayaran"
          options={{ title: 'Pembayaran Tiket', headerBackTitle: 'Batal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="status-pembayaran"
          options={{ title: 'Status Pembayaran', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="pembayaran-ulang" options={{ title: 'Lanjutkan Pembayaran', headerBackTitle: 'Kembali' }} />
        <Stack.Screen name="tiket" options={{ title: 'Tiket Saya', headerBackTitle: 'Kembali' }} />
        <Stack.Screen name="tiket/[id]" options={{ title: 'Detail E-Tiket', headerBackTitle: 'Tiket Saya' }} />
        <Stack.Screen name="explore" options={{ title: 'Explore', headerShown: false }} />
      </Stack>
    </>
  );
}
