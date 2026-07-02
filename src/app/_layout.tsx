import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

import { AuthProvider } from '@/features/auth';
import { OpeningAnimation } from '@/components/OpeningAnimation';

export default function RootLayout() {
  const [showOpening, setShowOpening] = useState(true);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  const handleFinish = useCallback(() => {
    setShowOpening(false);
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="auto" />
      {showOpening && <OpeningAnimation onFinish={handleFinish} />}
      <Toast />
    </AuthProvider>
  );
}
