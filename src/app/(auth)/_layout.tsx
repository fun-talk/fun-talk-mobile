import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { resolveAuthenticatedHomeRoute } from '@/lib/auth/accountRoutes';

export default function AuthLayout() {
  const { auth, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (auth?.teacherProfileRequired) {
      return <Stack screenOptions={{ headerShown: false }} />;
    }
    return <Redirect href={resolveAuthenticatedHomeRoute(auth) as Href} />;
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
