import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { useReportPolling } from '@/features/report';

const LOGIN_ROUTE = '/(auth)/login' as Href;

export default function AppLayout() {
  const { isLoading, isAuthenticated, apiClient } = useAuth();

  // Poll for report status updates whenever the user is authenticated.
  useReportPolling(apiClient, 60_000, isAuthenticated);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
