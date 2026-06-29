import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { LOGIN_ROUTE, resolveAuthenticatedHomeRoute } from '@/lib/auth/accountRoutes';

export default function IndexScreen() {
  const { auth, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={resolveAuthenticatedHomeRoute(auth) as Href} />;
  }

  return <Redirect href={LOGIN_ROUTE as Href} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
