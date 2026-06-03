import { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/features/auth';
import { OpeningAnimation } from '@/components/OpeningAnimation';

export default function RootLayout() {
  const [showOpening, setShowOpening] = useState(true);

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
    </AuthProvider>
  );
}
